#!/usr/bin/env python3
"""Render the hero poster from the real scene, after a build.

The hero paints itself on a <canvas>, so the no-JS fallback poster has to come
from that same renderer — otherwise the fallback and the live scene disagree.
This script serves dist/, loads a minimal page that mounts only the scene, and
screenshots it at the artwork's logical size (1672x941 @ 1x), so the poster is
pixel-identical to the first painted frame and needs no upscaling.

Usage:  npm run build && python3 tools/make_poster.py
"""
from __future__ import annotations

import http.server
import re
import shutil
import socket
import subprocess
import tempfile
import threading
from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parents[1]
DIST = REPO / "dist"
POSTER = REPO / "public" / "art" / "scene-poster.jpg"
BASE = "/limitless-labs/"
LOGICAL = (1672, 941)
BUDGET_MS = 6000

PAGE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>poster</title>
<style>
  html, body { margin: 0; padding: 0; background: #123c47; }
  #hero { position: fixed; inset: 0; }
  .landscape { position: absolute; inset: 0; overflow: hidden; }
  .landscape canvas { display: block; width: 100%; height: 100%; }
</style></head>
<body>
  <section id="hero" data-scene-backdrop="__BACKDROP__">
    <div class="landscape"><canvas id="orbitCanvas"></canvas></div>
  </section>
  <script type="module" src="__SCRIPT__"></script>
</body></html>
"""


def build_page(script: str) -> str:
    return PAGE.replace("__BACKDROP__", f"{BASE}art/backdrop.jpg").replace(
        "__SCRIPT__", script
    )


def find_browser() -> str:
    for name in ("google-chrome", "chromium", "chromium-browser", "chrome"):
        found = shutil.which(name)
        if found:
            return found
    raise SystemExit("no Chromium/Chrome binary found on PATH")


def main() -> None:
    if not (DIST / "index.html").is_file():
        raise SystemExit("dist/ not found — run `npm run build` first")

    browser = find_browser()
    index = (DIST / "index.html").read_text(encoding="utf-8")
    match = re.search(r'src="([^"]*/_astro/[^"]+\.js)"', index)
    if not match:
        raise SystemExit("could not find the built hero script in dist/index.html")
    script = match.group(1)

    work = Path(tempfile.mkdtemp(prefix="poster-"))
    root = work / "limitless-labs"
    shutil.copytree(DIST, root)
    (root / "poster.html").write_text(build_page(script), encoding="utf-8")

    handler = lambda *args, **kwargs: http.server.SimpleHTTPRequestHandler(  # noqa: E731
        *args, directory=str(work), **kwargs
    )
    handler.log_message = lambda *args, **kwargs: None  # type: ignore[attr-defined]

    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]

    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    shot = work / "poster.png"
    # Fixed frame: the poster shows the scene mid-session (screen awake, part of
    # the writing drawn) and is byte-reproducible across runs.
    url = f"http://127.0.0.1:{port}{BASE}poster.html?frame=9"
    command = [
        browser,
        "--headless",
        "--disable-gpu",
        "--no-sandbox",
        "--hide-scrollbars",
        "--force-device-scale-factor=1",
        f"--window-size={LOGICAL[0]},{LOGICAL[1]}",
        f"--virtual-time-budget={BUDGET_MS}",
        f"--screenshot={shot}",
        url,
    ]
    try:
        subprocess.run(command, check=True, capture_output=True)
    finally:
        server.shutdown()
        server.server_close()

    with Image.open(shot) as image:
        poster = image.convert("RGB")
        poster.save(POSTER, "JPEG", quality=90, optimize=True, progressive=True)
        print(f"wrote {POSTER} ({POSTER.stat().st_size} bytes, {poster.size})")

    shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    main()
