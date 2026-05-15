# adp-show-graphics

Browser-source graphics tool for live vMix shows. Operator panel + Cloudflare Worker backend.

## Stack
- **Frontend:** Single-file gallery (`gallery.html`) — no build step, deployed via GitHub Pages
- **Backend:** Cloudflare Worker (`worker/index.js`) — KV + R2 storage
- **Output pages:** `bug-h.html`, `bug-v.html`, `graphic-h.html`, `graphic-v.html` — loaded as browser sources in vMix
- **Deploy worker:** `npx wrangler deploy` (from project root — wrangler.toml is at root, not in worker/)
- **Gallery URL:** https://adp-lab.github.io/adp-show-graphics/gallery.html
- **Worker URL:** https://adp-show-graphics.mohn-edgar.workers.dev
- **CF account:** [redacted]

## KV structure (v3)
Per-slot keys: `slot:{event}:{layer}:{slot}` — never use shared objects, always atomic per-slot writes.
Layers: `graphics`, `bugs`. Slots: `h`, `v`.

## Key design decisions
- Output pages poll `/active` every 1500ms — keep response fast
- Worker cache TTL is 3s (not longer) — cross-datacenter staleness bound
- `recallLayout` in gallery uses sequential awaits, not Promise.all — prevents KV race
- `/trigger` endpoint is GET with `?apikey=` — Companion-friendly, no custom headers needed
- `/status` endpoint is public (no auth) — Companion can poll for feedback state
- Credits feature removed — Chad has standalone solution

## What NOT to change without thinking carefully
- Cache TTL in `/active`: was 30s, caused sticky outputs — keep at 3s or lower
- KV write pattern: always write to `slot:${event}:${layer}:${slot}`, never to a shared object
- `recallLayout` concurrent writes: must stay sequential (or verify race-free with Option B keys)

## Companion integration
See `docs/companion-cheatsheet.md` for trigger URL reference.

## Phase 1 — IN PROGRESS (2026-05-15)
Moving slot state + settings from KV to R2 (strongly consistent globally — fixes 15–30s cloud vMix delay).
Full plan: `docs/handoffs/2026-05-15-adp-show-graphics-phase1-handoff.md` (gitignored, on Maggie).
After Phase 1: KV structure note above becomes partially obsolete — slots move to R2, rest stays in KV.

## Phase 2 — PLANNED
Maggie as primary state server (Flask/PocketBase + CF Tunnel), SSE push for instant updates,
CasperCG AMCP integration. CF Worker stays as warm fallback with R2 state sync.

## Future scope
- Companion config helper tab in gallery
- UVC/webcam input layer
- NDI input/output
