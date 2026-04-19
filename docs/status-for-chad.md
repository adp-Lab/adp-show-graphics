# adp-show-graphics — Current State & Roadmap
*For Chad — 2026-04-19*

---

## What's built and working

**4 output URLs** (GFX H / GFX V / Bug H / Bug V) — transparent browser sources for vMix/OBS.

**Gallery (operator control panel):**
- Live Slots panel — H and V canvases, manipulation mode per layer (GFX = red, Bug = blue), scale/rotate/fit controls, snap-to-grid
- SEND LIVE buttons per layer/slot; output goes transparent until live
- Saved Layouts — H+V composite preview, recall H / V / both, drag-to-reorder, active layout highlighted
- Output monitors sidebar — live iframes of all 4 outputs

**Image library:**
- Search, tag filtering, drag-to-reorder
- Sections: Image Library · Processed Images · Credits Library · BG Reference Library
- Image Editor: crop, rotation, BG colour knock-out (colour picker + tolerance + EyeDropper), Save as Copy (never overwrites original)

**Infrastructure:**
- Multi-event system — isolated images and layouts per event, slug-based IDs for predictable vMix automation URLs
- vMix quick trigger: `GET /go?event=X&layer=X&slot=X&key=X` for scripted automation
- Worker Cache API — KV reads only on operator state changes; idle polling costs zero reads (implemented today)
- Output pages: `Cache-Control: no-store` + `cache: 'no-store'` fetch — no stale state from CDN or browser cache

---

## What's not built yet

**Credits output pages** — `credits-h.html` / `credits-v.html` don't exist yet.
The gallery already has a Credits Library section and Credits LIVE button stubs, but the actual output pages and Worker endpoint are missing.
*Note: André mentioned you may have built a standalone credits solution — worth checking before building this inside the tool.*

---

## Backlog / ideas

- **Error visibility on output pages** — poll failures are silent (`catch(e) {}`); vMix freezes with no indication; a small visual indicator would help the graphics OP
- **Export asset to local disk** — download originals or edited copies from the gallery
- **Bitfocus Companion webhook support** — trigger SEND LIVE / clear from Stream Deck
- **Visual crop handles** in the editor (currently slider-only)
- **Video playback** — R2 supports large objects; output page behaviour and vMix audio handling TBD
- **remove.bg API** — optional upgrade for higher-quality BG removal
- **QR code generation** — generate QR codes directly from a URL input in the gallery
- **Multi-user / viewer mode** — read-only gallery view for a second operator or client monitor
- **Scheduled graphics** — queue a graphic to go live at a set time

---

*Full roadmap: `Roadmap adp-show-graphics.md` in the repo.*
