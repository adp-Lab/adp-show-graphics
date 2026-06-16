# adp-show-graphics

Browser-source graphics system for live event production. Built for vMix, OBS, and anything that accepts browser sources — full-screen graphics and bug/QR overlays on horizontal (H) and vertical (V) outputs simultaneously.

**Live gallery:** https://adp-lab.github.io/adp-show-graphics/gallery.html

> **Operators:** start with the **[Quick Reference](docs/operator-quickref.md)** or the full **[Operator Guide](docs/operator-guide.md)** — or click **❓ How it works** inside the gallery for a labelled screenshot of every control.

---

## Architecture

```
Cloudflare Worker  ←→  R2  (live state + settings + images — strongly consistent)
                   ←→  KV  (gallery metadata only — eventually consistent)
                   ↑
GitHub Pages (gallery + output pages)
```

- **Gallery** (`gallery.html`) — operator control panel, runs in any browser
- **Output pages** (`bug-*.html`, `graphic-*.html`) — transparent browser sources added to vMix/OBS; poll the Worker ~1×/second
- **Worker** (`worker/index.js`) — REST API, image storage, live state
- **R2** — all time-critical live state (slot state + resolution settings) **and** images. Strongly consistent globally — this is what keeps cloud/NA vMix latency to ~1–2 s.
- **KV** — gallery-operated metadata only (image index, layouts, events, categories, tag rules). Eventually consistent; never holds time-critical state.

---

## Deploy — commit + push (non-negotiable)

**Deploy = commit + push to `main`.** GitHub Actions deploys `main` on every push.

> ⚠️ **Never run a bare `npx wrangler deploy`.** A manually-deployed-but-unpushed build was silently rolled back by the scheduled workflow once and reintroduced a multi-week latency regression. `main` is the single source of truth. Bump `VERSION` in `worker/index.js` whenever Worker behaviour changes.

Check what's actually live at any time:

```
GET /health   → { ok, version, colo, now }     # is the right code live? colo = nearest edge
GET /diag?apikey=KEY                            # R2 write/read/delete round-trip with timings
```

---

## Output URLs (add as vMix Browser Inputs)

Append `?event=ID` to target a specific event. Match the resolution to ⚙ Settings (defaults below).

| Layer | Format | URL | Default resolution |
|---|---|---|---|
| Graphics | H (landscape) | `…/graphic-h.html?event=…` | 3840 × 2160 |
| Graphics | V (portrait)  | `…/graphic-v.html?event=…` | 2160 × 3840 |
| Bug / QR | H (landscape) | `…/bug-h.html?event=…`     | 3840 × 2160 |
| Bug / QR | V (portrait)  | `…/bug-v.html?event=…`     | 2160 × 3840 |

**Base URL:** `https://adp-lab.github.io/adp-show-graphics/`

---

## Operator model (the essentials)

- **Loading an image into a slot = PREVIEW only** (local — shows in the gallery + monitors). It is **not on air** until a **SEND LIVE** button is pressed.
- **Colours = state**, everywhere (image-tile slot buttons, SEND LIVE buttons, layout H/V/Both buttons): 🟢 green = loaded/preview · 🔴 red = on air · dark = not loaded.
- **H** = landscape output, **V** = portrait output — independent; `H+V` acts on both.
- **Show BUG | GFX** toggles focus the workspace on one layer (view-only, never changes air); the surviving output monitor enlarges.
- **Saved Layouts** snapshot all four slots; recall H / V / Both. **Live Outputs** monitors are your on-air confidence feeds.

Full details: **[Operator Guide](docs/operator-guide.md)** · 30-second version: **[Quick Reference](docs/operator-quickref.md)**.

---

## Worker endpoints

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /active?event=&layer=&slot=` | public | current slot state (output pages poll this) |
| `GET /status?event=` | public | all slots at once (Companion feedback) |
| `GET /health` | public | version / edge / time |
| `GET /img/{key}` | public | serve an image from R2 |
| `GET /go?apikey=&event=&layer=&slot=&key=…` | key | set + go live in one call (vMix scripts) |
| `GET /trigger?apikey=…` | key | Companion-friendly trigger (no custom headers) |
| `GET /diag?apikey=` | key | R2 round-trip diagnostic |
| `PUT /select /live /clear`, `POST /events`, upload, … | key | gallery write operations |

Read endpoints are intentionally public (output pages need them with no auth). All writes require the API key. There is **no Worker cache** on `/active` or `/status` — R2 is consistent, caching would only reintroduce staleness.

---

## Storage layout

**R2 (strongly consistent — all time-critical live state):**

| Key | Content |
|---|---|
| `state/{event}/slot/{layer}/{slot}.json` | slot state. Layers: `graphics`, `bugs`. Slots: `h`, `v`. |
| `state/{event}/settings.json` | resolution settings |
| `{event}/…` | uploaded images |

**KV (eventually consistent — gallery metadata only):**
`image_index:{event}`, `layouts:{event}`, `layouts_order:{event}`, `events`, `image_categories`, `tag_rules`.

> Do **not** move slot state or settings back to KV — eventual consistency caused the original 15–60 s NA delay.

### Slot object

```json
{
  "key": "default/1234567_image_name.png",
  "name": "Image Name",
  "x": 50, "y": 50, "scale": 100, "rotate": 0,
  "fit": "contain",
  "live": false,
  "updatedAt": "2026-06-16T00:00:00Z"
}
```

---

## Resolution

Set per-event, per-format (H and V independently) in ⚙ Settings. Presets 4K / 1440p / 1080p / 720p, or custom. Defaults: **H 3840 × 2160**, **V 2160 × 3840**. Output pages read resolution from the Worker and size their canvas to match.

---

## Setup (first time)

```bash
npm install -g wrangler
npx wrangler kv namespace create adp-show-graphics      # → id into wrangler.toml
npx wrangler r2 bucket create adp-show-graphics
npx wrangler secret put API_KEY
# Deploy: commit + push to main (GitHub Actions deploys) — NOT a bare wrangler deploy.
# Enable GitHub Pages: repo Settings → Pages → Source: main / root
```

## Rotate the API key

```bash
npx wrangler secret put API_KEY
```

---

## Files

| File | Purpose |
|---|---|
| `gallery.html` | Operator control panel |
| `graphic-h.html` / `graphic-v.html` | Graphics output — landscape / portrait |
| `bug-h.html` / `bug-v.html` | Bug/QR output — landscape / portrait |
| `worker/index.js` | Cloudflare Worker |
| `wrangler.toml` | Worker deployment config |
| `docs/operator-quickref.md` · `docs/operator-guide.md` | Operator documentation |

---

*Built by André Doelle (adp-Lab)*
