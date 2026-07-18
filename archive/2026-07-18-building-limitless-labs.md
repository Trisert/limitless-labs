---
title: "Building limitless-labs — a field-journal repo, not a tutorial site"
date: 2026-07-18
tags: [meta, repo, github, ssh, workflow, self-hosting]
status: concluded
---

# Building limitless-labs

## What we set out to do

After the research on agent-era monetization (see `notes/2026-07-18-monetizing-tech-content-agent-era.md`),
we agreed the repo should be a **field-journal of real experiments**, not a collection of tutorials.
Tutorials are exactly the how-to content an LLM answers inline — the category in structural decline.
A research log with measured data and conclusions is what generative engines cite (GEO, arXiv:2311.09735).

## Decisions made during the build

- **Format:** dated entries in `notes/`, small real utilities in `tools/`. No "how-to" framing.
- **Name evolution:** started as `pi-selfhost-kit` (too tutorial-y) → `limitless-labb` (typo) →
  finally **`limitless-labs`** (matching the Discord server). Renamed locally before any push.
- **No GitHub Pages yet.** The repo is the citeable center; a static site hub can come later.
- **Language:** English README/notes for maximum LLM citability (r/selfhosted, arXiv, global audience).

## The real technical grind (and what we learned)

Creating and pushing from the Pi 3 (906 MB RAM, Debian 12) hit three permission walls — all
on the GitHub credential side, not the code:

1. **`gh repo create` failed** — *Resource not accessible by personal access token*. The
   default `gh` token lacked the `repo` scope.
2. **`gh auth login` with a fresh PAT failed** — *missing required scope 'read:org'*.
3. **SSH push failed** — *Permission denied (publickey)*. Root cause: the Pi's local key
   `~/.ssh/id_ed25519` (ED25519, no comment) was **never registered on GitHub**. None of the
   keys listed under the account matched it.

Resolution: added the local public key to GitHub via the REST API
(`POST /user/keys`) using a PAT with `admin:public_key`. After that, `ssh -T git@github.com`
authenticated cleanly and `git push -u origin master` succeeded.

> Lesson worth keeping: a working `gh auth status` ("Git operations configured to use ssh
> protocol") is NOT proof the SSH key is on GitHub. The key must exist in the account's
> SSH keys. Verify with `ssh -T git@github.com` before assuming push will work.

## Outcome

Repo live: **https://github.com/Trisert/limitless-labs**

Contents after first push:
- `README.md` — field-journal manifest (not a tutorial).
- `notes/2026-07-18-monetizing-tech-content-agent-era.md` — the monetization research entry.
- `tools/setup-tailscale.sh`, `tools/backup-pi.sh` — utilities actually used on the Pi.
- `LICENSE` — MIT.

The Pi's SSH key is now registered, so future `git push` from this machine works without a PAT.

## Workflow we settled on

1. Discuss / test / conclude here (Discord).
2. Nicola says "create the piece on X".
3. Hermes writes the entry into `notes/` and pushes to GitHub.

This keeps the repo as a living record of genuine work — the only content with real E-E-A-T.
