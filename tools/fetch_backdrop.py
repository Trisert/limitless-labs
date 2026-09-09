#!/usr/bin/env python3
"""Fetch (or regenerate) the original AI-painted hero backdrop.

The artwork is an original illustration generated with a free,
no-key provider (Pollinations.ai, model=flux) from the prompt below.
It is NOT the reference site's artwork: prompt, seed and composition
targets are ours, tuned so the painted river/sky fit this repo's
Canvas 2D overlay anchors (water shimmer band, robot perch, copy zone).

Reproducible: same prompt + seed returns the same bytes from the
provider; the file is then upscaled to the scene's logical size
(1672x941) with LANCZOS and saved as quality-80 JPEG.

Usage:  python3 tools/fetch_backdrop.py
Output: public/art/backdrop-ai.jpg
"""
from __future__ import annotations

import sys
import urllib.parse
import urllib.request
from pathlib import Path

PROMPT = (
    "Painterly storybook matte-painting landscape, wide 16:9: luminous open "
    "morning sky occupying the left two thirds, almost empty for text overlay, "
    "rolling emerald hills, a winding river crossing the lower third from the "
    "bottom-left corner to the right edge, dewy meadow foreground with "
    "wildflowers, a leafy tree branch framing only the top-right corner, small "
    "warm sun glow in the upper right, distant misty blue hills, soft visible "
    "brush texture, tranquil greens and sky blues with warm golden accents, no "
    "buildings, no people, no robots, no animals, no text, no watermark"
)
SEED = 3701
WIDTH, HEIGHT = 1672, 941
OUT = Path(__file__).resolve().parents[1] / "public" / "art" / "backdrop-ai.jpg"


def main() -> None:
    try:
        from PIL import Image
    except ImportError:
        print("Pillow is required: pip install pillow", file=sys.stderr)
        raise SystemExit(1)
    url = (
        "https://image.pollinations.ai/prompt/" + urllib.parse.quote(PROMPT)
        + f"?width=1536&height=864&nologo=true&model=flux&seed={SEED}"
    )
    print("fetching:", url[:120], "...")
    with urllib.request.urlopen(url, timeout=300) as response:
        raw = response.read()
    tmp = OUT.with_suffix(".fetch.tmp")
    tmp.write_bytes(raw)
    with Image.open(tmp) as image:
        art = image.convert("RGB").resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
        art.save(OUT, "JPEG", quality=80, optimize=True, progressive=True)
    tmp.unlink()
    print("wrote:", OUT, OUT.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
