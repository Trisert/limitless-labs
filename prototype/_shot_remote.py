import sys
from playwright.sync_api import sync_playwright

URL = "https://trisert.github.io/limitless-labs/prototype/"
shots = [
    ("desktop", 1280, 800),
    ("mobile", 390, 844),
]

with sync_playwright() as p:
    browser = p.chromium.launch(args=["--no-sandbox", "--use-gl=swiftshader",
                                      "--enable-unsafe-swiftshader"])
    for name, w, h in shots:
        ctx = browser.new_context(viewport={"width": w, "height": h},
                                  device_scale_factor=1)
        page = ctx.new_page()
        errors = []
        page.on("console", lambda m: errors.append(f"[{m.type}] {m.text}") if m.type in ("error","warning") else None)
        page.on("pageerror", lambda e: errors.append(f"[pageerror] {e}"))
        page.on("requestfailed", lambda r: errors.append(f"[reqfail] {r.url} {r.failure}"))
        try:
            page.goto(URL, wait_until="networkidle", timeout=30000)
        except Exception as e:
            errors.append(f"[goto] {e}")
        page.wait_for_timeout(3500)  # let 3D + reveal settle
        # scroll halfway to trigger reveals
        page.evaluate("window.scrollTo(0, document.body.scrollHeight * 0.5)")
        page.wait_for_timeout(1500)
        page.screenshot(path=f"/home/nicola/projects/limitless-labs/prototype/shot_{name}.png",
                        full_page=False)
        print(f"=== {name} ({w}x{h}) ===")
        # report computed style of a reveal element to see if visible
        vis = page.evaluate("""() => {
            const r = document.querySelector('.reveal');
            if (!r) return 'no .reveal';
            const cs = getComputedStyle(r);
            return 'reveal opacity=' + cs.opacity + ' display=' + cs.display;
        }""")
        print("reveal:", vis)
        canvas_ok = page.evaluate("""() => {
            const c = document.getElementById('orbitCanvas');
            if (!c) return 'no canvas';
            const gl = c.getContext('webgl') || c.getContext('webgl2');
            return 'canvas ' + c.width + 'x' + c.height + ' gl=' + (gl ? 'yes' : 'no');
        }""")
        print("canvas:", canvas_ok)
        if errors:
            print("ERRORS:")
            for e in errors[:15]:
                print("  ", e)
        else:
            print("no console/page errors")
        ctx.close()
    browser.close()
print("DONE")
