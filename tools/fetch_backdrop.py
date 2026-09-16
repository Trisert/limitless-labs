#!/usr/bin/env python3
"""Fetch the original hero painting and export it at hero resolution.

Artwork is generated with the free, keyless Pollinations endpoint (model=flux).
The anonymous tier returns 1024x576 regardless of the requested size, so the
export pipeline does the resolution work explicitly:

  1024x576 source -> LANCZOS to 2048x1152 -> unsharp mask -> fine canvas grain
  -> JPEG q88

2048 wide means the browser always *downscales* the artwork for the hero (even
at devicePixelRatio 2 on a 1024px-wide viewport), which is what keeps it from
looking soft. All the crisp detail in the scene (desk, laptop, papers, arm,
foliage, grass) is drawn as vector work in src/scripts/hero-scene.mjs, not
baked into this image.

Usage:  python3 tools/fetch_backdrop.py [seed]
"""
from __future__ import annotations

import random
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

PROMPT = (
    "Storybook matte painting landscape, wide 16:9, bright high-key daylight: "
    "luminous pale blue sky with soft white clouds filling the left two thirds, "
    "low sunlit green rolling hills on the horizon, a sparkling narrow stream "
    "winding across the lower left toward the centre, lush green meadow with "
    "wildflowers in the foreground, a big leafy tree canopy framing the top "
    "right corner, distant hazy blue mountains, airy pastel palette of sky "
    "blue mint green warm sand and soft gold, soft visible brushwork, no desk, "
    "no furniture, no buildings, no people, no robots, no animals, no text, "
    "no watermark"
)
SEED = 6101
EXPORT = (2048, 1152)
OUT = Path(__file__).resolve().parents[1] / "public" / "art" / "backdrop-ai.jpg"


def fetch(seed: int) -> bytes:
    url = (
        "https://image.pollinations.ai/prompt/"
        + urllib.parse.quote(PROMPT)
        + f"?width=1024&height=576&nologo=true&model=flux&seed={seed}"
    )
    print(f"fetching seed {seed} …")
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/126.0 Safari/537.36",
            "Accept": "image/jpeg,image/*;q=0.8",
        },
    )
    with urllib.request.urlopen(request, timeout=280) as response:
        return response.read()


def canvas_grain(image: Image.Image, strength: int = 5) -> Image.Image:
    """Paint texture: fine deterministic noise, so it reads as a painting
    rather than a soft photo when the browser scales it."""
    rng = random.Random(97)
    small = Image.new("L", (image.width // 6, image.height // 6))
    pixels = small.load()
    assert pixels is not None
    for y in range(small.height):
        for x in range(small.width):
            pixels[x, y] = rng.randrange(256)
    noise = small.resize(image.size, Image.Resampling.BILINEAR)
    layer = Image.new("RGBA", image.size, (255, 255, 255, 0))
    mask = noise.point(lambda value: strength if value > 132 else 0)
    layer.putalpha(mask)
    return Image.alpha_composite(image.convert("RGBA"), layer).convert("RGB")


def sharpen(image: Image.Image) -> Image.Image:
    """Detail pass: unsharp edges plus a true high-pass add on luminance, which
    is what gives a 1k-source painting some bite once the browser scales it."""
    import numpy as np

    edges = image.filter(ImageFilter.UnsharpMask(radius=1.2, percent=120, threshold=2))
    blurred = image.filter(ImageFilter.GaussianBlur(2.2))
    base = np.asarray(image, dtype=np.float32)
    low = np.asarray(blurred, dtype=np.float32)
    detail = np.clip(base + (base - low) * 0.7, 0, 255)
    sharpened = np.asarray(edges, dtype=np.float32) * 0.55 + detail * 0.45
    return Image.fromarray(np.clip(sharpened, 0, 255).astype(np.uint8), "RGB")


def main() -> None:
    seed = int(sys.argv[1]) if len(sys.argv) > 1 else SEED
    raw = fetch(seed)
    tmp = OUT.with_suffix(".fetch.tmp")
    tmp.write_bytes(raw)
    with Image.open(tmp) as source:
        print(f"source: {source.size}")
        art = source.convert("RGB").resize(EXPORT, Image.Resampling.LANCZOS)
    art = art.filter(ImageFilter.UnsharpMask(radius=2.0, percent=80, threshold=3))
    art = sharpen(art)
    art = canvas_grain(art)
    art.save(OUT, "JPEG", quality=88, optimize=True, progressive=True)
    tmp.unlink()
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes, {art.size[0]}x{art.size[1]})")


if __name__ == "__main__":
    main()
