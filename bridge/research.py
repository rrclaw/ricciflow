#!/usr/bin/env python3.11
"""研究工作台 —— 老板投一个话题进来，这里把「本地已经有什么」摊开。

之前投稿箱是个死按钮：点了「投进流水线」，正文被丢掉，流水线里什么也不出现。
流水线本身又是账本的只读镜子，新话题不在账本里，自然进不去。

现在分两层：
  · 投稿落到 bridge/inbox.jsonl（老板自己的选题队列，本机、不进 git），
    刷新还在，进流水线「灵感」列。
  · 点开是工作台：把这个话题在本机能对上的东西全找出来 ——
    相关 wiki 页、已记录的三方背离缺口、已有信念（含反方）、原始材料，
    再配上从真实纪要问答里蒸馏的提问链，和该派给谁。

**工作台不生成观点。** 它只做四件事：找出来、对上号、列出该问什么、指出下一步该跑什么命令。
判断仍然是你和本地 Claude 的事 —— 网站只负责把料摆齐，别让你从零开始。

检索是本地词面匹配（中文 n-gram + 英文词），不接向量库：桥是 stdlib，
而且这里要的是「能对上号」，不是语义召回。对不上就说对不上。

只读 KB；唯一写入是自己的 inbox.jsonl。
"""
import json
import os
import re
import time
from pathlib import Path

HERE = Path(__file__).parent
# 队列文件可被环境变量改到别处 —— 测试必须写到临时文件，
# 不能把测试投稿灌进老板真实的选题队列（已经犯过一次）。
INBOX = Path(os.environ.get("RICCIFLOW_INBOX") or (HERE / "inbox.jsonl"))
KB = Path.home() / "knowledge" / "knowledge"

_STOP = {"的", "了", "和", "与", "或者", "以及", "如何", "怎么", "请问", "我们", "他们",
         "这个", "那个", "什么", "哪些", "现在", "应该", "可以", "进行", "对比", "研究",
         "跟踪", "分析", "是不是", "为什么", "the", "and", "for", "how", "what", "who",
         "which", "that", "with", "are", "is", "of", "to", "in", "on"}


# 含这些虚词的片段一律不算词 —— 「的壁垒」「本优」「化的」这种切出来只会添乱
_FILLER = set("的了和或是在也都就而与及被把让使对为其之所以能会要有")
_VOCAB = None
_VOCAB_TOK = None


def vocab():
    """本机语料自己的词表：wiki 标题/主题/slug + 缺口标题 + 信念标题。

    用它过滤 n-gram —— 「在开源模」这种滑窗垃圾不会出现在任何标题里，
    自动被筛掉；「开源模型」「光模块」这种真词留下。
    比硬塞一个分词库靠谱：词表就是这台机器自己的用词习惯。
    """
    global _VOCAB
    if _VOCAB is not None:
        return _VOCAB
    v = set()
    try:
        import kbreal
        for p in kbreal.wiki_list()["pages"]:
            v.add((p.get("title") or "").lower())
            v.add((p.get("slug") or "").lower())
            for t in (p.get("themes") or []):
                v.add(str(t).lower())
        for slug, gs in kbreal.gap_index().items():
            for g in gs:
                v.add((g.get("title") or "").lower())
    except Exception:
        pass
    try:
        import pipeline
        B = pipeline.beliefs()
        if B.get("ok"):
            for rows in B["sections"].values():
                for b in rows:
                    v.add((b.get("title") or "").lower())
    except Exception:
        pass
    global _VOCAB_TOK
    # 精确词表：主题词、slug、页标题本身。两字词只有出现在这里才算数，
    # 否则「成为」「阶段」这类会因为在某个长标题里出现过而蒙混过关。
    _VOCAB_TOK = {x for x in v if x and len(x) <= 8}
    _VOCAB = " \n ".join(x for x in v if x)
    return _VOCAB


def terms_of(text, limit=24):
    """从一段自然语言里抠出检索词。

    中文没有分词库可用（桥是 stdlib），所以对每个汉字串取 2-5gram，
    再用本机语料词表过一遍，只留真出现过的词。
    """
    text = str(text or "")
    out = {}
    for w in re.findall(r"[A-Za-z][A-Za-z0-9\-\.]{2,}", text):
        lw = w.lower()
        if lw not in _STOP:
            out[lw] = out.get(lw, 0) + 3
    # 正向最大匹配：从左往右，每次取「词表里出现过的最长片段」，然后跳到它后面。
    # 不这么做的话，滑窗会同时产出「大模型供应」「模型供应商」「供应」这类重叠碎片 ——
    # 碎片一多，「供应」两个字就能把一堆不相干的个股页拉进来。
    V = vocab()
    for chunk in re.findall(r"[一-鿿]{2,}", text):
        i = 0
        while i < len(chunk):
            hit = None
            for n in range(min(6, len(chunk) - i), 1, -1):
                g = chunk[i:i + n]
                if g in _STOP or (_FILLER & set(g)):
                    continue
                if g in V and (len(g) >= 3 or g in (_VOCAB_TOK or ())):
                    hit = g
                    break
            if hit:
                out[hit] = out.get(hit, 0) + len(hit) * 2
                i += len(hit)
            else:
                i += 1
    if not out:                                    # 一个都对不上：说明这话题本机没沾过
        for chunk in re.findall(r"[一-鿿]{2,6}", text):
            if chunk not in _STOP:
                out[chunk] = len(chunk)
    ranked = sorted(out.items(), key=lambda kv: -kv[1])
    return [t for t, _ in ranked[:limit]]


def _score(text, terms):
    """命中了哪些词、得几分。返回 (分, 命中词)。"""
    low = str(text or "").lower()
    hit, sc = [], 0
    for t in terms:
        if t in low:
            hit.append(t)
            sc += len(t)
    return sc, hit


# ---------------------------------------------------------------- 投稿箱
def submit(text, who=None, tag=""):
    text = str(text or "").strip()
    if len(text) < 8:
        return {"ok": False, "error": "太短了，至少写 8 个字 —— 这条是要进队列的，不是随手一按"}
    # 同样的话题重复投 = 队列里出现几个一模一样的框。指回原来那条，别再开一张。
    norm = re.sub(r"\s+", "", text)
    for r in inbox(9999)["rows"]:
        if re.sub(r"\s+", "", r.get("text") or "") == norm:
            return {"ok": False, "dup": r["id"], "at": r["at"],
                    "error": f"这条 {r['at']} 已经投过了（{r['id']}），没有重复开票"}
    row = {"id": "sub_" + hex(abs(hash(text + str(time.time()))))[2:10],
           "at": time.strftime("%Y-%m-%d %H:%M"), "date": time.strftime("%Y-%m-%d"),
           "text": text[:2000], "who": who or [], "tag": tag or "",
           "status": "open"}
    with INBOX.open("a") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")
    return {"ok": True, "row": row}


def inbox(limit=50):
    """append-only 文件按 id 收敛到最后一条 —— 改过状态的那条会写两遍，
    不收敛的话同一个话题会在流水线里出现两个一模一样的框。"""
    latest = {}
    order = []
    if INBOX.exists():
        for line in INBOX.read_text(errors="ignore").splitlines():
            if not line.strip():
                continue
            try:
                d = json.loads(line)
            except Exception:
                continue
            if d["id"] not in latest:
                order.append(d["id"])
            latest[d["id"]] = d            # 后写的覆盖先写的
    rows = [latest[i] for i in reversed(order)]
    return {"ok": True, "n": len(rows), "rows": rows[:limit], "file": str(INBOX)}


def _find(sid):
    for r in inbox(9999)["rows"]:
        if r["id"] == sid:
            return r
    return None


def set_status(sid, status):
    """改状态 = 追加一条新记录（append-only，改不动历史）。"""
    r = _find(sid)
    if not r:
        return {"ok": False, "error": "没有这条投稿"}
    r = {**r, "status": status, "at": time.strftime("%Y-%m-%d %H:%M")}
    with INBOX.open("a") as f:
        f.write(json.dumps(r, ensure_ascii=False) + "\n")
    return {"ok": True, "row": r}


# ---------------------------------------------------------------- 工作台
def workbench(text, sid=""):
    """把这个话题在本机能对上的东西全找出来。找不到就说找不到。"""
    terms = terms_of(text)
    out = {"ok": True, "id": sid, "text": text[:2000], "terms": terms,
           "as_of": time.strftime("%Y-%m-%d %H:%M")}

    # 1) 相关 wiki 页 —— 本机已经建过页的，直接接着看，别重开一摊
    try:
        import kbreal
        pages = kbreal.wiki_list()["pages"]
        hits = []
        for p in pages:
            blob = " ".join([p.get("title", ""), p.get("slug", ""),
                             p.get("sector", ""), " ".join(p.get("themes") or [])])
            sc, h = _score(blob, terms)
            if sc >= 4:
                hits.append({**{k: p[k] for k in
                                ("slug", "kind", "title", "stance", "docs", "fresh", "gaps")},
                             "score": sc, "hit": h[:5]})
        # 只靠一个词命中、且一份材料都没有的个股页，是噪声不是线索
        # （「infra」能撞上任何一家沾边公司）。行业页和有料的页优先。
        def _rank(x):
            solid = x["kind"] == "industry" or x["docs"] > 0
            return (0 if solid else 1, -x["score"], -x["docs"])
        strong = [h for h in hits if h["kind"] == "industry" or h["docs"] > 0
                  or len(h["hit"]) >= 2]
        hits = strong if strong else hits
        hits.sort(key=_rank)
        out["wiki"] = hits[:10]
    except Exception as e:
        out["wiki"] = []
        out["wiki_err"] = str(e)

    # 2) 已记录的分歧 —— 一手与市场吵起来的地方，往往就是研究该切进去的地方
    try:
        import kbreal
        gaps = []
        for slug, gs in kbreal.gap_index().items():
            for g in gs:
                blob = " ".join([g.get("title", ""), g.get("first_hand", ""),
                                 g.get("market_view", ""), g.get("investment", "")])
                sc, h = _score(blob, terms)
                if sc >= 6:
                    gaps.append({**g, "slug": slug, "score": sc, "hit": h[:5]})
        gaps.sort(key=lambda g: (-g["score"], g.get("as_of") or ""))
        out["gaps"] = gaps[:8]
    except Exception as e:
        out["gaps"] = []
        out["gaps_err"] = str(e)

    # 3) 已有信念 —— 有没有人已经在赌这件事？正反证据各几条？
    try:
        import pipeline
        B = pipeline.beliefs()
        bs = []
        if B.get("ok"):
            for sec, rows in B["sections"].items():
                for b in rows:
                    sc, h = _score(b["title"], terms)
                    if sc >= 6:
                        bs.append({**b, "score": sc, "hit": h[:5]})
        bs.sort(key=lambda b: -b["score"])
        out["beliefs"] = bs[:8]
    except Exception as e:
        out["beliefs"] = []
        out["beliefs_err"] = str(e)

    # 4) 原始材料 —— 手上到底有没有料，有多新
    docs, latest = [], ""
    src = KB / "index" / "sources.jsonl"
    if src.exists():
        for line in src.open(errors="ignore"):
            if '"title"' not in line:
                continue
            try:
                d = json.loads(line)
            except Exception:
                continue
            sc, h = _score(d.get("title") or "", terms)
            if sc >= 6:
                dt = (d.get("date") or "")[:10]
                latest = max(latest, dt)
                docs.append({"title": (d.get("title") or "")[:110], "date": dt,
                             "type": d.get("source_type") or "", "score": sc,
                             "grade": d.get("confidence_grade") or "", "hit": h[:4]})
    docs.sort(key=lambda x: (x["date"] or "", x["score"]), reverse=True)
    out["docs"] = docs[:12]
    out["docs_total"] = len(docs)
    out["docs_latest"] = latest

    # 5) 该问什么 —— 从真实纪要问答里蒸馏，不是我编的问题模板
    try:
        import distill
        key = terms[0] if terms else text[:8]
        for t in terms[:5]:                       # 拿命中最强的几个词轮着试
            q = distill.inquiry_for(t)
            if q.get("layers") and any(l.get("qs") for l in q["layers"]):
                key = t
                break
        out["inquiry"] = {"anchor": key, **q}
    except Exception as e:
        out["inquiry"] = {"error": str(e)}

    # 6) 该派给谁 —— 按各策略自己写的信条与市场匹配
    try:
        import real
        who = []
        for sk in real.ROSTER:
            blob = " ".join([sk["style"], sk["market"], sk["motto"], " ".join(sk["creed"])])
            sc, h = _score(blob, terms)
            if sc >= 4:
                who.append({"id": sk["id"], "n": sk["n"], "market": sk["market"],
                            "style": sk["style"], "score": sc, "hit": h[:4]})
        who.sort(key=lambda x: -x["score"])
        out["who"] = who[:5]
    except Exception:
        out["who"] = []
    if not out["who"]:
        # 名册里全是选股策略，产业/基础设施类话题匹配不上是正常的，说清楚别让人以为坏了
        out["who_note"] = ("名册里没有对口的 —— 那 16 位都是选股策略，"
                           "这条更像产业/基建研究，路线是先建 wiki 页再往下落标的。")

    # 7) 下一步 —— 具体到该跑哪条命令，别停在「建议深入研究」
    slug = out["wiki"][0]["slug"] if out["wiki"] else None
    out["next"] = [
        {"do": "先读已有的页，别重开一摊",
         "how": f"知识库里打开 {slug}" if slug else "本地还没有对得上的页 —— 这本身是结论：这块是空白",
         "why": f"命中 {len(out['wiki'])} 页" if out["wiki"] else "0 页命中"},
        {"do": "看分歧切进去",
         "how": f"工作台下方 {len(out['gaps'])} 条已记录分歧，挑一条能证伪的",
         "why": "一手与市场吵起来的地方，才有预期差"},
        {"do": "补料",
         "how": "把找到的纪要/研报投进 ruku：python3.11 -m scripts.harness_cli ingest <文件>",
         "why": (f"本机已有 {out['docs_total']} 份沾边材料，最新 {out['docs_latest']}"
                 if out["docs_total"] else "本机一份沾边材料都没有，得先弄料")},
        {"do": "立成信念，才好被证伪",
         "how": "python3.11 -m scripts.beliefs propose \"<一句话观点>\"",
         "why": "写进信念账本才会进流水线、才会被 staleness 追着问"},
    ]
    return out


if __name__ == "__main__":
    import sys
    q = " ".join(sys.argv[1:]) or "开源模型占比提升，云厂商 routing 与成本优化谁做得好"
    d = workbench(q)
    print("检索词:", "、".join(d["terms"][:12]))
    print(f"wiki {len(d['wiki'])} 页 · 分歧 {len(d['gaps'])} 条 · 信念 {len(d['beliefs'])} 条 · "
          f"材料 {d['docs_total']} 份（最新 {d['docs_latest']}）")
    for p in d["wiki"][:5]:
        print(f"   页 {p['slug']:24} docs={p['docs']:>4} 命中 {'/'.join(p['hit'][:3])}")
    for g in d["gaps"][:3]:
        print(f"   分歧 {g['id']:14} {g['title'][:56]}")
    for b in d["beliefs"][:3]:
        print(f"   信念 {b['id']:16} 证据{b['evidence']}/反方{b['against']} {b['title'][:44]}")
    iq = d.get("inquiry") or {}
    print("提问锚点:", iq.get("anchor"), "· 层数", len(iq.get("layers") or []))
    print("该派给:", [w["n"] for w in d["who"]])
