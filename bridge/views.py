#!/usr/bin/env python3.11
"""晨会 / 复盘 = 各研究员观点的原文汇总。

rr 要的是「不同研究员观点的总结和精华」，不是把风险报表再抄一遍。所以这里做两件事：

  1. 把每个策略**自己写的那段观点**原样摘出来（标题 + 导语 + 小节），标明出自哪个文件。
  2. 把能直接对比的东西并排放：各家今天对大势的判断、谁满仓谁空仓、谁和谁拿了同一只票。
     **并列，不合并，不裁决。** 谁对谁错不是网站该说的。

综合摘要由本地 Claude 跑，落在 `_PLATFORM/briefing/<date>_{morning,evening}.md`；
存在就渲染，不存在就只给原文摘录并说明「综合还没跑」。网站自己不做提炼。

只读。stdlib only。
"""
import re
import time
from pathlib import Path

SK = Path.home() / "invest skills"
BRIEF_DIR = SK / "_PLATFORM" / "briefing"

_C = {}


def _cached(key, ttl, fn):
    hit = _C.get(key)
    if hit and time.time() - hit[0] < ttl:
        return hit[1]
    v = fn()
    _C[key] = (time.time(), v)
    return v


# 每个策略「观点在哪个文件里」。按顺序试，取第一个存在的。
# 晨会看的是它对明天怎么想；复盘看的是它对今天怎么认。
MORNING = {
    "brownsugar": ["reports/{d}/report.md"],
    "serenity":   ["reports/{d}/_autolock_report.md"],
    "usrocket":   ["reports/{d}/premarket.md", "reports/{d}/open30.md"],
    "wufu":       ["reports/{d}/report.md", "reports/{d}/nightly_log.md"],
    "goldpool":   ["reports/{d}/conviction.md", "reports/{d}/ranking.md"],
    "fattail":    ["reports/{d}/orders.md"],
    "wavehunter": ["reports/{d}/blotter_cn.md"],
    "factor":     ["output/{d}/report.md"],
}
EVENING = {
    "brownsugar": ["reports/{d}/self_reflection_16.md"],
    "usrocket":   ["reports/{d}/postclose.md", "reports/{d}/retrospect.md"],
    "serenity":   ["reports/{d}/_autolock_report.md"],
    "hedgepair":  ["reports/{d}/daily_review.md"],
    "wufu":       ["reports/{d}/nightly_log.md"],
}
# 周频的单独找最新一份，不按日期拼
WEEKLY = {"wavehunter": "reports/weekly_review_*.md"}


def _read_view(path, max_sec=6, sec_chars=700):
    """把一份人写的 md 拆成 {标题, 导语, 小节[]}。只切不改。"""
    try:
        text = path.read_text(errors="ignore")
    except OSError as e:
        return {"ok": False, "error": str(e)}
    lines = text.splitlines()
    title = next((l[2:].strip() for l in lines if l.startswith("# ")), path.stem)
    # 导语 = 标题后的第一段引用块或第一段加粗
    lede, seen_title = [], False
    for l in lines:
        if l.startswith("# "):
            seen_title = True
            continue
        if not seen_title:
            continue
        if l.startswith("## "):
            break
        if l.strip():
            lede.append(l.strip().lstrip("> ").strip())
        elif lede:
            break
    secs, cur, buf = [], None, []
    for l in lines:
        m = re.match(r"^##\s+(.+?)\s*$", l)
        if m:
            if cur:
                secs.append({"title": cur, "body": "\n".join(buf).strip()[:sec_chars]})
            cur, buf = m.group(1), []
        elif cur is not None:
            buf.append(l)
    if cur:
        secs.append({"title": cur, "body": "\n".join(buf).strip()[:sec_chars]})
    out = {"ok": True, "title": title, "lede": " ".join(lede)[:900],
           "sections": secs[:max_sec], "file": str(path),
           "bytes": len(text), "n_sections": len(secs)}
    # 有些文件不用 `##` 分节（premarket / conviction / factor report），
    # 那就把正文开头原样给出去，别显示成一片空白。
    if not secs and not out["lede"].strip():
        body = "\n".join(l for l in lines if not l.startswith("# ")).strip()
        out["raw"] = body[:1600]
    return out


def _pick_file(skdir, patterns, date):
    for pat in patterns:
        p = SK / skdir / pat.format(d=date)
        if p.exists():
            return p
    return None


def _latest_weekly(skdir, glob):
    d = SK / skdir
    files = sorted(d.glob(glob)) if d.is_dir() else []
    return files[-1] if files else None


def _roster():
    import real
    return {sk["id"]: sk for sk in real.ROSTER}


def _views(which):
    """把每个策略的观点原件读出来。找不到就写找不到 —— 不拿上一期冒充。"""
    import real
    table = MORNING if which == "morning" else EVENING
    R = _roster()
    out = []
    for sid, pats in table.items():
        sk = R.get(sid)
        if not sk:
            continue
        rep = real.latest_report(sk["dir"])
        date = rep.get("date") or ""
        f = _pick_file(sk["dir"], pats, date) if date else None
        if not f and sid in WEEKLY:
            f = _latest_weekly(sk["dir"], WEEKLY[sid])
        row = {"id": sid, "n": sk["n"], "market": sk["market"], "motto": sk["motto"],
               "creed": sk["creed"], "src_doc": sk["src"], "date": date}
        if not f:
            # 这一期确实没写这份文件。把那天实际落了什么列出来，
            # 免得看的人以为是程序读漏了。
            row["view"] = {"ok": False,
                           "error": f"{date or '—'} 这一期没有观点文件（找过 "
                                    + "、".join(pats) + "）",
                           "available": rep.get("files", [])[:8]}
        else:
            row["view"] = _read_view(f)
        p = real.latest_picks(sk["dir"])
        row["picks"] = {"date": p.get("date"), "n": len(p.get("picks") or []),
                        "regime": p.get("regime") or "", "note": (p.get("note") or "")[:220],
                        "top": (p.get("picks") or [])[:3]}
        out.append(row)
    return out


def _compare():
    """能直接并排比的三样东西。并列，不合并，不裁决。"""
    import real
    R = real.ROSTER
    regimes, cash, loaded = [], [], []
    board = real.pk_board()
    for sk in R:
        if sk.get("nobook"):
            continue
        st = real.status_of(sk, board, {}, None)
        # 已裁/休眠的策略不进「谁空仓谁满仓」的对比 —— 它们不是在观望，是不在跑了
        if st["code"] in ("fired", "dormant"):
            continue
        p = real.latest_picks(sk["dir"])
        if p.get("regime"):
            regimes.append({"n": sk["n"], "regime": p["regime"], "date": p.get("date")})
        if p.get("nofile"):
            continue
        (cash if not (p.get("picks") or []) else loaded).append(
            {"n": sk["n"], "date": p.get("date"), "status": st["label"],
             "why": (p.get("note") or "")[:160], "n_picks": len(p.get("picks") or [])})
    overlap = []
    try:
        import deskreal
        rb = deskreal.riskboard()
        if rb.get("ok"):
            for e in rb.get("exposure", []):
                holders = e.get("holders", "")
                if holders.count(":") >= 2:            # 同一只票被两家以上持有
                    overlap.append({"ticker": e["ticker"], "name": e["name"],
                                    "gross": e["gross"], "holders": holders})
    except Exception:
        pass
    return {"regimes": regimes, "cash": cash, "loaded": loaded, "overlap": overlap}


def _synth(which, date):
    """本地 Claude 跑出来的综合摘要。有就渲染，没有就说没有 —— 网站不代笔。"""
    p = BRIEF_DIR / f"{date}_{which}.md"
    if not p.exists():
        return {"ok": False, "path": str(p),
                "hint": "综合摘要由本地 Claude 产出后落在这个路径，网站只读不代笔。"}
    return {"ok": True, "path": str(p), "text": p.read_text(errors="ignore")[:20000]}


def session(which="morning"):
    if which not in ("morning", "evening"):
        return {"ok": False, "error": "which 只认 morning / evening"}
    date = time.strftime("%Y-%m-%d")
    return {"ok": True, "which": which, "as_of": time.strftime("%Y-%m-%d %H:%M"),
            "views": _views(which), "compare": _compare(), "synth": _synth(which, date),
            "note": "每段都是各策略自己文件里的原文。分歧并列呈现，不合并不裁决。"}


if __name__ == "__main__":
    for w in ("morning", "evening"):
        d = session(w)
        print(f"===== {w} =====")
        for v in d["views"]:
            vv = v["view"]
            if vv.get("ok"):
                print(f"  {v['n']:8} {v['date']} · {vv['n_sections']} 节 · {vv['title'][:56]}")
                print(f"           {vv['lede'][:96]}")
            else:
                print(f"  {v['n']:8} —— {vv.get('error')[:80]}")
        c = d["compare"]
        print("  大势判断:", [(x["n"], x["regime"]) for x in c["regimes"]])
        print("  空仓:", [x["n"] for x in c["cash"]], "| 有仓:", [x["n"] for x in c["loaded"]])
        print("  同票重叠:", len(c["overlap"]), "· 综合摘要:", d["synth"].get("ok"))
