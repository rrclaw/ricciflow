#!/usr/bin/env python3
"""ricciflow 静态服务：白名单 + no-cache。

🔴 2026-08-05 事故复盘：曾用 SimpleHTTPRequestHandler(directory=仓库根) 直接
服务整个 repo —— gitignore 只挡 Git，不挡文件服务器，结果 bridge/boss.secret、
bridge/npc/roster.json、bridge/cache/*.json 全部在公网可下载。

所以现在是**白名单**：只放行前端资产，默认拒绝。新目录要加进 ALLOW 才可见 ——
宁可页面缺资源（马上能看出来），也不要多放一个字节（永远看不出来）。
"""
import functools
import http.server
import os
import posixpath

ROOT = os.path.dirname(os.path.abspath(__file__))

# 根下具名文件 + 放行目录整棵。bridge/ 永远不进这个名单。
ALLOW_FILES = {"/", "/index.html", "/favicon.ico", "/manifest.webmanifest"}
ALLOW_DIRS = ("/src/", "/assets/")


def _allowed(path: str) -> bool:
    # 去 query/fragment 后规范化，杀 .. 与重复斜杠；点前缀段(.git/.env)直接拒
    p = posixpath.normpath(path.split("?", 1)[0].split("#", 1)[0])
    if not p.startswith("/"):
        p = "/" + p
    if any(seg.startswith(".") for seg in p.split("/") if seg):
        return False
    if p in ALLOW_FILES:
        return True
    return any(p.startswith(d) for d in ALLOW_DIRS)


class H(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        if not _allowed(self.path):
            self.send_error(404)          # 404 而非 403：不向探测者确认路径存在
            return None
        return super().send_head()

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, must-revalidate")
        super().end_headers()

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    http.server.ThreadingHTTPServer(
        ("127.0.0.1", 8330), functools.partial(H, directory=ROOT)
    ).serve_forever()
