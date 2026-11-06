#!/usr/bin/env python3
"""
Static server for local testing that never lets the browser cache anything.

The app has no `?v=` cache-busters any more — the service worker's versioned cache is
the caching mechanism now. That is correct for production, but during development it
means a stylesheet edit can be masked by the HTTP cache and you end up debugging code
that already works, or worse, the reverse.

This server sends `Cache-Control: no-store` on everything, so what you edit is what
you see. It is a development tool only — never use it to serve the real site.

    python3 scripts/serve.py [port]

Default port 8080.

Security headers
----------------
The app publishes to GitHub Pages, which does not send Content-Security-Policy as a
response header. Document CSP lives in each HTML `<meta>` tag, and that is what
production enforces. This server mirrors that: it does **not** send a CSP header, so
meta policy is what the browser sees (a CSP header would intersect with the meta and
could silently tighten `connect-src` on the test page or a service worker).

What it *does* send, for local framing and hardening that GitHub Pages also leaves
to the browser defaults:

  - launcher paths: `X-Frame-Options: DENY`
  - `/games/<id>/…`: `X-Frame-Options: SAMEORIGIN` so the launcher can iframe them
  - `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Robots-Tag`
  - `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`
  - `Cache-Control: no-store` (dev only — defeats the HTTP cache)

GitHub Pages cannot send any of these. They apply on this server only.
"""

import functools
import http.server
import socketserver
import socket
import sys
import os
import re
import urllib.parse

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DEV_OVERRIDES = {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
}

PERMISSIONS_POLICY = (
    "camera=(), microphone=(), geolocation=(), payment=(), clipboard-read=(), "
    "usb=(), midi=(), serial=(), display-capture=(), accelerometer=(), "
    "gyroscope=(), magnetometer=(), idle-detection=(), screen-wake-lock=(), "
    "browsing-topics=(), interest-cohort=()"
)

GAMES = ("blockfall", "klondike", "pacman", "pyramid", "word-puzzle")


def game_for_path(path):
    """Game id if `path` is under /games/<id>/, else None."""
    match = re.match(r"^/games/([^/]+)(/|$)", path)
    if not match:
        return None
    game = match.group(1)
    return game if game in GAMES else None


def for_path(path):
    """Hardening and framing headers for a request path. No CSP — see module docstring."""
    path = path.split("?")[0]
    if not path.startswith("/"):
        path = "/" + path

    headers = {
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        "Permissions-Policy": PERMISSIONS_POLICY,
        "X-Robots-Tag": "noindex, nofollow",
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Resource-Policy": "same-origin",
    }

    # This app's test page frames the game. GitHub Pages sends no framing header.
    headers["X-Frame-Options"] = "SAMEORIGIN"

    headers.update(DEV_OVERRIDES)
    return headers


class Policy:
    """Path → headers. Kept as a class so test_serve.py can keep `POLICY.for_path`."""

    def for_path(self, path):
        return for_path(path)


POLICY = Policy()

LOOPBACK_ADDRESSES = {"127.0.0.1", "::1", "::ffff:127.0.0.1"}


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    """SimpleHTTPRequestHandler plus headers that defeat every layer of browser cache."""

    def guess_type(self, path):
        if path.endswith("manifest.json") or path.endswith(".webmanifest"):
            return "application/manifest+json"
        return super().guess_type(path)

    def end_headers(self):
        path = urllib.parse.urlsplit(self.path).path
        for name, value in POLICY.for_path(path).items():
            self.send_header(name, value)
        super().end_headers()

    def send_head(self):
        path = urllib.parse.unquote(urllib.parse.urlsplit(self.path).path)
        if self.client_address[0] not in LOOPBACK_ADDRESSES:
            self.send_error(403, "Dev server accepts local connections only")
            return None
        if any(part.startswith(".") for part in path.split("/")):
            self.send_error(404, "File not found")
            return None
        return super().send_head()

    def log_message(self, fmt, *args):
        sys.stderr.write("  %s\n" % (fmt % args))


class DualStackServer(socketserver.ThreadingTCPServer):
    """
    Listens on IPv6 *and* IPv4, and serves more than one request at a time.

    Threading is required: a game frame with a service worker, a canvas and sound
    clips keeps several connections alive. A single-threaded server queues the next
    game behind those keep-alives and the launcher shows "failed to load".

    Binding :: with AF_INET6 accepts IPv4 as v4-mapped addresses, so localhost
    works whether the browser prefers ::1 or 127.0.0.1.
    """

    address_family = socket.AF_INET6
    allow_reuse_address = True
    daemon_threads = True

    def server_bind(self):
        if hasattr(socket, "IPPROTO_IPV6") and hasattr(socket, "IPV6_V6ONLY"):
            try:
                self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
            except OSError:
                pass
        socketserver.TCPServer.server_bind(self)


class IPv4Server(socketserver.ThreadingTCPServer):
    """Fallback for a host with no usable IPv6 stack at all."""

    allow_reuse_address = True
    daemon_threads = True


def pick_server():
    """Dual-stack where possible, plain IPv4 otherwise."""
    if socket.has_ipv6:
        probe = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
        try:
            probe.bind(("::1", 0))
            return DualStackServer, "::"
        except OSError:
            pass
        finally:
            probe.close()
    return IPv4Server, "0.0.0.0"


if __name__ == "__main__":
    ServerClass, HOST = pick_server()
    handler = functools.partial(NoCacheHandler, directory=ROOT)

    with ServerClass((HOST, PORT), handler) as httpd:
        banner = [
            f"Seclusa Klondike — dev server on http://127.0.0.1:{PORT}/  (caching disabled)",
            f"  bound {HOST}  — local connections only; localhost and 127.0.0.1 both work",
            "  framing headers from scripts/serve.py; document CSP is the HTML <meta>",
        ]
        print("\n".join(banner), flush=True)
        httpd.serve_forever()
