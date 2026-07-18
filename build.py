#!/usr/bin/env python3
"""Limitless Labs — static portfolio builder.

Reads Markdown from content/<category>/*.md, renders to HTML,
and writes a static site to the repo root (served by GitHub Pages).
No Node/Ruby. Runs on the Pi via `uv run`.
"""
import os
import re
import datetime
import urllib.parse
from pathlib import Path

try:
    import markdown
except ImportError:
    raise SystemExit("run: uv add markdown  (or: uv pip install markdown)")

ROOT = Path(__file__).parent
CONTENT = ROOT / "content"
CATEGORIES = ["ai", "tech", "space"]

CATEGORY_TITLES = {"ai": "AI", "tech": "Tecnologia", "space": "Spazio"}
CATEGORY_BLURBS = {
    "ai": "Intelligenze artificiali, agenti, modelli — cosa ci riguarda davvero.",
    "tech": "Calcolatori, self-hosting, strumenti: la tecnologia che usiamo.",
    "space": "Esplorazione, astronomia, il cosmo e le macchine che lo raggiungono.",
}

# --- minimal frontmatter parser ---
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
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{title} — Limitless Labs</title>
<link rel="stylesheet" href="/limitless-labs/style.css"/>
</head>
<body>
<header><a href="/limitless-labs/" class="brand">Limitless Labs</a>
<span class="cat">/ {CATEGORY_TITLES[category]}</span></header>
<main class="post">
<h1>{title}</h1>
<p class="date">{date}</p>
{body_html}
</main>
<footer><a href="/limitless-labs/">← Tutti gli articoli</a></footer>
</body></html>"""

def page_html(title, body_html):
    return f"""<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{title} — Limitless Labs</title>
<link rel="stylesheet" href="/limitless-labs/style.css"/>
</head>
<body>
<header><a href="/limitless-labs/" class="brand">Limitless Labs</a></header>
<main class="post">{body_html}</main>
</body></html>"""

def index_html(articles):
    cards = ""
    for cat in CATEGORIES:
        items = "".join(
            f'<li><a href="/limitless-labs/{a["cat"]}/{a["slug"]}.html">{a["title"]}</a>'
            f'<span class="date">{a["date"]}</span></li>'
            for a in articles if a["cat"] == cat
        ) or "<li class=\"empty\">nessun articolo ancora</li>"
        cards += f"""<section class="cat-block">
<h2><a href="/limitless-labs/{cat}/">{CATEGORY_TITLES[cat]}</a></h2>
<p class="blurb">{CATEGORY_BLURBS[cat]}</p>
<ul class="art-list">{items}</ul>
</section>"""
    return f"""<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Limitless Labs</title>
<link rel="stylesheet" href="/limitless-labs/style.css"/>
</head>
<body>
<header><span class="brand">Limitless Labs</span></header>
<main class="home">
<h1>Limitless Labs</h1>
<p class="intro">Un portfolio scritto a quattro mani da Nicola e Hermes.
Articoli su AI, tecnologia e spazio — quello che ci interessa, come ci pare.</p>
{cards}
<p class="more"><a href="/limitless-labs/about.html">Chi siamo →</a></p>
</main>
</body></html>"""

def cat_page_html(cat, articles):
    items = "".join(
        f'<li><a href="/limitless-labs/{a["cat"]}/{a["slug"]}.html">{a["title"]}</a>'
        f'<span class="date">{a["date"]}</span></li>'
        for a in articles if a["cat"] == cat
    ) or "<li class=\"empty\">nessun articolo ancora</li>"
    return f"""<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{CATEGORY_TITLES[cat]} — Limitless Labs</title>
<link rel="stylesheet" href="/limitless-labs/style.css"/>
</head>
<body>
<header><a href="/limitless-labs/" class="brand">Limitless Labs</a>
<span class="cat">/ {CATEGORY_TITLES[cat]}</span></header>
<main class="home">
<h1>{CATEGORY_TITLES[cat]}</h1>
<p class="blurb">{CATEGORY_BLURBS[cat]}</p>
<ul class="art-list">{items}</ul>
</main>
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

    # index + category pages
    (ROOT / "index.html").write_text(index_html(articles), encoding="utf-8")
    for cat in CATEGORIES:
        (ROOT / cat / "index.html").write_text(cat_page_html(cat, articles), encoding="utf-8")

    # about page
    about_md = (CONTENT / "about.md").read_text(encoding="utf-8")
    _, about_body = parse(about_md)
    about_html = markdown.markdown(about_body, extensions=["fenced_code"])
    (ROOT / "about.html").write_text(page_html("Chi siamo", about_html), encoding="utf-8")

    print(f"Built {len(articles)} articles + index + categories + about.")

if __name__ == "__main__":
    main()
