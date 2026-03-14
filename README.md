# adp-show-graphics

Browser-source graphics system for live event production. Built for vMix, OBS, and any software that accepts browser sources.

**Live gallery:** https://adp-lab.github.io/adp-show-graphics/gallery.html

---

## Architecture

```
Cloudflare Worker  ←→  KV (state)
                   ←→  R2 (images)
                   ↑
GitHub Pages (gallery + output pages)
```

- **Gallery** — operator control panel (browser, any device)
- **Output pages** — transparent browser sources added to vMix/OBS
- **Worker** — REST API, image storage, live state
- **KV** — active slot state, layouts, categories, events
- **R2** — image storage

---

## Output URLs

Add these as browser sources in vMix. Append `?event=ID` to target a specific event.

| Layer | Format | URL |
|---|---|---|
| Graphics | H (landscape) | `…/graphic-h.html?event=default` |
| Graphics | V (portrait)  | `…/graphic-v.html?event=default` |
| Bug / QR | H (landscape) | `…/bug-h.html?event=default`     |
| Bug / QR | V (portrait)  | `…/bug-v.html?event=default`     |

**Base URL:** `https://adp-lab.github.io/adp-show-graphics/`

---

## Layer concept

```
Layer 0 — Background reference  (gallery preview only, never in output)
Layer 1 — Bug / QR codes        → bug-h.html / bug-v.html
Layer 2 — Graphics              → graphic-h.html / graphic-v.html
```

Each layer is independently controlled. Output is always transparent until **SEND LIVE** is active.

---

## Gallery — Live Slots panel

The slots panel is a 4-column layout:

```
[ H column ] [ Center panel ] [ V column ] [ Output monitors ]
```

### H / V columns
- **Composite preview canvas** — both Graphics and Bug layers visible simultaneously
- **Active control tabs** (GFX / Bug) — select which layer the drag, scale, rotate and fit controls affect; both layers remain visible
- **Scale slider** — 10–300%
- **Rotate slider** — –180° to +180°; applied in both gallery preview and output pages
- **Fit / Cover / Fill** mode
- **URL bar** — output URLs for GFX and Bug per format, with ↗ open and 📋 copy
- **Grid** — toggle, 10×/20×/40×/80× divisions, snap-to-grid
- **BG Reference** — enable toggle + opacity slider (gallery preview only)

### Center panel
- **Preview toggles** (Bug H · Bug V · GFX H · GFX V) — show/hide each layer in the canvas independently
- **SEND LIVE buttons** — 4 individual + 2 combined (H+V per layer)
  - Grey = empty slot · Green = content loaded, not live · Red = on air
- **Send image to →** — target selector, determines which slot GFX H/V / Bug H/V buttons on image tiles send to
- **Clear slot** — 4 individual clear buttons

### Output monitors sidebar
- 4 live scaled iframes (GFX H/V, Bug H/V) + 2 Credits placeholders
- Click any monitor to magnify to ~60% screen

---

## Workflow

1. Open gallery → enter Worker URL + API key
2. Select event from dropdown (or create one)
3. Upload images via 📤 or drag from Finder onto the window
4. In the image library, click **GFX H / GFX V / Bug H / Bug V** on any tile to send it to that slot
   - Button highlights when the image is active in that slot — click again to clear
5. Drag image in the slot preview canvas to reposition; use Scale / Rotate / Fit controls
6. Click **SEND LIVE** in the center panel → image goes live on the output URL
7. Click **SEND LIVE** again → output goes transparent
8. Save layouts to recall full slot states instantly

---

## Image tiles

Each image card shows:
- Thumbnail (fixed height, dark background, preserves aspect ratio for both H and V images)
- Name — click ✏️ to open rename/edit modal
- Tag chips (blue) — click × to remove; 🏷 button opens tag dropdown
- **GFX H · GFX V · Bug H · Bug V** — slot toggle buttons (highlighted = currently in that slot)
- ✏️ Edit · 🗑 Delete

---

## Events

Each event has isolated images and layouts. Switch from the top dropdown.
Output pages pick up the event from the URL querystring: `?event=eventID`

---

## Resolution

Set per-event, per-format (H and V independently) in ⚙ Settings.
Presets: 4K (3840×2160), 1440p, 1080p, 720p — or enter custom values.
Output pages read resolution from the Worker and set canvas size dynamically.

---

## vMix quick trigger

Set an image live from a vMix script or title template without opening the gallery:

```
GET https://adp-show-graphics.mohn-edgar.workers.dev/go
  ?apikey=YOUR_KEY
  &event=default
  &layer=graphics
  &slot=h
  &key=IMAGE_KEY
  &x=50&y=50&scale=100&fit=contain&rotate=0
```

`slot=both` sets H and V simultaneously.

---

## Setup (first time)

```bash
# 1. Install Wrangler
npm install -g wrangler

# 2. Create KV namespace
npx wrangler kv namespace create adp-show-graphics
# → paste the id into wrangler.toml

# 3. Create R2 bucket
npx wrangler r2 bucket create adp-show-graphics

# 4. Deploy Worker
npx wrangler deploy

# 5. Set API key
npx wrangler secret put API_KEY

# 6. Enable GitHub Pages
# → repo Settings → Pages → Source: main / root
```

---

## Rotate API key

```bash
npx wrangler secret put API_KEY
```

---

## KV structure

| Key | Content |
|---|---|
| `events` | `[{id, name, created}]` |
| `active:{eventId}` | `{graphics:{h,v}, bugs:{h,v}}` — slot states |
| `image_index:{eventId}` | `[{key, name, tags, uploadedAt}]` |
| `layouts:{eventId}` | `{id: {name, graphics, bugs}}` |
| `layouts_order:{eventId}` | `[id, …]` |
| `settings:{eventId}` | `{resolution:{h:{w,h}, v:{w,h}}}` |
| `image_categories` | `[string, …]` — global |
| `tag_rules` | `{category:[keyword,…]}` — global |

---

## Slot object

```json
{
  "key": "default/1234567_image_name.png",
  "name": "Image Name",
  "x": 50,
  "y": 50,
  "scale": 100,
  "rotate": 0,
  "fit": "contain",
  "live": false,
  "updatedAt": "2026-03-11T00:00:00Z"
}
```

---

## Files

| File | Purpose |
|---|---|
| `gallery.html` | Operator control panel |
| `graphic-h.html` | Graphics output — landscape |
| `graphic-v.html` | Graphics output — portrait |
| `bug-h.html` | Bug/QR output — landscape |
| `bug-v.html` | Bug/QR output — portrait |
| `worker/index.js` | Cloudflare Worker |
| `wrangler.toml` | Worker deployment config |

---

---

## Operator quick-start

→ See [CHAD.md](CHAD.md) for a plain-language vMix setup guide.

---

*Built by André Doelle (adp-Lab) · v2*
