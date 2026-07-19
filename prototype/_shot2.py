from playwright.sync_api import sync_playwright

URL = "https://trisert.github.io/limitless-labs/prototype/"
shots = [("desktop", 1280, 800), ("mobile", 390, 844)]

with sync_playwright() as p:
    browser = p.chromium.launch(args=["--no-sandbox", "--use-gl=swiftshader",
                                      "--enable-unsafe-swiftshader"])
    for name, w, h in shots:
        ctx = browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=1)
        page = ctx.new_page()
        errs = []
        page.on("pageerror", lambda e: errs.append(f"[pageerror] {e}"))
        page.on("console", lambda m: errs.append(f"[{m.type}] {m.text}") if m.type == "error" else None)
        page.goto(URL, wait_until="load", timeout=30000)
        page.wait_for_timeout(2500)
        # scroll through whole page in steps to trigger IntersectionObserver
        page.evaluate("async () => { const H=document.body.scrollHeight; for(let y=0;y<=H;y+=300){window.scrollTo(0,y); await new Promise(r=>setTimeout(r,120));} }")
        page.wait_for_timeout(1500)
        # return to top for the hero shot
        page.evaluate("window.scrollTo(0,0)")
        page.wait_for_timeout(800)
        page.screenshot(path=f"/home/nicola/projects/limitless-labs/prototype/shot_{name}.png")
        info = page.evaluate("""() => {
            const revs=[...document.querySelectorAll('.reveal')];
            const vis=revs.filter(r=>r.classList.contains('is-visible')).length;
            const c=document.getElementById('orbitCanvas');
            return {
              htmlHasJs: document.documentElement.classList.contains('js'),
              revealTotal: revs.length, revealVisible: vis,
              canvas: c? (c.width+'x'+c.height):'none',
              heroText: (document.querySelector('.hero-3d h1')||{}).textContent || 'none'
            };
        }""")
        print(f"=== {name} ({w}x{h}) ===")
        print("  ", info)
        if errs:
            print("  ERRORS:", errs[:8])
        else:
            print("   no page errors")
        ctx.close()
    browser.close()
print("DONE")
