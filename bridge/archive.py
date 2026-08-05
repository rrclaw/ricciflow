#!/usr/bin/env python3.11
"""档案室 —— 每个研究员每天写了什么，按日期归档。

原来这一屏叫「日报」，装的却是各研究员的全部当日产出，名不副实，而且和手机
那块重复了。重新分工：

  · 档案室（这里）= 全量留痕，按日期倒序，可以翻到任意一天，看那天每个人写了什么
  · 老板手机       = 只呈现最新一天

留痕是各策略自己落盘的文件，不是我另建的记录：锁仓 picks、当日 report、
盘后复盘、周度评审、summary 日报、因子日报……有什么算什么，一个不加。

日期从目录名和文件名里认，只认 YYYY-MM-DD。认不出来的文件不进档案 ——
宁可漏，不要把日期猜错，那会让「某天写了什么」整个失真。

只读。stdlib only。
"""
import re
import time
from pathlib import Path

SK = Path.home() / "invest skills"
_C = {}
_DATE = re.compile(r"(\d{4}-\d{2}-\d{2})")

# 哪些扩展名算「留痕」。二进制与缓存不算。
KEEP_EXT = {".md", ".json", ".csv", ".txt", ".jsonl"}
SKIP_DIR = {"_legacy", "backtests", "data_cache", "cache", "logs", ".venv",
            "__pycache__", "_archive", "node_modules", "snapshots"}

# 文件名 → 人话。认不出来的就照原名显示，不硬编分类。
KIND = [
    ("picks", "锁仓"), ("self_reflection", "盘后复盘"), ("retrospect", "盘后复盘"),
    ("postclose", "盘后复盘"), ("weekly_review", "周度复盘"), ("daily_review", "当日复盘"),
    ("premarket", "盘前"), ("open30", "开盘30分"), ("intraday", "盘中"),
    ("autolock", "锁仓简报"), ("conviction", "把握度留痕"), ("ranking", "排序留痕"),
    ("report", "研判正文"), ("summary", "日报正文"), ("nightly_log", "夜跑日志"),
    ("orders", "指令"), ("blotter", "成交流水"), ("nav", "净值"),
    ("holdings", "持仓"), ("candidates", "候选"), ("hunt", "扫描"),
    ("regime", "环境判定"), ("factors", "因子"), ("3run", "三轮独立判断"),
    ("feishu", "推送稿"), ("dispatch", "分发回执"), ("digest", "摘要"),
    ("hard_rails", "硬轨扫描"), ("mtm", "盯市"), ("brake", "刹车"),
]


def _kind(name):
    low = name.lower()
    for k, label in KIND:
        if k in low:
            return label
    return ""


def _roster():
    import real
    return real.ROSTER


def _scan_skill(sk):
    """一个策略的全部留痕，按日期分桶。"""
    base = SK / sk["dir"]
    out = {}
    if not base.is_dir():
        return out
    for sub in ("reports", "reports_v06", "output"):
        d = base / sub
        if not d.is_dir():
            continue
        for entry in d.iterdir():
            if entry.name.startswith(".") or entry.name in SKIP_DIR:
                continue
            if entry.is_dir():
                m = _DATE.fullmatch(entry.name)
                if not m:
                    continue
                day = m.group(1)
                for f in sorted(entry.iterdir()):
                    if f.is_file() and f.suffix in KEEP_EXT:
                        out.setdefault(day, []).append(_row(sk, f, day))
            elif entry.is_file() and entry.suffix in KEEP_EXT:
                # 扁平命名：2026-07-30_report.md / weekly_review_2026-07-26.md
                m = _DATE.search(entry.name)
                if not m:
                    continue
                out.setdefault(m.group(1), []).append(_row(sk, entry, m.group(1)))
    return out


def _row(sk, f, day):
    try:
        st = f.stat()
        size, mt = st.st_size, time.strftime("%H:%M", time.localtime(st.st_mtime))
    except OSError:
        size, mt = 0, ""
    return {"who": sk["n"], "who_id": sk["id"], "file": f.name,
            "kind": _kind(f.name), "bytes": size, "at": mt,
            "path": str(f.relative_to(SK))}


def index():
    """全库档案索引：日期 → 当天所有留痕。"""
    def go():
        days = {}
        for sk in _roster():
            for day, rows in _scan_skill(sk).items():
                days.setdefault(day, []).extend(rows)
        for d in days.values():
            d.sort(key=lambda r: (r["who"], r["file"]))
        order = sorted(days.keys(), reverse=True)
        return {"ok": True, "built_at": time.strftime("%Y-%m-%d %H:%M"),
                "n_days": len(order), "n_files": sum(len(v) for v in days.values()),
                "days": order, "by_day": days}
    return _cached("idx", 300, go)


def _cached(key, ttl, fn):
    hit = _C.get(key)
    if hit and time.time() - hit[0] < ttl:
        return hit[1]
    v = fn()
    _C[key] = (time.time(), v)
    return v


def day(date=""):
    """某一天的留痕，按研究员分组。不给日期就取最新有留痕的一天。"""
    idx = index()
    if not idx.get("ok"):
        return idx
    order = idx["days"]
    if not order:
        return {"ok": False, "error": "一天的留痕都没有"}
    d = date if date in idx["by_day"] else order[0]
    rows = idx["by_day"][d]
    by_who = {}
    for r in rows:
        by_who.setdefault(r["who"], []).append(r)
    today = time.strftime("%Y-%m-%d")
    return {"ok": True, "date": d, "is_today": d == today,
            "n_files": len(rows), "n_who": len(by_who),
            "who": [{"who": k, "id": v[0]["who_id"], "files": v} for k, v in
                    sorted(by_who.items(), key=lambda kv: -len(kv[1]))],
            "days": order[:120],
            "prev": next((x for x in order if x < d), ""),
            "next": next((x for x in reversed(order) if x > d), ""),
            "latest": order[0],
            "note": "都是各策略自己落盘的文件，不是另建的记录。"}


def read(rel, limit=120000):
    """读一份留痕原文。只允许 invest skills 目录内，且只读白名单扩展名。"""
    p = (SK / rel).resolve()
    try:
        p.relative_to(SK.resolve())
    except ValueError:
        return {"ok": False, "error": "越界路径，拒绝"}
    if p.suffix not in KEEP_EXT or not p.is_file():
        return {"ok": False, "error": f"不是可读的留痕文件：{rel}"}
    return {"ok": True, "path": rel, "bytes": p.stat().st_size,
            "text": p.read_text(errors="ignore")[:limit]}


if __name__ == "__main__":
    idx = index()
    print(f"档案 {idx['n_days']} 天 · {idx['n_files']} 份留痕")
    for d in idx["days"][:5]:
        rows = idx["by_day"][d]
        who = sorted({r["who"] for r in rows})
        print(f"  {d}  {len(rows):>3} 份 · {'、'.join(who)}")
    x = day()
    print(f"\n最新一天 {x['date']}（{x['n_who']} 人 / {x['n_files']} 份）")
    for w in x["who"][:4]:
        print("   ", w["who"], "·", "、".join(f["kind"] or f["file"] for f in w["files"][:6]))
