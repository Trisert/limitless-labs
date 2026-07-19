#!/usr/bin/env python3
"""Limitless Labs — static portfolio builder (SpaceX x Linear hybrid).

Reads Markdown from content/<category>/*.md, renders to HTML,
and writes a static site to the repo root (served by GitHub Pages).
No Node/Ruby. Runs on the Pi via `uv run`.
"""
import re
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
    "ai": "Modelli locali, inference, e tutto ciò che riguarda l'intelligenza artificiale.",
    "tech": "Rust, NixOS, agenti e strumenti self-hosted: la tecnologia che costruisco e uso.",
    "space": "Astrodinamica, satelliti e missioni — dalla dinamica orbitale al volo spaziale.",
}

NAV = '<nav class="links"><a href="/limitless-labs/ai/">AI</a><a href="/limitless-labs/tech/">Tecnologia</a><a href="/limitless-labs/space/">Spazio</a><a href="/limitless-labs/projects.html">Progetti</a><a href="/limitless-labs/about.html">Chi sono</a></nav>'
FOOTER = '<footer class="site"><div class="wrap">Limitless Labs — Nicola · 2026</div></footer>'

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

HEAD = """<!DOCTYPE html>
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
  {nav}
</div></header>"""

def article_html(title, body_html, meta, category):
    date = meta.get("date", "")
    return (HEAD + """
<main class="post wrap">
<article>
  <div class="kicker">{cat}</div>
  <h1>{title}</h1>
  <div class="meta">{date}</div>
  <div class="prose">{body}</div>
</article>
</main>
{footer}
</body></html>""").format(title=title, nav=NAV, footer=FOOTER, cat=CATEGORY_TITLES[category],
                         body=body_html, date=date)

def page_html(title, body_html):
    return (HEAD + """
<main class="post wrap"><article><div class="prose">{body}</div></article></main>
{footer}
</body></html>""").format(title=title, nav=NAV, footer=FOOTER, body=body_html)

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
    return (HEAD + """
<section class="hero">
  <div class="wrap">
    <div class="pill">Portfolio personale</div>
    <h1>Pensieri su AI,<br>tecnologia e spazio.</h1>
    <p>Uno spazio personale di Nicola. Note su AI, tecnologia e spazio — quello che lo incuriosisce davvero.</p>
    <a class="ghost" href="/limitless-labs/about.html">Chi sono →</a>
  </div>
</section>
<section class="wrap grid">{cards}</section>
{footer}
</body></html>""").format(title="Limitless Labs", nav=NAV, footer=FOOTER, cards=cards)

def cat_page_html(cat, articles):
    items = "".join(
        f'<li><a href="/limitless-labs/{a["cat"]}/{a["slug"]}.html">{a["title"]}</a>'
        f'<span class="date">{a["date"]}</span></li>'
        for a in articles if a["cat"] == cat
    ) or '<li class="empty">nessun articolo ancora</li>'
    return (HEAD + """
<section class="wrap grid"><section class="block">
  <h1 class="cat-title">{title}</h1>
  <p class="blurb">{blurb}</p>
  <ul class="list">{items}</ul>
</section></section>
{footer}
</body></html>""").format(title=CATEGORY_TITLES[cat], nav=NAV, footer=FOOTER,
                         blurb=CATEGORY_BLURBS[cat], items=items)

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
    (ROOT / "about.html").write_text(page_html("Chi sono", about_html), encoding="utf-8")

    projects_md = (CONTENT / "projects.md").read_text(encoding="utf-8")
    _, projects_body = parse(projects_md)
    projects_html = markdown.markdown(projects_body, extensions=["fenced_code"])
    (ROOT / "projects.html").write_text(page_html("Progetti", projects_html), encoding="utf-8")

    print(f"Built {len(articles)} articles + index + categories + about + projects.")

if __name__ == "__main__":
    main()
