#!/usr/bin/env python3.11
"""ricciflow 实时热点源 — aihot（今日AI）+ polymarket（预测市场）
真抓，带 UA 和代理。被 distill 融进灵感流。"""
import json
import os
import ssl
import urllib.request
import urllib.parse

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36"
_CTX = ssl.create_default_context()
_CTX.check_hostname = False
_CTX.verify_mode = ssl.CERT_NONE
# 本机代理（.zshrc 7897）；bridge 由 launchd 起，env 里可能没有 → 显式带上
PROXY = os.environ.get("HTTPS_PROXY") or "http://127.0.0.1:7897"

def _get(url, timeout=10):
    handlers = []
    if PROXY:
        handlers.append(urllib.request.ProxyHandler({"http": PROXY, "https": PROXY}))
    handlers.append(urllib.request.HTTPSHandler(context=_CTX))
    op = urllib.request.build_opener(*handlers)
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    return json.load(op.open(req, timeout=timeout))

def aihot_today(n=3):
    """今日 AI 日报精选 → 灵感条（真引子）"""
    out = []
    try:
        d = _get("https://aihot.virxact.com/api/public/daily")
        date = d.get("date", "")
        for sec in d.get("sections", []):
            for it in sec.get("items", [])[:2]:
                title = (it.get("title") or "").strip()
                if not title:
                    continue
                # 关键词 = 标题里的主体（公司/模型名），取前一个实体
                theme = _lead_entity(title)
                out.append({
                    "theme": theme, "topic": title[:52],
                    "heat": 3, "fresh": True, "src": "aihot·今日AI",
                    "as_of": date,
                    "method": f"来自 aihot.virxact.com 今日 AI 日报（{date}）· {sec.get('label','')}。"
                              f"每天 08:00 抓全网 AI 动态 LLM 评分精选。",
                })
                if len(out) >= n:
                    return {"ok": True, "items": out, "as_of": date}
        return {"ok": True, "items": out, "as_of": date}
    except Exception as e:
        return {"ok": False, "error": f"{type(e).__name__}: {e}", "items": []}

# 体育/电竞/娱乐盘成交额常年很大，但对投研没有信息量 —— 灵感流要的是
# 宏观/政策/科技事件，所以按关键词剔掉。宁可少几条，不要拿 Dota 盘凑数。
POLY_SKIP = [
    " vs ", "dota", "csgo", "cs2", "league of legends", "lol ", "valorant",
    "nba", "nfl", "mlb", "nhl", "ufc", "soccer", "football", "premier league",
    "la liga", "serie a", "bundesliga", "champions league", "tennis", "golf",
    "f1 ", "formula 1", "olympic", "world cup", "super bowl", "esports",
    "grammy", "oscar", "emmy", "eurovision", "box office", "rotten tomatoes",
]


def _poly_noise(q):
    low = (q or "").lower()
    return any(w in low for w in POLY_SKIP)


def polymarket_hot(n=3):
    """预测市场 24h 成交额最高 → 今日全球在赌什么（宏观/事件热点）"""
    out = []
    try:
        url = ("https://gamma-api.polymarket.com/markets?closed=false"
               "&order=volume24hr&ascending=false&limit=40")   # 剔噪后仍要够 n 条
        ms = _get(url)
        ms = ms if isinstance(ms, list) else ms.get("data", [])
        for m in ms:
            q = (m.get("question") or m.get("title") or "").strip()
            v = m.get("volume24hr") or m.get("volumeNum") or 0
            try: v = float(v)
            except: v = 0
            if not q or v < 100000 or _poly_noise(q):
                continue
            out.append({
                "theme": _lead_entity(q), "topic": q[:56],
                "heat": 3 if v > 3e6 else 2, "fresh": True,
                "src": "polymarket·预测市场",
                "vol": round(v / 1e6, 1),
                "method": f"来自 Polymarket 预测市场 · 24h 成交额 ${v/1e6:.1f}M。"
                          f"真金白银在赌的事件，宏观/政策热点的领先指标。",
            })
            if len(out) >= n:
                break
        return {"ok": True, "items": out}
    except Exception as e:
        return {"ok": False, "error": f"{type(e).__name__}: {e}", "items": []}

_CN_ENTS = ["腾讯", "阿里", "字节", "百度", "华为", "小米", "月之暗面", "智谱", "DeepSeek",
            "Kimi", "混元", "通义", "文心", "OpenAI", "Anthropic", "Google", "Microsoft",
            "Meta", "Nvidia", "英伟达", "苹果", "Apple", "xAI", "Seagate", "Broadcom",
            "AMD", "Intel", "TSMC", "Micron", "SK Hynix", "Samsung"]
# 预测市场事件语义 → 中文题材
_EVENT_MAP = [
    (["fed", "interest rate", "rate cut", "rate hike"], "美联储利率"),
    (["election", "president", "prime minister"], "大选/政局"),
    (["bitcoin", "btc", "ethereum", "crypto"], "加密货币"),
    (["gdp", "recession", "inflation", "cpi"], "宏观经济"),
    (["nvidia", "openai", "gpt", "ai "], "AI 竞赛"),
    (["war", "ceasefire", "ukraine", "israel", "gaza"], "地缘冲突"),
    (["tariff", "trade"], "关税贸易"),
]
_SKIP_TITLES = ["morning wrap", "eod wrap", "roundup", "newsletter", "weekly", "daily digest",
                "podcast", "tmt breakout", "首页", "index"]

def _is_skippable(title):
    tl = title.lower().strip()
    return any(sk in tl for sk in _SKIP_TITLES) and len(title) < 30

def _title_subject(title):
    """从标题提炼「明确的公司/题材」：股票 ticker > 已知公司 > 事件语义。
    抽象长文标题（Fire Horse 之类）返回 None，不当热词塞进灵感流。"""
    import re
    # 1) 括号 ticker (STX)(KLAC) 或逗号列表 CDNS, CLS, KLAC —— 最强信号
    tks = re.findall(r"\(([A-Z]{2,5})\)", title)
    if tks: return tks[0]
    # 全大写 ticker 序列（≥2 个连续大写词表明是 ticker 列表）
    caps = re.findall(r"\b([A-Z]{2,5})\b", title)
    caps = [c for c in caps if c not in ("TMTB","TMT","EOD","CEO","CFO","AI","GPU","CPU",
            "IPO","SOTA","LLM","US","UK","EU","Q1","Q2","Q3","Q4","YoY","QoQ","API")]
    if len(caps) >= 1 and re.search(r"[A-Z]{2,5}[,\s].*[A-Z]{2,5}", title):
        return caps[0]                       # ticker 列表，取第一个
    if len(caps) == 1 and caps[0] not in ("The","This","New"):
        return caps[0]                       # 单个明确 ticker
    # 2) 已知公司
    for e in _CN_ENTS:
        if e.lower() in title.lower(): return e
    # 3) 事件语义
    for kws, label in _EVENT_MAP:
        if any(k in title.lower() for k in kws): return label
    # 4) 抽象标题 → 不产热词
    return None

def _lead_entity(title):
    import re
    tl = title.lower()
    # 先看已知公司实体
    for e in _CN_ENTS:
        if e.lower() in tl:
            return e
    # 事件语义映射（预测市场类）
    for kws, label in _EVENT_MAP:
        if any(k in tl for k in kws):
            return label
    # 英文：跳过 Will/The/A 等虚词，取首个有意义大写词
    stop = {"will", "the", "a", "an", "is", "are", "who", "what", "when", "how", "does", "do"}
    for m in re.finditer(r"\b([A-Z][A-Za-z0-9\-]{2,})\b", title):
        w = m.group(1)
        if w.lower() not in stop:
            return w
    # 中文：取标题前 8 字
    cn = re.sub(r"[^\u4e00-\u9fff]", "", title)
    return (cn[:8] if cn else title[:10])

def _rss_titles(url, timeout=12):
    import re
    handlers = []
    if PROXY:
        handlers.append(urllib.request.ProxyHandler({"http": PROXY, "https": PROXY}))
    handlers.append(urllib.request.HTTPSHandler(context=_CTX))
    op = urllib.request.build_opener(*handlers)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    raw = op.open(req, timeout=timeout).read().decode("utf-8", "ignore")
    titles = re.findall(r"<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</title>", raw)
    return [t.strip() for t in titles[1:] if t.strip()]   # [0] 是频道名

def tmtbreakout_today(n=2):
    """TMT Breakout → 抓标题里的公司/题材（EOD Wrap 里点名的 ticker 才是信号）"""
    out = []
    try:
        titles = _rss_titles("https://www.tmtbreakout.com/feed")
        seen = set()
        for t in titles:
            th = _title_subject(t)
            if not th or th in seen:
                continue
            seen.add(th)
            out.append({
                "theme": th, "topic": t[:56], "heat": 2, "fresh": True,
                "src": "TMT Breakout·前沿",
                "method": "来自 TMT Breakout 投研前沿 substack。标题点名的 ticker=当日焦点。",
            })
            if len(out) >= n:
                break
        return {"ok": True, "items": out}
    except Exception as e:
        return {"ok": False, "error": f"{type(e).__name__}: {e}", "items": []}

def substack_feed(url, n=2):
    """任意 substack RSS → 灵感条（数据源勾选里可配自定义 substack）"""
    try:
        titles = _rss_titles(url)
        host = urllib.parse.urlparse(url).netloc
        return {"ok": True, "items": [{
            "theme": _lead_entity(t), "topic": t[:56], "heat": 1, "fresh": True,
            "src": f"substack·{host.split('.')[0]}",
            "method": f"来自 {host} RSS。",
        } for t in titles[:n]]}
    except Exception as e:
        return {"ok": False, "error": str(e), "items": []}

_epoch_cache = {"at": 0, "data": None}
def epoch_models(n=2):
    """Epoch AI 公开数据集 → 最新发布的重要模型（权威 AI 前沿时间线，缓存30min）"""
    import csv, io, time as _t
    if _epoch_cache["data"] and _t.time() - _epoch_cache["at"] < 1800:
        return {"ok": True, "items": _epoch_cache["data"][:max(n,6)]}
    try:
        handlers = []
        if PROXY:
            handlers.append(urllib.request.ProxyHandler({"http": PROXY, "https": PROXY}))
        handlers.append(urllib.request.HTTPSHandler(context=_CTX))
        op = urllib.request.build_opener(*handlers)
        req = urllib.request.Request("https://epoch.ai/data/notable_ai_models.csv",
                                     headers={"User-Agent": UA})
        raw = op.open(req, timeout=15).read().decode("utf-8", "ignore")
        rows = list(csv.reader(io.StringIO(raw)))
        hdr = rows[0]
        di = next((i for i, c in enumerate(hdr) if "publication date" in c.lower()), None)
        mi = next((i for i, c in enumerate(hdr) if c.lower() == "model"), 0)
        oi = next((i for i, c in enumerate(hdr) if "organization" in c.lower()), None)
        dom = next((i for i, c in enumerate(hdr) if c.lower() == "domain"), None)
        data = [r for r in rows[1:] if di and len(r) > di and r[di]]
        data.sort(key=lambda r: r[di], reverse=True)
        out = []
        for r in data[:8]:
            model = r[mi]
            org = r[oi] if oi and len(r) > oi else ""
            out.append({
                "theme": org or _lead_entity(model), "topic": f"{model}（{r[di]} 发布）", "heat": 2,
                "fresh": True, "src": "Epoch AI·前沿模型", "model": model, "org": org, "date": r[di],
                "method": f"来自 Epoch AI 公开数据集 notable_ai_models（权威）。"
                          f"{r[di]} {org} 发布 {model}。追前沿模型=追算力/应用的领先指标。",
            })
        _epoch_cache["data"] = out; _epoch_cache["at"] = _t.time()
        return {"ok": True, "items": out[:max(n,6)]}
    except Exception as e:
        return {"ok": False, "error": f"{type(e).__name__}: {e}", "items": []}

import base64
HERE_RT = os.path.dirname(os.path.abspath(__file__))
def _src_cfg(sid):
    cf = os.path.join(HERE_RT, "src_config.json")
    if os.path.exists(cf):
        try: return json.load(open(cf)).get(sid, {})
        except: pass
    return {}

def reddit_hot(n=3):
    """Reddit OAuth client_credentials → 关注 subreddit 的热帖（散户情绪）"""
    c = _src_cfg("reddit")
    cid, sec = c.get("client_id"), c.get("secret")
    if not (cid and sec):
        return {"ok": False, "error": "未配 reddit key（数据源机架里填）", "items": []}
    subs = c.get("subs") or ["stocks", "wallstreetbets"]
    try:
        handlers = []
        if PROXY:
            handlers.append(urllib.request.ProxyHandler({"http": PROXY, "https": PROXY}))
        handlers.append(urllib.request.HTTPSHandler(context=_CTX))
        op = urllib.request.build_opener(*handlers)
        auth = base64.b64encode(f"{cid}:{sec}".encode()).decode()
        tok_req = urllib.request.Request("https://www.reddit.com/api/v1/access_token",
            data=b"grant_type=client_credentials",
            headers={"Authorization": f"Basic {auth}", "User-Agent": "ricciflow/0.1"})
        tok = json.load(op.open(tok_req, timeout=10))["access_token"]
        out = []
        for sub in subs[:2]:
            req = urllib.request.Request(f"https://oauth.reddit.com/r/{sub}/hot?limit=4",
                headers={"Authorization": f"Bearer {tok}", "User-Agent": "ricciflow/0.1"})
            d = json.load(op.open(req, timeout=10))
            for ch in d["data"]["children"][:3]:
                pd = ch["data"]
                out.append({"theme": _lead_entity(pd.get("title","")), "topic": pd.get("title","")[:56],
                    "heat": 2, "fresh": True, "src": f"reddit·r/{sub}",
                    "method": f"Reddit r/{sub} 热帖（{pd.get('ups',0)}↑）。散户情绪风向。"})
                if len(out) >= n: return {"ok": True, "items": out}
        return {"ok": True, "items": out}
    except Exception as e:
        return {"ok": False, "error": f"{type(e).__name__}: {e}", "items": []}

def substack_configured(n=3):
    """配置的 substack RSS → 深度长文线索（作者 + 文章标题，非热词）"""
    c = _src_cfg("substack")
    urls = c.get("urls") or []
    out = []
    NAMES = {"doomberg":"Doomberg", "bearcave":"Bear Cave", "mostlyborrowedideas":"MBI"}
    for u in urls[:3]:
        try:
            host = urllib.parse.urlparse(u).netloc.split(".")
            key = host[0] if host[0] != "www" else host[1]
            author = NAMES.get(key, key)
            titles = [x for x in _rss_titles(u) if not _is_skippable(x) and x.lower() != author.lower()]
            for t in titles[:1]:
                out.append({
                    "theme": author, "topic": f"新文：{t[:44]}", "heat": 1, "fresh": True,
                    "src": f"substack·深度",
                    "method": f"{author} 最新长文（{u}）。深度研究博客，作为阅读线索，非市场热词。",
                })
                if len(out) >= n:
                    return {"ok": True, "items": out}
        except Exception:
            pass
    return {"ok": True, "items": out}

def realtime_probe():
    """数据源卡带用：探活各实时源"""
    r = {}
    try:
        _get("https://aihot.virxact.com/api/public/daily", timeout=6)
        r["aihot"] = True
    except Exception:
        r["aihot"] = False
    try:
        _get("https://gamma-api.polymarket.com/markets?limit=1", timeout=6)
        r["polymarket"] = True
    except Exception:
        r["polymarket"] = False
    try:
        _rss_titles("https://www.tmtbreakout.com/feed", timeout=6)
        r["tmtbreakout"] = True
    except Exception:
        r["tmtbreakout"] = False
    try:
        _get("https://epoch.ai/data/notable_ai_models.csv", timeout=8) if False else None
        # epoch 是 CSV 非 JSON，用 HEAD 探
        h = urllib.request.build_opener(urllib.request.HTTPSHandler(context=_CTX))
        rq = urllib.request.Request("https://epoch.ai/data/notable_ai_models.csv",
                                    headers={"User-Agent": UA}, method="HEAD")
        if PROXY:
            h = urllib.request.build_opener(
                urllib.request.ProxyHandler({"http": PROXY, "https": PROXY}),
                urllib.request.HTTPSHandler(context=_CTX))
        h.open(rq, timeout=8)
        r["epoch"] = True
    except Exception:
        r["epoch"] = False
    return r

if __name__ == "__main__":
    import sys
    which = sys.argv[1] if len(sys.argv) > 1 else "all"
    if which in ("aihot", "all"):
        print("[aihot]", json.dumps(aihot_today(), ensure_ascii=False)[:400])
    if which in ("poly", "all"):
        print("[poly]", json.dumps(polymarket_hot(), ensure_ascii=False)[:400])
    if which in ("probe", "all"):
        print("[probe]", realtime_probe())
