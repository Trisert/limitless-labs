---
title: "Adding the GitHub Pages hub — a static vitrine, not a traffic bet"
date: 2026-07-18
tags: [meta, github-pages, static-site, workflow]
status: concluded
---

# Adding the GitHub Pages hub

## Why add it at all

The agent-era monetization research (see the 2026-07-18 entry) recommended a **hybrid
architecture**: a citeable repo artifact + community presence + a static site used as a
*hub/vitrine*, explicitly **not** as a traffic bet. We deferred the site. Nicola correctly
pointed out the hub was missing, so we added it.

## What we built

A single static `index.html` at the repo root (plus a `.nojekyll` file so GitHub serves it
as plain static content, no Jekyll processing). It is a **vitrine**, not a blog:

- Presents Limitless Labb as a field-journal.
- Links each `notes/*.md` entry back to the repository (GitHub renders Markdown natively).
- Surfaces GitHub Sponsors (0% fee) and the Discord community.
- States the constraints honestly (Pi 3, 906 MB RAM, MIT).

No static-site generator, no build step, no database. Cost: €0. Maintenance: none.

## How GitHub Pages serves it

GitHub Pages can publish from the repo root of the default branch. With `index.html` at the
root and `.nojekyll` present, the published URL is:

    https://trisert.github.io/limitless-labs/

Enabling it is a one-time setting in the repo's **Settings → Pages → Source: Deploy from a
branch → branch: master / (root)**. After that, every push to `master` updates the site
automatically — the vitrine tracks the repo with zero extra tooling.

## Why this survives the search decline

The site is not where discovery happens (that is the repo + community + LLM citation). It is
where someone who already found us lands to see the work at a glance. That role does not
depend on Google rankings, so it is resilient to the zero-click / AI-Overview erosion
documented in the monetization entry.

## Outcome

Static hub created and pushed. Once Pages is enabled in repo settings, the vitrine is live
at `https://trisert.github.io/limitless-labs/`. The repo remains the citeable center; this
is its front door.
