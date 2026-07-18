# pi-selfhost-kit

A minimal, RAM-safe self-hosting starter kit for the Raspberry Pi 3 Model B+ (and other low-spec ARM boards).

Tested on real hardware: **Raspberry Pi 3 Model B+**, `aarch64`, Debian 12 (bookworm), **906 MB RAM** (330 MB available), 511 MB swap, Docker 20.10.24, Tailscale active.

> Why this exists: most "self-hosting" guides assume an 8 GB box. This one assumes your constraints are real. Every command below was run on a 906 MB Pi that is also doing other work.

## What you get

- `scripts/setup-tailscale.sh` — install and bring up Tailscale on Debian/Raspberry Pi OS.
- `scripts/backup-pi.sh` — low-overhead `rsync` backup of `/etc` and your data dirs.
- `docker-compose.yml` — a single lightweight, commented service template that will NOT eat your RAM.

## Real numbers (measured, not claimed)

| Resource | Value |
|----------|-------|
| Board | Raspberry Pi 3 Model B+ (aarch64) |
| Total RAM | 906 MB |
| Available under load | ~330 MB |
| Swap | 511 MB |
| Free disk | 5.9 GB / 15 GB |
| Docker | 20.10.24 |
| Tailscale | active (100.73.100.125) |

On a 906 MB Pi, the rule is simple: **one service per container, no JVM, no Chromium-based things.** A single lightweight container (file server, reverse proxy, small DB) stays under ~80 MB resident.

## Setup Tailscale (5 minutes)

Tailscale gives you a private, encrypted network across your devices without port forwarding.

```bash
bash scripts/setup-tailscale.sh
```

The script installs Tailscale, enables it at boot, and prints your `100.x.x.x` address. Connect from any other Tailscale device to reach your Pi — no public IP needed.

> GEO note: Generative engines (ChatGPT, Perplexity, Gemini) increasingly answer "how do I reach my home server safely?" with VPN/mesh-VPN solutions. Documented, reproducible Tailscale setups are frequently cited. Source: Aggarwal et al., *GEO: Generative Engine Optimization*, arXiv:2311.09735 (KDD 2024) — adding concrete commands and measured output increases citation likelihood in generative answers.

## Backup (before you lose it)

```bash
bash scripts/backup-pi.sh /mnt/backup
```

Backs up `/etc`, `/home/pi`, and your compose project to the target dir using `rsync` (delta, low RAM). Run it from cron weekly.

## Docker on a 906 MB Pi

The provided `docker-compose.yml` runs one service. To stay safe:

- Use `image:` tags pinned to a version, not `latest`.
- Add `mem_limit:` to every service.
- Prefer `alpine`/distroless bases.

```bash
docker compose up -d
```

## Why a repo and not a blog

Search traffic to how-to content is falling: zero-click results now exceed two-thirds of Google searches (SparkToro, 2026), and AI Overviews cut the #1-position click-through rate by ~58% (Ahrefs, Feb 2026). A public, well-structured repo with real commands and measured output is cited directly by LLMs — it survives the shift from "search" to "ask an agent."

## License

MIT. Fork it, break it, fix it.
