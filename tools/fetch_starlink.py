#!/usr/bin/env python3
"""Fetch fresh Starlink TLEs, propagate to now with SGP4, write data/satellites.json.

Positions are ECI/TEME in Earth radii. The canvas reads this file and animates.
Run: uv run python tools/fetch_starlink.py
"""
import json
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).parent.parent
OUT = ROOT / "data" / "satellites.json"
URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle"
MAX_SATS = 2000
EARTH_R_KM = 6371.0


def ensure_sgp4():
    try:
        import sgp4  # noqa
    except ImportError:
        subprocess.run([sys.executable, "-m", "pip", "install", "sgp4"], check=True)


def fetch_tle():
    last_err = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(URL, headers={
                "User-Agent": "Mozilla/5.0 (limitless-labs; nicola@trisert.dev)",
                "Accept": "text/plain",
            })
            with urllib.request.urlopen(req, timeout=90) as r:
                return r.read().decode("utf-8")
        except Exception as e:
            last_err = e
            import time
            time.sleep(5 * (attempt + 1))
    raise RuntimeError(f"celestrak fetch failed: {last_err}")


def parse_tles(text):
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    out = []
    i = 0
    while i + 2 < len(lines):
        l1, l2 = lines[i + 1], lines[i + 2]
        if l1.startswith("1 ") and l2.startswith("2 "):
            out.append((lines[i], l1, l2))
            i += 3
        else:
            i += 1
    return out


def main():
    ensure_sgp4()
    from sgp4.api import Satrec, jday

    now = datetime.now(timezone.utc)
    jd, fr = jday(now.year, now.month, now.day, now.hour, now.minute, now.second)

    try:
        tles = parse_tles(fetch_tle())
        step = max(1, len(tles) // MAX_SATS)
        sats = []
        for idx in range(0, len(tles), step):
            _, l1, l2 = tles[idx]
            sat = Satrec.twoline2rv(l1, l2)
            err, r, _ = sat.sgp4(jd, fr)
            if err != 0:
                continue
            x, y, z = r
            radius_km = (x*x + y*y + z*z) ** 0.5
            alt_km = radius_km - EARTH_R_KM
            sats.append([round(x / EARTH_R_KM, 4), round(y / EARTH_R_KM, 4), round(z / EARTH_R_KM, 4), round(alt_km)])
        if sats:
            OUT.parent.mkdir(parents=True, exist_ok=True)
            OUT.write_text(json.dumps({"updated": now.strftime("%Y-%m-%dT%H:%M:%SZ"), "count": len(sats), "sats": sats}))
            print(f"Wrote {len(sats)} satellites -> {OUT}")
            return
        print("no valid sats from celestrak, falling back")
    except Exception as e:
        print(f"celestrak failed ({e}), falling back to 3-shell generator")

    # fallback: regenerate offline 3-shell snapshot
    import subprocess
    subprocess.run([sys.executable, str(Path(__file__).parent / "gen_fallback_starlink.py")], check=True)


if __name__ == "__main__":
    main()
