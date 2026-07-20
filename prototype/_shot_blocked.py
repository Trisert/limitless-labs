from playwright.sync_api import sync_playwright

URL = "https://trisert.github.io/limitless-labs/prototype/"
shots = [("desktop", 1280, 800), ("mobile", 390, 844)]

with sync_playwright() as p:
    browser = p.chromium.launch(args=["--no-sandbox", "--use-gl=swiftshader",
                                      "--enable-unsafe-swiftshader"])
    for name, w, h in shots:
        ctx = browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=1)
        # Simulate a mobile network that BLOCKS Google Fonts (the user's symptom)
        ctx.route("**://fonts.googleapis.com/**", lambda route: route.abort())
        ctx.route("**://fonts.gstatic.com/**", lambda route: route.abort())
        page = ctx.new_page()
        errs = []
        page.on("pageerror", lambda e: errs.append(f"[pageerror] {e}"))
        page.on("console", lambda m: errs.append(f"[{m.type}] {m.text}") if m.type == "error" else None)
        page.on("requestfailed", lambda r: errs.append(f"[reqfail] {r.url[:60]}"))
        page.goto(URL, wait_until="load", timeout=30000)
        page.wait_for_timeout(2500)
        page.evaluate("async () => { const H=document.body.scrollHeight; for(let y=0;y<=H;y+=300){window.scrollTo(0,y); await new Promise(r=>setTimeout(r,120));} }")
        page.wait_for_timeout(1500)
        page.evaluate("window.scrollTo(0,0)")
        page.wait_for_timeout(800)
        page.screenshot(path=f"/home/nicola/projects/limitless-labs/prototype/shot_{name}.png")
        info = page.evaluate("""() => {
            const h1 = document.querySelector('.hero-3d h1');
            const cs = h1 ? getComputedStyle(h1) : null;
            const body = getComputedStyle(document.body);
            const revs=[...document.querySelectorAll('.reveal')];
            const vis=revs.filter(r=>r.classList.contains('is-visible')).length;
            return {
              h1Font: cs ? cs.fontFamily : 'none',
              h1Size: cs ? cs.fontSize : 'none',
              bodyFont: body.fontFamily,
              bodyBg: body.backgroundColor,
              revealVisible: vis + '/' + revs.length
            };
        }""")
        print(f"=== {name} ({w}x{h}) [Google Fonts BLOCKED] ===")
        print("  ", info)
        print("   errors:", errs[:6] if errs else "none")
        ctx.close()
    browser.close()
print("DONE")
