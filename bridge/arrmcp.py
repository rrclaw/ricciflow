#!/usr/bin/env python3.11
"""arr MCP 适配器 —— 接自建的 Frontier AI Revenue Tracker。

arr.polyalpha.cn/mcp 是手写规范服务端（2026-07-28），比通用 MCP 客户端多两条硬要求：
  · `Mcp-Method` 每个请求都要带，值 = body 里的 method
  · `Mcp-Name` 只在 tools/call / resources/read / prompts/get 时要带，值 = 目标名
  · body 的 _meta 协议版本必须与 MCP-Protocol-Version 头一致
不满足就是 -32020，不是静默降级。所以这里不用现成 SDK，直接照规范拼。

只读、匿名、无状态。零依赖（stdlib urllib）。
"""
import json
import time
import urllib.request

ENDPOINT = "https://arr.polyalpha.cn/mcp"
PROTO = "2026-07-28"
TIMEOUT = 12
_CACHE = {}          # key -> (ts, payload)
_TTL = 1800


def _rpc(method, params=None, name=None):
    body = {"jsonrpc": "2.0", "id": 1, "method": method,
            "_meta": {"io.modelcontextprotocol/protocolVersion": PROTO}}
    if params is not None:
        body["params"] = params
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "MCP-Protocol-Version": PROTO,
        "Mcp-Method": method,
        "User-Agent": "ricciflow-kb-bridge/1.0",
    }
    if name:
        headers["Mcp-Name"] = name
    req = urllib.request.Request(ENDPOINT, data=json.dumps(body).encode(),
                                 headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        out = json.loads(r.read().decode())
    if "error" in out:
        raise RuntimeError(f"{out['error'].get('code')}: {out['error'].get('message')}")
    return out.get("result", {})


def call_tool(tool, args=None):
    """调一个工具，把 content[0].text 里的 JSON 解出来。"""
    res = _rpc("tools/call", {"name": tool, "arguments": args or {}}, name=tool)
    for blk in res.get("content", []):
        if blk.get("type") == "text":
            try:
                return json.loads(blk["text"])
            except Exception:
                return {"text": blk["text"]}
    return res


def _cached(key, fn):
    hit = _CACHE.get(key)
    if hit and time.time() - hit[0] < _TTL:
        return hit[1]
    val = fn()
    _CACHE[key] = (time.time(), val)
    return val


def tools():
    return _cached("tools", lambda: _rpc("tools/list").get("tools", []))


def companies():
    return _cached("companies", lambda: call_tool("list_companies"))


def peek(n=6):
    """数据源卡的「看一眼」：前 n 家实验室的 ARR 现值与隐含倍数。"""
    try:
        d = companies()
    except Exception as e:
        return {"ok": False, "error": str(e)}
    rows = d.get("companies", [])[:n]
    return {
        "ok": True,
        "as_of": d.get("as_of", ""),
        "items": [{
            "topic": r.get("company", ""),
            "arr": r.get("arr_now_usd_b"),
            "conf": r.get("arr_confirmed_usd_b"),
            "mult": r.get("implied_multiple"),
            "model": r.get("revenue_model", ""),
        } for r in rows],
    }


def series_list():
    """白名单序列目录。get_series 不带参数就返回可选清单，这是服务端刻意的设计
    （没有任意查询工具，避免把 databank 直通出去）。"""
    def go():
        d = call_tool("get_series")
        txt = d.get("text") or ""
        # 无参调用返回的是「# Call again with…」+ 一段 JSON，切出 JSON 再解
        i = txt.find("{")
        if i >= 0:
            try:
                return json.loads(txt[i:]).get("available", [])
            except Exception:
                pass
        return d.get("available", []) if isinstance(d, dict) else []
    return _cached("series_list", lambda: go())


def series(sid):
    return call_tool("get_series", {"series_id": sid})


def probe():
    """健康探针：工具数 + 覆盖公司数 + 数据日期。"""
    try:
        t = tools()
        d = companies()
        return {"ok": True, "tools": len(t), "companies": len(d.get("companies", [])),
                "as_of": d.get("as_of", "")}
    except Exception as e:
        return {"ok": False, "error": str(e)}


if __name__ == "__main__":
    print(json.dumps(probe(), ensure_ascii=False))
    print(json.dumps(peek(3), ensure_ascii=False, indent=1))
