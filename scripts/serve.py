#!/usr/bin/env python3
"""
Simple local dev server for the Embedding Projector.

Run from the repo root:
    python scripts/serve.py

Then open http://localhost:8000 in your browser.
Pass --port to change the port.
"""

import argparse
import http.server
import os
import socketserver


class CORSHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def log_message(self, fmt, *args):
        print(f"  {self.address_string()} - {fmt % args}")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--port", type=int, default=8000)
    p.add_argument("--host", default="localhost")
    args = p.parse_args()

    # Always serve from the repo root regardless of cwd
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(repo_root)

    with socketserver.TCPServer((args.host, args.port), CORSHandler) as httpd:
        httpd.allow_reuse_address = True
        url = f"http://{args.host}:{args.port}"
        print(f"Serving Embedding Projector at {url}")
        print(f"  Default config : data/projector_config.json")
        print(f"  Demo datasets  : {url}?config=oss_data/oss_demo_projector_config.json")
        print("Press Ctrl-C to stop.\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")


if __name__ == "__main__":
    main()
