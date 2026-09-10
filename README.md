# Limitless Labs

Personal portfolio for Nicola Destro: aerospace software, local AI systems, and field notes measured against real constraints.

## Stack

- Astro static output with an original painted hero and a Canvas 2D motion layer (drifting mist, sun bloom, cloud shadows, stream sparkle, canopy wind light).
- The hero painting is generated with the free, keyless Pollinations endpoint and exported at 2048px by `tools/fetch_backdrop.py`; the no-JS poster is rendered from the live scene by `tools/make_poster.py`. Both assets live in `public/art/`.
- Only one raster ships in the hero (the painting). Everything animated on top is vector or gradient work drawn at device resolution, so it stays sharp on any display.
- Markdown posts in `src/content/posts/` rendered to `/writing/<slug>.html`.
- No runtime API, analytics, cookies, remote fonts, or CDN dependencies.
- GitHub Pages deployment through `.github/workflows/pages.yml`.

## Hero artwork

```sh
python3 tools/fetch_backdrop.py            # regenerate public/art/backdrop-ai.jpg
npm run build && python3 tools/make_poster.py   # regenerate public/art/scene-poster.jpg
```

`tools/fetch_backdrop.py` calls the anonymous Pollinations tier, which returns
1024x576 regardless of the requested size — that is a hard free-tier limit, not
a bug. The export pipeline therefore upscales to 2048x1152, sharpens and adds
fine canvas grain. Any higher-resolution or prompt-adherent provider can replace
the `fetch()` function without touching the scene code.

Motion is tuned per painting through the `SCENE` block in
`src/scripts/hero-scene.mjs` (sun position, stream rows, canopy zone, and the
laptop-screen quad used when a painting contains a display).

## Local development

Requires Node 24 or newer:

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

The production path is `/limitless-labs/`, matching the project-site URL:
`https://trisert.github.io/limitless-labs/`.

## Content

Add a Markdown file under `src/content/posts/` with frontmatter:

```yaml
---
title: A measured title
date: 2026-09-09
category: systems
description: A short field-note summary.
---
```

The homepage and field-note index sort published posts deterministically by date and slug. Drafts stay out of the build.

## Deployment

The repository must use **GitHub Actions** as its Pages source. In the repository settings, set Pages → Build and deployment → Source to `GitHub Actions`; the workflow builds `dist/` and deploys it. The existing project-site prefix is configured in `astro.config.mjs` and must not be removed.
