#!/usr/bin/env python3
"""Static dev server for the GIS game (repo root). Usage: python3 serve.py [port]"""
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8137


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".webmanifest": "application/manifest+json",
        ".json": "application/json",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


if __name__ == "__main__":
    with ThreadingHTTPServer(("", PORT), Handler) as httpd:
        print(f"Serving {ROOT} on http://localhost:{PORT}")
        httpd.serve_forever()
