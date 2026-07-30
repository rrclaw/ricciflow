#!/usr/bin/env python3.11
"""老板日报 —— 主体就是本机 summary 的当日报告，待办来自各账本的真实计数。

rr 定的：**summary 就是日报**。所以这里不再自己攒一份日报，而是把
`invest skills/summary/reports/<date>/summary-*.md` 按小节切开原文呈现。

两条纪律：
  1. **不拿昨天的冒充今天。** 今天没跑就说今天没跑，并给出最近一期是哪天。
     日报最怕的就是看着有内容、其实是隔夜的。
  2. **只切不改。** 小节标题与正文都是原文，网站不做提炼 —— 提炼由本地 Claude 跑。

待办也全是真数：审阅队列、待入库、停职名单、wiki 复核过期、入库断档天数。

只读。stdlib only。
"""
import json
import re
import time
from pathlib import Path

SK = Path.home() / "invest skills"
KB = Path.home() / "knowledge" / "knowledge"
SUMMARY = SK / "summary" / "reports"

_C = {}


def _cached(key, ttl, fn):
    hit = _C.get(key)
    if hit and time.time() - hit[0] < ttl:
        return hit[1]
    v = fn()
    _C[key] = (time.time(), v)
    return v


def _today():
    return time.strftime("%Y-%m-%d")


def _days_since(datestr):
    try:
        return int((time.time() - time.mktime(time.strptime(datestr, "%Y-%m-%d"))) / 86400)
    except Exception:
        return None


# ---------------------------------------------------------------- summary 日报
def summary_report():
    """当日 summary 原文分节。没有当日就报「今天还没跑」+ 最近一期日期。"""
    def go():
        if not SUMMARY.is_dir():
            return {"ok": False, "error": f"没有 summary 报告目录：{SUMMARY}"}
        days = sorted((d.name for d in SUMMARY.iterdir()
                       if d.is_dir() and re.fullmatch(r"\d{4}-\d{2}-\d{2}", d.name)), reverse=True)
        if not days:
            return {"ok": False, "error": "summary 一期都没有"}
        today = _today()
        latest = days[0]
        files = sorted((SUMMARY / latest).glob("summary-*.md"))
        if not files:
            return {"ok": False, "error": f"{latest} 目录里没有 summary-*.md"}
        f = files[-1]                     # 同日多版取最后一版（文件名带 HHMM）
        text = f.read_text(errors="ignore")

        # 切节：`## 标题`，正文原样保留
        secs, cur, buf = [], None, []
        for line in text.splitlines():
            m = re.match(r"^##\s+(.+?)\s*$", line)
            if m:
                if cur is not None:
                    secs.append({"title": cur, "body": "\n".join(buf).strip()})
                cur, buf = m.group(1), []
            else:
                buf.append(line)
        if cur is not None:
            secs.append({"title": cur, "body": "\n".join(buf).strip()})
        head = text.split("## ")[0].strip()

        return {"ok": True, "date": latest, "is_today": latest == today,
                "stale_days": _days_since(latest), "file": str(f),
                "bytes": len(text), "head": head[:4000],
                "sections": [{"title": s["title"], "body": s["body"][:6000],
                              "full_bytes": len(s["body"])} for s in secs],
                "recent_days": days[:10]}
    return _cached("summary", 300, go)


# ---------------------------------------------------------------- 待办
_BELIEF_LINE = re.compile(r"^-\s*\[\s*\]\s*(\S+)\s*(.*?)\|\s*(b_[0-9a-f]+)\s*\|\s*(.*)$")


def review_queue():
    """审阅队列：🔴OVERTURN / 🥶stale / 🆕未人审。每条带 belief id。"""
    def go():
        p = KB / "wiki" / "_REVIEW_QUEUE.md"
        if not p.exists():
            return {"ok": False, "error": f"没有审阅队列：{p}"}
        buckets = {}
        rows = []
        for line in p.read_text(errors="ignore").splitlines():
            m = _BELIEF_LINE.match(line.strip())
            if not m:
                continue
            flag, kind, bid, rest = m.group(1), m.group(2).strip(), m.group(3), m.group(4)
            key = flag + " " + (kind.split("(")[0].strip() or "")
            buckets[key] = buckets.get(key, 0) + 1
            rows.append({"flag": flag, "kind": kind, "id": bid, "txt": rest[:180]})
        return {"ok": True, "file": str(p), "total": len(rows),
                "buckets": buckets, "rows": rows[:40]}
    return _cached("rq", 300, go)


def pending_ingest():
    """待入库队列 ☐ 计数（markdown 表格，不是 DB）。"""
    def go():
        p = KB / "wiki" / "_PENDING_INGEST.md"
        if not p.exists():
            return {"ok": False, "error": f"没有待入库队列：{p}"}
        txt = p.read_text(errors="ignore")
        rows = []
        for line in txt.splitlines():
            if not line.strip().startswith("|") or "☐" not in line:
                continue
            c = [x.strip() for x in line.strip("|").split("|")]
            if len(c) >= 4:
                rows.append({"date": c[0], "title": c[1][:120], "type": c[2], "conf": c[3]})
        return {"ok": True, "file": str(p), "pending": txt.count("☐"),
                "done": txt.count("✅"), "rows": rows[:20]}
    return _cached("pending", 300, go)


def kb_freshness():
    """知识库入库断档：最新一份原始材料距今几天。"""
    def go():
        p = KB / "index" / "sources.jsonl"
        if not p.exists():
            return {"ok": False, "error": f"没有来源注册表：{p}"}
        latest = ""
        n = 0
        for line in p.open(errors="ignore"):
            if '"date"' not in line:
                continue
            try:
                d = json.loads(line)
            except Exception:
                continue
            n += 1
            dt = (d.get("date") or "")[:10]
            if dt:
                latest = max(latest, dt)
        return {"ok": True, "file": str(p), "total": n, "latest": latest,
                "stale_days": _days_since(latest)}
    return _cached("kbfresh", 900, go)


def wiki_overdue():
    """wiki 复核到期：frontmatter 的 review_by 已过今天的页数。"""
    def go():
        try:
            import kbreal
            pages = kbreal.wiki_list()["pages"]
        except Exception as e:
            return {"ok": False, "error": str(e)}
        today = _today()
        over = [p for p in pages if p.get("review_by") and p["review_by"] < today]
        over.sort(key=lambda p: p["review_by"])
        return {"ok": True, "n": len(over), "of": len(pages),
                "rows": [{"slug": p["slug"], "kind": p["kind"], "review_by": p["review_by"],
                          "title": p["title"]} for p in over[:20]]}
    return _cached("overdue", 900, go)


def suspended():
    """被真闸拦停/裁掉的策略 —— 从 real.py 的名册状态直接取，口径一致。"""
    def go():
        try:
            import real
            r = real.roster(with_equity=False)
        except Exception as e:
            return {"ok": False, "error": str(e)}
        bad = [{"id": x["id"], "n": x["n"], "label": x["status"]["label"],
                "why": x["status"]["why"]}
               for x in r["researchers"]
               if x["status"]["code"] in ("suspended", "fired", "pip", "dormant", "watch")]
        return {"ok": True, "n": len(bad), "rows": bad}
    return _cached("susp", 300, go)


# ---------------------------------------------------------------- 汇总
def briefing():
    """日报整包：summary 原文 + 真实待办 + riskboard 告警。"""
    out = {"as_of": time.strftime("%Y-%m-%d %H:%M"),
           "summary": summary_report(),
           "review_queue": review_queue(),
           "pending_ingest": pending_ingest(),
           "kb_freshness": kb_freshness(),
           "wiki_overdue": wiki_overdue(),
           "suspended": suspended()}
    try:
        import deskreal
        rb = deskreal.riskboard()
        out["riskboard"] = {k: rb.get(k) for k in ("ok", "date", "alerts", "nav", "error")}
    except Exception as e:
        out["riskboard"] = {"ok": False, "error": str(e)}
    return out


if __name__ == "__main__":
    b = briefing()
    s = b["summary"]
    if s.get("ok"):
        tag = "今日" if s["is_today"] else f"{s['stale_days']} 天前"
        print(f"summary {s['date']}（{tag}）· {len(s['sections'])} 节 · {s['bytes']//1024}KB")
        for x in s["sections"][:8]:
            print("   §", x["title"][:50])
    else:
        print("summary FAIL:", s.get("error"))
    print("审阅队列:", b["review_queue"].get("buckets"))
    print("待入库:", b["pending_ingest"].get("pending"), "已完成", b["pending_ingest"].get("done"))
    print("入库断档:", b["kb_freshness"].get("stale_days"), "天 · 最新", b["kb_freshness"].get("latest"))
    print("wiki 复核过期:", b["wiki_overdue"].get("n"), "/", b["wiki_overdue"].get("of"))
    print("非在岗策略:", [(x["n"], x["label"]) for x in b["suspended"].get("rows", [])])
    print("riskboard 告警:", len((b["riskboard"].get("alerts") or [])))
