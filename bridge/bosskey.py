#!/usr/bin/env python3.11
"""老板钥匙 —— 每日一换，只能在本机终端拿。

以前是一把长期不变的 10 位静态密码：存进浏览器就一直有效，泄漏了也不会自己失效。
现在改成按天派生：

    今日钥匙 = HMAC-SHA256(本机密钥, "ricciflow:<YYYY-MM-DD>") 的前 10 位十进制

  · 本机密钥（boss.secret）**只生成一次、永不出本机、不进 git**。没有它推不出任何一天的钥匙。
  · 钥匙不需要存服务端 —— 桥每次现算今天的那把来比对，所以「改密码」这件事不存在，
    时间到了旧的自动作废。
  · 想拿今天的钥匙，只有一条路：在这台机器的终端上跑一次
        python3.11 bridge/bosskey.py

跨零点的宽限：凌晨 0 点到 GRACE_UNTIL 点之间，昨天的钥匙仍然收。
理由很实际 —— 深夜开着页面干活，不该在零点整被踢出去。过了这个点昨天的就死了。

零依赖：stdlib hmac/hashlib。
"""
import hashlib
import hmac
import os
import secrets
import sys
import time
from pathlib import Path

HERE = Path(__file__).parent
SECRET_FILE = HERE / "boss.secret"
LEGACY_KEY = HERE / "boss.key"          # 旧的静态钥匙，迁移后不再被信任
DIGITS = 10
GRACE_UNTIL = 4                          # 凌晨 4 点前仍收昨天的钥匙


def _secret():
    """本机密钥。不存在就生成一把，权限收到 0600。"""
    if SECRET_FILE.exists():
        s = SECRET_FILE.read_bytes().strip()
        if len(s) >= 32:
            return s
    s = secrets.token_hex(32).encode()
    SECRET_FILE.write_bytes(s)
    try:
        os.chmod(SECRET_FILE, 0o600)
    except OSError:
        pass
    return s


def key_for(day):
    """某一天的钥匙。纯派生，不落盘 —— 服务端不存钥匙，只现算。"""
    mac = hmac.new(_secret(), f"ricciflow:{day}".encode(), hashlib.sha256).digest()
    n = int.from_bytes(mac[:8], "big") % (10 ** DIGITS)
    return str(n).zfill(DIGITS)


def today():
    return time.strftime("%Y-%m-%d")


def yesterday():
    return time.strftime("%Y-%m-%d", time.localtime(time.time() - 86400))


def valid_keys():
    """此刻收哪几把。跨零点宽限期内昨天的还算数。"""
    ks = [key_for(today())]
    if time.localtime().tm_hour < GRACE_UNTIL:
        ks.append(key_for(yesterday()))
    return ks


def check(tok):
    """常量时间比对，逐个试今天/宽限期内的昨天。"""
    return any(hmac.compare_digest(tok or "", k) for k in valid_keys())


def _expiry_hint():
    now = time.localtime()
    left = (24 - now.tm_hour - 1) * 60 + (60 - now.tm_min)
    return f"{left // 60} 小时 {left % 60} 分后失效（本地零点换）"


if __name__ == "__main__":
    fresh = not SECRET_FILE.exists()
    k = key_for(today())
    print()
    print(f"  今日老板钥匙  {k}")
    print(f"  日期          {today()}")
    print(f"  有效期        {_expiry_hint()}，凌晨 {GRACE_UNTIL} 点前旧钥匙仍收")
    print()
    if fresh:
        print(f"  已生成本机密钥 {SECRET_FILE}（0600，不进 git）。")
        print("  这把密钥推得出任何一天的钥匙，别复制出去。")
        print()
    if LEGACY_KEY.exists():
        print("  ⚠ 检测到旧的静态钥匙 bridge/boss.key —— 它已经不被信任了。")
        print("    删掉它就行：rm bridge/boss.key")
        print()
    if "--json" in sys.argv:
        import json
        print(json.dumps({"date": today(), "key": k}, ensure_ascii=False))
