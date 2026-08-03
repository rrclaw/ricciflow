#!/usr/bin/env python3.11
"""研究流水线 = 真实课题的生命周期。

以前流水线是 9 张编出来的票。现在六段各自对应一批真在办的事：

  灵感  ← distill.insight_daily()（已真）
  初筛  ← 信念账本的 proposed（216 条待人审）
  快研  ← _PENDING_INGEST.md 里还没消化的原始材料
  深研  ← active 但未人审的信念 + 🔴三方背离缺口
  决策  ← 今天各策略真实锁的仓（带 thesis 原文）
  跟踪  ← riskboard 在仓腿 + 🥶stale 信念（等新证据）

每张票都是一个真实工作项：有 id、有出处文件、有下一步该干什么。
点开看到的是它的真实档案（证据数 vs 反方数、最新证据日期、涉及标的、来源缺口），
不是我替它写的摘要。

_BELIEFS.md 是 derived 视图（由 beliefs/events.jsonl 渲染），格式相对稳定，
但仍然是人可读 markdown。解析不出来就报「解析不了 + 文件路径」，不猜。

只读。stdlib only。
"""
import json
import re
import time
from pathlib import Path

KB = Path.home() / "knowledge" / "knowledge"
SK = Path.home() / "invest skills"
BELIEFS = KB / "wiki" / "_BELIEFS.md"

_C = {}


def _cached(key, ttl, fn):
    hit = _C.get(key)
    if hit and time.time() - hit[0] < ttl:
        return hit[1]
    v = fn()
    _C[key] = (time.time(), v)
    return v


_HEAD = re.compile(r"^###\s+(b_[0-9a-f]+)\s+·\s+(.*?)(?:\s*〔conf\s*([\d.]+)〕)?\s*$")
_EVID = re.compile(r"证据:\s*(\d+)\s*条.*?反方:\s*(\d+)\s*条.*?最新证据\s*(\d{4}-\d{2}-\d{2})?")


def beliefs():
    """解析信念账本。返回 {section: [belief…]}，section 用原文小节名。"""
    def go():
        if not BELIEFS.exists():
            return {"ok": False, "error": f"没有信念账本：{BELIEFS}"}
        text = BELIEFS.read_text(errors="ignore")
        m = re.search(r"更新:\s*(\S+)\s*·\s*active\s*(\d+).*?falsified\s*(\d+).*?"
                      r"proposed\s*(\d+).*?retired\s*(\d+)", text)
        counts = {"updated": m.group(1), "active": int(m.group(2)),
                  "falsified": int(m.group(3)), "proposed": int(m.group(4)),
                  "retired": int(m.group(5))} if m else {}
        out, section, cur = {}, "", None
        for line in text.splitlines():
            if line.startswith("## "):
                section = line[3:].strip()
                cur = None
                continue
            h = _HEAD.match(line)
            if h:
                cur = {"id": h.group(1), "title": h.group(2).strip(),
                       "conf": float(h.group(3)) if h.group(3) else None,
                       "section": section, "tickers": [], "status": "",
                       "evidence": None, "against": None, "last_evidence": "",
                       "stale": False, "review": "", "gap": "", "page": ""}
                out.setdefault(section, []).append(cur)
                continue
            if not cur or not line.strip().startswith("-"):
                continue
            b = line.strip().lstrip("- ").strip()
            if b.startswith("标的:"):
                seg = b[3:].split("·")
                cur["tickers"] = [t for t in seg[0].split() if t][:12]
                for s2 in seg[1:]:
                    if "status:" in s2:
                        cur["status"] = s2.split("status:")[1].strip()
            elif b.startswith("证据:"):
                e = _EVID.search(b)
                if e:
                    cur["evidence"] = int(e.group(1))
                    cur["against"] = int(e.group(2))
                    cur["last_evidence"] = e.group(3) or ""
                cur["stale"] = "stale" in b
            elif b.startswith("人审:"):
                cur["review"] = b[3:].strip()[:220]
            elif b.startswith("来源 gap:"):
                g = b.split("来源 gap:")[1].strip()
                cur["gap"] = g.split("@")[0].strip()
                cur["page"] = g.split("@")[1].strip() if "@" in g else ""
        if not out:
            return {"ok": False, "error": f"账本里没解析到任何信念条目（格式可能变了）：{BELIEFS}"}
        return {"ok": True, "file": str(BELIEFS), "counts": counts,
                "sections": {k: v for k, v in out.items()}}
    return _cached("beliefs", 600, go)


def _sec(d, *keys):
    """小节名带 emoji，按关键字模糊取。"""
    for name, rows in (d.get("sections") or {}).items():
        if all(k in name for k in keys):
            return rows
    return []


def _today_picks():
    """今天各策略真实锁的仓。没锁就带上它自己写的空仓理由。"""
    try:
        import real
    except Exception:
        return []
    out = []
    for sk in real.ROSTER:
        if sk.get("nobook"):
            continue
        p = real.latest_picks(sk["dir"])
        for x in (p.get("picks") or []):
            out.append({"kind": "pick", "id": f"{sk['id']}:{x.get('ticker')}",
                        "title": f"{x.get('name') or x.get('ticker')}",
                        "who": sk["n"], "date": p.get("date"),
                        "weight": x.get("weight"), "why": x.get("why") or "",
                        "src": f"{sk['dir']}/reports/{p.get('date')}/{p.get('file', '')}"})
        if not (p.get("picks") or []) and p.get("note"):
            out.append({"kind": "empty", "id": f"{sk['id']}:empty",
                        "title": f"{sk['n']} 这期空仓", "who": sk["n"],
                        "date": p.get("date"), "why": str(p["note"])[:200],
                        "src": f"{sk['dir']}/reports/{p.get('date')}/"})
    return out


def _pending():
    try:
        import briefing
        return briefing.pending_ingest()
    except Exception as e:
        return {"ok": False, "error": str(e)}


def _gaps_hot(limit=25):
    """🔴三方背离 + 强度高的缺口 —— 深研列的另一半。"""
    try:
        import kbreal
        idx = kbreal.gap_index()
    except Exception:
        return []
    rows = []
    for slug, gs in idx.items():
        for g in gs:
            if g.get("type") != "🔴":
                continue
            rows.append({**g, "slug": slug})
    rows.sort(key=lambda g: (-(int(g.get("strength") or 0)), g.get("as_of") or ""), reverse=False)
    rows.sort(key=lambda g: (g.get("as_of") or ""), reverse=True)
    return rows[:limit]


def _holding():
    try:
        import deskreal
        rb = deskreal.riskboard()
        return rb.get("exposure", []) if rb.get("ok") else []
    except Exception:
        return []


def pipeline():
    """六段流水线，每段都是真实工作项。"""
    B = beliefs()
    if not B.get("ok"):
        return {"ok": False, "error": B.get("error")}
    active = _sec(B, "Active")
    proposed = _sec(B, "Proposed")
    stale = [b for b in active if b["stale"]]
    unreviewed = [b for b in active if not b["review"]]
    pend = _pending()
    gaps = _gaps_hot()
    picks = _today_picks()
    hold = _holding()

    def bcard(b, stage, next_step):
        return {"id": b["id"], "stage": stage, "title": b["title"][:160],
                "conf": b["conf"], "tickers": b["tickers"],
                "evidence": b["evidence"], "against": b["against"],
                "last_evidence": b["last_evidence"], "stale": b["stale"],
                "review": b["review"], "gap": b["gap"], "page": b["page"],
                "src": "wiki/_BELIEFS.md", "next": next_step}

    stages = [
        {"n": "灵感", "note": "今天世界在聊什么（实时源）", "items": [],
         "src": "bridge/distill.py insight_daily()"},
        {"n": "初筛", "note": f"待人审的新信念 {len(proposed)} 条",
         "items": [bcard(b, "初筛", "人审：endorse / 补反方证据 / 退回") for b in proposed[:40]],
         "src": "wiki/_BELIEFS.md · Proposed"},
        {"n": "快研", "note": f"抓回来还没消化的材料 {pend.get('pending', 0)} 条",
         "items": [{"id": f"ing:{i}", "stage": "快研", "title": r["title"],
                    "date": r["date"], "type": r["type"], "conf_grade": r["conf"],
                    "src": "wiki/_PENDING_INGEST.md",
                    "next": "跑 ruku digest 抽事实入库"}
                   for i, r in enumerate(pend.get("rows", []))],
         "src": "wiki/_PENDING_INGEST.md"},
        {"n": "深研", "note": f"未人审 {len(unreviewed)} 条 + 🔴三方背离 {len(gaps)} 条",
         "items": [bcard(b, "深研", "补证据或找反方，够了再人审") for b in unreviewed[:20]] +
                  [{"id": g["id"], "stage": "深研", "title": g["title"],
                    "gap": g["id"], "page": g["slug"], "conviction": g["conviction"],
                    "strength": g["strength"], "as_of": g["as_of"],
                    "first_hand": g["first_hand"], "market_view": g["market_view"],
                    "investment": g["investment"], "tickers": g["tickers"],
                    "src": "wiki/_RESOLVED_GAPS.json",
                    "next": "一手与市场分歧还没收敛，找能证伪的那条数据"}
                   for g in gaps],
         "src": "wiki/_BELIEFS.md · _RESOLVED_GAPS.json"},
        {"n": "决策", "note": f"今天各策略锁的仓 {len([p for p in picks if p['kind']=='pick'])} 笔",
         "items": [{"id": p["id"], "stage": "决策", "title": p["title"], "who": p["who"],
                    "date": p["date"], "weight": p.get("weight"), "why": p["why"],
                    "empty": p["kind"] == "empty", "src": p["src"],
                    "next": "已锁仓，进跟踪" if p["kind"] == "pick" else "空仓也是决策，看它的理由站不站得住"}
                   for p in picks],
         "src": "各策略 reports/<date>/picks*.json"},
        {"n": "跟踪", "note": f"在仓 {len(hold)} 个标的 · 等新证据 {len(stale)} 条",
         "items": [{"id": f"hold:{h['ticker']}", "stage": "跟踪",
                    "title": f"{h['name']} {h['ticker']}", "gross": h["gross"],
                    "holders": h["holders"], "src": "riskboard 合并敞口",
                    "next": "盯它的退出条件"} for h in hold] +
                  [bcard(b, "跟踪", f"最新证据停在 {b['last_evidence']}，该找新证据或降级")
                   for b in stale[:20]],
         "src": "riskboard · _BELIEFS.md stale"},
    ]
    return {"ok": True, "as_of": time.strftime("%Y-%m-%d %H:%M"),
            "counts": B.get("counts", {}), "stages": stages,
            "note": "每张票都是真实工作项。点开是它的真实档案，不是摘要。"}


if __name__ == "__main__":
    d = pipeline()
    if not d.get("ok"):
        print("FAIL:", d.get("error"))
    else:
        print("账本:", d["counts"])
        for s in d["stages"]:
            print(f"{s['n']:4} {len(s['items']):>4} 张 · {s['note']}")
            for it in s["items"][:2]:
                print("      ·", (it.get("title") or "")[:70])
