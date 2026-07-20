#!/usr/bin/env python3
"""Limitless Labs — article pipeline.

Reads posts from `posts/` in multiple formats:
  - .md   : frontmatter (title, date, category) + Markdown body
  - .docx / .rtf / .odt : converted to HTML via pandoc, frontmatter inferred
                           from filename or first heading

Generates:
  - writing/<slug>.html   : individual article page
  - injects the transmission log into index.html (between LOG_START / LOG_END)

Run: uv run python build.py
"""
import os
import re
import subprocess
import tempfile
import json
import datetime
from pathlib import Path

ROOT = Path(__file__).parent
POSTS = ROOT / "posts"
WRITING = ROOT / "writing"
INDEX = ROOT / "index.html"
SITE_URL = "https://trisert.github.io/limitless-labs"
AUTHOR = "Nicola"

CAT_CLASS = {"aerospace": "log-cat-aero", "ai": "log-cat-ai", "systems": "log-cat-sys"}
CAT_LABEL = {"aerospace": "AEROSPACE", "ai": "AI / ML", "systems": "SYSTEMS"}

FM = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
H1 = re.compile(r"^#\s+(.+)$", re.MULTILINE)

def pandoc_to_html(path: Path) -> str:
    out = subprocess.run(
        ["pandoc", str(path), "-t", "html5", "--wrap=none"],
        capture_output=True, text=True,
    )
    if out.returncode != 0:
        raise RuntimeError(f"pandoc failed on {path.name}: {out.stderr}")
    return out.stdout

def extract_frontmatter(text: str):
    m = FM.match(text)
    meta, body = {}, text
    if m:
        for line in m.group(1).splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                meta[k.strip()] = v.strip()
        body = text[m.end():]
    return meta, body

def read_post(path: Path):
    slug = path.stem
    if path.suffix.lower() == ".md":
        meta, body = extract_frontmatter(path.read_text(encoding="utf-8"))
        html = markdown_markdown(body)
        title = meta.get("title") or (H1.search(body).group(1) if H1.search(body) else slug)
        title = title.strip().strip('"').strip("'")
        date = meta.get("date", "")
        cat = (meta.get("category") or "ai").lower()
        desc = meta.get("description") or first_paragraph_text(body)
    else:
        html = pandoc_to_html(path)
        # strip wrapping <p> if single heading present
        title = slug.replace("-", " ").title()
        m = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.DOTALL)
        if m:
            title = re.sub(r"<[^>]+>", "", m.group(1)).strip()
        date = ""
        cat = "ai"
        desc = first_paragraph_text(html)
    return {"slug": slug, "title": title, "date": date, "category": cat,
            "html": html, "description": desc}

def first_paragraph_text(md: str) -> str:
    """Best-effort plain-text excerpt for meta description / SEO."""
    # drop frontmatter if present
    text = re.sub(r"^---\s*\n.*?\n---\s*\n", "", md, flags=re.DOTALL)
    # strip markdown headings/markers, grab first non-empty paragraph
    for para in re.split(r"\n\s*\n", text):
        clean = re.sub(r"[#>*_`\-]+", "", para).strip()
        clean = re.sub(r"<[^>]+>", "", clean)
        if len(clean) > 20:
            return (clean[:155].rstrip() + "…") if len(clean) > 155 else clean
    return ""

def markdown_markdown(body: str) -> str:
    try:
        import markdown
        return markdown.markdown(body, extensions=["fenced_code", "tables"])
    except ImportError:
        # minimal fallback: paragraphs
        paras = [f"<p>{p.strip()}</p>" for p in body.split("\n\n") if p.strip()]
        return "\n".join(paras)

def article_page(post):
    cls = CAT_CLASS.get(post["category"], "log-cat-sys")
    label = CAT_LABEL.get(post["category"], post["category"].upper())
    cat_line = f'<div class="log-date">{label} &middot; {post["date"]}</div>' if post["date"] else f'<div class="log-date">{label}</div>'

    url = f"{SITE_URL}/writing/{post['slug']}.html"
    desc = post.get("description") or post["title"]
    date_pub = post.get("date") or ""
    # JSON-LD BlogPosting
    ld = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post["title"],
        "description": desc,
        "author": {"@type": "Person", "name": AUTHOR, "url": SITE_URL},
        "publisher": {"@type": "Organization", "name": "Limitless Labs",
                       "url": SITE_URL},
        "mainEntityOfPage": {"@type": "WebPage", "@id": url},
        "url": url,
        "inLanguage": "en",
    }
    if date_pub:
        ld["datePublished"] = date_pub
        ld["dateModified"] = date_pub
    json_ld = f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>'

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>{post['title']} — Limitless Labs</title>
<meta name="description" content="{desc}">
<meta name="author" content="{AUTHOR}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="{url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Limitless Labs">
<meta property="og:title" content="{post['title']}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{post['title']}">
<meta name="twitter:description" content="{desc}">
{json_ld}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=IBM+Plex+Sans:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../style.css"/>
</head>
<body>
<div class="wrap"><nav style="padding:22px 0">
  <div class="logo">LIMITLESS <span class="dim">LABS</span></div>
</nav></div>
<main class="post"><div class="wrap">
  {cat_line}
  <div class="prose">{post['html']}</div>
  <p style="margin-top:48px"><a href="../#writing" style="color:var(--steel)">&larr; Back to transmission log</a></p>
</div></main>
<footer style="padding:48px 0"><div class="wrap" style="font-family:var(--font-mono);font-size:11px;color:var(--text-faint)">&copy; 2026 LIMITLESS LABS &middot; BUILT ON EARTH, AIMED AT ORBIT</div></footer>
</body></html>"""

def log_rows(posts):
    rows = []
    for p in sorted(posts, key=lambda x: x["date"], reverse=True):
        cls = CAT_CLASS.get(p["category"], "log-cat-sys")
        label = CAT_LABEL.get(p["category"], p["category"].upper())
        rows.append(f"""    <div class="log-row">
      <div class="log-date">{p['date']}</div>
      <div class="log-title"><a href="writing/{p['slug']}.html">{p['title']}</a></div>
      <div class="log-cat {cls}">{label}</div>
    </div>""")
    return "\n".join(rows)

def inject_log(index_html: str, log_block: str, count: int):
    pattern = re.compile(r"<!-- LOG_START -->.*?<!-- LOG_END -->", re.DOTALL)
    block = f"<!-- LOG_START -->\n{log_block}\n    <!-- LOG_END -->"
    new = pattern.sub(block, index_html)
    if count:
        new = new.replace('<div class="section-note" id="log-count"></div>',
                          f'<div class="section-note" id="log-count">{count} ENTRIES</div>')
    return new

def main():
    if not POSTS.exists():
        POSTS.mkdir()
        print("Created posts/ — drop .md/.docx/.rtf/.odt there and re-run.")
        return
    posts = []
    for f in POSTS.iterdir():
        if f.suffix.lower() in (".md", ".docx", ".rtf", ".odt"):
            try:
                posts.append(read_post(f))
            except Exception as e:
                print(f"SKIP {f.name}: {e}")
    WRITING.mkdir(exist_ok=True)
    for p in posts:
        (WRITING / f"{p['slug']}.html").write_text(article_page(p), encoding="utf-8")

    html = INDEX.read_text(encoding="utf-8")
    if posts:
        new_html = inject_log(html, f'<div class="log-list">\n{log_rows(posts)}\n    </div>', len(posts))
    else:
        new_html = inject_log(html, """<div class="log-empty">
      <div class="glyph">&gt;_</div>
      <p>No transmissions yet. The first write-up &mdash; likely on GPU inference tuning or satellite flight software &mdash; lands here.</p>
    </div>""", 0)
    INDEX.write_text(new_html, encoding="utf-8")

    write_sitemap(posts)
    write_robots()
    print(f"Built {len(posts)} article(s) into writing/ and updated the transmission log.")


def write_sitemap(posts):
    today = datetime.date.today().isoformat()
    urls = [f'  <url>\n    <loc>{SITE_URL}/</loc>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>']
    for p in posts:
        loc = f"{SITE_URL}/writing/{p['slug']}.html"
        lastmod = p.get("date") or today
        urls.append(
            f'  <url>\n    <loc>{loc}</loc>\n    <lastmod>{lastmod}</lastmod>\n'
            f'    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>'
        )
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(urls) + "\n</urlset>\n"
    (ROOT / "sitemap.xml").write_text(xml, encoding="utf-8")
    print(f"Wrote sitemap.xml ({len(urls)} URLs).")


def write_robots():
    txt = (
        "User-agent: *\n"
        "Allow: /\n"
        f"Sitemap: {SITE_URL}/sitemap.xml\n"
    )
    (ROOT / "robots.txt").write_text(txt, encoding="utf-8")
    print("Wrote robots.txt.")


if __name__ == "__main__":
    main()
