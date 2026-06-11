# adp-show-graphics — Operator Manual

Browser-based graphics overlay tool for live vMix productions. Manages fullscreen graphics and bug/QR overlays on horizontal (H) and vertical (V) outputs simultaneously.

Gallery: https://adp-lab.github.io/adp-show-graphics/gallery.html

---

## Quick Start

1. Open the gallery URL in Chrome
2. Enter the **Worker URL** and **API key** (provided by the show's technical lead)
3. Choose or create an **Event** from the dropdown (top-left) — each event has its own image library and layouts
4. Upload your graphics and QR codes
5. Assign images to slots, then use the LIVE buttons to send them to the outputs

---

## Gallery Layout

The gallery has a 3-column layout with a sidebar:

```
┌──────────────┬──────────┬──────────────┬──────────────┐
│   H Column   │  Center  │   V Column   │   Output     │
│  (Landscape) │ Buttons  │  (Portrait)  │   Monitors   │
└──────────────┴──────────┴──────────────┴──────────────┘
```

Below that are collapsible sections: Saved Layouts, Processed Images, Tag Management, Image Library, and Background References.

---

## The Slot Columns (H and V)

Each column represents one output orientation:
- **H** — Landscape (default 3840 x 2160)
- **V** — Portrait (default 2160 x 3840, or 1215 x 2160 for vMix vertical crop)

### Two layers per slot

Each slot has two independent layers that composite on top of each other:
- **Graphics (GFX)** — fullscreen graphics, backgrounds, title cards
- **Bugs** — QR codes, logos, lower-thirds overlays

### Manipulation tabs

At the top of each column, two tabs control which layer's sliders are active:
- **Manip. GFX** — sliders and drag affect the Graphics layer (controls highlighted red)
- **Manip. Bug** — sliders and drag affect the Bug/QR layer (controls highlighted blue)

Click the active tab again to deactivate (all controls dim). The inactive layer is still visible in the preview — you're only choosing which layer responds to adjustments.

### Canvas preview

The large preview area shows both layers composited. You can:
- **Drag** the image to reposition it (X/Y). Content can be dragged partially or fully off-frame.
- Drag updates appear on the output within ~3 seconds.
- During and for 2 seconds after a drag, incoming poll updates are paused to prevent snap-back.

### Sliders

- **Scale** — 10% to 300%. Click the percentage label to reset to 100%.
- **Rotate** — -180 to +180 degrees. Click the degree label to reset to 0.

### Fit mode

- **Contain** — image fits inside the frame, maintaining aspect ratio. May have transparent edges.
- **Cover** — image fills the entire frame (crops to fit). Position and scale sliders are ignored.

### Grid overlay

- Toggle a grid overlay on the canvas preview (gallery only — never visible on output)
- Grid sizes: 10x10, 20x20, 25x25, 40x40, 50x40, 80x80
- **Snap** checkbox — snaps drag positions to grid intersections

### Background Reference (BG Ref)

- Loads a reference image (e.g., a presentation slide) behind the graphic in the gallery preview
- **Gallery only** — never sent to output, never visible in vMix
- Opacity slider adjusts transparency
- Upload reference images via the Background References section at the bottom

### Output URL bar

Each column shows the output page URLs for GFX and Bug layers:
- **Open** — opens the output page in a new tab (use this URL as a Browser Source in vMix)
- **Copy** — copies the URL to clipboard

---

## Center Buttons

### Preview toggles

**Bug H / Bug V / GFX H / GFX V** — show or hide individual layers in the gallery canvas preview. Does not affect the output. Useful for checking one layer without the other.

### LIVE buttons

The main controls for sending graphics to air:

| Color | Meaning |
|-------|---------|
| Grey | Slot is empty — no image assigned |
| Green | Image loaded, ready to go — NOT on air |
| Red | ON AIR — image is live on the output |

- **Bug H / Bug V** — toggle individual bug/QR slots
- **Bug H+V** — toggle both bug slots together. Splits visually (left/right) when H and V are in different states.
- **GFX H / GFX V** — toggle individual graphics slots
- **GFX H+V** — toggle both graphics slots together

Clicking a red (live) button takes that slot off air (transparent). The image stays assigned — click again to go live again.

**Important:** Assigning an image from the library does NOT make it live. You must click the LIVE button to send it to the output.

### Clear buttons

**GFX H x / GFX V x / Bug H x / Bug V x** — removes the image from the slot entirely and immediately goes transparent on the output. Unlike toggling off, clearing also removes the assignment.

---

## Output Monitors (right sidebar)

Live iframe previews of each output page — GFX H, GFX V, Bug H, Bug V.

- Click any monitor to magnify it in a full-screen modal. Click anywhere to close.
- Monitors poll at the same rate as the actual output pages (~3 seconds).
- Use these to verify what the output looks like before and after going live.

---

## Image Library

### Uploading images

Three ways to upload:
1. Click **Upload** in the Image Library or Processed Images section
2. **Drag files from Finder** anywhere onto the gallery window
3. During upload, select category tags and add extra tags (comma-separated)

Auto-tag rules (configured in Tag Management) automatically apply tags based on filename keywords.

### Image tiles

Each image card shows:
- Thumbnail and name
- **Slot buttons** (GFX H / GFX V / Bug H / Bug V) — highlighted = currently assigned to that slot. Click to assign or remove.
- **Tag chips** — shows assigned categories/tags
- Action buttons: **rename**, **tag dropdown**, **image editor**, **delete**

Cards can be **dragged to reorder** — the order is saved.

### Filters

Use the filter bar to show only images with a specific tag. The search box filters by name.

### Select mode

Click **Select** in the toolbar to enter multi-select mode. Check individual images, then delete selected.

---

## Image Editor

Click the pencil icon on any image tile to open the editor.

- **Rotation** — live preview; output auto-resizes to bounding box
- **Crop/Trim** — Top / Bottom / Left / Right as percentage of source image
- **Background Knock-Out** — enable checkbox, pick a color, set tolerance. Matching pixels become transparent. Use the **Pick** button for an eyedropper (Chrome 95+).
- **Save as Copy** — saves the edited version as a new image in the library (original is preserved)

---

## Saved Layouts

A layout saves the current state of all 4 slots (GFX H, GFX V, Bug H, Bug V) — which images are assigned, their position, scale, rotation, and fit mode.

### Saving

Click **+ Save Current** to save whatever is currently in the slots. You'll be prompted for a name. The layout ID (used for Companion integration) is shown on the card.

### Recalling

Click a layout card to recall it. This loads all saved images into their respective slots in **preview mode** (not live). You still need to click LIVE to send them to air.

Recall options: **H only**, **V only**, or **Both** (default).

### Layout cards

Each card shows a mini-preview of all 4 slots. Click the magnification icon to see a larger preview. Cards can be dragged to reorder, renamed, or deleted.

---

## Events

Events are isolated workspaces. Each event has its own:
- Image library
- Layouts
- Settings (resolution)
- Active slot states

Use events to separate different shows or segments. The event ID appears in all output URLs as `?event=ID`.

The **default** event cannot be deleted.

---

## Settings

Click the gear icon (top-right) to configure:

- **Canvas resolution** for H and V independently
- Presets: 4K (3840x2160), 1440p, 1080p, 720p, or custom
- For vMix vertical outputs: **1215 x 2160** is the recommended V resolution (crops 4K canvas to practical pixel area)

---

## Tag Management & Categories

- Create categories to organize your image library (e.g., "QR Codes", "Backgrounds", "Logos")
- Set **auto-tag rules**: keyword-to-category mappings applied automatically on upload based on filename
- Example: keyword "qr" → category "QR Codes" means any uploaded file with "qr" in the name is auto-tagged

---

## Setting Up vMix Outputs

1. In the gallery, copy the output URL from the URL bar (e.g., GFX H, Bug H)
2. In vMix, add a **Browser Input** at the matching resolution
3. Set the URL to the copied output page URL
4. Layer the Browser Input over your camera/content using vMix's overlay system
5. Graphics and Bug layers are separate Browser Inputs — layer bugs on top of graphics

Typical vMix setup for one output orientation:
```
Layer 3 (top):    Bug H   — browser source at matching resolution
Layer 2:          GFX H   — browser source at matching resolution  
Layer 1 (bottom): Camera / content
```

---

## Connection Status

The gallery header shows connection status:
- **Green dot — Connected** — gallery is successfully polling the worker
- **Red dot — Connection lost** — worker is unreachable (after ~9 seconds of failures). Check your internet connection and worker URL. Auto-recovers when the connection is restored.

---

## Companion / External Control

The tool can be controlled externally via HTTP GET requests (Bitfocus Companion, vMix scripts, etc.). See `companion-cheatsheet.md` for URL patterns and examples.

---

## Troubleshooting & Diagnostics

If graphics are late, missing, or wrong on an output, follow the triage flow in
`2026-06-11-diagnostics-cheatsheet-chad.md` — it covers `/health` (deployed version +
serving edge), `/status` (current slot state), `/active` (what one output page sees),
and `/diag` (write-path round-trip test), including the exact URLs and where to run them.

---

## Tips for Live Shows

- **Prep layouts before the show** — save all your graphic combinations as layouts. During the show, recall + go live is two clicks (or one Companion button).
- **Use BG References** — load your presentation slides as background references to check graphic placement before going live.
- **Preview before going live** — assigning an image or recalling a layout loads to preview only. Always verify in the canvas and output monitors before clicking LIVE.
- **Clear vs. Off** — "Off" keeps the image assigned (quick to go live again). "Clear" removes the image entirely.
- **Grid + Snap** — use the grid overlay with snap for consistent positioning across multiple graphics.
- **Check output monitors** — the right sidebar shows exactly what each output page renders. If it looks wrong there, it looks wrong in vMix.
