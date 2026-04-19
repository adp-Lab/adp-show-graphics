Roadmap — adp-show-graphics
_______________________________

## Current state — v2 (as of 2026-04-19)

### What is built and working

**Core architecture**
- Cloudflare Worker + KV (state) + R2 (images)
- 4 output URLs: GFX H / GFX V / Bug H / Bug V
- GitHub Pages for gallery + output pages
- Multi-event system — isolated image libraries and layouts per event
- Worker Cache API — KV reads only on operator state changes; idle polling costs zero reads

**Gallery — operator control panel**
- Live Slots panel: H and V canvases, manipulation mode (GFX = red glow, Bug = blue glow)
- Scale / Rotate sliders, Contain / Cover fit, Snap-to-grid (multiple grid presets)
- BG Reference toggle + opacity per slot
- Center panel: Preview toggles, SEND LIVE buttons per layer/slot, Clear buttons
- Output monitors sidebar: live iframes for all 4 outputs + Credits stubs
- Saved Layouts: H+V composite preview, H/V/Both recall, drag-to-reorder, active layout indicator (green badge), zoom on click
- Slot dirty guard: once an operator touches a slot, the poll loop never overwrites it for the session

**Image library**
- Search (name + tags), tag filter bar, drag-to-reorder
- Tag management: create, delete, rename tags; auto-suggest on upload
- Image tiles: thumbnail, name, tag chips, slot toggle buttons (GFX H/V, Bug H/V), edit/delete
- Image preview modal: H + V side-by-side, 4 slot buttons
- Sections: Image Library · Processed Images (tagged `edited`) · Credits Library (tagged `Credits`) · BG Reference Library

**Image Editor modal**
- Crop sliders: top / right / bottom / left (% of image dimensions), live canvas preview
- Rotation slider: –180° to +180°
- BG colour knock-out: colour picker + tolerance slider; EyeDropper API for click-to-pick (with fallback)
- Save as Copy: canvas export → POST /upload tagged `edited`; name editable before saving; never overwrites original

**Settings & UX**
- Settings modal: resolution per format (H + V independently), presets + custom input
- Help modal with UI guide image
- vMix quick trigger: GET /go endpoint for scripted automation
- Slug-based event IDs for predictable URLs

**Output pages (all 4)**
- Transparent background, scales to viewport
- Polls Worker every 1.5s; applies position, scale, rotate, fit from state
- Cache headers set to no-store; poll uses `cache: 'no-store'` fetch option

---

## What is not yet built

### Credits output pages (next major feature)
The gallery already has a Credits Library section and Credits LIVE button stubs, but the actual output pages don't exist yet and the Worker has no credits endpoint.

Scope:
- `credits-h.html` / `credits-v.html` output pages
- Paged display with fade-in transitions (not scrolling)
- At least one page supports a full background image (Zoom branding use case)
- Worker endpoint: `PUT /credits?event=X` → stored in KV → polled by output pages
- Gallery: Credits H / V / H+V LIVE buttons (wire up the existing stubs)
- Name data source: pull from signup sheet or manual entry (API endpoint TBD)
- Contributor data: posted via external tools → Worker endpoint

---

## Backlog

### Operator / show workflow
- **Error visibility on output pages** — silent `catch(e) {}` in poll loop means vMix freezes with no indication if network or quota issues occur; add a small visual indicator (red border, dot) so the graphics OP can see something is wrong
- **Export asset to local disk** — download button on image tiles to save originals or edited copies
- **Sort controls for image library** — by name, upload date, or active-in-slot
- **Bitfocus Companion webhook support** — trigger SEND LIVE / clear from a Stream Deck button

### Editor improvements
- **Visual crop handles** — currently crop is slider-only; drag handles on the canvas would be more intuitive
- **remove.bg API integration** — optional paid upgrade path for higher-quality BG removal vs. the current colour-tolerance KO

### Platform expansion
- **Video playback support** — serve and display video assets in the output pages; open question: how to handle asset storage (R2 supports large objects) and looping/cue behaviour
- **Audio** — if video is supported, audio routing needs to be considered; vMix handles audio from browser sources, but this needs testing

### Infrastructure
- **Bundled `/active/all` endpoint** — gallery currently makes 4 separate `/active` calls per poll cycle; a single endpoint returning all slot states would halve KV reads further (low priority now that Cache API is in place)
- **SSE / push updates** — proper push-based updates instead of polling; requires Cloudflare Durable Objects (paid); revisit if latency becomes a concern or volume grows

---

## Ideas parking lot

These are ideas worth discussing but not yet scoped:

- **Multi-user / role separation** — read-only output URLs are already public; a viewer-only gallery mode (no send-live, no edits) for a second operator or client monitor
- **Scheduled graphics** — queue a graphic to go live at a specific time (useful for countdown-driven shows)
- **vMix title / data source integration** — push text fields from the gallery into a vMix title template, not just images
- **QR code generation** — generate QR codes directly in the gallery from a URL input instead of uploading pre-made images

---

## Session history

| Session | Status | Key commits |
|---|---|---|
| Session 1 | ✅ Complete | Initial v2 build — multi-layer, events, live toggle, resolution |
| Session 2 | ✅ Complete | New slots panel, tile redesign, rotate support |
| Session 3 | ✅ Complete | Full gallery UI overhaul — layout, sections, preview modal (`af35dd8`) |
| Session 4 | ✅ Complete | Center panel redesign, snap-to-grid, sidebar monitors (`96e33ad`) |
| Session 5 | ✅ Complete | Manipulation mode toggle, tile thumbnails +30%, editor stub, scaling fix (`bcd26dc`) |
| Session 6 | ✅ Complete | Full Image Editor — crop, rotation, BG KO, save as copy (`bfd9d5b` + fixes) |
| 2026-04-19 | ✅ Complete | Worker Cache API + no-store headers — KV reads drop to near zero at idle |
