#!/usr/bin/env python3.11
"""NPC = 谐音化名角色 + 真实公开发言蒸馏。

rr 拍板的做法：**说的话是真的，说话的人是化名。**

  · 界面上只出现化名（老黄·黄仁训 / 山姆·奥特蛮 / 中鑫证券…），真人姓名与
    内资券商名一律不渲染 —— 真名只作内部检索键。谐音化名让它落在戏仿评论，
    不是冒充；顺带满足「外发不暴露内资券商名」那条红线。
  · 每条发言必须有出处：本机 KB 的文件路径，或本地例程搜来的 URL。
    **绝不编造引述。** 蒸馏只允许压缩原话，不允许推演「他会怎么说」。
  · 人设靠两层：写死的「一贯立场」骨架保证性格连贯，当期真实发言保证内容新。
    界面上分开标，别让人把归纳当成他今天说的。

时效闸（rr 点名要的）：
  ≤30 天  正常进对话池
  31-90   标「稍旧」并降权
  >90     不进对话池，只留在「历史立场」折叠区
  全都超 90 天 → 这个 NPC 显示「他最近没公开表态」，不拿旧话充数。

素材两个来源：
  1. 本机 KB（raw/*.md + sources.jsonl 的日期与 source_type）—— 业绩会/访谈算「一手」，
     研报/纪要里转述的算「转述」。
  2. 本地 Claude 例程 WebSearch 后落盘的 bridge/npc/<id>.json —— 桥是 stdlib，
     自己搜不了网，所以这一路必须由本地跑。没跑就没有，界面照实说。

只读 KB。stdlib only。
"""
import json
import re
import time
from pathlib import Path

KB = Path.home() / "knowledge" / "knowledge"
HERE = Path(__file__).parent
NPC_DIR = HERE / "npc"
CACHE = HERE / "cache" / "npc_quotes.json"

FRESH_OK, FRESH_OLD = 30, 90
SCAN_DAYS = 200          # 只扫最近这些天的原始材料，再往前的不进对话池

_C = {}


def _days(d):
    try:
        return int((time.time() - time.mktime(time.strptime(d, "%Y-%m-%d"))) / 86400)
    except Exception:
        return 9999


# ---------------------------------------------------------------- 化名册
# key = 内部检索键（真名，只用于在 KB 里找材料，永不渲染）
# 「一贯立场」= 从其长期一致的公开表态归纳的骨架，写死在这里，保证性格连贯。
ROSTER = [
    {"id": "huang", "alias": "老黄 · 黄仁训", "org": "某加速计算巨头", "sprite": "oldmoney",
     "keys": ["黄仁勋", "Jensen Huang", "Jensen"],
     "stance": ["算力永远不够，需求被低估的次数比高估多",
                "买得越多省得越多 —— 总拥有成本才是账",
                "对手永远差一代，而且差的那一代最难追"]},
    {"id": "altman", "alias": "山姆 · 奥特蛮", "org": "某闭源大模型公司", "sprite": "tech",
     "keys": ["Altman", "奥特曼", "山姆·奥尔特曼"],
     "stance": ["scaling 还没撞墙，先上规模再谈单位经济",
                "算力是唯一的硬约束，能签多少签多少",
                "AGI 的时间表一贯偏乐观"]},
    {"id": "musk", "alias": "马斯壳", "org": "某垂直整合帝国", "sprite": "quant",
     "keys": ["马斯克", "Musk", "Elon"],
     "stance": ["自建、垂直整合，供应链不假手于人",
                "时间表习惯性乐观，然后习惯性后延",
                "先做出来再谈economics"]},
    {"id": "amodei", "alias": "阿摩戴", "org": "某安全优先实验室", "sprite": "serenity",
     "keys": ["Amodei", "阿莫代", "Dario"],
     "stance": ["能力涨得比预想快，风险也是",
                "企业 API 优先于消费级",
                "对时间表给区间，不给单点"]},
    {"id": "nadella", "alias": "那德拉", "org": "某超大规模云", "sprite": "macro",
     "keys": ["Nadella", "纳德拉"],
     "stance": ["capex 要有纪律，机队必须可复用",
                "不为单一客户绑死架构",
                "把算力变成可计量的生意"]},
    {"id": "zuck", "alias": "小扎 · 扎克波格", "org": "某开源权重阵营", "sprite": "growth",
     "keys": ["扎克伯格", "Zuckerberg", "Meta 的"],
     "stance": ["开源权重是护城河，不是慈善",
                "自建集群不惜代价",
                "算力先囤上，用途后想"]},
    {"id": "hassabis", "alias": "哈撒比", "org": "某科学优先实验室", "sprite": "consume",
     "keys": ["Hassabis", "哈萨比斯", "Demis"],
     "stance": ["科学突破优先于产品化",
                "对时间表最保守的那个",
                "评测要能证伪才算数"]},
    {"id": "liang", "alias": "梁文峰", "org": "某开源权重挑战者", "sprite": "growth",
     "keys": ["梁文锋", "DeepSeek 创始人"],
     "stance": ["极致成本效率，架构上抠出来",
                "开源权重换生态位",
                "不追随定价，自己定"]},
    # 卖方机构：化名 + 风格骨架。真实观点来自 KB sell_side 通道，剥名后归到这里。
    {"id": "zhongxin", "alias": "中鑫证券", "org": "卖方", "sprite": "macro", "house": True,
     "keys": [], "stance": ["顺周期看多，喜欢喊拐点", "目标价先给，逻辑后补"]},
    {"id": "huatai2", "alias": "华太证券", "org": "卖方", "sprite": "quant", "house": True,
     "keys": [], "stance": ["只看边际变化，不谈估值中枢", "数据密度高，结论克制"]},
    {"id": "guosheng2", "alias": "国胜证券", "org": "卖方", "sprite": "serenity", "house": True,
     "keys": [], "stance": ["爱做深度，一篇写三万字", "产业链拆得细，节奏判断偏慢"]},
    {"id": "zhaoshang2", "alias": "招上证券", "org": "卖方", "sprite": "growth", "house": True,
     "keys": [], "stance": ["追热点，主题来了就出报告", "对催化敏感，对证伪迟钝"]},
]
BY_ID = {r["id"]: r for r in ROSTER}

# 渲染前的最后一道保险：真名换成**他自己的化名**，券商名换成中性说法。
# 换成化名而不是「某位业内人士」，读起来才是一个角色在说话，而且没撒谎 ——
# 化名与来源都明写在界面上。漏一个真名，整套定位就塌了，所以这里做大小写不敏感匹配。
BROKERS = ["中信建投", "中信证券", "中金公司", "华泰证券", "国盛证券", "招商证券",
           "广发证券", "兴业证券", "申万宏源", "海通证券", "国泰君安", "天风证券",
           "东吴证券", "民生证券", "长江证券", "浙商证券", "方正证券", "光大证券",
           "银河证券", "华创证券", "中金", "中信", "华泰", "国盛", "申万", "国君"]
# 常见拼写变体也要收，源文件里就有把 Altman 写成 altam 的
EXTRA_KEYS = {"altman": ["sam altman", "altam", "sam altam", "奥尔特曼"],
              "huang": ["jensen", "huang", "老黄"],
              "musk": ["elon"],
              "zuck": ["mark zuckerberg", "小扎"],
              "amodei": ["dario"],
              "hassabis": ["demis"],
              "nadella": ["satya"]}


def _redact_map():
    """真名 → 化名。长的先替换，避免「中信建投」被「中信」截断。"""
    pairs = []
    for r in ROSTER:
        if r.get("house"):
            continue
        short = r["alias"].split(" · ")[-1]
        for k in list(r["keys"]) + EXTRA_KEYS.get(r["id"], []):
            pairs.append((k, short))
    for b in BROKERS:
        pairs.append((b, "某中资券商"))
    pairs.sort(key=lambda x: -len(x[0]))
    return pairs


_RMAP = None


def redact(text):
    global _RMAP
    if _RMAP is None:
        _RMAP = _redact_map()
    out = str(text or "")
    for name, alias in _RMAP:
        if name.isascii():
            out = re.sub(re.escape(name), alias, out, flags=re.I)
        elif name in out:
            out = out.replace(name, alias)
    return out


def leaks(text):
    """自检：渲染前扫一遍，还能找到真名就是漏了。gate 会用这个。"""
    bad = []
    for name, _ in (_RMAP or _redact_map()):
        if name.isascii():
            if re.search(re.escape(name), text or "", re.I):
                bad.append(name)
        elif name in (text or ""):
            bad.append(name)
    return bad


# ---------------------------------------------------------------- KB 引述抽取
FIRST_HAND = {"earnings_call", "ir_call", "official_press_release", "company_meeting_note"}


def _index():
    """扫最近 SCAN_DAYS 天的原始材料，把点到名的句子摘出来。

    结果按 sources.jsonl 的 mtime 缓存 —— 那个文件一变说明有新材料入库。
    """
    def go():
        src = KB / "index" / "sources.jsonl"
        if not src.exists():
            return {"ok": False, "error": f"没有来源注册表：{src}"}
        cutoff = time.strftime("%Y-%m-%d", time.localtime(time.time() - SCAN_DAYS * 86400))
        docs = []
        for line in src.open(errors="ignore"):
            if '"date"' not in line:
                continue
            try:
                d = json.loads(line)
            except Exception:
                continue
            dt = (d.get("date") or "")[:10]
            if dt and dt >= cutoff and d.get("raw_path"):
                docs.append((dt, d.get("source_type") or "", d["raw_path"], d.get("title") or ""))
        hits = {r["id"]: [] for r in ROSTER}
        houses = [r["id"] for r in ROSTER if r.get("house")]
        for dt, stype, rel, title in docs:
            # 卖方观点：剥名后按 source 路径哈希稳定分给四家化名券商。
            # 分配是确定性的 —— 同一份研报永远归同一家，人设才不会飘。
            if stype == "sell_side" and houses:
                hid = houses[sum(ord(c) for c in rel) % len(houses)]
                if len(hits[hid]) < 40:
                    try:
                        head = (KB / rel).read_text(errors="ignore")[:4000]
                    except OSError:
                        head = ""
                    for sent in _lead_sentences(head):
                        hits[hid].append({"date": dt, "text": sent, "kind": "卖方观点",
                                          "source_type": stype, "path": rel, "title": title[:90]})
                        break
            f = KB / rel
            try:
                text = f.read_text(errors="ignore")
            except OSError:
                continue
            for r in ROSTER:
                if not r["keys"]:
                    continue
                for k in r["keys"]:
                    if k not in text:
                        continue
                    for sent in _sentences_with(text, k):
                        hits[r["id"]].append({
                            "date": dt, "text": sent,
                            "kind": "一手" if stype in FIRST_HAND else "转述",
                            "source_type": stype, "path": rel, "title": title[:90],
                        })
                    break
        for k in hits:
            hits[k].sort(key=lambda x: x["date"], reverse=True)
            hits[k] = hits[k][:40]
        return {"ok": True, "built_at": time.strftime("%Y-%m-%d %H:%M"),
                "scanned": len(docs), "cutoff": cutoff, "hits": hits}

    st = (KB / "index" / "sources.jsonl")
    stamp = str(int(st.stat().st_mtime)) if st.exists() else "0"
    if CACHE.exists():
        try:
            c = json.loads(CACHE.read_text())
            if c.get("_stamp") == stamp:
                return c
        except Exception:
            pass
    d = go()
    d["_stamp"] = stamp
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps(d, ensure_ascii=False))
    return d


_SPLIT = re.compile(r"(?<=[。！？!?;；\n])")


def _lead_sentences(text, lo=24, hi=180):
    """研报开头第一句像样的判断句。只取原句。"""
    for part in _SPLIT.split(text):
        s2 = part.strip().strip("|-# >*")
        if lo <= len(s2) <= hi and not s2.startswith(("http", "!")):
            yield s2


def _sentences_with(text, key, max_hits=3, lo=18, hi=200):
    """含关键词的句子，长度落在可读区间。只取原句，不改写。"""
    out = []
    for part in _SPLIT.split(text):
        s = part.strip().strip("|-# >*")
        if key not in s or not (lo <= len(s) <= hi):
            continue
        out.append(s)
        if len(out) >= max_hits:
            break
    return out


def _local_quotes(nid):
    """本地例程 WebSearch 后落盘的引述。桥自己搜不了网，没跑就没有。"""
    p = NPC_DIR / f"{nid}.json"
    if not p.exists():
        return []
    try:
        d = json.loads(p.read_text(errors="ignore"))
    except Exception:
        return []
    rows = d.get("quotes") if isinstance(d, dict) else d
    out = []
    for q in rows or []:
        if not q.get("url") or not q.get("date"):
            continue          # 没出处的一律不要 —— 那就是编的
        out.append({"date": q["date"][:10], "text": str(q.get("text") or "")[:300],
                    "kind": q.get("kind") or "公开发言", "url": q["url"],
                    "topic": q.get("topic") or ""})
    return out


def npc(nid):
    r = BY_ID.get(nid)
    if not r:
        return {"ok": False, "error": f"没有这个角色：{nid}"}
    idx = _index()
    kb_hits = (idx.get("hits") or {}).get(nid, []) if idx.get("ok") else []
    quotes = []
    for q in kb_hits:
        quotes.append({"date": q["date"], "text": redact(q["text"]), "kind": q["kind"],
                       # 文件名里也会带真名，一并脱敏后再给前端
                       "src": redact(q["path"]), "title": redact(q["title"]), "url": None})
    for q in _local_quotes(nid):
        quotes.append({"date": q["date"], "text": redact(q["text"]), "kind": q["kind"],
                       "src": None, "title": redact(q.get("topic", "")), "url": q["url"]})
    quotes.sort(key=lambda q: q["date"], reverse=True)
    for q in quotes:
        d = _days(q["date"])
        q["age"] = d
        q["tier"] = "fresh" if d <= FRESH_OK else ("old" if d <= FRESH_OLD else "archive")
    pool = [q for q in quotes if q["tier"] != "archive"]
    return {"ok": True, "id": nid, "alias": r["alias"], "org": r["org"],
            "sprite": r["sprite"], "house": bool(r.get("house")),
            "stance": r["stance"],
            "pool": pool[:12], "archive": [q for q in quotes if q["tier"] == "archive"][:12],
            "latest": quotes[0]["date"] if quotes else "",
            "silent": not pool,
            "note": "角色为化名，观点蒸馏自公开发言并附出处。骨架是一贯立场，不是他今天说的。"}


def roster():
    idx = _index()
    out = []
    for r in ROSTER:
        hits = (idx.get("hits") or {}).get(r["id"], []) if idx.get("ok") else []
        loc = _local_quotes(r["id"])
        latest = max([h["date"] for h in hits] + [q["date"] for q in loc], default="")
        fresh = sum(1 for h in hits if _days(h["date"]) <= FRESH_OLD) + \
                sum(1 for q in loc if _days(q["date"]) <= FRESH_OLD)
        out.append({"id": r["id"], "alias": r["alias"], "org": r["org"],
                    "sprite": r["sprite"], "house": bool(r.get("house")),
                    "latest": latest, "n_pool": fresh, "silent": fresh == 0})
    return {"ok": True, "as_of": time.strftime("%Y-%m-%d"),
            "scanned": idx.get("scanned", 0), "cutoff": idx.get("cutoff", ""),
            "npcs": out, "local_dir": str(NPC_DIR),
            "note": "化名角色。发言全部有出处，>90 天的不进对话池。"}


if __name__ == "__main__":
    d = roster()
    print(f"扫了最近 {d['scanned']} 份材料（{d['cutoff']} 起）")
    for x in d["npcs"]:
        print(f"  {x['alias']:14} 最近 {x['latest'] or '—':10} 可用 {x['n_pool']:>3} 条"
              + ("  ← 最近没公开表态" if x["silent"] else ""))
    for nid in ("huang", "altman"):
        n = npc(nid)
        print(f"\n== {n['alias']} · 池 {len(n['pool'])} 条")
        for q in n["pool"][:3]:
            print(f"   [{q['kind']}·{q['age']}d] {q['text'][:78]}")
