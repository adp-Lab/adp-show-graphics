# Office Hours Graphics — Operator Quick Reference

Open the gallery → **https://adp-lab.github.io/adp-show-graphics/gallery.html**

**First time — Connect to Worker.** On the connect screen enter:
- **Worker URL:** `https://adp-show-graphics.mohn-edgar.workers.dev`
- **API key:** shared separately by André (not in this doc).

(URL + key are remembered after the first connect.) Then pick your show's **Event** from the dropdown (top-left) before anything else.

---

## The one rule to remember
**Loading an image into a slot is PREVIEW only.** It shows in your preview slots and the Live Outputs monitors — but it is **NOT on air** until you press a **SEND LIVE** button.

## Colours = state (the same everywhere)
- 🟢 **Green** — loaded / in preview (ready, *not* on air)
- 🔴 **Red** — **ON AIR** (in program)
- **Dark** — not loaded

You'll see these on the image-tile slot buttons, the SEND LIVE buttons, and the Saved-Layout H / V / Both buttons.

## H vs V
**H = landscape** output, **V = portrait** output. They have separate slots and go live independently.

---

## Put a bug / QR live (≈30 seconds)
1. In the **Image Library**, on the tile you want, click **Bug H** or **Bug V** → it loads into that slot (button turns 🟢).
2. Position / scale it in the preview slot if needed.
3. Under **BUG / QR LIVE**, press **Bug H**, **Bug V**, or **Bug H+V** → on air (button turns 🔴).
4. Confirm it in the **Live Outputs** monitors on the right.

## Put a graphic live
Same flow: click **GFX H** / **GFX V** on the tile, then press **GFX H** / **GFX V** / **GFX H+V** under **GRAPHICS LIVE**.

## Take it off air
- Press the **red** SEND LIVE button again (it toggles off), **or**
- Use **CLEAR** (GFX H/V, Bug H/V) to remove the image from the slot entirely.

## Swap what's on air
Load the new image into the slot (it goes 🟢 in preview), then press its SEND LIVE — the output switches.

---

## Layouts (save a whole setup, recall fast)
- **+ Save Current Layout** stores your current slots + names it.
- In **Saved Layouts**, click **H / V / Both** to recall.
- Button colours tell you the layout's state: 🟢 = its content is loaded in preview, 🔴 = on air, dark = not loaded.

## If something isn't showing on air
1. Is the **SEND LIVE** button **red**? If green/dark, it's only in preview — press it.
2. Check the **Live Outputs** confidence monitor for that slot.
3. Right **Event** selected? (top-left dropdown)

---

**Saw a ⏸ Paused (idle) badge?** The gallery paused its previews after ~5 min idle to save requests — **your outputs are still live.** Move the mouse to resume.

## Need the full picture?
Click **❓ How it works** in the gallery header — it has every control explained on a labelled screenshot. The full written guide is `oh-graphics-operator-guide`.
