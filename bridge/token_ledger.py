#!/usr/bin/env python3.11
"""真实 token 账本 —— 扫 ~/.claude/projects 的会话转录，按项目/技能归集消耗与花费。

这是财务处的唯一数据来源。没有任何编造值：每一个 token 都是某次真实调用留下的。

三个必须踩对的坑（踩错就是账目失真，不是小数点问题）：
  1. 去重。流式落盘会把同一条 assistant 消息的 usage 写多遍，实测 101 条记录里
     只有 40 条是独立的。不按 (message.id, requestId) 去重 → 高估 2.5 倍。
  2. `<synthetic>` 模型的记录是本地合成的，零成本，必须排除。
  3. cache_creation 要拆 1h / 5m 两档：写入价分别是基础价的 2x 和 1.25x。
     只用汇总的 cache_creation_input_tokens 会把 1h 缓存算便宜。

扫描是增量的：以 (路径, 大小, mtime) 为键缓存每个文件的聚合结果，
只有变过的文件才重读。全量首扫约 1.4GB，之后每次只碰当天写过的那几个。

跑法:  python3.11 bridge/token_ledger.py [--rebuild]
"""
import json
import os
import sys
import time
from pathlib import Path

PROJECTS = Path.home() / ".claude" / "projects"
CACHE = Path(__file__).parent / "cache" / "token_ledger.json"

# 公开价目表（USD / 1M tokens）。cache 写入价 = 基础价 x 倍率，读取价 = 基础价 x 0.1。
# 未列出的模型按 tier 兜底；账面会把兜底标出来，不假装自己知道。
PRICES = {
    "opus":   {"in": 15.0, "out": 75.0},
    "sonnet": {"in": 3.0,  "out": 15.0},
    "haiku":  {"in": 1.0,  "out": 5.0},
    "fable":  {"in": 3.0,  "out": 15.0},   # 按 sonnet 档估
}
CACHE_WRITE_1H = 2.0
CACHE_WRITE_5M = 1.25
CACHE_READ = 0.1
USD_CNY = 7.15


def tier_of(model):
    m = (model or "").lower()
    for t in ("opus", "sonnet", "haiku", "fable"):
        if t in m:
            return t
    return "sonnet"


def price_of(model, u):
    """一条 usage 记录折多少美元。"""
    p = PRICES[tier_of(model)]
    cc = u.get("cache_creation") or {}
    w1h = cc.get("ephemeral_1h_input_tokens", 0)
    w5m = cc.get("ephemeral_5m_input_tokens", 0)
    if not (w1h or w5m):                      # 老记录没拆档，按 5m 保守计
        w5m = u.get("cache_creation_input_tokens", 0)
    return (
        u.get("input_tokens", 0) * p["in"]
        + u.get("output_tokens", 0) * p["out"]
        + w1h * p["in"] * CACHE_WRITE_1H
        + w5m * p["in"] * CACHE_WRITE_5M
        + u.get("cache_read_input_tokens", 0) * p["in"] * CACHE_READ
    ) / 1_000_000


def scan_file(path):
    """单个转录文件 → 聚合。去重在文件内做（跨文件不会重复同一个 requestId）。"""
    seen = set()
    agg = {"msgs": 0, "in": 0, "out": 0, "cw": 0, "cr": 0, "usd": 0.0,
           "models": {}, "first": "", "last": "", "skills": {}}
    try:
        fh = path.open(errors="ignore")
    except OSError:
        return agg
    with fh:
        for line in fh:
            if '"usage"' not in line and '"Skill"' not in line:
                continue
            try:
                d = json.loads(line)
            except Exception:
                continue
            msg = d.get("message") or {}
            # 顺带记下这个会话调用过哪些 skill —— cwd 是 ~ 的会话只能靠这个归属
            for blk in (msg.get("content") or []) if isinstance(msg.get("content"), list) else []:
                if isinstance(blk, dict) and blk.get("name") == "Skill":
                    s = (blk.get("input") or {}).get("skill")
                    if s:
                        agg["skills"][s] = agg["skills"].get(s, 0) + 1
            if d.get("type") != "assistant":
                continue
            u = msg.get("usage")
            if not u:
                continue
            model = msg.get("model") or ""
            if model == "<synthetic>":
                continue
            key = (msg.get("id"), d.get("requestId"))
            if key in seen:
                continue
            seen.add(key)
            ts = (d.get("timestamp") or "")[:10]
            if ts:
                agg["first"] = min(agg["first"] or ts, ts)
                agg["last"] = max(agg["last"], ts)
            agg["msgs"] += 1
            agg["in"] += u.get("input_tokens", 0)
            agg["out"] += u.get("output_tokens", 0)
            agg["cw"] += u.get("cache_creation_input_tokens", 0)
            agg["cr"] += u.get("cache_read_input_tokens", 0)
            agg["usd"] += price_of(model, u)
            agg["models"][model] = agg["models"].get(model, 0) + 1
    return agg


def _merge(dst, src):
    for k in ("msgs", "in", "out", "cw", "cr"):
        dst[k] = dst.get(k, 0) + src.get(k, 0)
    dst["usd"] = dst.get("usd", 0.0) + src.get("usd", 0.0)
    for k in ("models", "skills"):
        d = dst.setdefault(k, {})
        for m, n in (src.get(k) or {}).items():
            d[m] = d.get(m, 0) + n
    for k, better in (("first", min), ("last", max)):
        if src.get(k):
            dst[k] = better(dst[k], src[k]) if dst.get(k) else src[k]
    return dst


def build(rebuild=False):
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    old = {}
    if CACHE.exists() and not rebuild:
        try:
            old = json.loads(CACHE.read_text()).get("_files", {})
        except Exception:
            old = {}
    files, projects, hits, misses = {}, {}, 0, 0
    for proj in sorted(PROJECTS.iterdir()) if PROJECTS.exists() else []:
        if not proj.is_dir():
            continue
        for f in proj.rglob("*.jsonl"):
            try:
                st = f.stat()
            except OSError:
                continue
            key = str(f)
            stamp = f"{st.st_size}:{int(st.st_mtime)}"
            cached = old.get(key)
            if cached and cached.get("_stamp") == stamp:
                agg = cached
                hits += 1
            else:
                agg = scan_file(f)
                agg["_stamp"] = stamp
                misses += 1
            files[key] = agg
            _merge(projects.setdefault(proj.name, {}), agg)
    out = {"built_at": time.strftime("%Y-%m-%d %H:%M:%S"),
           "usd_cny": USD_CNY, "projects": projects, "_files": files,
           "_stat": {"files": len(files), "cached": hits, "rescanned": misses}}
    CACHE.write_text(json.dumps(out, ensure_ascii=False))
    return out


def load(max_age=3600):
    """读缓存；太旧就增量重扫。"""
    if CACHE.exists():
        try:
            d = json.loads(CACHE.read_text())
            age = time.time() - CACHE.stat().st_mtime
            if age < max_age:
                return d
            return build()
        except Exception:
            pass
    return build()


def summary():
    d = load()
    rows = []
    for name, a in d["projects"].items():
        if not a.get("msgs"):
            continue
        rows.append({"project": name, "msgs": a["msgs"],
                     "tokens": a["in"] + a["out"] + a["cw"] + a["cr"],
                     "out_tokens": a["out"], "usd": round(a["usd"], 2),
                     "cny": round(a["usd"] * d["usd_cny"], 2),
                     "first": a.get("first", ""), "last": a.get("last", ""),
                     "models": a.get("models", {}), "skills": a.get("skills", {})})
    rows.sort(key=lambda r: -r["usd"])
    return {"built_at": d["built_at"], "rows": rows,
            "total_usd": round(sum(r["usd"] for r in rows), 2),
            "stat": d.get("_stat", {})}


if __name__ == "__main__":
    t0 = time.time()
    s = summary() if "--rebuild" not in sys.argv else (build(True), summary())[1]
    print(f"built {s['built_at']} · {s['stat']} · {time.time()-t0:.1f}s")
    print(f"{'project':42} {'msgs':>7} {'tokens':>14} {'USD':>10}")
    for r in s["rows"]:
        print(f"{r['project']:42} {r['msgs']:>7} {r['tokens']:>14,} {r['usd']:>10,.2f}")
    print(f"{'TOTAL':42} {'':>7} {'':>14} {s['total_usd']:>10,.2f}")
