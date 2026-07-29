#!/usr/bin/env python3.11
"""真实知识库读取层 —— wiki 页 / 缺口账本 / 源注册表。

知识库屏（ATLAS）过去画的是编的节点图。这里把它换成 ~/knowledge 里真有的东西：
  · 127 页行业 wiki + 489 页个股 wiki，带机读的 stance / cycle_stage / stock_map
  · 1887 条真实缺口（_RESOLVED_GAPS.json），🔴三方背离这类分级是原文标注
  · 8552 条来源注册（index/sources.jsonl），数据源机架的库存与时效以此为准

只读。frontmatter 用容错解析：这些页里有重复键、有几 KB 长的内联注释、
有中途换行的值，标准 YAML 解析器会直接抛或者静默取错，所以只认顶层标量与短列表。
"""
import json
import re
import time
from pathlib import Path

KB = Path.home() / "knowledge" / "knowledge"
WIKI = KB / "wiki"
_C = {}


def _cached(key, ttl, fn):
    hit = _C.get(key)
    if hit and time.time() - hit[0] < ttl:
        return hit[1]
    v = fn()
    _C[key] = (time.time(), v)
    return v


_SCALAR = re.compile(r'^([a-z_]+):\s*(.*)$')


def front_matter(text, want=None):
    """只取顶层标量与单行列表。重复键取第一次出现的（后面多半是历史残留）。"""
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end < 0:
        end = min(len(text), 8000)
    out = {}
    for line in text[3:end].splitlines():
        m = _SCALAR.match(line)
        if not m:
            continue
        k, v = m.group(1), m.group(2).strip()
        if k in out or (want and k not in want):
            continue
        if not v:                       # 后面是缩进块（source_refs 之类），跳过
            continue
        if v.startswith("[") and v.endswith("]"):
            out[k] = [x.strip().strip('"\'') for x in v[1:-1].split(",") if x.strip()]
        else:
            out[k] = v.strip('"\'')[:200]
    return out


WANT = {"industry", "company", "ticker", "market", "slug", "parent_sector", "stance",
        "stance_basis", "cycle_stage", "cycle_stage_code", "themes", "created",
        "updated", "last_verified", "review_by", "gap_summary", "confidence"}


def domain_of(sector):
    """parent_sector 写法很自由（TMT - AI基础设施 / 半导体存储、半导体设备-WFE、周期-有色…），
    归一到一小撮大类，否则图上会出现 57 个只有一页的「域」。"""
    s = (sector or "").strip()
    if not s:
        return "未分类"
    head = re.split(r"[-/ ]", s.replace("TMT", "TMT "), 1)[0].strip() or s
    for k in ("TMT", "半导体", "周期", "消费", "医药", "军工", "金融", "电力", "新能源",
              "有色", "化工", "机械", "地产", "农业", "光通信", "高端制造", "新基建"):
        if s.startswith(k) or head.startswith(k):
            return k
    return head[:6] or "未分类"


def _scan_dir(d, kind):
    rows = []
    if not d.is_dir():
        return rows
    for f in sorted(d.glob("*.md")):
        if f.name.startswith("_"):
            continue
        try:
            head = f.read_text(errors="ignore")[:6000]
        except OSError:
            continue
        fm = front_matter(head, WANT)
        eg = edges_of(head[:head.find("\n---", 3) if head.find("\n---", 3) > 0 else 6000])
        rows.append({
            "edges": eg,
            "kind": kind,
            "slug": fm.get("slug") or f.stem,
            "file": f.name,
            "title": fm.get("industry") or fm.get("company") or f.stem,
            "ticker": fm.get("ticker", ""),
            "market": fm.get("market", ""),
            "sector": fm.get("parent_sector", ""),
            "domain": domain_of(fm.get("parent_sector", "")),
            "stance": fm.get("stance", ""),
            "cycle": fm.get("cycle_stage_code", ""),
            "themes": fm.get("themes", [])[:6] if isinstance(fm.get("themes"), list) else [],
            "updated": (fm.get("updated") or "")[:10],
            "verified": (fm.get("last_verified") or "")[:10],
            "review_by": (fm.get("review_by") or "")[:10],
            "gap": fm.get("gap_summary", ""),
            "bytes": f.stat().st_size,
        })
    return rows


EDGE_KEYS = ("belongs_to", "upstream", "downstream", "customers", "suppliers",
             "competitors", "substitutes", "peers_in_industry", "key_stocks")
_LINK = re.compile(r"\[\[([^\]|]+)")


def edges_of(head):
    """抽 frontmatter 里的类型化连边（Obsidian wikilink 形态）。

    这些块是缩进列表，标量解析器看不见，所以单独扫：遇到 `key:` 开块，
    往下吃缩进行，直到下一个顶层键。
    """
    out = {}
    cur = None
    for line in head.splitlines():
        m = re.match(r"^([a-z_]+):\s*$", line)
        if m:
            cur = m.group(1) if m.group(1) in EDGE_KEYS else None
            continue
        if re.match(r"^[a-z_]+:", line):
            cur = None
            continue
        if cur and line.strip().startswith("-"):
            for t in _LINK.findall(line):
                out.setdefault(cur, []).append(t.split("/")[-1].strip())
    return out


def industry_stats():
    """每个行业 slug 真实有多少份原始材料、最近一份是什么时候。

    数据来自 sources.jsonl 的 industries[] 标注 —— 这正是 ATLAS 里
    「docs 篇数 / fresh 距今天数」两个字段该有的口径。
    """
    def go():
        p = KB / "index" / "sources.jsonl"
        docs, latest, grades = {}, {}, {}
        if not p.exists():
            return {}
        for line in p.open(errors="ignore"):
            if '"industries"' not in line:
                continue
            try:
                d = json.loads(line)
            except Exception:
                continue
            dt = (d.get("date") or "")[:10]
            g = d.get("confidence_grade") or "C"
            for slug in (d.get("industries") or []):
                docs[slug] = docs.get(slug, 0) + 1
                if dt:
                    latest[slug] = max(latest.get(slug, ""), dt)
                gg = grades.setdefault(slug, {"A": 0, "B": 0, "C": 0})
                gg[g if g in gg else "C"] += 1
        today = time.time()
        out = {}
        for slug, n in docs.items():
            lt = latest.get(slug, "")
            try:
                fresh = int((today - time.mktime(time.strptime(lt, "%Y-%m-%d"))) / 86400) if lt else 999
            except Exception:
                fresh = 999
            gg = grades.get(slug, {"A": 0, "B": 0, "C": 0})
            tot = max(1, sum(gg.values()))
            out[slug] = {"docs": n, "latest": lt, "fresh": fresh,
                         "conf": round((gg["A"] * 1.0 + gg["B"] * 0.7 + gg["C"] * 0.4) / tot, 2),
                         "grades": gg}
        return out
    return _cached("indstat", 900, go)


def wiki_list():
    """全部 wiki 页的目录。600 多个文件只读头部，整趟约 1 秒，缓存 10 分钟。"""
    def go():
        rows = _scan_dir(WIKI / "industries", "industry") + _scan_dir(WIKI / "stocks", "stock")
        gaps = gap_index()
        stat = industry_stats()
        for r in rows:
            r["gaps"] = len(gaps.get(r["slug"], []))
            s = stat.get(r["slug"])
            if s:
                r.update(docs=s["docs"], fresh=s["fresh"], conf=s["conf"], latest=s["latest"])
            else:
                # 页面在、原始材料没标到它头上 —— 这本身就是一个真实的缺口信号
                r.update(docs=0, fresh=999, conf=0, latest="")
        today = time.strftime("%Y-%m-%d")
        return {"as_of": today, "n": len(rows),
                "n_industry": sum(1 for r in rows if r["kind"] == "industry"),
                "n_stock": sum(1 for r in rows if r["kind"] == "stock"),
                "pages": rows}
    return _cached("wiki_list", 600, go)


def gap_index():
    """真实缺口账本，按 slug 分桶。🔴三方背离这类分级是页面里原文写的。"""
    def go():
        p = WIKI / "_RESOLVED_GAPS.json"
        out = {}
        if not p.exists():
            return out
        try:
            arr = json.loads(p.read_text(errors="ignore"))
        except Exception:
            return out
        for g in arr if isinstance(arr, list) else []:
            out.setdefault(g.get("slug", "?"), []).append({
                "id": g.get("id"), "type": g.get("type"), "type_name": g.get("type_name"),
                "strength": g.get("edge_strength"), "title": (g.get("title") or "")[:150],
                "as_of": g.get("as_of"), "conviction": g.get("conviction"),
                "tickers": g.get("tickers") or [],
                "first_hand": (g.get("first_hand") or "")[:400],
                "market_view": (g.get("market_view") or "")[:300],
                "investment": (g.get("investment") or "")[:300],
            })
        return out
    return _cached("gaps", 600, go)


def wiki_page(slug):
    """整页原文。只有老板钥匙能到这一步。"""
    for kind, d in (("industry", WIKI / "industries"), ("stock", WIKI / "stocks")):
        for f in (d / f"{slug}.md",):
            if f.exists():
                txt = f.read_text(errors="ignore")
                return {"ok": True, "kind": kind, "slug": slug, "file": str(f),
                        "bytes": len(txt), "fm": front_matter(txt[:6000], WANT),
                        "gaps": gap_index().get(slug, []),
                        "content": txt[:400000]}
    # slug 与文件名不一致时（少数页 frontmatter 的 slug 与文件名不同）再兜一次
    for r in wiki_list()["pages"]:
        if r["slug"] == slug:
            f = WIKI / ("industries" if r["kind"] == "industry" else "stocks") / r["file"]
            if f.exists():
                txt = f.read_text(errors="ignore")
                return {"ok": True, "kind": r["kind"], "slug": slug, "file": str(f),
                        "bytes": len(txt), "fm": front_matter(txt[:6000], WANT),
                        "gaps": gap_index().get(slug, []), "content": txt[:400000]}
    return {"ok": False, "error": "没有这一页"}


# ---------------------------------------------------------------- 源注册表
# channel 里混着一批 YYYY-MM-DD —— 那是 raw/<日期>/ 目录被当成 channel 的历史残留，
# 不是真的信源，归到「按日期入库」一类，不冒充成一个数据源。
CHANNEL_LABEL = {
    "Expert_Acecamp": ("AceCamp 专家纪要", "expert"),
    "expert_acecamp": ("AceCamp 专家纪要", "expert"),
    "acecamp": ("AceCamp 专家纪要", "expert"),
    "Analyst_Acecamp": ("AceCamp 卖方研报", "broker"),
    "analyst_acecamp": ("AceCamp 卖方研报", "broker"),
    "Expert_ThirdBridge": ("高临 Third Bridge", "expert"),
    "expert_thirdbridge": ("高临 Third Bridge", "expert"),
    "Expert_Market": ("市场流通纪要", "expert"),
    "expert_market": ("市场流通纪要", "expert"),
    "Analyst_Market": ("市场流通研报", "broker"),
    "analyst_market": ("市场流通研报", "broker"),
    "Earningscall": ("业绩说明会", "campus"),
    "earningscall": ("业绩说明会", "campus"),
    "纪要": ("会议纪要", "expert"),
    "filing": ("巨潮公告", "media"),
    "archive": ("历史归档", "archive"),
    "documents": ("飞书/微信入库", "media"),
    "unknown": ("未标注来源", "archive"),
}


def source_registry():
    """真实入库统计 —— 数据源机架的「今日入流 / 库存 / 时效」以此为准。"""
    def go():
        p = KB / "index" / "sources.jsonl"
        if not p.exists():
            return {"ok": False, "error": "没有 sources.jsonl"}
        chan, stype, grade, bydate = {}, {}, {}, {}
        n = 0
        latest = ""
        for line in p.open(errors="ignore"):
            if not line.strip():
                continue
            try:
                d = json.loads(line)
            except Exception:
                continue
            n += 1
            c = d.get("channel") or "unknown"
            if re.fullmatch(r"\d{4}-\d{2}-\d{2}", c):
                c = "_by_date"
            chan[c] = chan.get(c, 0) + 1
            stype[d.get("source_type") or "unknown"] = stype.get(d.get("source_type") or "unknown", 0) + 1
            grade[d.get("confidence_grade") or "?"] = grade.get(d.get("confidence_grade") or "?", 0) + 1
            dt = (d.get("date") or "")[:10]
            if dt:
                bydate[dt] = bydate.get(dt, 0) + 1
                latest = max(latest, dt)
        rows = []
        for c, cnt in sorted(chan.items(), key=lambda x: -x[1]):
            if c == "_by_date":
                label, bucket = ("按日期批量入库（早期无 channel 标注）", "archive")
            else:
                label, bucket = CHANNEL_LABEL.get(c, (c, "archive"))
            rows.append({"channel": c, "label": label, "bucket": bucket, "n": cnt})
        days = sorted(bydate.items(), reverse=True)[:30]
        return {"ok": True, "total": n, "latest": latest,
                "channels": rows, "types": stype, "grades": grade,
                "recent_days": [{"date": d, "n": v} for d, v in days],
                "last7": sum(v for d, v in days if d > time.strftime(
                    "%Y-%m-%d", time.localtime(time.time() - 7 * 86400)))}
    return _cached("srcreg", 900, go)


if __name__ == "__main__":
    w = wiki_list()
    print(f"wiki: {w['n']} 页（行业 {w['n_industry']} / 个股 {w['n_stock']}）")
    for r in w["pages"][:5]:
        print("  ", r["kind"], r["slug"], r["stance"], r["updated"], "gaps", r["gaps"])
    g = gap_index()
    print(f"缺口: {sum(len(v) for v in g.values())} 条，覆盖 {len(g)} 页")
    s = source_registry()
    print(f"来源注册: {s['total']} 条，最新 {s['latest']}，近 7 天 {s['last7']}")
    for r in s["channels"][:8]:
        print("  ", r["label"], r["n"])
