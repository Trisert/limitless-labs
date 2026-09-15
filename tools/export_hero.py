#!/usr/bin/env python3
"""Export the generated hero painting into public/art/ at native hero size.

The image generator returns 1672x941 (the scene's logical size), so this is a
format/optimisation pass only — no upscaling. A light unsharp keeps the
brushwork crisp once the browser scales for smaller viewports.

Usage: python3 tools/export_hero.py <source.png> [dest-basename]
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageFilter

REPO = Path(__file__).resolve().parents[1]
LOGICAL = (1672, 941)


def main() -> None:
    source = Path(sys.argv[1])
    name = sys.argv[2] if len(sys.argv) > 2 else "backdrop.jpg"
    image = Image.open(source).convert("RGB")
    print(f"source {source.name}: {image.size} {image.mode}")
    if image.size != LOGICAL:
        image = image.resize(LOGICAL, Image.Resampling.LANCZOS)
        print(f"resized to {LOGICAL}")
    art = image.filter(ImageFilter.UnsharpMask(radius=1.1, percent=70, threshold=3))
    target = REPO / "public" / "art" / name
    art.save(target, "JPEG", quality=90, optimize=True, progressive=True)
    print(f"wrote {target} ({target.stat().st_size} bytes, {art.size[0]}x{art.size[1]})")


if __name__ == "__main__":
    main()
