# adp-show-graphics v3 — Update for Chad
2026-05-10

## What happened

During shows we noticed that after recalling a layout (e.g. switching from one QR code setup to another), the H and V outputs would sometimes show the wrong graphic — H was correct but V was stuck on the old image, or vice versa. This was intermittent and hard to reproduce because it depended on timing.

## Root cause

**Race condition in the old architecture.** All 4 slots (graphics-h, graphics-v, bugs-h, bugs-v) lived in a single shared KV object. When the gallery recalled a layout, it fired 4 concurrent writes via Promise.all. Each write:

1. Read the shared object (all 4 got the same snapshot)
2. Modified its own slot
3. Wrote the whole object back

Last write won. The other 3 were silently overwritten. That's why one slot would show the correct image and the others wouldn't update.

A secondary issue: the Cloudflare Cache API was set to 30 seconds. Even after a correct write, output pages on different edge nodes could serve stale data for up to 30 seconds.

## What changed (v3)

**Worker:**
- Each slot is now its own KV key: `slot:{event}:{layer}:{slot}` — no shared object, no race
- Cache TTL reduced from 30s to 3s — output pages update within 3 seconds max
- `/trigger` endpoint added — designed for Companion and vMix HTTP requests
- `/status` endpoint added — returns all 4 slot states at once for Companion feedback polling
- Empty-slot guards — going live on an empty slot is handled gracefully instead of creating ghost entries

**Gallery:**
- Layout recall rewritten to avoid the race (sequential writes as belt-and-suspenders)
- Live buttons show state: green = image ready, red = live on air
- H+V combined buttons split visually when slots are in different states
- Connection-lost indicator — if the worker goes down, the operator sees it

## Current Companion integration

The `/trigger` endpoint is the main integration point. All actions use GET requests with the API key in the URL — no custom headers needed, which makes Companion setup straightforward.

### Available actions

| Action | What it does | Required params |
|--------|-------------|-----------------|
| `preview` | Load image to slot, NOT live | `layer`, `key` |
| `live` | Take slot on air | `layer` |
| `off` | Take slot off air (image stays) | `layer` |
| `go` | Load image + go live immediately | `layer`, `key` |
| `clear` | Remove image from slot(s) | `layer` (optional = all layers) |
| `layout` | Recall saved layout to preview | `layout` (layout ID) |

`slot` defaults to `both` (H+V). Can be set to `h` or `v` for single-output control.

### Feedback polling

`GET /status?event=default` returns all slot states. Use this in Companion to drive button colors (green/red based on `.bugs.h.live`, `.graphics.v.live`, etc.). The endpoint is cached for 3 seconds — fast enough for feedback, light on resources.

### Typical Companion button (one-button layout recall + go live)

Stack 3 HTTP actions on a single button:
```
GET /trigger?apikey=KEY&action=layout&layout=panel_intro&slot=both
GET /trigger?apikey=KEY&action=live&layer=bugs&slot=both
GET /trigger?apikey=KEY&action=live&layer=graphics&slot=both
```

Full URL examples and a quick reference table are in `companion-cheatsheet.md`.

## What's next

- **Companion helper tab** in the gallery — a UI that generates trigger URLs from your layouts and images, so operators don't need to manually construct URLs
- **Operator manual** — markdown reference for graphics operators

## Links

- Gallery: https://adp-lab.github.io/adp-show-graphics/gallery.html
- Worker: https://adp-show-graphics.mohn-edgar.workers.dev
- Companion cheatsheet: `docs/companion-cheatsheet.md`
