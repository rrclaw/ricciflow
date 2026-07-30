#!/usr/bin/env python3.11
"""交易台的真实数据 —— 全部来自 ~/invest skills/_PLATFORM，零编造。

以前交易台是编的：虚构持仓、虚构 blotter、虚构「上头拦截剧场」。现在读三份真东西：

  · riskboard/reports/<最新>.md  跨策略合并风险报表（skill 总览 / 合并敞口 / 熔断 / 告警 / 闸活性）
  · ledger/trades.jsonl          151 笔真实平仓，退出理由是原文
  · tradelib/riskrules_baseline.yaml  R1–R10 统一风控基线

riskboard 是人可读的 markdown，列数和标题都会变。所以解析器的原则是：
**解析不出来就说解析不出来，并把文件路径报出来，绝不静默返回空或者猜。**
静默返回空最危险 —— 界面会显示「0 个告警」，看着像一切正常。

只读。零依赖（不引 yaml，基线文件用行扫描抽关键阈值）。
"""
import json
import re
import time
from pathlib import Path

SK = Path.home() / "invest skills"
PLAT = SK / "_PLATFORM"
RISKBOARD = PLAT / "riskboard" / "reports"
TRADES = PLAT / "ledger" / "trades.jsonl"
RULES = PLAT / "tradelib" / "riskrules_baseline.yaml"

_C = {}


def _cached(key, ttl, fn):
    hit = _C.get(key)
    if hit and time.time() - hit[0] < ttl:
        return hit[1]
    v = fn()
    _C[key] = (time.time(), v)
    return v


# ---------------------------------------------------------------- riskboard
def _latest_riskboard():
    if not RISKBOARD.is_dir():
        return None
    files = sorted((f for f in RISKBOARD.glob("*.md")
                    if re.fullmatch(r"\d{4}-\d{2}-\d{2}\.md", f.name)), reverse=True)
    return files[0] if files else None


def _sections(text):
    """按 `## ` 切节，键是节号（① ② ④ ⑥ ⑦ ⑧ ⑤b…），值是正文。"""
    out, cur, buf = {}, None, []
    for line in text.splitlines():
        m = re.match(r"^##\s+(\S+)\s*(.*)$", line)
        if m:
            if cur:
                out[cur] = "\n".join(buf)
            cur, buf = m.group(1), []
            out.setdefault("_titles", {})[m.group(1)] = m.group(2)
        elif cur:
            buf.append(line)
    if cur:
        out[cur] = "\n".join(buf)
    return out


def _md_table(body):
    """吃一段 markdown，返回第一张表的 (表头, 行列表)。没有表就 (None, [])。"""
    rows = [l.strip() for l in body.splitlines() if l.strip().startswith("|")]
    rows = [r for r in rows if not re.fullmatch(r"\|[\s\-|:]+\|", r)]
    if len(rows) < 2:
        return None, []
    def cells(r):
        return [c.strip() for c in r.strip("|").split("|")]
    head = cells(rows[0])
    return head, [cells(r) for r in rows[1:]]


def _bullets(body):
    return [re.sub(r"^[-*]\s*", "", l.strip()) for l in body.splitlines()
            if l.strip().startswith(("-", "*"))]


def _num(s):
    m = re.search(r"-?\d+(?:\.\d+)?", (s or "").replace(",", ""))
    return float(m.group()) if m else None


def riskboard():
    """解析最新一期跨策略风险报表。任一关键节缺失都显式报错。"""
    def go():
        f = _latest_riskboard()
        if not f:
            return {"ok": False, "error": f"没有 riskboard 报表（找过 {RISKBOARD}）"}
        text = f.read_text(errors="ignore")
        sec = _sections(text)
        missing = [k for k in ("①", "②", "④", "⑥", "⑦") if k not in sec]
        if missing:
            return {"ok": False, "file": str(f),
                    "error": f"报表结构变了，缺小节 {'/'.join(missing)} —— 解析器需要更新，"
                             f"不猜也不给空表。文件：{f}"}

        h1, r1 = _md_table(sec["①"])
        skills = [{
            "skill": r[0], "decision": r[1], "age": r[2], "legs": r[3],
            "gross": r[4], "net": r[5], "market": r[6] if len(r) > 6 else "",
        } for r in r1 if len(r) >= 6]

        h2, r2 = _md_table(sec["②"])
        exposure = [{
            "ticker": r[0], "name": r[1], "market": r[2],
            "gross": r[3], "net": r[4], "holders": r[5] if len(r) > 5 else "",
        } for r in r2 if len(r) >= 5]

        conc = {}
        for b in _bullets(sec["④"]):
            if "gross book" in b:
                conc["gross"] = _num(b.split("gross book")[1])
                m = re.search(r"合并 net[:：]\s*([+\-]?[\d.]+)", b)
                if m:
                    conc["net"] = float(m.group(1))
            elif "HHI(invested" in b or "HHI（invested" in b:
                conc["hhi"] = _num(b.split("**")[1]) if "**" in b else _num(b)
            elif "持仓只数" in b:
                conc["names"] = _num(b)

        nav = {}
        for b in _bullets(sec["⑥"]):
            if "合并 NAV" in b:
                nav["nav"] = _num(b.split("**")[1]) if "**" in b else _num(b)
                m = re.search(r"(\d+)\s*交易日", b)
                if m:
                    nav["days"] = int(m.group(1))
            elif "MaxDD" in b:
                parts = b.split("**")
                nav["maxdd"] = _num(parts[1]) if len(parts) > 1 else None
                nav["dd_now"] = _num(parts[3]) if len(parts) > 3 else None
            elif "熔断" in b:
                nav["breaker"] = b

        # ⑦ 之后紧跟分隔线与生成戳，`- ` 扫描会把它们也当告警，按前缀 emoji 过掉
        alerts = [{"level": "red" if b.startswith("🔴") else "warn",
                   "txt": b.lstrip("🔴🟠🟡🟢 ")}
                  for b in _bullets(sec["⑦"]) if b[:1] in "🔴🟠🟡🟢"]
        gates = [{"ok": b.startswith("🟢"), "txt": b.lstrip("🔴🟢 ")}
                 for b in _bullets(sec.get("⑧", ""))]

        return {"ok": True, "file": str(f), "date": f.stem,
                "skills": skills, "exposure": exposure, "conc": conc,
                "nav": nav, "alerts": alerts, "gates": gates,
                "note": (sec.get("_titles", {}).get("①") or "")}
    return _cached("riskboard", 300, go)


# ---------------------------------------------------------------- blotter
def blotter(limit=40):
    """真实平仓流水。退出理由用原文，不改写 —— 那句话本身就是判断依据。"""
    def go():
        if not TRADES.exists():
            return {"ok": False, "error": f"没有平仓账本：{TRADES}"}
        rows = []
        for line in TRADES.read_text(errors="ignore").splitlines():
            if not line.strip():
                continue
            try:
                d = json.loads(line)
            except Exception:
                continue
            rows.append({
                "skill": d.get("skill"), "ticker": d.get("ticker"), "name": d.get("name"),
                "market": d.get("market"), "entry": d.get("entry_date"), "exit": d.get("exit_date"),
                "pnl": d.get("realized_pnl_pct"), "hold": d.get("hold_days"),
                "weight": d.get("weight"), "rule": d.get("exit_rule_id") or "",
                "outcome": d.get("thesis_outcome"),
            })
        rows.sort(key=lambda r: r["exit"] or "", reverse=True)
        wins = [r for r in rows if (r["pnl"] or 0) > 0]
        return {"ok": True, "file": str(TRADES), "total": len(rows),
                "wins": len(wins), "rows": rows}
    d = _cached("blotter", 300, go)
    if not d.get("ok"):
        return d
    return {**d, "rows": d["rows"][:limit]}


# ---------------------------------------------------------------- 原则库
RULE_KEYS = [
    ("r1_stop_discipline", "R1 止损纪律", "每个有权重的 pick 必须有止损路径，无止损直接拒锁"),
    ("r2_single_name_cap", "R2 单票上限", "超限确定性削到 cap，写 note，不报错"),
    ("r3_account_dd_breaker", "R3 合并回撤熔断", "熔断只冻结新开仓，不砍存量底仓"),
    ("r4", "R4", ""), ("r5", "R5", ""), ("r6", "R6", ""),
    ("r7", "R7", ""), ("r8", "R8", ""), ("r9", "R9", ""), ("r10", "R10", ""),
]


def principles():
    """R1–R10 统一风控基线。不引 yaml 依赖，按行扫 key 与注释。"""
    def go():
        if not RULES.exists():
            return {"ok": False, "error": f"没有风控基线：{RULES}"}
        text = RULES.read_text(errors="ignore")
        out = []
        lines = text.splitlines()
        for i, line in enumerate(lines):
            m = re.match(r"^(r\d+_[a-z_]+|r\d+):\s*$", line)
            if not m:
                continue
            key = m.group(1)
            # 往上收紧邻的注释行当说明；往下收前几个字段当阈值
            desc = []
            for j in range(i - 1, max(-1, i - 6), -1):
                s = lines[j].strip()
                if s.startswith("#"):
                    desc.insert(0, s.lstrip("# ").strip())
                elif s:
                    break
            fields = []
            for j in range(i + 1, min(len(lines), i + 8)):
                s = lines[j]
                if s and not s.startswith((" ", "\t")):
                    break
                s = s.strip()
                if s and not s.startswith("#"):
                    fields.append(s)
            out.append({"key": key, "title": (desc[0] if desc else key),
                        "why": " ".join(desc[1:])[:220], "fields": fields[:4]})
        if not out:
            return {"ok": False, "error": f"基线文件里没扫到任何 r* 规则：{RULES}"}
        return {"ok": True, "file": str(RULES), "n": len(out), "rules": out,
                "hard": "per-skill trade_profile.yaml 只允许收紧，不允许放松；违者 raise"}
    return _cached("principles", 900, go)


def desk():
    return {"riskboard": riskboard(), "blotter": blotter(), "principles": principles()}


if __name__ == "__main__":
    r = riskboard()
    if not r.get("ok"):
        print("riskboard FAIL:", r.get("error"))
    else:
        n = r["nav"]
        print(f"riskboard {r['date']} · 合并 NAV {n.get('nav')} · MaxDD {n.get('maxdd')}% · "
              f"当前回撤 {n.get('dd_now')}%")
        print(f"  skill {len(r['skills'])} 行 · 敞口 {len(r['exposure'])} 行 · "
              f"告警 {len(r['alerts'])} · 闸 {len(r['gates'])}")
        for a in r["alerts"]:
            print("   !", a["txt"][:90])
    b = blotter()
    print(f"blotter: {b.get('total')} 笔 · 盈利 {b.get('wins')}" if b.get("ok") else f"blotter FAIL: {b.get('error')}")
    p = principles()
    print(f"principles: {p.get('n')} 条" if p.get("ok") else f"principles FAIL: {p.get('error')}")
    for x in (p.get("rules") or [])[:4]:
        print("   ·", x["key"], "—", x["title"][:60])
