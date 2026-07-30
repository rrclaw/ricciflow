#!/usr/bin/env python3.11
"""免费 A 股数据接口的真探针 —— baostock / pywencai / 通达信 / efinance。

这些源的通病是「装得上不代表还活着」：证券宝的数据可能停在某年、通达信的
免费行情服务器一批批失联、问财的 token 规则常改。所以卡片上的状态不写死，
每次「测试连接」都真去拉一条最近的数据回来，拉到什么就报什么。

每个探针跑在**子进程**里，不是线程。两个原因，都是踩过的：
  · 这些库会卡在 socket 上，线程杀不掉；子进程超时直接 kill。
  · `contextlib.redirect_stdout` 改的是全局 sys.stdout，不是线程局部的 ——
    一个卡住的探针线程会把主进程的 stdout 一起劫走，之后所有 print 全进它的
    StringIO 里消失。子进程天然隔离，顺带把库的启动横幅关在外面。

只读。零副作用。不落盘。
"""
import json
import os
import subprocess
import sys
import time
import warnings

warnings.filterwarnings("ignore")

_CACHE = {}
_TTL = 600


# ---------------------------------------------------------------- 各家探针
def _baostock():
    import baostock as bs
    lg = bs.login()
    rs = bs.query_history_k_data_plus(
        "sh.600519", "date,close", frequency="d",
        start_date=time.strftime("%Y-%m-%d", time.localtime(time.time() - 20 * 86400)),
        end_date=time.strftime("%Y-%m-%d"))
    rows = []
    while rs.error_code == "0" and rs.next():
        rows.append(rs.get_row_data())
    bs.logout()
    if not rows:
        return {"ok": False, "error": f"登录 {lg.error_code}，但取不到任何 K 线（数据可能已停更）"}
    return {"ok": True, "items": [{"topic": f"贵州茅台 {r[0]}", "date": r[0], "close": r[1]} for r in rows[-5:]],
            "note": f"{len(rows)} 根日线，最新 {rows[-1][0]}"}


def _pywencai():
    import pywencai
    d = pywencai.get(query="今日涨幅前5的股票", loop=True)
    if d is None:
        return {"ok": False, "error": "问财返回空（token 规则常变，多半是被挡了）"}
    if hasattr(d, "columns"):
        cols = [c for c in d.columns if "股票简称" in c or "code" in c.lower()]
        name_col = cols[0] if cols else d.columns[0]
        items = [{"topic": str(v)} for v in list(d[name_col])[:5]]
        return {"ok": True, "items": items, "note": f"{d.shape[0]} 行 × {d.shape[1]} 列"}
    return {"ok": True, "items": [{"topic": str(type(d).__name__)}], "note": "返回非表格结构"}


TDX_HOSTS = [("119.147.212.81", 7709), ("123.125.108.90", 7709),
             ("180.153.18.170", 7709), ("218.108.98.244", 7709),
             ("115.238.90.165", 7709), ("124.71.187.122", 7709)]


def _pytdx():
    from pytdx.hq import TdxHq_API
    api = TdxHq_API(raise_exception=True)
    tried = []
    for h, p in TDX_HOSTS:
        try:
            with api.connect(h, p, time_out=3):
                q = api.get_security_quotes([(1, "600519"), (0, "000001")])
                if not q:
                    tried.append(f"{h} 连上但无报价")
                    continue
                return {"ok": True, "note": f"服务器 {h} 可用（试了 {len(tried)+1} 个）",
                        "items": [{"topic": f"{x['code']} 现价 {x['price']}"} for x in q]}
        except Exception as e:
            tried.append(f"{h} {type(e).__name__}")
    return {"ok": False, "error": "免费行情服务器全部失联：" + "；".join(tried[:4])}


def _efinance():
    import efinance as ef
    df = ef.stock.get_quote_history(
        "600519",
        beg=time.strftime("%Y%m%d", time.localtime(time.time() - 20 * 86400)),
        end=time.strftime("%Y%m%d"))
    if df is None or not len(df):
        return {"ok": False, "error": "东财接口返回空"}
    tail = df.tail(5)
    return {"ok": True, "note": f"{len(df)} 根日线，最新 {tail.iloc[-1]['日期']}",
            "items": [{"topic": f"贵州茅台 {r['日期']}", "date": str(r['日期']),
                       "close": float(r['收盘'])} for _, r in tail.iterrows()]}


PROBES = {
    "baostock": (_baostock, 25),
    "pywencai": (_pywencai, 40),
    "pytdx":    (_pytdx, 30),
    "efinance": (_efinance, 25),
}


def probe(sid, force=False):
    """探一个源。缓存 10 分钟 —— 这些接口都慢，别让点两下界面就打四遍上游。"""
    if sid not in PROBES:
        return {"ok": False, "error": f"没有 {sid} 的探针"}
    hit = _CACHE.get(sid)
    if hit and not force and time.time() - hit[0] < _TTL:
        return hit[1]
    secs = PROBES[sid][1]
    t0 = time.time()
    out = _run_child(sid, secs)
    out["elapsed"] = round(time.time() - t0, 1)
    out["probed_at"] = time.strftime("%Y-%m-%d %H:%M")
    _CACHE[sid] = (time.time(), out)
    return out


def _run_child(sid, secs):
    """子进程里跑一个探针，只信它最后一行的 JSON。超时就整棵进程树砍掉。"""
    cmd = [sys.executable, os.path.abspath(__file__), "--one", sid]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=secs,
                           start_new_session=True)
    except subprocess.TimeoutExpired:
        return {"ok": False, "error": f"超时（{secs}s 没回），已终止"}
    except Exception as e:
        return {"ok": False, "error": f"{type(e).__name__}: {str(e)[:160]}"}
    for line in reversed((r.stdout or "").strip().splitlines()):
        line = line.strip()
        if line.startswith("{"):
            try:
                return json.loads(line)
            except Exception:
                continue
    err = (r.stderr or "").strip().splitlines()
    return {"ok": False, "error": "子进程没给出结果：" + (err[-1][:160] if err else f"rc={r.returncode}")}


def probe_all(force=False):
    from concurrent.futures import ThreadPoolExecutor
    # 这里的线程只在等子进程，卡不住
    with ThreadPoolExecutor(max_workers=4) as ex:
        futs = {sid: ex.submit(probe, sid, force) for sid in PROBES}
        return {sid: f.result() for sid, f in futs.items()}


def _main_one(sid):
    """子进程入口：把结果作为最后一行 JSON 打出来，然后硬退（库的线程会拖住 atexit）。"""
    fn = PROBES[sid][0]
    try:
        out = fn()
    except Exception as e:
        out = {"ok": False, "error": f"{type(e).__name__}: {str(e)[:200]}"}
    sys.stdout.write("\n" + json.dumps(out, ensure_ascii=False) + "\n")
    sys.stdout.flush()
    os._exit(0)


if __name__ == "__main__":
    if "--one" in sys.argv:
        _main_one(sys.argv[sys.argv.index("--one") + 1])
    for sid, r in probe_all(force=True).items():
        flag = "OK  " if r.get("ok") else "FAIL"
        print(f"{sid:10} {flag} {r.get('elapsed', 0):5.1f}s  {r.get('note') or r.get('error')}")
        for it in (r.get("items") or [])[:3]:
            print("            ·", it.get("topic"))
    # 卡住的探针线程会被 atexit 的 join 等到天亮，命令行下直接硬退
    sys.stdout.flush()
    os._exit(0)
