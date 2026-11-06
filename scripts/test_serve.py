#!/usr/bin/env python3
"""Checks the local server headers and that the game page is self-contained."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import serve  # noqa: E402

ROOT = serve.ROOT
failures = []


def check(condition, description):
    if not condition:
        failures.append(description)


headers = serve.POLICY.for_path("/index.html")
check(headers.get("X-Frame-Options") == "SAMEORIGIN", "index is SAMEORIGIN so tests can frame it")
check("Content-Security-Policy" not in headers, "server does not send a CSP header")
check(headers.get("Cache-Control", "").startswith("no-store"), "dev server disables caching")
check(headers.get("X-Robots-Tag") == "noindex, nofollow", "robots tag is set")

index = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
check('rel="manifest"' in index, "index links a manifest")
check('name="version"' in index, "index carries a version meta")
check("../../" not in index, "index does not reach outside this app")
check("stand.js" in index, "index loads the app menu")

manifest = open(os.path.join(ROOT, "manifest.json"), encoding="utf-8").read()
check('"version"' in manifest, "manifest has a version")
check('"start_url"' in manifest, "manifest has a start_url")

if failures:
    print("FAIL")
    for item in failures:
        print(" -", item)
    sys.exit(1)

print("ok")
