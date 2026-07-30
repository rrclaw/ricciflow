#!/usr/bin/env python3.11
"""ricciflow kb-bridge — 本地知识库只读桥（老板钥匙鉴权）

只绑 127.0.0.1:8331。只读 ~/knowledge，唯一写入是本目录的 carried.jsonl（搬运登记）。
公网 demo 永远不接这里；浏览器本地打开游戏时自动探测。

跑法:  python3 bridge/kb_bridge.py
首次运行自动生成老板钥匙（6 位数字，保险库转盘用），打印在终端并存 boss.key。

零依赖：stdlib http.server。
"""
import hmac
import http.server
import json
import os
import random
import re
import time
from pathlib import Path
from urllib.parse import urlparse, parse_qs

KB = Path.home() / "knowledge" / "knowledge"
HERE = Path(__file__).parent
KEY_FILE = HERE / "boss.key"
CARRY_FILE = HERE / "carried.jsonl"
PORT = 8331

try:
    import distill
except Exception as _e:
    distill = None
    print("[warn] distill 模块未就绪:", _e)

def _gen_key():
    return "".join(random.SystemRandom().choice("0123456789") for _ in range(10))
if not KEY_FILE.exists() or len(KEY_FILE.read_text().strip()) < 10:
    KEY_FILE.write_text(_gen_key())          # 公网可达 → 至少 10 位
BOSS_KEY = KEY_FILE.read_text().strip()

# 暴力破解防线：每 IP 连错 5 次封 15 分钟
FAILS = {}          # ip -> [count, banned_until]
def ip_ok(ip):
    c = FAILS.get(ip)
    if not c: return True
    return not (c[0] >= 5 and time.time() < c[1])
def ip_fail(ip):
    c = FAILS.setdefault(ip, [0, 0])
    c[0] += 1
    if c[0] >= 5:
        c[1] = time.time() + 900
        print(f"[SEC] {ip} 连错 5 次，封禁 15 分钟")
def ip_pass(ip):
    FAILS.pop(ip, None)

# ---------------- 楼宇分拣规则（只读虚拟打标，不改动知识库本体） ----------------
BROKER_HINTS = ["研报", "点评", "sell", "sellside", "sell_side", "券商", "首次覆盖", "深度报告",
                "morgan", "goldman", "ubs", "citi", "jpm", "中金", "中信", "华泰", "国盛",
                "招商", "广发", "兴业", "OW", "Overweight", "评级"]
CAMPUS_HINTS = ["纪要", "调研", "专家", "交流", "电话会", "路演", "访谈", "expert", "call",
                "透露", "反馈", "会议纪要"]
MEDIA_HINTS = ["公告", "财联社", "cninfo", "巨潮", "新闻", "报道", "wsj", "theinformation",
               "the information", "semianalysis", "reuters", "bloomberg", "预告", "季度报告",
               "年度报告", "announcement", "media", "推送"]

def classify(meta):
    st = str(meta.get("source_type", "")).lower()
    if st in ("sell_side", "sellside", "broker"): return "broker"
    if st in ("expert", "company_call", "expert_call"): return "campus"
    if st in ("announcement", "media", "news"): return "media"
    blob = " ".join(str(meta.get(k, "")) for k in
                    ("title", "raw_path", "source", "kb_name", "scope", "content_type", "event_type")).lower()
    def hit(hints): return sum(1 for h in hints if h.lower() in blob)
    scores = {"broker": hit(BROKER_HINTS), "campus": hit(CAMPUS_HINTS), "media": hit(MEDIA_HINTS)}
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "archive"

def guess_broker(meta):
    m = re.search(r"(中金|中信建投|中信|华泰|国盛|招商|广发|兴业|申万|海通|国君|国泰君安|东吴|民生|天风|长江|浙商|方正|光大|银河|安信|华创|东方证券|Morgan Stanley|Goldman|UBS|JPM|Citi|BofA|Jefferies|Bernstein|Wells ?Fargo)",
                  str(meta.get("title", "")) + " " + str(meta.get("raw_path", "")), re.I)
    return m.group(1) if m else ""

def tickers_str(t):
    """tickers 字段形态百出：str/JSON字符串/list[str]/list[dict]，全部驯成串"""
    if not t: return ""
    if isinstance(t, str):
        if t.startswith("["):
            try: t = json.loads(t.replace("'", '"'))
            except Exception: return t.strip("[]' ")
        else: return t
    out = []
    for x in (t if isinstance(t, list) else [t]):
        if isinstance(x, dict):
            out.append(str(x.get("sec_name") or x.get("ticker") or x.get("code") or ""))
        else:
            out.append(str(x))
    return ",".join(v for v in out if v)

# ---------------- 装载 ----------------
DOCS = {}

def load():
    docs = {}
    src = KB / "index" / "sources.jsonl"
    if src.exists():
        for line in src.read_text(errors="ignore").splitlines():
            try: m = json.loads(line)
            except Exception: continue
            did = m.get("source_id") or m.get("id")
            if not did: continue
            docs[did] = {
                "id": did, "title": m.get("title", "")[:120], "date": m.get("date", ""),
                "building": classify(m), "broker": guess_broker(m),
                "company": tickers_str(m.get("tickers")),
                "conf": m.get("confidence_grade", "C"), "layer": "raw",
                "_path": str(KB / m["raw_path"]) if m.get("raw_path") else "",
            }
    for f in (KB / "normalized").rglob("*.json"):
        try: m = json.loads(f.read_text(errors="ignore"))
        except Exception: continue
        did = m.get("doc_id")
        if not did or did in docs: continue
        docs[did] = {
            "id": did, "title": (m.get("title") or "")[:120], "date": m.get("date", "") or (m.get("ingested_at", "") or "")[:10],
            "building": classify(m), "broker": guess_broker(m),
            "company": m.get("sec_name") or tickers_str(m.get("tickers")),
            "conf": "B", "layer": "normalized", "_path": str(f), "_inline": bool(m.get("content") or m.get("snippet")),
        }
    return docs

def doc_content(d):
    p = Path(d.get("_path", ""))
    if d.get("layer") == "normalized" and p.exists():
        m = json.loads(p.read_text(errors="ignore"))
        return (m.get("content") or m.get("snippet") or m.get("summary") or "")[:200000]
    if p.exists() and p.suffix == ".md":
        return p.read_text(errors="ignore")[:200000]
    return "(原文文件未找到: 注册表有账但文件不在位)"

# ---------------- HTTP ----------------
class H(http.server.BaseHTTPRequestHandler):
    def _send(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _auth(self):
        ip = (self.headers.get("CF-Connecting-IP") or
              self.headers.get("X-Forwarded-For", "").split(",")[0].strip() or
              self.client_address[0])
        if not ip_ok(ip):
            return False
        q = parse_qs(urlparse(self.path).query)
        tok = (self.headers.get("Authorization", "").replace("Bearer ", "") or
               (q.get("key") or [""])[0])
        ok = hmac.compare_digest(tok, BOSS_KEY)
        if ok: ip_pass(ip)
        elif tok: ip_fail(ip)
        return ok

    def do_OPTIONS(self):
        self._send(200, {})

    def log_message(self, *a): pass

    def _norm(self):
        if self.path.startswith("/kbapi/"):
            self.path = self.path[len("/kbapi"):]

    def do_GET(self):
        self._norm()
        u = urlparse(self.path); q = parse_qs(u.query)
        if u.path == "/api/health":
            return self._send(200, {"ok": True, "docs": len(DOCS), "auth": self._auth(),
                                    "distill": distill is not None})
        if u.path == "/api/source_peek":
            sid = (q.get("id") or [""])[0]
            try:
                import realtime
                if sid in ("baostock", "pytdx", "efinance", "pywencai"):
                    # 免费接口：真去拉一条最近数据，活着还是死了当场见分晓
                    import freeapi
                    return self._send(200, freeapi.probe(
                        sid, force=(q.get("force") or ["0"])[0] == "1"))
                if sid == "arr_mcp":
                    import arrmcp
                    return self._send(200, arrmcp.peek(7))
                if sid == "epoch":
                    return self._send(200, realtime.epoch_models(6))
                if sid == "aihot":
                    return self._send(200, realtime.aihot_today(6))
                if sid == "polymarket":
                    return self._send(200, realtime.polymarket_hot(6))
                if sid == "tmtbreakout":
                    return self._send(200, {"ok": True, "items":
                        [{"topic": t} for t in realtime._rss_titles("https://www.tmtbreakout.com/feed")[:6]]})
                return self._send(200, {"ok": False, "error": "该源无 peek"})
            except Exception as e:
                return self._send(200, {"ok": False, "error": str(e)})
        if u.path == "/api/arr":
            # 自建 ARR Tracker 的 MCP：工具目录 / 白名单序列 / 单条序列
            try:
                import arrmcp
                what = (q.get("what") or ["tools"])[0]
                if what == "tools":
                    return self._send(200, {"ok": True, "tools": [
                        {"name": t.get("name"), "title": t.get("title"),
                         "desc": (t.get("description") or "")[:220]} for t in arrmcp.tools()]})
                if what == "series_list":
                    return self._send(200, {"ok": True, "series": arrmcp.series_list()})
                if what == "series":
                    sid = (q.get("id") or [""])[0]
                    if not sid:
                        return self._send(400, {"ok": False, "error": "缺 id"})
                    return self._send(200, {"ok": True, **arrmcp.series(sid)})
                return self._send(200, {"ok": False, "error": "what 只认 tools/series_list/series"})
            except Exception as e:
                return self._send(200, {"ok": False, "error": str(e)})
        if u.path == "/api/realtime_probe":
            try:
                import realtime
                return self._send(200, {"ok": True, **realtime.realtime_probe()})
            except Exception as e:
                return self._send(200, {"ok": False, "error": str(e)})
        if u.path == "/api/insight":
            # 灵感流：公司门面，客人也能看（真实 search_alpha 新兴主题）
            if not distill: return self._send(200, {"ok": False, "error": "distill 未就绪"})
            try:
                n = int((q.get("n") or ["3"])[0])
                return self._send(200, distill.insight_daily(n))
            except Exception as e:
                return self._send(200, {"ok": False, "error": str(e)})
        if not self._auth():
            return self._send(401, {"error": "老板钥匙不对。保安请你去前台喝茶"})
        if u.path == "/api/inquiry":
            # 提问蒸馏：读内部纪要，需老板钥匙
            theme = (q.get("theme") or [""])[0]
            if not theme: return self._send(400, {"error": "缺 theme"})
            if not distill: return self._send(200, {"ok": False, "error": "distill 未就绪"})
            try:
                r = distill.inquiry_for(theme)
                r["ok"] = True
                return self._send(200, r)
            except Exception as e:
                return self._send(200, {"ok": False, "error": str(e)})
        if u.path == "/api/roster":
            # 真实研究员名册：人设引自 doctrine 原文，战绩来自平仓账本与 playbookex
            try:
                import real
                return self._send(200, real.roster(
                    with_series=(q.get("series") or ["0"])[0] == "1"))
            except Exception as e:
                return self._send(200, {"ok": False, "error": str(e)})
        if u.path == "/api/finance":
            # 真实薪资：扫 ~/.claude/projects 的 usage，按项目目录归属到研究员
            try:
                import real
                return self._send(200, real.finance())
            except Exception as e:
                return self._send(200, {"ok": False, "error": str(e)})
        if u.path in ("/api/wiki", "/api/wiki_page", "/api/srcreg"):
            # 真实知识库：613 页 wiki + 1887 条缺口 + 8552 条来源注册
            try:
                import kbreal
                if u.path == "/api/wiki":
                    return self._send(200, kbreal.wiki_list())
                if u.path == "/api/srcreg":
                    return self._send(200, kbreal.source_registry())
                slug = (q.get("slug") or [""])[0]
                if not slug:
                    return self._send(400, {"ok": False, "error": "缺 slug"})
                return self._send(200, kbreal.wiki_page(slug))
            except Exception as e:
                return self._send(200, {"ok": False, "error": str(e)})
        if u.path == "/api/buildings":
            inv = {}
            for d in DOCS.values():
                inv[d["building"]] = inv.get(d["building"], 0) + 1
            return self._send(200, inv)
        if u.path == "/api/docs":
            b = (q.get("building") or [""])[0]
            broker = (q.get("broker") or [""])[0].lower()
            comp = (q.get("company") or [""])[0].lower()
            kw = (q.get("q") or [""])[0].lower()
            limit = int((q.get("limit") or ["60"])[0])
            out = [
                {k: v for k, v in d.items() if not k.startswith("_")}
                for d in DOCS.values()
                if (not b or d["building"] == b)
                and (not broker or broker in d["broker"].lower())
                and (not comp or comp in (d["company"] + d["title"]).lower())
                and (not kw or kw in d["title"].lower())
            ]
            out.sort(key=lambda x: x["date"] or "", reverse=True)
            return self._send(200, {"total": len(out), "docs": out[:limit]})
        if u.path.startswith("/api/doc/"):
            did = u.path.split("/api/doc/")[1]
            d = DOCS.get(did)
            if not d: return self._send(404, {"error": "无此文档"})
            return self._send(200, {**{k: v for k, v in d.items() if not k.startswith("_")},
                                    "content": doc_content(d)})
        if u.path == "/api/carried":
            rows = []
            if CARRY_FILE.exists():
                rows = [json.loads(x) for x in CARRY_FILE.read_text().splitlines() if x.strip()]
            return self._send(200, {"rows": rows})
        self._send(404, {"error": "not found"})

    def do_POST(self):
        self._norm()
        if not self._auth():
            return self._send(401, {"error": "no key"})
        u = urlparse(self.path)
        if u.path == "/api/src_config":
            n = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(n) or b"{}")
            cf = os.path.join(HERE, "src_config.json")
            allc = {}
            if os.path.exists(cf):
                try: allc = json.load(open(cf))
                except: pass
            allc[body.get("id","")] = body.get("cfg", {})
            json.dump(allc, open(cf, "w"), ensure_ascii=False)
            return self._send(200, {"ok": True})
        if u.path == "/api/carry":
            n = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(n) or b"{}")
            d = DOCS.get(body.get("id", ""))
            if not d: return self._send(404, {"error": "无此文档"})
            row = {"id": d["id"], "title": d["title"], "building": d["building"],
                   "broker": d["broker"], "company": d["company"], "date": d["date"],
                   "processed_by": body.get("by") or "",     # 新增强制带研究员；存量另案
                   "carried_at": time.strftime("%Y-%m-%d %H:%M")}
            with CARRY_FILE.open("a") as f:
                f.write(json.dumps(row, ensure_ascii=False) + "\n")
            return self._send(200, {"ok": True, "row": row})
        self._send(404, {"error": "not found"})

def _warm():
    try:
        if distill: distill.insight_daily()
        print("[warm] insight 缓存已预热")
    except Exception as e:
        print("[warm] insight 预热失败:", e)
    # arr MCP 冷启一次要好几秒（两跳），预热掉，点「测试连接」就是毫秒级
    try:
        import arrmcp
        p = arrmcp.probe()
        print(f"[warm] arr MCP: {p}")
    except Exception as e:
        print("[warm] arr MCP 预热失败:", e)

if __name__ == "__main__":
    DOCS = load()
    import threading
    threading.Thread(target=_warm, daemon=True).start()
    inv = {}
    for d in DOCS.values(): inv[d["building"]] = inv.get(d["building"], 0) + 1
    print(f"kb-bridge 就绪 · 共 {len(DOCS)} 份文档 · 楼宇库存: {inv}")
    print(f"老板钥匙（保险库转盘密码）: {BOSS_KEY}")
    print(f"http://127.0.0.1:{PORT}  · 只读 ~/knowledge · Ctrl-C 停")
    http.server.ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
