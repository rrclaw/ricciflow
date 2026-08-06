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
import signal
import time
import warnings

warnings.filterwarnings("ignore")

_CACHE = {}
_TTL = 600



# 🔴 2026-08-05 实战教训：两个进程各占一个满核空转了 6 天 8 小时才被发现。
# 根因不是网络卡住，是 **baostock 的 bs.login() 在自己内部空转**（实测：0.2s 走到
# login，之后永不返回，CPU 100%）。进程内关不住它——socket.setdefaulttimeout 试过，
# 无效；Python 也杀不掉一个不配合的线程。**唯一可靠的containment 是进程级**，
# 也就是本文件已有的 _run_child(子进程 + 超时 + 杀进程组)。
#
# 那次事故的真正触发方式是：有人 `import freeapi` 后**直接调探针函数**（或调 probe()
# 之外的内部函数），绕过了子进程那条路，于是超时保护根本不生效，父进程一死就成孤儿。
# 所以把危险路径堵死，而不是写句注释提醒自己别走。
_IN_CHILD = False   # 只有 --one 子进程入口会置 True


def _child_only(name):
    """探针函数只准在 --one 子进程里执行；进程内直调一律拒绝。"""
    if not _IN_CHILD:
        raise RuntimeError(
            f"{name} 只能通过 probe('{name.strip(chr(95))}') 走子进程调用。"
            "直接在进程内调用没有超时保护，baostock 一类的库会把你的进程挂死"
            "(2026-08-05 事故: 满核空转 6 天)。")


# ---------------------------------------------------------------- 各家探针
def _baostock():
    _child_only("_baostock")
    import baostock as bs
    lg = bs.login()
    rs = bs.query_history_k_data_plus(
        "sh.600519", "date,close", frequency="d",
        start_date=time.strftime("%Y-%m-%d", time.localtime(time.time() - 20 * 86400)),
        end_date=time.strftime("%Y-%m-%d"))
    # 🔴 死循环闸（2026-08-05 补，实战教训）：baostock 的 rs.next() 在连接掉线/服务端
    # 异常时会一直返回 True 而**不推进游标**，这个 while 就变成无 sleep 的满速空转。
    # （注：6 天那次事故的根因是上面的 bs.login()，不是这个循环；这道闸是独立的防御，
    #   因为 rs.next() 不推进游标这件事本身也确实会空转。）
    # 行数上限比时间更硬：只取 20 天日线，正常 15 根左右，过 5000 一定是游标坏了。
    MAX_ROWS, DEADLINE = 5000, time.time() + 20
    rows, stalled = [], None
    while rs.error_code == "0" and rs.next():
        rows.append(rs.get_row_data())
        if len(rows) > MAX_ROWS:
            stalled = f"游标不推进（已读 {len(rows)} 行，20 天日线不可能这么多）"
            break
        if time.time() > DEADLINE:
            stalled = f"读取超 20s（已读 {len(rows)} 行）"
            break
    bs.logout()
    if stalled:
        return {"ok": False, "error": f"baostock 返回异常：{stalled}"}
    if not rows:
        return {"ok": False, "error": f"登录 {lg.error_code}，但取不到任何 K 线（数据可能已停更）"}
    return {"ok": True, "items": [{"topic": f"贵州茅台 {r[0]}", "date": r[0], "close": r[1]} for r in rows[-5:]],
            "note": f"{len(rows)} 根日线，最新 {rows[-1][0]}"}


def _pywencai():
    _child_only("_pywencai")
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
    _child_only("_pytdx")
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
    _child_only("_efinance")
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
    # start_new_session=True 把子进程放进独立进程组, 就是为了能整组砍。
    # 但 subprocess.run 超时时只 kill 直接子进程, 孙进程会活下来变孤儿 —— 得自己 killpg。
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                            text=True, start_new_session=True)
    try:
        out, err = proc.communicate(timeout=secs)
        r = subprocess.CompletedProcess(cmd, proc.returncode, out, err)
    except subprocess.TimeoutExpired:
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
        except (ProcessLookupError, PermissionError):
            proc.kill()
        proc.wait(timeout=5)
        return {"ok": False, "error": f"超时（{secs}s 没回），已连同子孙进程一起终止"}
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
    global _IN_CHILD
    _IN_CHILD = True          # ← 唯一放行点: 只有这条路有子进程超时兜底
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
