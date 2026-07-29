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
        srcs = len(set(x.get("src","").split("·")[0] for x in r.get("items",[])))
        # 只有抓到 ≥4 个源的完整结果才长缓存；残缺结果只缓 2 分钟等重试
        _insight_cache["data"] = r
        _insight_cache["at"] = _t.time() if srcs >= 4 else _t.time() - 1680
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
                "tmt": lambda: realtime.tmtbreakout_today(2),
                "sub": lambda: realtime.substack_configured(2),
                "reddit": lambda: realtime.reddit_hot(2)}
        with ThreadPoolExecutor(max_workers=5) as ex:
            futs = {k: ex.submit(f) for k, f in jobs.items()}
            for k in ["aihot", "poly", "tmt", "sub", "reddit"]:
                try:
                    r = futs[k].result(timeout=10)
                    if r.get("ok"): out["items"] += r["items"]
                except Exception: pass
    # ── 统一后处理：去重 / 引子补全 / 引子中文化 / 热度重分级 ──
    items = out["items"]
    # a) 同 theme 去重（保留热度高的）
    dedup = {}
    for it in items:
        k = it["theme"]
        if k not in dedup or (it.get("heat",1) > dedup[k].get("heat",1)):
            dedup[k] = it
    items = list(dedup.values())
    # b) 机构热搜词补引子：panel 没有就去 aihot/tmt 当天标题里交叉找
    all_topics = [x.get("topic","") for x in items if x.get("topic")]
    for it in items:
        if not it.get("topic"):
            hit = _cross_hook(it["theme"], all_topics)
            it["topic"] = hit or _plain_hook(it["theme"])
    # c) 英文引子提炼成中文一句
    for it in items:
        it["topic"] = _zh_hook(it.get("topic",""))
    # d) 热度重分级：跨源归一，别全 3 火
    for it in items:
        it["heat"] = _regrade_heat(it)
    out["items"] = items
    out["ok"] = True
    out["source"] = "机构周环比 + aihot + polymarket + TMT Breakout + substack"
    return out

def _cross_hook(theme, topics):
    """机构词的引子：在今日 aihot/tmt 标题里找含该词的句子"""
    for t in topics:
        if theme and theme in t:
            return t
    return ""

_THEME_GLOSS = {
    "超节点": "华为/国产算力互联架构，对标 NVLink 的整机柜超节点方案",
    "KIMI": "月之暗面 Kimi 大模型，长上下文/Agent 方向",
    "小米": "小米汽车/AI/端侧模型相关",
    "NPO": "近封装光学（Near-Package Optics），CPO 的过渡方案",
    "液冷": "AI 服务器散热，风冷转液冷的确定性升级",
    "光芯片磷化铟": "光模块上游 InP 衬底，国产替代窄口",
}
def _plain_hook(theme):
    return _THEME_GLOSS.get(theme, f"机构本周搜索快速升温，具体讨论待展开研究")

def _zh_hook(t):
    """英文引子提炼为中文要点（预测市场/英文标题）"""
    if not t: return t
    import re
    if not re.search(r"[a-zA-Z]", t): return t   # 已是中文
    tl = t.lower()
    rules = [
        ("fed decrease", "预测市场：押注美联储降息"),
        ("fed increase", "预测市场：押注美联储加息"),
        ("no change in fed", "预测市场：押注美联储利率不变"),
        ("interest rate", "预测市场：美联储利率决议"),
        ("prime minister", "预测市场：某国政局/大选"),
        ("president", "预测市场：大选/领导人"),
        ("recession", "预测市场：衰退概率"),
        ("bitcoin", "预测市场：比特币价格"),
    ]
    for kw, zh in rules:
        if kw in tl: return zh
    # 中英混合标题保留；纯英文截断加标注
    return t[:44] + "…（英文原题）" if len(t) > 44 else t

def _regrade_heat(it):
    """跨源热度归一：机构涨幅/预测市场成交额/新起 分级，避免全 3 火"""
    src = it.get("src","")
    if "机构" in src:
        r = it.get("ratio",1); fresh = it.get("fresh")
        return 3 if (r>=2.5 or (fresh and it.get("count",0)>=15)) else 2 if r>=1.6 else 1
    if "polymarket" in src:
        v = it.get("vol",0)
        return 3 if v>=5 else 2 if v>=2 else 1
    if "aihot" in src:
        return 2   # AI 日报统一 2 火（今日新但未必市场级）
    if "TMT" in src or "substack" in src:
        return 2 if it.get("theme","")[:1].isupper() else 1
    return it.get("heat",1)

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

# 话题 → 同义/相关词扩展（让新词/别名能命中语料里的真问题）
TOPIC_EXPAND = {
    "超节点": ["算力", "互联", "机柜", "服务器", "CoWoS", "NVLink", "光互联", "铜连接", "交换"],
    "KIMI": ["大模型", "推理", "训练", "Agent", "长上下文", "月之暗面", "算力", "token"],
    "小米": ["汽车", "端侧", "SoC", "手机", "AI眼镜"],
    "美联储利率": ["利率", "流动性", "降息", "加息", "宏观", "美债", "汇率"],
    "液冷": ["散热", "服务器", "数据中心", "温控", "冷板"],
    "光芯片磷化铟": ["磷化铟", "InP", "衬底", "光模块", "CW光源", "激光器"],
    "NPO": ["光互联", "CPO", "光模块", "封装", "近封装"],
    "光模块": ["光模块", "800G", "1.6T", "硅光", "EML", "CPO", "光互联"],
}
# 话题类型 → 决定用哪套「通用起手式」（AI模型/宏观/硬件公司/产业题材）
def _topic_type(theme):
    t = theme.lower()
    if any(k in theme for k in ["KIMI", "GPT", "模型", "大模型", "Claude", "混元", "智谱", "Agent"]) or "kimi" in t or "gpt" in t:
        return "ai_model"
    if any(k in theme for k in ["美联储", "利率", "通胀", "衰退", "汇率", "宏观", "大选", "政局", "关税", "地缘"]):
        return "macro"
    import re
    if re.fullmatch(r"[A-Z]{2,5}", theme):   # 纯 ticker
        return "company"
    if re.fullmatch(r"[A-Za-z][A-Za-z0-9\.\-]{2,}", theme):  # 英文公司名(Seagate/Doomberg)
        return "company"
    return "industry"

# 四套按话题类型的起手式：industry(产业) / ai_model(AI模型) / macro(宏观) / company(公司)
GENERIC_BY_TYPE = {
 "industry": {
    "现状定位": ["{t}到底是什么、在产业链哪个环节、当前规模和渗透率多少？", "谁是{t}这条链上绕不开的卡点，价值沉淀在哪个环节？"],
    "产能供给": ["{t}相关产能紧张还是过剩，扩产周期多长、瓶颈在哪？", "需求超预期时{t}谁的产能弹性最大、谁最先受益？"],
    "良率技术": ["{t}的核心技术壁垒是什么，良率/工艺决定国产替代能不能成吗？", "{t}有没有正在发生的技术路线切换，谁站对了？"],
    "价格盈利": ["{t}价格怎么传导到毛利再到净利，涨价10%的利润弹性多大？", "{t}最终能不能变成钱，钱被谁赚走？"],
    "竞争格局": ["{t}竞争格局是寡头还是分散，份额怎么分？", "买{t}该买哪个环节哪家公司，而不是买指数？"],
    "边际变化": ["{t}最近一季度的边际变化，环比/增速/二阶导往哪走？", "{t}股价隐含了多少预期，是否已充分定价？"],
    "证伪风险": ["什么信号出现说明{t}逻辑死了？列出下车信号。", "{t}最容易被证伪的假设是什么，最坏情况多坏？"],
 },
 "ai_model": {
    "现状定位": ["{t}的定位和目标场景是什么，对标谁、跑分/口碑如何？", "{t}背后是谁，商业模式是 API、订阅还是开源？"],
    "产能供给": ["{t}的训练/推理算力从哪来，卡够不够、成本结构如何？", "{t}的调用量/日活趋势，供给能不能跟上需求？"],
    "良率技术": ["{t}的技术路线（稠密/MoE、上下文、多模态）有什么独到？", "{t}相比上一代/竞品，能力边际提升在哪、护城河是什么？"],
    "价格盈利": ["{t}的 token 定价与推理成本，单位经济性算得过来吗？", "{t}怎么变现，谁为它付费、付费意愿多强？"],
    "竞争格局": ["{t}和 OpenAI/Anthropic/国产同行比，差在哪、强在哪？", "{t}的生态（开发者、应用、Agent）粘性如何？"],
    "边际变化": ["{t}最近发布/更新带来了什么边际变化，渗透率拐点到了吗？", "{t}的关注度是真实需求还是发布会营销？怎么区分？"],
    "证伪风险": ["什么信号说明{t}只是叙事、不是真需求？", "{t}最大的风险（合规、算力、被开源平替）是什么？"],
 },
 "macro": {
    "现状定位": ["{t}当前处在什么位置，市场共识预期是什么？", "{t}的关键决定变量有哪些，谁在主导？"],
    "产能供给": ["{t}的政策/供给侧信号最近怎么变，路径是鹰是鸽？", "{t}相关的资金面/流动性在收还是放？"],
    "良率技术": ["{t}的传导机制是什么，从政策到资产要几步？", "{t}历史上类似情形怎么演绎的，这次哪里不一样？"],
    "价格盈利": ["{t}对不同资产（股/债/汇/商品）的影响方向和幅度？", "{t}兑现或证伪，哪些板块受益、哪些受损？"],
    "竞争格局": ["{t}下资金会往哪些方向轮动，谁是最大受益方？", "{t}的一致预期打得有多满，预期差在哪？"],
    "边际变化": ["{t}最近的边际变化（数据、表态、盘面）指向什么？", "{t}的定价充分了吗，市场是抢跑还是滞后？"],
    "证伪风险": ["什么数据/事件出现会证伪{t}的当前判断？", "{t}的尾部风险和最坏情形是什么？"],
 },
 "company": {
    "现状定位": ["{t}是做什么的，主营构成和当前营收规模多少？", "{t}在产业链的位置和核心竞争力是什么？"],
    "产能供给": ["{t}的产能/产量/出货最近趋势，有没有扩产或瓶颈？", "{t}的订单能见度和交付节奏如何？"],
    "良率技术": ["{t}的技术/良率/产品迭代进展，相比对手领先还是落后？", "{t}有没有新产品/新客户带来结构性增量？"],
    "价格盈利": ["{t}的价格趋势、毛利率变化和盈利弹性如何？", "{t}的业绩预期，市场一致预测是多少、有没有预期差？"],
    "竞争格局": ["{t}的市场份额、主要对手和客户绑定深度？", "{t}相比同业，估值贵还是便宜，凭什么？"],
    "边际变化": ["{t}最近一季度的边际变化（订单/价格/份额）？", "{t}股价隐含了什么预期，兑现还是证伪临近？"],
    "证伪风险": ["什么信号说明{t}的逻辑破了？列出下车信号。", "{t}最大的风险（丢单、降价、技术替代）是什么？"],
 },
}
GENERIC_OPENERS = GENERIC_BY_TYPE["industry"]   # 兼容旧引用

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
    ttype = _topic_type(theme)
    # 宏观话题：本地语料是产业调研纪要，无宏观问答，硬匹配会串味 → 直接走宏观起手式
    if ttype == "macro":
        scored = []
    else:
        expand_terms = TOPIC_EXPAND.get(theme, [])
        scored = []
        for e in idx["entries"]:
            r = _relevance(theme, e)
            for ex in expand_terms:
                if ex in (e["q"] + e["title"]):
                    r += 3
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
        openers = GENERIC_BY_TYPE.get(ttype, GENERIC_BY_TYPE["industry"])
        for name, qs in openers.items():
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
