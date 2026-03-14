# adp-show-graphics — vMix Setup Guide
*For Chad — test run 2026-03-15*

---

## Step 1 — Add 4 browser sources to vMix

Create these as **Browser** inputs. Resolution must match exactly.

| Input name | URL | Resolution |
|---|---|---|
| GFX H | `https://adp-lab.github.io/adp-show-graphics/graphic-h.html?event=default` | 3840 × 2160 |
| GFX V | `https://adp-lab.github.io/adp-show-graphics/graphic-v.html?event=default` | 1215 × 2160 |
| Bug H | `https://adp-lab.github.io/adp-show-graphics/bug-h.html?event=default` | 3840 × 2160 |
| Bug V | `https://adp-lab.github.io/adp-show-graphics/bug-v.html?event=default` | 1215 × 2160 |

- All 4 pages have **transparent background** — overlay them on top of cameras/content
- They poll the server every 1.5 s — no manual refresh needed
- Blank = nothing live (transparent), not broken
- **V resolution note:** vMix vertical video uses a cropped column from the 4K canvas — 1215×2160 is the practical pixel area. In the gallery → ⚙ Settings → set V resolution to **1215 × 2160** so uploaded images are scaled correctly.

---

## Step 2 — Open the gallery (operator control)

**URL:** https://adp-lab.github.io/adp-show-graphics/gallery.html

Open in any browser (Chrome recommended). First time on a new machine:

1. Click **⚙ Settings** (top right)
2. Paste Worker URL: `https://adp-show-graphics.mohn-edgar.workers.dev`
3. Paste API Key: *(get from André)*
4. Click **Save** — the dot in the header turns green ("Connected")

---

## Step 3 — Send a graphic live

1. In the **Image Library** (bottom of page), find the image to use
2. Click **GFX H** or **GFX V** (or **Bug H / Bug V**) on the image tile → image loads into that slot
3. In the **center panel**, click **GFX H** button (green → red = on air) — or **GFX H+V** to push both simultaneously
4. The browser source in vMix updates within ~1.5 s
5. Click the same button again to go **transparent**

---

## Layer concept (for compositing in vMix)

```
Bug / QR layer  →  bug-h / bug-v      (lower third bugs, QR codes)
Graphics layer  →  graphic-h / graphic-v  (full-frame graphics, silhouettes)
```

Stack order in vMix: Graphics on top of camera, Bug on top of Graphics (or separate overlay).

---

## Quick reference — button colors

| Color | Meaning |
|---|---|
| Grey | Slot empty |
| Green | Image loaded, **not** on air |
| Red | **On air** — output is live |

---

## If something looks wrong

- **Output blank / nothing shows** → check the "Connected" dot is green in gallery; check API key in Settings
- **Image is there but wrong slot** → Click the red SEND LIVE button again to clear, then re-assign
- **Old image still showing** → click the slot's **X Clear** button in the center panel
- **Gallery shows no images** → click **↺ Refresh** button (top right of gallery)

---

*André: Worker URL `https://adp-show-graphics.mohn-edgar.workers.dev` · API key via wrangler*
