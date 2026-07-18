---
title: "Monetizing tech content in the agent era — why we abandoned the SEO-site plan"
date: 2026-07-18
tags: [research, seo, geo, ai-search, monetization, self-hosting]
status: concluded
---

# Monetizing tech content in the agent era

## Context

We set out to evaluate whether a "free static site + SEO + affiliate" pipeline could
produce passive income (target 200–500 €/month) for a solo author on a budget of €0,
hosting on a Raspberry Pi 3 (906 MB RAM). Two deep-research passes later, the
conclusion flipped.

## What the data says (verified at source)

- **Zero-click dominates.** In 2026 less than one-third of Google searches still send a
  click to a site (SparkToro, 2026). AI Overviews are present on 20%+ of queries and cut
  the #1-position CTR by **~58%** (Ahrefs, Feb 2026; was -34.5% in Apr 2025).
- **Organic traffic declining.** Bain & Co (2025) estimates organic web traffic down
  15–25%, with ~80% of consumers relying on AI-written results for ≥40% of searches.
- **How-to is hit hardest.** Tutorial-style queries ("install X on Raspberry Pi") are the
  easiest for an LLM to answer inline — the user never clicks. A new low-authority site
  also fails to enter the RAG citation phase of LLMs, losing on both fronts: no ranking
  *and* no citation.

## The pivot: GEO + hybrid architecture

Generative Engine Optimization (GEO, Aggarwal et al., arXiv:2311.09735) is the answer to
"how do I get found when people ask an agent instead of Googling." Key finding from the
paper: adding statistics, citations, and technical terms to content can increase
visibility in generative answers by up to **+40%**. A public, well-structured repo with
real commands and measured output is cited directly by LLMs.

Recommended architecture for a solo author, €0, modest hardware:

1. **A useful public artifact on GitHub** (tool / script / template) with a GEO-optimized
   README — citeable by agents, earns stars + Sponsors.
2. **Active community presence** (r/selfhosted ~798k members, Discord, Mastodon) — the
   real discovery graph now.
3. **Static site as a hub/vitrine**, not a traffic bet (GitHub/Cloudflare Pages).
4. **Layered monetization**: GitHub Sponsors (0% fee) + one digital product + occasional
   sponsors + consulting. Affiliate stays a bonus, not the pillar.
5. **Measure LLM visibility manually** (fixed prompts on ChatGPT/Perplexity; check if the
   repo/name appears).

Case study: Jeff Geerling (geerlingguy) monetizes self-hosting content via GitHub
Sponsors + YouTube + book + sponsors — *not* a SEO blog.

## Conclusion

We will not build a tutorial site. This repository becomes a **field-journal**: dated
entries of real experiments, measurements, and research on self-hosting and edge AI.
That is the content with genuine E-E-A-T — the only kind that generative engines cite
and that communities reward. Verdict: 200–500 €/month is realistic in 6–12 months *if* we
ship artifacts people actually use; far more uncertain if we only write SEO blog posts.

## Sources

- SparkToro — "In 2026, less than one third of Google searches still send a click" (2026)
- Ahrefs — "Update: AI Overviews Reduce Clicks by 58%" (Feb 2026)
- Bain & Co — "Goodbye Clicks, Hello AI" (Feb 2025)
- Aggarwal et al. — GEO: Generative Engine Optimization, arXiv:2311.09735 (KDD 2024)
- gummysearch — r/selfhosted ~798k members (2026)
- GitHub Sponsors — geerlingguy public profile (case study)
