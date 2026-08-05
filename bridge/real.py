#!/usr/bin/env python3.11
"""真实研究员名册 —— 把 ~/invest skills 的每个策略当成一名研究员。

游戏里那些「等级/信任度/战绩」不再是编的：
  · 人设与信条 —— 逐字引自各家 doctrine / SKILL.md，不改写不美化
  · 平仓战绩   —— _PLATFORM/ledger/trades.jsonl（真实成交回合）
  · 组合净值   —— rr.playbookex.com 的 equity 口径（本地 :8100，缓存 1h）
  · 在岗状态   —— 三种真实闸的产物：verdict_gate(SHADOW) / sunset / 休眠
  · 薪资       —— token_ledger.py 扫出来的真实 API 花费

没有账本的技能就写「无账本」。宁可留白，不要拿别人的数字凑。
"""
import json
import re
import time
import urllib.request
from pathlib import Path

SKILLS = Path.home() / "invest skills"
LEDGER = SKILLS / "_PLATFORM" / "ledger"
PBX = "http://127.0.0.1:8100/rr/api/public"

_CACHE = {}
EQ_CACHE = Path(__file__).parent / "cache" / "equity.json"


def _cached(key, ttl, fn):
    hit = _CACHE.get(key)
    if hit and time.time() - hit[0] < ttl:
        return hit[1]
    val = fn()
    _CACHE[key] = (time.time(), val)
    return val


def _eq_disk():
    """净值缓存落盘：桥重启后不必重新去敲一遍 playbookex（那边单次要好几秒）。"""
    if EQ_CACHE.exists():
        try:
            return json.loads(EQ_CACHE.read_text())
        except Exception:
            pass
    return {}


def _eq_disk_save(d):
    EQ_CACHE.parent.mkdir(parents=True, exist_ok=True)
    EQ_CACHE.write_text(json.dumps(d, ensure_ascii=False))


# ---------------------------------------------------------------- 人设
# motto / creed 全部是原文摘句，出处写在 src 里，游戏里点开能看到自己是从哪抄的。
ROSTER = [
    {"id": "brownsugar", "dir": "brownsugar", "n": "拥抱主线", "en": "brownsugar",
     "market": "A股", "style": "主线动量 · 长多 · 0-5 只集中",
     "motto": "空仓只有两种合法理由，研究源断供不是其中之一。",
     "creed": ["R-02 状态即预算：MONEY 用 60-100% 仓，BLEED 只给 0-10%",
               "R-16 新开仓单票 ≥5% book —— 不开装饰仓",
               "R-24 规则预算 ≤30 条。想加第 31 条 = 先证明删哪条"],
     "src": "brownsugar/doctrine/RULES.md", "gate": "validate_v11 代码闸，不可 --force 绕过",
     "pbx": "brownsugar"},
    {"id": "serenity", "dir": "serenity", "n": "卡脖子", "en": "serenity",
     "market": "A股+美股", "style": "窄口埋伏 · 小盘 · 数月",
     "motto": "复刻她的流程，不是她那无审计的收益率。",
     "creed": ["判断不可外包；picks=[] 永远合法",
               "三个互不可见的独立判断跑，≥2 票且 0 否决才锁仓",
               "涨多了/窗已关不再新建，不是 EXIT 的理由"],
     "src": "serenity/doctrine/mission.md", "gate": "report-scorer ≥60 才准进 picks",
     "pbx": "serenity"},
    {"id": "usrocket", "dir": "usrocket", "n": "快钱", "en": "usrocket",
     "market": "美股", "style": "小盘爆发 · 快进快出 · 1周-1月",
     "motto": "赚快钱。不是价值投资，不是长期主义，不是分散风险。",
     "creed": ["选出未来 1 周到 1 个月内最强势 top 5% 的票",
               "不在乎成交量容量 / 不分散 / 不留压舱仓",
               "A 是凭证日，B 和 C 不改 picks.json"],
     "src": "usrocket/doctrine/mission.md", "gate": "三段式锁定（P-58 继承自 brownsugar）",
     "pbx": "usrocket"},
    {"id": "goldpool", "dir": "goldpool", "n": "金股池", "en": "goldpool",
     "market": "A股", "style": "月度金股 · 横截面动量加速",
     "motto": "从金股池里选中未来几周涨幅最高的那几只。就这一句。",
     "creed": ["骑加速龙头，绝不 fade 追高，绝不躲共识砍现金",
               "wiki 只能靠客观证伪降级，不准用「看着贵」主观降级",
               "不凭直觉改权重，必须过回测 t>1.96"],
     "src": "goldpool/SKILL.md", "gate": "verdict_gate 拦停，夜间选股入口 raise",
     "pbx": "goldpool"},
    {"id": "wufu", "dir": "wufu", "n": "五福轮动", "en": "wufu",
     "market": "A股 ETF", "style": "ETF 动量轮动 · 单只满仓",
     "motto": "原版「11 年 400 倍」是后视镜幻觉。",
     "creed": ["不亏大钱 > 赚大钱：大盘极弱强制切债券 ETF",
               "顺势不逆，不预测拐点",
               "参数锁死，实盘只 walk-forward，不为回测好看调任一参数"],
     "src": "wufu/doctrine/core/mission.md", "gate": "参数冻结（V0.2 起）",
     "pbx": "wufu"},
    {"id": "wavehunter", "dir": "wavehunter", "n": "产业浪", "en": "wavehunter",
     "market": "A股+美股", "style": "产业波段 · 4-16 周",
     "motto": "两个世界：认知层可以自由推理，资金层禁止一切自然语言。",
     "creed": ["认知世界禁止触碰组合权重、价格、资金分配",
               "回测周的股票池含未来上市标的 → 直接 raise（幸存者偏差闸）",
               "一字板买不进就坍缩成现金，不顺延不补票"],
     "src": "wavehunter/doctrine/mission.md", "gate": "三哈希同 → 输出必须 bitwise 同",
     "pbx": "wavehunter"},
    {"id": "hedgepair", "dir": "hedgepair", "n": "对冲配对", "en": "hedgepair",
     "market": "美股", "style": "同业多空配对 · beta 中性 · 1-3 周",
     "motto": "不能亏钱 > 赚大钱。最大回撤 ≤8% 是硬指标。",
     "creed": ["thesis 漂亮但单腿暴露的 pair，不如 thesis 平庸但 beta 匹配好的",
               "跨行业不算 pair，那是 macro bet",
               "为凑够目标 pair 数而降门槛 = doctrine 死罪"],
     "src": "hedgepair/doctrine/core/mission.md", "gate": "净敞口 ≤15% NAV",
     "pbx": "hedgepair"},
    {"id": "fattail", "dir": "fattail", "n": "厚尾", "en": "fattail",
     "market": "A股+美股", "style": "主观深度价值/趋势 · ≤6 只 · 年级别",
     "motto": "看好不重仓等于没看好。",
     "creed": ["少下注，下重注，拿长线",
               "研究只在左侧有价值",
               "交易系统对老板绝缘：审批权终止于入场"],
     "src": "fattail/doctrine/core/creed.md", "gate": "params_v1 sha256 封印（G-FREEZE-1）",
     "pbx": "fattail"},
    {"id": "smartmoney1", "dir": "smartmoney1.0", "n": "中军", "en": "smartmoney 1.0",
     "market": "A股", "style": "机构主题 → 龙头核心票",
     "motto": "在赢的板块里买龙头。",
     "creed": ["search 是主题雷达，不是可交易 alpha 引擎",
               "alpha 在主题层（选对子行业），不在选股层",
               "诚实预期：短期收益≈主题 beta"],
     "src": "smartmoney1.0/SKILL.md", "gate": "verdict_gate 拦停，锁仓入口 raise",
     "pbx": "smartmoney1.0"},
    {"id": "smartmoney2", "dir": "smartmoney2.0", "n": "弹性", "en": "smartmoney 2.0",
     "market": "A股", "style": "机构主题 → 高弹性补涨票",
     "motto": "旧因子经不重叠审计全部证伪，只剩两层架构。",
     "creed": ["与 1.0 共用引擎，只差角色集与 tilt（1.5 更集中强势子行业）",
               "精英机构账本 observe-only，不进 picks"],
     "src": "smartmoney2.0/SKILL.md", "gate": "verdict_gate 拦停",
     "pbx": "smartmoney2.0"},
    {"id": "factor", "dir": "Factor", "n": "因子看板", "en": "factor",
     "market": "A股", "style": "市场因子/择时环境 · 不选股",
     "motto": "只算数值，不做择时判断。",
     "creed": ["10 个市场级 + 3 个个股级量价因子，日更",
               "是别人的输入，不是自己的组合"],
     "src": "Factor/SKILL.md", "gate": "—", "pbx": None, "nobook": True},
    {"id": "filing", "dir": "Filing", "n": "公告精筛", "en": "filing-keyword",
     "market": "A股", "style": "公告事件筛选 · 不建仓",
     "motto": "公告披露日算次一交易日，评价用当天 K 线。",
     "creed": ["五层关键词匹配：精确/同义/大词/公司名误命中/噪声",
               "选股用，不是避雷用"],
     "src": "Filing/.claude/skills/filing-keyword/SKILL.md", "gate": "—",
     "pbx": None, "nobook": True},
    {"id": "news_radar", "dir": "news_radar", "n": "新闻雷达", "en": "news-radar",
     "market": "宏观/政策", "style": "98 站信源监控 · 零 LLM 规则打分",
     "motto": "用户说触发词才跑。不挂 launchd，不留后台进程。",
     "creed": ["规则打分，零 LLM；只有 top-N 才交给模型写摘要",
               "无飞书推送，纯本地"],
     "src": "news_radar/.claude/skills/news-radar/SKILL.md", "gate": "—",
     "pbx": None, "nobook": True},
    {"id": "summary", "dir": "summary", "n": "晚间复盘", "en": "summary",
     "market": "A股", "style": "盘后综合日报 · 不建仓",
     "motto": "Python 只做采集和渲染，禁止在代码里写 if score > X then 买。",
     "creed": ["六节骨架固定：核心判断/宏观结构/主线穿透/低位弹性/涨价链/速览",
               "研究台子模块已于 2026-07-12 退役"],
     "src": "summary/SKILL.md", "gate": "—", "pbx": None, "nobook": True},
    {"id": "bottom_mining", "dir": "bottom_mining", "n": "左侧抄底", "en": "bottom-mining",
     "market": "A股", "style": "绝对底部 × 边际改善",
     "motto": "绝对底部 × 边际改善，不是相对强弱 × 主升追强。",
     "creed": ["状态机必做：Cold→Heating→Warm→Confirmed→Cooling",
               "signal_collector 严格无状态，回测与实盘同一代码路径",
               "v0 必跑 2024-02-05 微盘股冰点回测"],
     "src": "bottom_mining/SKILL.md", "gate": "—", "pbx": None},
    {"id": "annealing", "dir": "annealing", "n": "退火", "en": "annealing",
     "market": "A股", "style": "纯量化因子挖掘 · 隔夜 alpha",
     "motto": "5 年 walk-forward 三版本累计 α 全负。",
     "creed": ["信息论上，负 alpha 源不能产生正 alpha 下游",
               "所以它连子信号都不许捐给别人"],
     "src": "annealing/SKILL.md", "gate": "—", "pbx": None},
]


# ---------------------------------------------------------------- 真实读数
def pk_board():
    p = LEDGER / "pk_board.json"
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text())
    except Exception:
        return {}


def trades():
    """真实平仓成交回合，按技能分桶。"""
    p = LEDGER / "trades.jsonl"
    out = {}
    if not p.exists():
        return out
    for line in p.read_text(errors="ignore").splitlines():
        if not line.strip():
            continue
        try:
            d = json.loads(line)
        except Exception:
            continue
        out.setdefault(d.get("skill", "?"), []).append(d)
    for v in out.values():
        v.sort(key=lambda t: t.get("exit_date") or "", reverse=True)
    return out


def latest_report(dirname):
    """最新一期报告的日期与文件清单。日期目录名形态各家不同，只认 YYYY-MM-DD。"""
    base = SKILLS / dirname
    best = ("", None)
    for sub in ("reports", "reports_v06", "output"):
        d = base / sub
        if not d.is_dir():
            continue
        for x in d.iterdir():
            if x.is_dir() and re.fullmatch(r"\d{4}-\d{2}-\d{2}", x.name) and x.name > best[0]:
                best = (x.name, x)
    if not best[1]:
        # Filing 是扁平文件：reports/2026-07-30_report.md
        d = base / "reports"
        if d.is_dir():
            for x in d.glob("*_report.md"):
                day = x.name[:10]
                if re.fullmatch(r"\d{4}-\d{2}-\d{2}", day) and day > best[0]:
                    best = (day, x)
    if not best[1]:
        return {"date": "", "files": []}
    files = sorted(f.name for f in best[1].iterdir()) if best[1].is_dir() else [best[1].name]
    return {"date": best[0], "files": files, "_path": str(best[1])}


def latest_picks(dirname):
    """最新一期的持仓建议。picks 的字段各家不统一，只抽公共的几个。"""
    rep = latest_report(dirname)
    p = Path(rep.get("_path", ""))
    if not p.is_dir():
        return {"date": rep["date"], "picks": [], "note": "", "nofile": True,
                "files": rep.get("files", [])[:8]}
    for name in ("picks.json", "picks_v06.json", "picks_cn.json", "picks_v2.json"):
        f = p / name
        if not f.exists():
            continue
        try:
            d = json.loads(f.read_text(errors="ignore"))
        except Exception:
            continue
        raw = d.get("picks") or []
        picks = []
        for x in raw if isinstance(raw, list) else []:
            if not isinstance(x, dict):
                continue
            picks.append({
                "ticker": x.get("ticker") or x.get("code") or "",
                "name": x.get("name") or x.get("sec_name") or "",
                "weight": x.get("weight") or x.get("l_actual") or x.get("final_weight"),
                "why": (x.get("thesis") or x.get("reason") or x.get("why")
                        or x.get("comment") or "")[:160],
            })
        # 各家的「空仓理由/点评」字段形态不一：字符串、列表、甚至嵌套 dict，统一驯成一段文字
        note = d.get("picks_empty_reason") or d.get("commentary") or d.get("_note") or ""
        if isinstance(note, list):
            note = "；".join(str(x) for x in note if x)
        elif isinstance(note, dict):
            note = "；".join(f"{k}: {v}" for k, v in note.items() if v)
        return {"date": d.get("date") or rep["date"], "picks": picks,
                "note": str(note)[:400],
                "regime": str((d.get("regime") or {}).get("state") or "")[:40]
                          if isinstance(d.get("regime"), dict) else str(d.get("regime") or "")[:40],
                "file": name}
    # 没找到 picks 文件 ≠ 空仓。前者是那一期根本没跑选股腿，后者是跑了但没选出来。
    return {"date": rep["date"], "picks": [], "note": "", "nofile": True,
            "files": rep.get("files", [])[:8]}


EQ_TTL = 6 * 3600
EQ_KEYS = ("current_nav", "total_return_pct", "max_drawdown_pct", "win_rate",
           "n_days", "start_date", "end_date", "n_winners", "n_losers",
           "holdings_only_return_pct")


def _fetch_equity(slug):
    with urllib.request.urlopen(f"{PBX}/skills/{slug}/equity", timeout=25) as r:
        d = json.loads(r.read().decode())
    return {k: d.get(k) for k in EQ_KEYS} | {"series": d.get("series") or [], "_ts": time.time()}


def equities(slugs):
    """一次把所有净值拉齐 —— 串行要 40 秒，并发 5 秒。过期的才重拉。"""
    from concurrent.futures import ThreadPoolExecutor
    disk = _eq_disk()
    now = time.time()
    todo = [s for s in slugs if s and now - (disk.get(s, {}).get("_ts") or 0) > EQ_TTL]
    if todo:
        with ThreadPoolExecutor(max_workers=8) as ex:
            for slug, fut in zip(todo, [ex.submit(_fetch_equity, s) for s in todo]):
                try:
                    disk[slug] = fut.result()
                except Exception as e:
                    # 拉不到就保留旧值；实在没有就记下失败原因，前端照实显示
                    disk.setdefault(slug, {"error": str(e), "_ts": now})
        _eq_disk_save(disk)
    return disk


def equity(slug):
    if not slug:
        return None
    return equities([slug]).get(slug)


def status_of(sk, board, tr, eq):
    """在岗状态 —— 由真实闸的状态推出来，不是拍的。

    已裁员 / 停职 / 观察 / 在岗 / 休眠 / 无账本
    """
    sid = sk["id"]
    gate = (sk.get("gate") or "")
    if sid == "annealing":
        return {"code": "fired", "label": "已裁员", "why": "2026-05-20 sunset：三版本 walk-forward 累计 α 全负"}
    rep = latest_report(sk["dir"])
    stale = ""
    if rep["date"]:
        try:
            days = (time.time() - time.mktime(time.strptime(rep["date"], "%Y-%m-%d"))) / 86400
            stale = f"最近一期 {rep['date']}（{int(days)} 天前）"
        except Exception:
            days = 0
    else:
        days = 999
    if "verdict_gate" in gate:
        return {"code": "suspended", "label": "停职查看",
                "why": "verdict_gate 代码闸拦停，选股入口直接 raise。" + stale}
    if days > 45:
        return {"code": "dormant", "label": "休眠", "why": stale or "没有产出记录"}
    if sk.get("nobook"):
        return {"code": "nobook", "label": "无组合", "why": "只产信号/报告，不建仓，没有战绩可考。" + stale}
    flags = (board.get("flags") or {}).get("dominated_this_window") or []
    m = (board.get("metrics") or {}).get(sid) or {}
    if sid in flags or (board.get("dominance") or {}).get(sid, {}).get("is_dominated_75pct"):
        by = ", ".join((board.get("dominance") or {}).get(sid, {}).get("dominated_by") or [])
        return {"code": "watch", "label": "观察期",
                "why": f"被 {by} 全面压制（连续两个窗口）→ 按 PK 规则降级观察"}
    if m.get("n_closed", 0) >= 5 and m.get("hit_rate") is not None and m["hit_rate"] < 0.15:
        return {"code": "pip", "label": "绩效改进",
                "why": f"{m['n_closed']} 笔平仓命中率 {m['hit_rate']*100:.0f}%"}
    if eq and eq.get("current_nav") and eq["current_nav"] < 0.9:
        return {"code": "pip", "label": "绩效改进",
                "why": f"组合净值 {eq['current_nav']:.3f}，回撤 {eq.get('max_drawdown_pct')}%"}
    return {"code": "active", "label": "在岗", "why": stale}


def hp_of(sk, st, board, eq):
    """信任度血条 —— 公式写死在这里，可复核：

       在岗 100 起步；组合亏损按 3 倍扣；最大回撤按 1 倍扣；
       平仓命中率低于 50% 每差 1pp 扣 0.5；停职/观察/休眠各有封顶。
    """
    cap = {"fired": 0, "suspended": 35, "dormant": 25, "watch": 55, "pip": 40,
           "nobook": 70, "active": 100}[st["code"]]
    hp = 100.0
    if eq and eq.get("current_nav"):
        hp += (eq["total_return_pct"] or 0) * 3
        hp -= abs(eq.get("max_drawdown_pct") or 0)
    m = (board.get("metrics") or {}).get(sk["id"]) or {}
    if m.get("hit_rate") is not None and m.get("n_closed", 0) >= 5:
        hp -= max(0, 50 - m["hit_rate"] * 100) * 0.5
    return max(0, min(cap, round(hp)))


def roster_public():
    """公开层名册：只给身份与公开信条，**一个数字都不给**。

    可以公开：策略名、市场、风格、格言、信条、在岗状态标签。
    绝不公开：净值、平仓统计、信任度、持仓建议、本机路径、状态理由
    （理由里会带「最近一期 X 日」这种运营信息）。
    """
    board = pk_board()
    out = []
    for sk in ROSTER:
        st = status_of(sk, board, {}, None)
        out.append({k: sk[k] for k in ("id", "n", "en", "market", "style", "motto", "creed", "src", "gate")}
                   | {"status": {"code": st["code"], "label": st["label"]}, "public": True})
    return {"as_of": time.strftime("%Y-%m-%d"), "n": len(out), "researchers": out,
            "note": "公开层：只有身份与公开信条。战绩、持仓、薪资需要老板钥匙。"}


def roster(with_equity=True, with_series=False):
    board = pk_board()
    tr = trades()
    eqs = equities([sk.get("pbx") for sk in ROSTER]) if with_equity else {}
    out = []
    for sk in ROSTER:
        eq = eqs.get(sk.get("pbx")) if with_equity else None
        if eq and (eq.get("error") or eq.get("current_nav") is None):
            eq = None
        st = status_of(sk, board, tr, eq)
        m = (board.get("metrics") or {}).get(sk["id"]) or {}
        mytr = tr.get(sk["id"], [])
        row = {k: sk[k] for k in ("id", "n", "en", "market", "style", "motto", "creed", "src", "gate")}
        row["dir"] = str(SKILLS / sk["dir"])
        row["status"] = st
        row["hp"] = hp_of(sk, st, board, eq)
        row["report"] = latest_report(sk["dir"])
        row["picks"] = latest_picks(sk["dir"])
        row["closed"] = {"n": m.get("n_closed") or len(mytr),
                         "hit_rate": m.get("hit_rate"),
                         "sum_pnl_pct": m.get("sum_pnl_pct"),
                         "mean_pnl_pct": m.get("mean_pnl_pct"),
                         "worst_pct": m.get("worst_trade_pct"),
                         "eligible": m.get("eligible")}
        row["trades"] = [{k: t.get(k) for k in
                          ("ticker", "name", "entry_date", "exit_date", "realized_pnl_pct",
                           "hold_days", "weight", "exit_rule_id")} for t in mytr[:12]]
        if eq:
            row["equity"] = eq if with_series else {k: v for k, v in eq.items() if k != "series"}
        out.append(row)
    out.sort(key=lambda r: (-r["hp"], r["id"]))
    return {"as_of": time.strftime("%Y-%m-%d %H:%M"), "n": len(out),
            "board": {"eligible": board.get("eligible_pool", []),
                      "observing": board.get("observing", [])},
            "researchers": out}


# ---------------------------------------------------------------- 财务
# 项目目录 → 研究员。只有自己开过工作目录的技能才有独立账单，其余诚实留白。
PROJ_MAP = {
    "-Users-bot-invest-skills-brownsugar": "brownsugar",
    "-Users-bot-invest-skills-serenity": "serenity",
    "-Users-bot-invest-skills-goldpool": "goldpool",
    "-Users-bot-invest-skills-fattail": "fattail",
    "-Users-bot-invest-skills-news-radar": "news_radar",
}
OVERHEAD = {
    "-Users-bot": "老板自己（总部）",
    "-Users-bot-invest-skills": "研究部公共开销",
    "-Users-bot-knowledge": "知识库建设",
    "-Users-bot-knowledge-knowledge": "知识库建设",
    "-Users-bot-Desktop-acecamp": "专家纪要处理",
    "-Users-bot-ai-media": "对外内容",
    "-Users-bot-aidemand": "需求雷达",
    "-Users-bot-arr": "ARR 追踪器",
    "-Users-bot-stock-data": "行情数据",
    "-Users-bot-databank": "供需账本",
    "-Users-bot-search-alpha": "机构搜索因子",
}


def finance():
    import token_ledger
    s = token_ledger.summary()
    rate = 7.15
    salaries, overhead, other = [], [], []
    byid = {sk["id"]: sk for sk in ROSTER}
    for r in s["rows"]:
        who = PROJ_MAP.get(r["project"])
        item = {"project": r["project"], "msgs": r["msgs"], "tokens": r["tokens"],
                "out_tokens": r["out_tokens"], "usd": r["usd"], "cny": r["cny"],
                "t_in": r["t_in"], "t_out": r["t_out"], "t_cw": r["t_cw"], "t_cr": r["t_cr"],
                "cost": r["cost"], "cache_hit": r["cache_hit"],
                "first": r["first"], "last": r["last"],
                "models": r["models"],
                "top_model": max(r["models"], key=r["models"].get) if r["models"] else ""}
        if who:
            item["id"] = who
            item["n"] = byid.get(who, {}).get("n", who)
            salaries.append(item)
        elif r["project"] in OVERHEAD:
            item["n"] = OVERHEAD[r["project"]]
            overhead.append(item)
        else:
            other.append(item)
    # 同一个开销标签可能对应多个项目目录（knowledge 有内外两层），合并成一行
    merged = {}
    for x in overhead:
        m = merged.setdefault(x["n"], {"n": x["n"], "usd": 0.0, "cny": 0.0,
                                       "tokens": 0, "msgs": 0, "projects": []})
        m["usd"] += x["usd"]; m["cny"] += x["cny"]
        m["tokens"] += x["tokens"]; m["msgs"] += x["msgs"]
        m["projects"].append(x["project"])
    overhead = sorted(merged.values(), key=lambda x: -x["usd"])
    for x in overhead:
        x["usd"] = round(x["usd"], 2); x["cny"] = round(x["cny"], 2)
    no_bill = [{"id": sk["id"], "n": sk["n"]} for sk in ROSTER
               if sk["id"] not in PROJ_MAP.values()]
    return {"built_at": s["built_at"], "usd_cny": rate,
            "salaries": salaries, "overhead": overhead, "other": other,
            "no_bill": no_bill,
            "total_usd": s["total_usd"], "total_cny": round(s["total_usd"] * rate, 2),
            "salary_usd": round(sum(x["usd"] for x in salaries), 2),
            "overhead_usd": round(sum(x["usd"] for x in overhead), 2),
            "prices": {t: {"in": p["in"], "out": p["out"],
                           "cache_write_1h": round(p["in"] * 2.0, 2),
                           "cache_write_5m": round(p["in"] * 1.25, 2),
                           "cache_read": round(p["in"] * 0.1, 3)}
                       for t, p in token_ledger.PRICES.items()},
            "note": "逐条精算：输入/输出各自单价，缓存写入按 1h=2x / 5m=1.25x 拆档，"
                    "缓存读取 0.1x。已按 message.id+requestId 去重、排除 <synthetic>。"}


if __name__ == "__main__":
    d = roster()
    print(f"{'研究员':10} {'状态':6} {'HP':>3} {'净值':>8} {'平仓':>4} {'命中':>6}  最近一期")
    for r in d["researchers"]:
        eq = r.get("equity") or {}
        c = r["closed"]
        print(f"{r['n']:10} {r['status']['label']:6} {r['hp']:>3} "
              f"{(eq.get('current_nav') or 0):>8.4f} {c['n']:>4} "
              f"{(c['hit_rate'] or 0)*100:>5.1f}%  {r['report']['date']}")
    f = finance()
    print(f"\n总花费 ${f['total_usd']:,.2f} · 研究员薪资 ${f['salary_usd']:,.2f} · 总部 ${f['overhead_usd']:,.2f}")
