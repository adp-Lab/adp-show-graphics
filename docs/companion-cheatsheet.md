# Bitfocus Companion — adp-show-graphics Cheatsheet
Replace `123456` with your real API key before use.

**Worker base URL:** `https://adp-show-graphics.mohn-edgar.workers.dev`

---

## Layout → Preview (both H+V)
```
GET https://adp-show-graphics.mohn-edgar.workers.dev/trigger?apikey=123456&action=layout&layout=LAYOUT_ID&slot=both
```
Find LAYOUT_ID: open gallery → Saved Layouts → the ID shown under each layout card (or use the Companion Helper tab).

Example for a layout named "Panel Intro" (ID = `panel_intro`):
```
GET https://adp-show-graphics.mohn-edgar.workers.dev/trigger?apikey=123456&action=layout&layout=panel_intro&slot=both
```

---

## Layout → Preview (H only or V only)
```
GET .../trigger?apikey=123456&action=layout&layout=panel_intro&slot=h
GET .../trigger?apikey=123456&action=layout&layout=panel_intro&slot=v
```

---

## Take Bugs/QR Live (both H+V)
```
GET https://adp-show-graphics.mohn-edgar.workers.dev/trigger?apikey=123456&action=live&layer=bugs&slot=both
```

## Take Graphics Live (both H+V)
```
GET https://adp-show-graphics.mohn-edgar.workers.dev/trigger?apikey=123456&action=live&layer=graphics&slot=both
```

## Take Both Layers Live (H+V, bugs + graphics)
Stack two HTTP actions on one Companion button:
```
GET .../trigger?apikey=123456&action=live&layer=bugs&slot=both
GET .../trigger?apikey=123456&action=live&layer=graphics&slot=both
```

---

## Take Off Air (without clearing)
```
GET .../trigger?apikey=123456&action=off&layer=bugs&slot=both
GET .../trigger?apikey=123456&action=off&layer=graphics&slot=both
```

---

## Clear (removes image from slot, goes transparent)
```
GET .../trigger?apikey=123456&action=clear&layer=bugs&slot=both
GET .../trigger?apikey=123456&action=clear&layer=graphics&slot=both
```
Clear ALL layers and slots (omit layer):
```
GET .../trigger?apikey=123456&action=clear&slot=both
```

---

## Load specific image → Preview
```
GET .../trigger?apikey=123456&action=preview&layer=bugs&slot=h&key=R2_KEY
```
R2_KEY looks like: `default/1713500000000_my_qr_code.png`
Find it in the gallery → image card → Companion Helper tab.

## Load specific image → Live immediately
```
GET .../trigger?apikey=123456&action=go&layer=bugs&slot=h&key=R2_KEY
```

---

## Companion Feedback (button green/red state)
Poll this URL to get live state of all slots:
```
GET https://adp-show-graphics.mohn-edgar.workers.dev/status?event=default
```
Response:
```json
{
  "graphics": { "h": {"live": true, "key": "..."}, "v": {"live": false, "key": "..."} },
  "bugs":     { "h": {"live": true, "key": "..."}, "v": {"live": true,  "key": "..."} }
}
```
In Companion: use HTTP polling on this URL, then read `.bugs.h.live` etc. to drive button colours.

---

## Typical one-button workflow (load layout + go live)
Stack these two actions on a single Companion button:
1. `action=layout&layout=panel_intro&slot=both` → loads to preview
2. `action=live&layer=bugs&slot=both` → takes bugs live
3. `action=live&layer=graphics&slot=both` → takes graphics live

---

## Event parameter
If you use multiple events (e.g. different shows), add `&event=EVENT_ID`:
```
GET .../trigger?apikey=123456&action=layout&layout=panel_intro&slot=both&event=my_event
```
Default event is `default` (no parameter needed for single-event setups).

---

## Quick reference table

| What you want | URL suffix |
|---|---|
| Layout X → preview both | `&action=layout&layout=X&slot=both` |
| Layout X → preview H only | `&action=layout&layout=X&slot=h` |
| Bugs live (both) | `&action=live&layer=bugs&slot=both` |
| GFX live (both) | `&action=live&layer=graphics&slot=both` |
| Bugs off (keep image) | `&action=off&layer=bugs&slot=both` |
| Clear bugs | `&action=clear&layer=bugs&slot=both` |
| Clear everything | `&action=clear&slot=both` |
| Image X → preview bugs H | `&action=preview&layer=bugs&slot=h&key=X` |
| Image X → live bugs H | `&action=go&layer=bugs&slot=h&key=X` |

All URLs start with: `https://adp-show-graphics.mohn-edgar.workers.dev/trigger?apikey=123456`
