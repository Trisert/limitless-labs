#!/usr/bin/env python3
"""Generate the original illustrated layers used by the portfolio hero."""
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

W, H = 1672, 941
OUT = Path(__file__).resolve().parents[1] / "public" / "art"
OUT.mkdir(parents=True, exist_ok=True)


def lerp(a: tuple[int, int, int], b: tuple[int, int, int], t: float):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def gradient(size, top, bottom, split=1.0):
    image = Image.new("RGB", size)
    pixels = image.load()
    for y in range(size[1]):
        t = min(1.0, y / (size[1] * split))
        color = lerp(top, bottom, t)
        for x in range(size[0]):
            pixels[x, y] = color
    return image.convert("RGBA")


def composite_glow(base, center, radius, color, alpha):
    glow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for r in range(radius, 0, -12):
        factor = (radius - r) / radius
        a = round(alpha * factor * factor)
        gd.ellipse((center[0] - r, center[1] - r, center[0] + r, center[1] + r), fill=(*color, a))
    base.alpha_composite(glow.filter(ImageFilter.GaussianBlur(18)))


def backdrop():
    # Retired: the hero base is now an original AI-painted illustration
    # (public/art/backdrop-ai.jpg, see tools/fetch_backdrop.py). This stub
    # stays so `generate_scene_art.py` keeps producing cloud/canopy/robot
    # without recreating the old procedural backdrop.png.
    return
    image = gradient((W, H), (35, 112, 169), (157, 211, 211), 0.7)
    draw = ImageDraw.Draw(image, "RGBA")
    composite_glow(image, (1365, 222), 185, (255, 222, 139), 70)
    draw.ellipse((1292, 149, 1438, 295), fill=(255, 222, 139, 255))

    # Quiet distant hills keep the left copy zone calm and open.
    draw.polygon([(0, 560), (290, 490), (540, 530), (790, 430), (1030, 510), (1280, 380), (1672, 350), (1672, 710), (0, 710)], fill=(87, 143, 111, 255))
    draw.polygon([(520, 620), (775, 500), (1010, 555), (1195, 445), (1450, 398), (1672, 430), (1672, 760), (450, 760)], fill=(73, 128, 90, 255))
    draw.polygon([(820, 635), (1070, 525), (1230, 560), (1390, 455), (1672, 470), (1672, 795), (760, 795)], fill=(54, 109, 80, 255))

    # A winding blue stream gives the animation a visible water target.
    water = [(240, 941), (450, 850), (610, 780), (750, 742), (885, 710), (1015, 700), (1165, 720), (1305, 788), (1450, 855), (1672, 920), (1672, 941)]
    draw.polygon(water, fill=(54, 137, 177, 255))
    draw.polygon([(270, 941), (500, 850), (665, 793), (820, 764), (990, 755), (1160, 778), (1310, 840), (1500, 910), (1672, 935), (1672, 941)], fill=(70, 160, 196, 220))
    for y in range(790, 930, 28):
        x = 570 + int((y - 790) * 1.9)
        draw.line((x, y, min(W, x + 250), y - 18), fill=(180, 225, 221, 90), width=4)

    # Foreground meadow and loose painted grass.
    draw.polygon([(0, 650), (210, 620), (430, 690), (580, 676), (760, 725), (940, 700), (1110, 756), (1320, 740), (1672, 805), (1672, 941), (0, 941)], fill=(25, 76, 70, 255))
    draw.polygon([(0, 780), (240, 730), (470, 780), (690, 750), (900, 820), (1130, 770), (1400, 825), (1672, 790), (1672, 941), (0, 941)], fill=(16, 58, 58, 255))
    rng = random.Random(11)
    for _ in range(620):
        x = rng.randrange(W)
        y = rng.randrange(675, H)
        height = rng.randrange(5, 22)
        color = rng.choice([(49, 111, 84, 145), (83, 137, 91, 145), (23, 82, 77, 160)])
        draw.line((x, y, x + rng.randrange(-7, 8), y - height), fill=color, width=rng.choice([1, 2, 3]))

    # Original observatory workbench on the right-hand subject zone.
    draw.ellipse((1082, 682, 1580, 790), fill=(8, 43, 46, 115))
    draw.polygon([(1110, 563), (1440, 530), (1570, 600), (1240, 641)], fill=(208, 175, 111, 255))
    draw.polygon([(1240, 641), (1570, 600), (1560, 708), (1240, 755)], fill=(126, 93, 67, 255))
    draw.polygon([(1110, 563), (1240, 641), (1240, 755), (1140, 698)], fill=(161, 121, 78, 255))
    draw.line((1130, 579, 1437, 547), fill=(255, 230, 165, 180), width=7)
    draw.polygon([(1334, 520), (1370, 394), (1402, 397), (1382, 530)], fill=(57, 77, 72, 255))
    draw.ellipse((1320, 373, 1445, 420), fill=(73, 94, 87, 255))
    draw.ellipse((1332, 383, 1435, 410), fill=(42, 120, 142, 255))
    draw.line((1381, 386, 1456, 330), fill=(239, 215, 153, 220), width=6)
    draw.ellipse((1450, 324, 1464, 338), fill=(240, 211, 128, 255))

    # Painterly grain, kept subtle so copy stays readable under the scrim.
    rng = random.Random(37)
    small = Image.new("L", (W // 8, H // 8))
    small_pixels = small.load()
    assert small_pixels is not None
    for y in range(small.height):
        for x in range(small.width):
            small_pixels[x, y] = rng.randrange(256)
    noise = small.resize((W, H), Image.Resampling.BILINEAR)
    grain = Image.new("RGBA", (W, H), (255, 255, 255, 0))
    grain.putalpha(noise.point(lambda p: 7 if p > 130 else 0))
    image.alpha_composite(grain)
    image.convert("RGB").save(OUT / "backdrop.png", optimize=True)


def cloud_layer():
    image = Image.new("RGBA", (900, 300), (0, 0, 0, 0))
    shadow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow, "RGBA")
    sd.ellipse((130, 120, 700, 252), fill=(24, 87, 119, 75))
    shadow = shadow.filter(ImageFilter.GaussianBlur(22))
    image.alpha_composite(shadow)
    draw = ImageDraw.Draw(image, "RGBA")
    for box, color in [
        ((80, 80, 410, 235), (244, 247, 235, 215)),
        ((260, 30, 600, 230), (255, 250, 231, 232)),
        ((475, 95, 835, 242), (232, 242, 232, 195)),
    ]:
        draw.ellipse(box, fill=color)
    draw.ellipse((0, 148, 900, 280), fill=(239, 246, 235, 205))
    image.filter(ImageFilter.GaussianBlur(1.2)).save(OUT / "cloud.png", optimize=True)


def canopy_layer():
    image = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image, "RGBA")
    rng = random.Random(22)
    # Branches and a dense canopy framing the right edge.
    draw.line((1590, 520, 1535, 285, 1450, 90), fill=(35, 57, 49, 215), width=24)
    draw.line((1570, 390, 1655, 230, 1700, 110), fill=(48, 69, 53, 180), width=16)
    palette = [(26, 91, 70, 210), (40, 117, 75, 225), (77, 145, 82, 210), (116, 164, 88, 170), (22, 72, 67, 190)]
    for _ in range(310):
        x = rng.randrange(1370, 1710)
        y = rng.randrange(20, 520)
        radius = rng.randrange(22, 74)
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=rng.choice(palette))
    # A few foreground leaves reach into the subject zone.
    for x, y, r in [(1320, 365, 46), (1390, 280, 34), (1490, 170, 42), (1605, 560, 58)]:
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(21, 83, 68, 180))
    image.save(OUT / "canopy.png", optimize=True)


def robot_layer():
    image = Image.new("RGBA", (430, 470), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image, "RGBA")
    # Original industrial writing arm: a warm, low-poly machine over the desk.
    draw.ellipse((45, 399, 382, 464), fill=(18, 42, 43, 120))
    draw.rounded_rectangle((92, 320, 308, 432), radius=18, fill=(61, 77, 72, 255), outline=(218, 190, 132, 220), width=7)
    draw.rectangle((120, 344, 280, 405), fill=(28, 57, 62, 255))
    draw.rectangle((140, 359, 260, 369), fill=(93, 166, 169, 210))
    draw.rectangle((140, 381, 228, 390), fill=(93, 166, 169, 150))
    draw.ellipse((163, 422, 207, 466), fill=(28, 49, 53, 255))
    draw.ellipse((257, 422, 301, 466), fill=(28, 49, 53, 255))

    # Shoulder and two articulated links.
    draw.ellipse((88, 232, 190, 334), fill=(213, 132, 73, 255), outline=(255, 218, 151, 230), width=7)
    draw.ellipse((116, 260, 163, 307), fill=(40, 72, 70, 255))
    draw.line((142, 270, 238, 154), fill=(228, 157, 88, 255), width=48)
    draw.line((142, 270, 238, 154), fill=(255, 207, 125, 140), width=11)
    draw.ellipse((205, 122, 276, 193), fill=(64, 83, 75, 255), outline=(232, 178, 103, 240), width=6)
    draw.line((241, 157, 331, 92), fill=(55, 79, 75, 255), width=34)
    draw.line((241, 157, 331, 92), fill=(131, 169, 136, 160), width=8)
    draw.ellipse((302, 65, 361, 124), fill=(213, 117, 71, 255), outline=(255, 215, 141, 220), width=6)

    # Gripper jaws close on empty air; the survey beam carries the gesture.
    image.save(OUT / "robot.png", optimize=True)


if __name__ == "__main__":
    backdrop()  # retired stub, no output
    cloud_layer()
    # canopy_layer() retired: hero now uses the painted foliage in backdrop-ai.jpg
    robot_layer()
    print(f"Generated original hero layers in {OUT}")
