#!/usr/bin/env python3
"""Limitless Labs — static portfolio builder (SpaceX x Linear hybrid).

Reads Markdown from content/<category>/*.md, renders to HTML,
and writes a static site to the repo root (served by GitHub Pages).
No Node/Ruby. Runs on the Pi via `uv run`.
"""
import os
import re
import datetime
from pathlib import Path

try:
    import markdown
except ImportError:
    raise SystemExit("run: uv pip install markdown")

ROOT = Path(__file__).parent
CONTENT = ROOT / "content"
CATEGORIES = ["ai", "tech", "space"]

CATEGORY_TITLES = {"ai": "AI", "tech": "Tecnologia", "space": "Spazio"}
CATEGORY_BLURBS = {
    "ai": "Intelligenze artificiali, agenti, modelli — cosa ci riguarda davvero.",
    "tech": "Calcolatori, self-hosting, strumenti: la tecnologia che usiamo.",
    "space": "Esplorazione, astronomia, il cosmo e le macchine che lo raggiungono.",
}

FM = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)

def parse(md: str):
    m = FM.match(md)
    meta, body = {}, md
    if m:
        for line in m.group(1).splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                meta[k.strip()] = v.strip()
        body = md[m.end():]
    return meta, body

def article_html(title, body_html, meta, category):
    date = meta.get("date", "")
    return f"""<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>{title} — Limitless Labs</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;590;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/limitless-labs/style.css"/>
</head>
<body>
<header class="site"><div class="wrap nav">
  <a class="brand" href="/limitless-labs/">LIMITLESS LABS</a>
  <nav class="links"><a href="/limitless-labs/ai/">AI</a><a href="/limitless-labs/tech/">Tecnologia</a><a href="/limitless-labs/space/">Spazio</a><a href="/limitless-labs/about.html">Chi siamo</a></nav>
</div></header>
<main class="post wrap">
<article>
  <div class="kicker">{CATEGORY_TITLES[category]}</div>
  <h1>{title}</h1>
  <div class="meta">{date}</div>
  <div class="prose">{body_html}</div>
</article>
</main>
<footer class="site"><div class="wrap">Limitless Labs — Nicola &amp; Hermes · 2026</div></footer>
</body></html>"""

def page_html(title, body_html):
    return f"""<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>{title} — Limitless Labs</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;590;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/limitless-labs/style.css"/>
</head>
<body>
<header class="site"><div class="wrap nav">
  <a class="brand" href="/limitless-labs/">LIMITLESS LABS</a>
  <nav class="links"><a href="/limitless-labs/ai/">AI</a><a href="/limitless-labs/tech/">Tecnologia</a><a href="/limitless-labs/space/">Spazio</a><a href="/limitless-labs/about.html">Chi siamo</a></nav>
</div></header>
<main class="post wrap"><article><div class="prose">{body_html}</div></article></main>
<footer class="site"><div class="wrap">Limitless Labs — Nicola &amp; Hermes · 2026</div></footer>
</body></html>"""

def index_html(articles):
    cards = ""
    for cat in CATEGORIES:
        items = "".join(
            f'<li><a href="/limitless-labs/{a["cat"]}/{a["slug"]}.html">{a["title"]}</a>'
            f'<span class="date">{a["date"]}</span></li>'
            for a in articles if a["cat"] == cat
        ) or '<li class="empty">nessun articolo ancora</li>'
        cards += f"""<section class="block">
<h2><a href="/limitless-labs/{cat}/">{CATEGORY_TITLES[cat]}</a></h2>
<p class="blurb">{CATEGORY_BLURBS[cat]}</p>
<ul class="list">{items}</ul>
</section>"""
    return f"""<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Limitless Labs</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;590;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/limitless-labs/style.css"/>
</head>
<body>
<header class="site"><div class="wrap nav">
  <a class="brand" href="/limitless-labs/">LIMITLESS LABS</a>
  <nav class="links"><a href="/limitless-labs/ai/">AI</a><a href="/limitless-labs/tech/">Tecnologia</a><a href="/limitless-labs/space/">Spazio</a><a href="/limitless-labs/about.html">Chi siamo</a></nav>
</div></header>
<section class="hero">
  <div class="wrap">
    <div class="pill">Portfolio · scritto a quattro mani</div>
    <h1>Pensieri su AI,<br>tecnologia e spazio.</h1>
    <p>Uno spazio personale di Nicola, con Hermes. Niente SEO, niente rumore — solo quello che ci interessa davvero, messo in forma.</p>
    <a class="ghost" href="/limitless-labs/about.html">Chi siamo →</a>
  </div>
</section>
<section class="wrap grid">{cards}</section>
<footer class="site"><div class="wrap">Limitless Labs — Nicola &amp; Hermes · 2026</div></footer>
</body></html>"""

def cat_page_html(cat, articles):
    items = "".join(
        f'<li><a href="/limitless-labs/{a["cat"]}/{a["slug"]}.html">{a["title"]}</a>'
        f'<span class="date">{a["date"]}</span></li>'
        for a in articles if a["cat"] == cat
    ) or '<li class="empty">nessun articolo ancora</li>'
    return f"""<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>{CATEGORY_TITLES[cat]} — Limitless Labs</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;590;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/limitless-labs/style.css"/>
</head>
<body>
<header class="site"><div class="wrap nav">
  <a class="brand" href="/limitless-labs/">LIMITLESS LABS</a>
  <nav class="links"><a href="/limitless-labs/ai/">AI</a><a href="/limitless-labs/tech/">Tecnologia</a><a href="/limitless-labs/space/">Spazio</a><a href="/limitless-labs/about.html">Chi siamo</a></nav>
</div></header>
<section class="wrap grid"><section class="block">
  <h1 class="cat-title">{CATEGORY_TITLES[cat]}</h1>
  <p class="blurb">{CATEGORY_BLURBS[cat]}</p>
  <ul class="list">{items}</ul>
</section></section>
<footer class="site"><div class="wrap">Limitless Labs — Nicola &amp; Hermes · 2026</div></footer>
</body></html>"""

def main():
    articles = []
    for cat in CATEGORIES:
        d = CONTENT / cat
        if not d.exists():
            continue
        for f in sorted(d.glob("*.md")):
            meta, body = parse(f.read_text(encoding="utf-8"))
            title = meta.get("title", f.stem)
            date = meta.get("date", "")
            slug = f.stem
            body_html = markdown.markdown(body, extensions=["fenced_code", "tables"])
            out = ROOT / cat / f"{slug}.html"
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(article_html(title, body_html, meta, cat), encoding="utf-8")
            articles.append({"cat": cat, "slug": slug, "title": title, "date": date})

    (ROOT / "index.html").write_text(index_html(articles), encoding="utf-8")
    for cat in CATEGORIES:
        (ROOT / cat / "index.html").write_text(cat_page_html(cat, articles), encoding="utf-8")

    about_md = (CONTENT / "about.md").read_text(encoding="utf-8")
    _, about_body = parse(about_md)
    about_html = markdown.markdown(about_body, extensions=["fenced_code"])
    (ROOT / "about.html").write_text(page_html("Chi siamo", about_html), encoding="utf-8")

    print(f"Built {len(articles)} articles + index + categories + about.")

if __name__ == "__main__":
    main()
