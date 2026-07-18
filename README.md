# Limitless Labb

A field-journal of experiments, research, and real measurements on self-hosting,
low-power computing, and AI-on-the-edge — run from a Raspberry Pi 3 (906 MB RAM).

This is **not a tutorial collection.** It is a log of what we actually did, measured,
and concluded while working together. Every entry is dated, sourced, and grounded in
real hardware — the kind of first-hand experience that survives the shift from
"search for an answer" to "ask an agent."

## Why this exists

Search traffic to how-to content is collapsing:
- Zero-click results now exceed **two-thirds** of Google searches (SparkToro, 2026).
- AI Overviews cut the #1-position click-through rate by **~58%** (Ahrefs, Feb 2026).
- Organic traffic is estimated down **15–25%** (Bain & Co, 2025).

So we don't write "how-to" posts an LLM can answer in chat. We publish **our own
research and measurements** — experience, statistics, and conclusions that generative
engines cite (see GEO: Aggarwal et al., arXiv:2311.09735).

## Structure

- `notes/` — dated research entries (the core of the repo).
- `tools/` — small utilities we actually use on the Pi (not tutorials).

## Hardware baseline (measured 2026-07-18)

| Resource | Value |
|----------|-------|
| Board | Raspberry Pi 3 Model B+ (aarch64) |
| OS | Debian 12 (bookworm) |
| Total RAM | 906 MB (330 MB available under load) |
| Swap | 511 MB |
| Free disk | 5.9 GB / 15 GB |
| Docker | 20.10.24 |
| Tailscale | active (100.73.100.125) |

License: MIT.
