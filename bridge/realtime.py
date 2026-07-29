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

def polymarket_hot(n=3):
    """预测市场 24h 成交额最高 → 今日全球在赌什么（宏观/事件热点）"""
    out = []
    try:
        url = ("https://gamma-api.polymarket.com/markets?closed=false"
               "&order=volume24hr&ascending=false&limit=12")
        ms = _get(url)
        ms = ms if isinstance(ms, list) else ms.get("data", [])
        for m in ms:
            q = (m.get("question") or m.get("title") or "").strip()
            v = m.get("volume24hr") or m.get("volumeNum") or 0
            try: v = float(v)
            except: v = 0
            if not q or v < 100000:
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
    """TMT Breakout（投研前沿 substack）最近文章标题 → 灵感条"""
    out = []
    try:
        titles = [t for t in _rss_titles("https://www.tmtbreakout.com/feed") if not _is_skippable(t)]
        for t in titles[:n]:
            out.append({
                "theme": _lead_entity(t), "topic": t[:56], "heat": 2, "fresh": True,
                "src": "TMT Breakout·前沿",
                "method": "来自 TMT Breakout（tmtbreakout.com）投研前沿 substack。"
                          "美股科技一线，Morning/EOD Wrap 覆盖当日要闻。",
            })
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
