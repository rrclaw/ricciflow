#!/usr/bin/env python3
"""ricciflow 静态服务：SimpleHTTPRequestHandler + no-cache 头。
浏览器每次都取新文件，改完即生效，不再有旧 JS 缓存坑。"""
import os
import http.server
import functools

class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, must-revalidate')
        super().end_headers()
    def log_message(self, *a):
        pass

if __name__ == '__main__':
    http.server.ThreadingHTTPServer(('127.0.0.1', 8330),
        functools.partial(H, directory=os.path.dirname(os.path.abspath(__file__)))).serve_forever()
