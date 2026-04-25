#!/usr/bin/env python3
"""
Simple local dev server for the Embedding Projector.

Run from the repo root:
    python scripts/serve.py

Then open the printed URL in any browser on the same Wi-Fi network,
including your phone. Pass --port to change the port.
"""

import argparse
import http.server
import os
import socket
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
    p.add_argument("--host", default="0.0.0.0")
    args = p.parse_args()

    # Always serve from the repo root regardless of cwd
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(repo_root)

    # Resolve a human-readable LAN IP for the "open on phone" hint
    try:
        lan_ip = socket.gethostbyname(socket.gethostname())
    except Exception:
        lan_ip = "YOUR_MACHINE_IP"

    with socketserver.TCPServer((args.host, args.port), CORSHandler) as httpd:
        httpd.allow_reuse_address = True
        local_url = f"http://localhost:{args.port}"
        lan_url   = f"http://{lan_ip}:{args.port}"
        print(f"Serving Embedding Projector")
        print(f"  Local  : {local_url}")
        print(f"  Network: {lan_url}  ← open this on your phone (same Wi-Fi)")
        print(f"  Demo datasets: {lan_url}?config=oss_data/oss_demo_projector_config.json")
        print("Press Ctrl-C to stop.\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")


if __name__ == "__main__":
    main()
