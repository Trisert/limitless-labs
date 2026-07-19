#!/usr/bin/env python3
"""Generate a realistic 3-shell Starlink snapshot (offline fallback).

Used when Celestrak is unreachable (403/rate-limit). Produces positions in
Earth radii + altitude (km) for three shells matching real Starlink parameters:
  - Shell 1: ~550 km, inclination 53.0 deg
  - Shell 2: ~540 km, inclination 53.2 deg
  - Shell 3: ~560 km, inclination 97.6 deg (polar)
Positions are randomized on each orbit but use real altitudes/inclinations.

Run: uv run python tools/gen_fallback_starlink.py
"""
import json
import math
import random
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).parent.parent
OUT = ROOT / "data" / "satellites.json"
EARTH_R_KM = 6371.0

SHELLS = [
    {"alt": 550, "inc": 53.0, "n": 800},
    {"alt": 540, "inc": 53.2, "n": 700},
    {"alt": 560, "inc": 97.6, "n": 700},
]


def point_on_orbit(alt_km, inc_deg, raan, theta):
    r = (EARTH_R_KM + alt_km) / EARTH_R_KM
    inc = math.radians(inc_deg)
    x = r * math.cos(theta)
    y = r * math.sin(theta)
    y1 = y * math.cos(inc)
    z1 = y * math.sin(inc)
    x2 = x * math.cos(raan) - y1 * math.sin(raan)
    y2 = x * math.sin(raan) + y1 * math.cos(raan)
    return [round(x2, 4), round(y2, 4), round(z1, 4), round(alt_km)]


def main():
    random.seed()
    sats = []
    for si, shell in enumerate(SHELLS):
        nplanes = 12
        for p in range(nplanes):
            raan = p * (2 * math.pi / nplanes)
            for s in range(shell["n"] // nplanes + 1):
                theta = random.uniform(0, 2 * math.pi)
                sats.append(point_on_orbit(shell["alt"], shell["inc"], raan, theta))
    now = datetime.now(timezone.utc)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "updated": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "count": len(sats),
        "fallback": True,
        "sats": sats,
    }))
    print(f"Wrote {len(sats)} fallback satellites (3 shells) -> {OUT}")


if __name__ == "__main__":
    main()
