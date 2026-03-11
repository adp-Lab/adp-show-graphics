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

Each layer is independently controlled. Both layers are always transparent until **SEND LIVE** is active.

---

## Workflow

1. Open gallery → enter Worker URL + API key
2. Select event from dropdown (or create one)
3. Upload images via 📤 or drag from Finder
4. Select target slot (Graphics H/V · Bug H/V)
5. Click image → appears in slot preview
6. Click **SEND LIVE** → image goes live on output URL
7. Click **SEND LIVE** again → output goes transparent
8. Save layouts to recall full slot states instantly

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
  &x=50&y=50&scale=100&fit=contain
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

*Built by André Doelle (adp-Lab) · v2*
