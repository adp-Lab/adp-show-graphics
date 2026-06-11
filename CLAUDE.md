# adp-show-graphics

Browser-source graphics tool for live vMix shows. Operator panel + Cloudflare Worker backend.

## Stack
- **Frontend:** Single-file gallery (`gallery.html`) — no build step, deployed via GitHub Pages
- **Backend:** Cloudflare Worker (`worker/index.js`) — R2 for live state + images, KV for gallery metadata
- **Output pages:** `bug-h.html`, `bug-v.html`, `graphic-h.html`, `graphic-v.html` — loaded as browser sources in vMix
- **Deploy worker:** commit + push to main — GitHub Actions deploys (wrangler.toml is at root, not in worker/)
- **Gallery URL:** https://adp-lab.github.io/adp-show-graphics/gallery.html
- **Worker URL:** https://adp-show-graphics.mohn-edgar.workers.dev
- **CF account:** [redacted]

## Deploy rule — NON-NEGOTIABLE
**Deploy = commit + push. Never bare `npx wrangler deploy`.**
GitHub main is the source of truth: Actions deploys it on every push, and the weekly
scheduled run must never deploy (scan only — see `.github/workflows/deploy.yml`).
In May 2026, a manually deployed but unpushed v4 was silently rolled back to v3 by the
scheduled deploy, reintroducing the 30s cloud-vMix delay for three weeks of shows.
If an emergency mid-show manual deploy ever happens, push the same code immediately after.

## Storage layout (v4)
**R2 (strongly consistent — all time-critical live state):**
- `state/{event}/slot/{layer}/{slot}.json` — slot state. Layers: `graphics`, `bugs`. Slots: `h`, `v`.
- `state/{event}/settings.json` — resolution settings
- `{event}/...` — uploaded images

**KV (eventually consistent — gallery-operated metadata only, staleness invisible at operator speed):**
`image_index:{event}`, `layouts:{event}`, `layouts_order:{event}`, `events`, `image_categories`, `tag_rules`.
Never put time-critical state in KV — cross-region propagation takes up to 60s.

## Key design decisions
- Output pages poll `/active` every 1500ms — keep response fast
- No Worker Cache on `/active` or `/status` (removed in v4) — R2 is consistent, caching would only reintroduce staleness
- `GET /health` returns `{ok, version}` — first check whenever "is the right code live?" comes up
- `recallLayout` in gallery uses sequential awaits, not Promise.all — belt and braces against write races
- `/trigger` endpoint is GET with `?apikey=` — Companion-friendly, no custom headers needed
- `/status` endpoint is public (no auth) — Companion can poll for feedback state
- Credits feature removed — Chad has standalone solution

## What NOT to change without thinking carefully
- Do NOT add caching in front of slot-state reads — staleness directly delays live graphics in cloud vMix
- Do NOT move slot state or settings back to KV — eventual consistency caused the original 15–60s NA delay
- Bump `VERSION` in `worker/index.js` whenever Worker behaviour changes

## Companion integration
See `docs/companion-cheatsheet.md` for trigger URL reference.

## Phase 1 — DONE (built 2026-05-15, committed + pipeline fixed 2026-06-11)
Slot state + settings moved from KV to R2 (strongly consistent globally — fixes 15–60s cloud vMix delay).
Full plan: `docs/handoffs/2026-05-15-adp-show-graphics-phase1-handoff.md` (gitignored, on Maggie).

## Phase 2 — PLANNED
Maggie as primary state server (Flask/PocketBase + CF Tunnel), SSE push for instant updates,
CasperCG AMCP integration. CF Worker stays as warm fallback with R2 state sync.

## Future scope
- Companion config helper tab in gallery
- UVC/webcam input layer
- NDI input/output
