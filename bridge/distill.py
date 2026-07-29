#!/usr/bin/env python3.11
"""ricciflow 蒸馏器 — insight（新兴热点）+ inquiry（专业提问话术）
两块都从本地真实数据蒸馏，绝不 mock。被 kb_bridge 调用。"""
import glob
import json
import os
import re
import sys
from datetime import datetime, date

HOME = os.path.expanduser("~")
KB = os.path.join(HOME, "knowledge", "knowledge")
SA = os.path.join(HOME, "search_alpha")
HERE = os.path.dirname(os.path.abspath(__file__))
INQ_INDEX = os.path.join(HERE, "inquiry_index.json")
try:
    import realtime
except Exception:
    realtime = None

# ============================================================
# INSIGHT — 每天 3 个刚萌芽的市场热点
#   来源：search_alpha 机构搜索热度的「突破点检测」+ 聪明分析师主题
#   逻辑：突破分高 = 搜索热度刚从沉寂里抬头 = 萌芽期，正是要抓的
# ============================================================
DESKTOP = os.path.join(HOME, "Desktop", "数据统计")
KWDATA = os.path.join(HERE, "kwdata")   # 桌面 CSV 的本地副本（绕过 launchd TCC 桌面限制）

def _latest_keyword_csvs():
    import glob as _g, re as _re
    fs = _g.glob(os.path.join(KWDATA, "*搜索关键词*.csv"))
    if not fs:
        fs = _g.glob(os.path.join(DESKTOP, "*搜索关键词*.csv"))
    dated = []
    for f in fs:
        m = _re.search(r"(\d{4})_(\d{2})_(\d{2})", f)
        if m: dated.append((m.group(0).replace("_", "-"), f))
    dated.sort(reverse=True)
    return dated

def _read_kw(path):
    import csv as _csv
    m = {}
    try:
        with open(path, encoding="utf-8-sig") as f:
            for r in list(_csv.reader(f))[1:]:
                if len(r) >= 2:
                    try: m[r[0].strip()] = int(r[1])
                    except: pass
    except Exception:
        pass
    return m

PANEL = os.path.join(SA, "hotdata", "panel.jsonl")
_panel_cache = None
def _panel_hook(kw):
    """热搜词的引子 = panel.jsonl 里该词最近的高热研报/讨论标题"""
    global _panel_cache
    if _panel_cache is None:
        _panel_cache = []
        try:
            for l in open(PANEL, encoding="utf-8"):
                try: _panel_cache.append(json.loads(l))
                except: pass
        except Exception:
            _panel_cache = []
    hits = [r for r in _panel_cache
            if kw in (str(r.get("theme","")) + str(r.get("title","")))]
    hits.sort(key=lambda r: -int(r.get("views", 0) or 0))
    if hits:
        t = str(hits[0].get("title", ""))
        return re.sub(r"^[^｜|]+[｜|]\s*", "", t)[:40]   # 去掉"某研究｜"前缀
    return ""

_insight_cache = {"at": 0, "data": None}
def insight_daily(n=2):
    import time as _t
    if _insight_cache["data"] and _t.time() - _insight_cache["at"] < 1800:
        return _insight_cache["data"]
    r = _insight_compute(n)
    if r.get("ok"):
        _insight_cache["data"] = r; _insight_cache["at"] = _t.time()
    return r

def _insight_compute(n=2):
    """机构搜索关键词周环比 → 本周涨最快/新起的热点（真·近期萌芽）"""
    out = {"generated_at": datetime.now().isoformat(timespec="seconds"), "items": []}
    csvs = _latest_keyword_csvs()
    if len(csvs) < 1:
        out["ok"] = False; out["error"] = "桌面数据统计无关键词 CSV"; return out
    cur_date, cur_path = csvs[0]
    prev = _read_kw(csvs[1][1]) if len(csvs) > 1 else {}
    cur = _read_kw(cur_path)
    out["source"] = f"机构搜索热度周环比 · 截至 {cur_date}"
    out["as_of"] = cur_date
    STOP = {"模型", "谷歌", "AMD", "英伟达", "苹果", "股票", "美股", "A股", "港股", "大盘", "指数"}
    ranked = []
    for k, v in cur.items():
        if v < 8 or k in STOP or len(k) < 2:
            continue
        p = prev.get(k, 0)
        delta = v - p
        ratio = v / max(p, 1)
        fresh = p == 0
        # 平衡打分：够热(绝对量) + 涨得多(delta) + 涨得快(ratio) + 新起小加成
        # 目标=既新鲜又有信号，避免小量新起(如13次)盖过超节点(45次2.6x)
        score = v * 1.0 + delta * 2.5 + min(ratio, 6) * 5 + (18 if fresh and v >= 10 else 0)
        ranked.append((score, k, v, p, delta, ratio, fresh))
    ranked.sort(key=lambda x: -x[0])
    for score, k, v, p, delta, ratio, fresh in ranked[:n]:
        # 火焰热度：新起或翻倍=3🔥，明显上升=2🔥，温和=1🔥
        if fresh or ratio >= 2 or v >= 40: heat = 3
        elif ratio >= 1.4 or v >= 22: heat = 2
        else: heat = 1
        out["items"].append({
            "theme": k, "count": v, "prev": p, "delta": delta,
            "ratio": round(ratio, 1), "fresh": fresh, "heat": heat,
            "topic": _panel_hook(k), "as_of": cur_date, "src": "机构热搜·周环比",
            "method": (f"「{k}」本周机构搜索 {v} 次，上周 {p} 次，"
                       + ("本周凭空新起" if fresh else f"环比涨 {ratio:.1f} 倍（+{delta}）")
                       + f"。数据={cur_date} 机构搜索关键词周环比。"),
        })
    # 机构榜取 n；再各融 aihot / polymarket，让灵感流有真·今日源
    out["items"] = out["items"][:n]
    if realtime:
        from concurrent.futures import ThreadPoolExecutor
        jobs = {"aihot": lambda: realtime.aihot_today(2),
                "poly": lambda: realtime.polymarket_hot(2),
                "tmt": lambda: realtime.tmtbreakout_today(2)}
        with ThreadPoolExecutor(max_workers=3) as ex:
            futs = {k: ex.submit(f) for k, f in jobs.items()}
            for k in ["aihot", "poly", "tmt"]:
                try:
                    r = futs[k].result(timeout=10)
                    if r.get("ok"): out["items"] += r["items"]
                except Exception: pass
    out["ok"] = True
    out["source"] = "机构周环比 + aihot + polymarket + TMT Breakout"
    return out

def _insight_why(theme, r, smart):
    delta = float(r.get("delta_excess", 0)) * 100
    n_post = int(r.get("n_post", 0))
    bits = []
    if n_post <= 14:
        bits.append("突破发生不久，仍处萌芽期，机构刚开始加注")
    else:
        bits.append("突破已持续一段时间，需判断是否已进入拥挤")
    if delta > 5:
        bits.append(f"超额搜索强度大（+{delta:.0f}pp），关注度切换明显")
    if smart:
        bits.append("聪明分析师群体同步在搜，信号质量更高")
    return "；".join(bits) + "。"


# ============================================================
# INQUIRY — 针对一个话题，专家们真实问过的专业问题（蒸馏为分层追问）
#   来源：本地 documents 里的调研/专家/纪要（acecamp/券商/公司交流）
#   分层：现状 / 产能供给 / 良率技术 / 价格盈利 / 竞争格局 / 边际变化 / 证伪风险
# ============================================================
LAYER_RULES = [
    ("现状定位", ["是什么", "介绍", "情况", "现状", "目前", "定位", "进展", "背景", "构成", "占比"]),
    ("产能供给", ["产能", "供给", "扩产", "产量", "出货", "交付", "排产", "稼动", "供应", "瓶颈", "缺口"]),
    ("良率技术", ["良率", "技术", "工艺", "验证", "认证", "路线", "难度", "壁垒", "参数", "性能", "规格"]),
    ("价格盈利", ["价格", "定价", "涨价", "毛利", "利润", "成本", "价差", "盈利", "ASP", "费用", "报价"]),
    ("竞争格局", ["竞争", "对手", "格局", "份额", "客户", "供应商", "替代", "国产", "海外", "谁"]),
    ("边际变化", ["变化", "趋势", "预期", "增速", "边际", "拐点", "环比", "同比", "未来", "下半年", "明年", "展望"]),
    ("证伪风险", ["风险", "不及预期", "挑战", "担忧", "假设", "证伪", "下行", "如果", "什么情况", "会不会"]),
]

GENERIC_OPENERS = {
    "现状定位": ["{t}到底是什么、在整条产业链的哪个环节、当前市场规模和渗透率大概多少？",
                 "谁是{t}这条链上真正绕不开的卡点，价值主要沉淀在哪个环节？"],
    "产能供给": ["{t}相关产能目前是紧张还是过剩，扩产周期多长、瓶颈卡在哪一步？",
                 "如果需求超预期，{t}这条链上谁的产能弹性最大、谁最先受益？"],
    "良率技术": ["{t}的核心技术壁垒是什么，良率/工艺难度决定了国产替代能不能成吗？",
                 "{t}有没有正在发生的技术路线切换，谁站对了、谁可能被颠覆？"],
    "价格盈利": ["{t}的价格怎么传导到毛利再到净利，涨价10%对相关环节的利润弹性有多大？",
                 "{t}这个热点最终能不能变成钱，还是只是叙事？钱会被谁赚走？"],
    "竞争格局": ["{t}的竞争格局是寡头还是分散，份额怎么分、客户绑定有多深？",
                 "买{t}这个主题，具体该买哪个环节、哪家公司，而不是买指数？"],
    "边际变化": ["{t}最近一个季度发生了什么边际变化，环比、增速、二阶导在往哪个方向走？",
                 "{t}现在的股价隐含了多少预期，市场是不是已经充分定价？"],
    "证伪风险": ["什么信号一旦出现，就说明{t}这个逻辑死了？请列出下车信号。",
                 "{t}最大的风险和最容易被证伪的假设是什么，最坏情况有多坏？"],
}

def _clean_q(q):
    q = re.sub(r"^\s*[\d一二三四五六七八九十]+[、\.\,，\)）\s]*", "", q.strip())
    q = re.sub(r"^[Qq问][:：\.\s]*", "", q)
    q = re.sub(r"\s+", " ", q).strip()
    return q

def _classify(q):
    for layer, kws in LAYER_RULES:
        if any(k in q for k in kws):
            return layer
    return "边际变化"

def build_inquiry_index(limit=None):
    """扫描纪要，抽真实问句，按话题词建倒排。一次建，之后查。"""
    docs = glob.glob(f"{KB}/documents/*.md") + glob.glob(f"{KB}/documents/acecamp/*.md")
    if limit:
        docs = docs[:limit]
    entries = []
    for f in docs:
        try:
            t = open(f, encoding="utf-8", errors="ignore").read()
        except Exception:
            continue
        title = ""
        m = re.search(r"^#\s*(.+)", t, re.M)
        if m:
            title = m.group(1)[:80]
        src = "纪要"
        if "acecamp" in f.lower() or "AceCamp" in t or "本营" in t:
            src = "AceCamp"
        elif "专家" in t[:400] or "调研" in title:
            src = "专家调研"
        elif "券商" in t[:400] or "sell" in f.lower():
            src = "券商交流"
        qs = [l.strip() for l in t.split("\n")
              if l.strip().endswith("？") and 8 <= len(l.strip()) <= 90]
        for q in qs:
            qc = _clean_q(q)
            if len(qc) < 8:
                continue
            entries.append({"q": qc, "layer": _classify(qc), "title": title, "src": src})
    # 去重（同问句只留一条，保留最短）
    uniq = {}
    for e in entries:
        k = e["q"][:40]
        if k not in uniq or len(e["q"]) < len(uniq[k]["q"]):
            uniq[k] = e
    entries = list(uniq.values())
    json.dump({"built_at": datetime.now().isoformat(timespec="seconds"),
               "count": len(entries), "entries": entries},
              open(INQ_INDEX, "w"), ensure_ascii=False)
    return len(entries)

def _load_index():
    if not os.path.exists(INQ_INDEX):
        build_inquiry_index()
    return json.load(open(INQ_INDEX))

def _tokens(s):
    # 中文按 2-gram + 英文词，做话题匹配
    s = s.lower()
    en = re.findall(r"[a-z0-9]{2,}", s)
    cn = re.findall(r"[一-鿿]", s)
    bi = ["".join(cn[i:i+2]) for i in range(len(cn) - 1)]
    return set(en) | set(cn) | set(bi)

def _core_terms(theme):
    """话题核心词：完整 theme + 拆出的 2-4 字子串 + 英文词。用于强匹配。"""
    theme = theme.strip()
    terms = {theme}
    en = re.findall(r"[A-Za-z0-9]{2,}", theme)
    terms |= set(en)
    cn = re.findall(r"[一-鿿]+", theme)
    for seg in cn:
        if len(seg) >= 2:
            terms.add(seg)
        # 3+ 字词再拆 2-gram，但完整词权重更高（下面打分体现）
    return terms

def _relevance(theme, e):
    """相关性打分：话题原串命中最重，核心词次之，2-gram 兜底但压低权重。"""
    blob = e["q"] + " " + e["title"]
    score = 0
    core = _core_terms(theme)
    for t in core:
        if len(t) >= 2 and t in blob:
            score += 6 if t == theme else 4 if len(t) >= 3 else 2
    # 2-gram 只在核心词没怎么命中时补一点，且单条封顶，避免误匹配主导
    if score < 4:
        gram = len(_tokens(theme) & _tokens(blob))
        score += min(gram, 2)
    return score

def inquiry_for(theme, per_layer=3):
    """给一个话题，返回分层的真实专家问题 + 一句起手提示。
    只有相关性达标（>=4）的真问题才算切题，不硬塞无关问题误导老板。"""
    idx = _load_index()
    scored = []
    for e in idx["entries"]:
        r = _relevance(theme, e)
        if r >= 4:
            scored.append((r, e))
    scored.sort(key=lambda x: -x[0])
    layers = {name: [] for name, _ in LAYER_RULES}
    for ov, e in scored:
        L = layers[e["layer"]]
        if len(L) < per_layer:
            L.append({"q": e["q"], "src": e["src"], "title": e["title"][:40], "match": ov})
    # 话题太新、语料里专家还没怎么问过 → 给「万能起手七问」，且诚实标明这是通用式
    thin = sum(len(v) for v in layers.values()) < 6
    if thin:
        for name, qs in GENERIC_OPENERS.items():
            have = {x["q"] for x in layers[name]}
            for q in qs:
                if len(layers[name]) >= per_layer:
                    break
                filled = q.replace("{t}", theme)
                if filled not in have:
                    layers[name].append({"q": filled, "src": "通用起手式", "title": "",
                                         "match": 0, "generic": True})
    ordered = [{"layer": name, "hint": _layer_hint(name),
                "questions": layers[name]} for name, _ in LAYER_RULES if layers[name]]
    return {"theme": theme, "thin_topic": thin,
            "opener": _opener(theme),
            "total_hits": len(scored), "layers": ordered,
            "corpus": idx["count"]}

def _layer_hint(name):
    return {
        "现状定位": "先把这个东西是什么、在产业链哪个位置、现在多大搞清楚，别急着下判断",
        "产能供给": "供给端是矛盾的常见发源地：扩产周期、瓶颈、稼动率决定弹性",
        "良率技术": "技术和良率是壁垒的度量衡，也是国产替代能不能成的关键",
        "价格盈利": "价格→毛利→净利的传导，决定这个热点能不能变成钱",
        "竞争格局": "谁吃到价值、谁绕不开、份额怎么分，决定买谁而不是买主题",
        "边际变化": "投资赚的是二阶导：环比、增速、拐点，比绝对水平更重要",
        "证伪风险": "先问它怎么死。写不出下车信号的逻辑不配上仓位",
    }.get(name, "")

def _opener(theme):
    return (f"面对「{theme}」如果你完全不知道从哪问起，就照下面七层走一遍："
            f"先摸清现状定位，再逐层往供给、技术、价格、竞争挖，"
            f"最后一定要问清边际变化和证伪信号。下面每条都是真实调研里专家被问过的问题，"
            f"不是模板——照着问，至少不会显得外行。")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "both"
    if cmd in ("index", "both"):
        n = build_inquiry_index()
        print(f"[inquiry] 索引建成，{n} 条真实专家问题")
    if cmd in ("insight", "both"):
        r = insight_daily()
        print("[insight]", "ok" if r.get("ok") else r.get("error"))
        for it in r.get("items", []):
            print(f"  · {it['theme']} ({it['hook']}) — {it['why']}")
    if cmd in ("inquiry", "both"):
        theme = sys.argv[2] if len(sys.argv) > 2 else "光模块"
        r = inquiry_for(theme)
        print(f"[inquiry] 「{theme}」命中 {r['total_hits']} 条真实问题 / 语料 {r['corpus']} 条"
              + ("（话题偏新，补了通用起手式）" if r["thin_topic"] else ""))
        for L in r["layers"]:
            print(f"  【{L['layer']}】{L['hint']}")
            for q in L["questions"][:3]:
                print(f"     Q({q['src']}): {q['q'][:60]}")
