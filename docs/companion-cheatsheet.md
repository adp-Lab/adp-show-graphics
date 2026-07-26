# Bitfocus Companion — adp-show-graphics Cheatsheet
Replace `123456` with your real API key before use.

**Worker base URL:** `https://adp-show-graphics.mohn-edgar.workers.dev`
**Event for Office Hours shows:** `officehours` — always add `&event=officehours` (see [Event parameter](#event-parameter)).

---

## ⭐ Chad quick start — the 4 QR/bug buttons, ready to paste

One Companion button per QR, one HTTP GET action each, straight to program — no
staged preview step. Just paste the full URL into the action's URL field (see
[Companion button setup](#companion-button-setup-generic-http-module) below).

| Button | Full URL |
|---|---|
| JOIN OHG | `https://adp-show-graphics.mohn-edgar.workers.dev/trigger?apikey=123456&action=layout&layout=layout_1781552525533&slot=both&live=true&event=officehours` |
| ASK OHG | `https://adp-show-graphics.mohn-edgar.workers.dev/trigger?apikey=123456&action=layout&layout=layout_1781552769137&slot=both&live=true&event=officehours` |
| VOLUNTEER OHG | `https://adp-show-graphics.mohn-edgar.workers.dev/trigger?apikey=123456&action=layout&layout=layout_1781552797417&slot=both&live=true&event=officehours` |
| DONATE OHG | `https://adp-show-graphics.mohn-edgar.workers.dev/trigger?apikey=123456&action=layout&layout=layout_1781552711265&slot=both&live=true&event=officehours` |

These 4 IDs are fixed, global (stored in the Worker's KV, same for every operator
on every machine) — they won't change unless someone deletes and re-saves that
layout. If a 5th QR layout gets added later, its ID is now shown as small grey
text right on the layout card in the gallery (Saved Layouts section) — copy it
from there and reuse the same URL pattern.

This only drives the graphics/bug **content** inside the browser-source outputs.
Activating the Bug input as an overlay in vMix itself stays on its own separate
Companion button (vMix TCP), unchanged.

### Companion button setup (Generic HTTP module)
Verified against the module's current docs ([HELP.md](https://github.com/bitfocus/companion-module-generic-http/blob/master/companion/HELP.md)):
1. In Companion, add a connection using the **Generic HTTP** module (Bitfocus) — Base URL field can be left blank, since the URLs above are already full `https://...` URLs and override it.
2. On each button, add action → your Generic HTTP connection → **HTTP Get**.
3. Paste the button's full URL (from the table above) into the action's **URL / URI** field.
4. Repeat for all 4 — no import file needed, ~30 seconds per button.

### Two ways to wire each button — pick whichever fits your vMix workflow
Both use the exact same Worker calls — the only difference is Companion-side
button config. Mix and match per button; switching later needs no server change.

**Pattern 1 — current workflow (separate vMix overlay button, unchanged)**
- Press actions: the one-shot URL from the table above (`...&live=true...`)
- Nothing else needed. Bug overlay activation in vMix stays its own separate button.

**Pattern 2 — overlay left live all the time; one button does both**
If you leave the Bug input's vMix overlay on-air permanently (no separate
activate/deactivate button), a single Companion button can both send content
live on a quick press *and* take it off again on a hold — confirmed via
Companion's official docs, this is a native feature ("duration groups"), not a
workaround:
1. **Press actions:** the one-shot URL (`...&live=true...`) — quick tap sends it live and it stays live.
2. In the button's action editor, click **"Add duration group"**, set it to e.g. **500–600ms**, mode **"while being held"**.
3. In that duration group, add an HTTP Get action for: `.../trigger?apikey=123456&action=off&layer=bugs&slot=both&event=officehours`
4. Leave **Short release actions** empty.

Quick tap → live, stays live. Hold past ~600ms → takes it back off. Saves one
button and one vMix-side action per QR, at the cost of the overlay channel
being on-air full time — worth testing live before committing the whole rig to it.
([Companion duration-group docs](https://companion.free/user-guide/v4.2/config/buttons/creating/actions/))

---

## One-shot: layout straight to live (general pattern)
```
GET .../trigger?apikey=123456&action=layout&layout=LAYOUT_ID&slot=both&live=true&event=EVENT_ID
```
Recalls the saved layout **and** takes it live immediately, in one HTTP call — no
staged preview step. Goes live for whichever layers the layout actually contains
(a QR-only layout only has `bugs`, so only `bugs` goes live). This is the pattern
used for the four QR buttons above; use it for any future saved layout the same way.

If you want the old staged behaviour (load to preview, confirm on the monitor,
*then* take live as a second press) for a particular button, use the two-action
stack in [Older pattern](#older-pattern-load-layout-to-preview-then-take-live-as-separate-steps)
instead.

---

## Layout → Preview only (no live)
```
GET https://adp-show-graphics.mohn-edgar.workers.dev/trigger?apikey=123456&action=layout&layout=LAYOUT_ID&slot=both&event=EVENT_ID
```
Find LAYOUT_ID: open gallery → Saved Layouts → the small grey ID text shown on each layout card.

## Layout → Preview (H only or V only)
```
GET .../trigger?apikey=123456&action=layout&layout=LAYOUT_ID&slot=h&event=EVENT_ID
GET .../trigger?apikey=123456&action=layout&layout=LAYOUT_ID&slot=v&event=EVENT_ID
```

---

## Take Bugs/QR Live (both H+V)
```
GET https://adp-show-graphics.mohn-edgar.workers.dev/trigger?apikey=123456&action=live&layer=bugs&slot=both&event=EVENT_ID
```

## Take Graphics Live (both H+V)
```
GET https://adp-show-graphics.mohn-edgar.workers.dev/trigger?apikey=123456&action=live&layer=graphics&slot=both&event=EVENT_ID
```

## Take Both Layers Live (H+V, bugs + graphics)
Stack two HTTP actions on one Companion button:
```
GET .../trigger?apikey=123456&action=live&layer=bugs&slot=both&event=EVENT_ID
GET .../trigger?apikey=123456&action=live&layer=graphics&slot=both&event=EVENT_ID
```

---

## Take Off Air (without clearing)
```
GET .../trigger?apikey=123456&action=off&layer=bugs&slot=both&event=EVENT_ID
GET .../trigger?apikey=123456&action=off&layer=graphics&slot=both&event=EVENT_ID
```

---

## Clear (removes image from slot, goes transparent)
```
GET .../trigger?apikey=123456&action=clear&layer=bugs&slot=both&event=EVENT_ID
GET .../trigger?apikey=123456&action=clear&layer=graphics&slot=both&event=EVENT_ID
```
Clear ALL layers and slots (omit layer):
```
GET .../trigger?apikey=123456&action=clear&slot=both&event=EVENT_ID
```

---

## Load specific image → Preview
```
GET .../trigger?apikey=123456&action=preview&layer=bugs&slot=h&key=R2_KEY&event=EVENT_ID
```
R2_KEY looks like: `officehours/1776519917465_OH_QR_JoinUs.png`

## Load specific image → Live immediately
```
GET .../trigger?apikey=123456&action=go&layer=bugs&slot=h&key=R2_KEY&event=EVENT_ID
```

---

## Companion Feedback — recommended: precise per-button state
"Is THIS specific QR/graphic the one currently live" (not just "is something
live in that layer") — this is what should drive each button's own green/red state.
```
GET https://adp-show-graphics.mohn-edgar.workers.dev/layouts-status?event=officehours
```
Response — one entry per saved layout, `true` only when that exact layout's content
is loaded AND live right now:
```json
{
  "layout_1781552525533": { "h": true,  "v": true  },
  "layout_1781552769137": { "h": false, "v": false },
  "layout_1781552797417": { "h": false, "v": false },
  "layout_1781552711265": { "h": false, "v": false }
}
```
Set up once, drives all 4+ buttons:
1. Add a Companion **Trigger** on an interval (e.g. every 3–5s — keep it slow; this repo has hit Cloudflare's free-tier request cap before from over-polling) that fires an HTTP Get to the URL above and stores the JSON response into one custom variable (Generic HTTP module's **"JSON Response Data Variable"** option on the action).
2. On each button, add a **"Variable Value"** feedback (Companion core, not the HTTP module) that reads that stored variable via JSONPath, e.g. `$.layout_1781552525533.h`, and sets the button green/red when it equals `true`.
3. Because this is computed server-side from the layout's actual current content, it never goes stale if you swap the image behind a layout later — no per-button key to maintain.

## Companion Feedback — simpler alternative: is the layer live at all
Less precise (doesn't distinguish which specific image), but zero setup beyond
what's already documented — same `/status` endpoint used elsewhere in this sheet:
```
GET https://adp-show-graphics.mohn-edgar.workers.dev/status?event=officehours
```
Response:
```json
{
  "graphics": { "h": {"live": true, "key": "..."}, "v": {"live": false, "key": "..."} },
  "bugs":     { "h": {"live": true, "key": "..."}, "v": {"live": true,  "key": "..."} }
}
```
In Companion: poll this the same way, read `.bugs.h.live` etc. Fine for a single
"is bugs on air at all" indicator; use the `/layouts-status` version above for
feedback on the individual QR buttons.

---

## Older pattern: load layout to preview, then take live as separate steps
Stack these two actions on a single Companion button:
1. `action=layout&layout=LAYOUT_ID&slot=both&event=EVENT_ID` → loads to preview only
2. `action=live&layer=bugs&slot=both&event=EVENT_ID` → takes bugs live
3. `action=live&layer=graphics&slot=both&event=EVENT_ID` → takes graphics live

Two HTTP round-trips instead of one — keep this pattern only where you deliberately
want the local-preview pause before airing.

---

## Event parameter
Add `&event=EVENT_ID` to every call. For Office Hours shows that's always
`&event=officehours`. If it's ever omitted, the Worker falls back to a
different event (`default`) — omitting it against the wrong event is the most
likely reason a trigger silently does nothing.

---

## Quick reference table

| What you want | URL suffix |
|---|---|
| Layout X → **live** immediately, both (one-shot QR button) | `&action=layout&layout=X&slot=both&live=true&event=officehours` |
| Layout X → preview both | `&action=layout&layout=X&slot=both&event=officehours` |
| Layout X → preview H only | `&action=layout&layout=X&slot=h&event=officehours` |
| Bugs live (both) | `&action=live&layer=bugs&slot=both&event=officehours` |
| GFX live (both) | `&action=live&layer=graphics&slot=both&event=officehours` |
| Bugs off (keep image) | `&action=off&layer=bugs&slot=both&event=officehours` |
| Clear bugs | `&action=clear&layer=bugs&slot=both&event=officehours` |
| Clear everything | `&action=clear&slot=both&event=officehours` |
| Image X → preview bugs H | `&action=preview&layer=bugs&slot=h&key=X&event=officehours` |
| Image X → live bugs H | `&action=go&layer=bugs&slot=h&key=X&event=officehours` |

All URLs start with: `https://adp-show-graphics.mohn-edgar.workers.dev/trigger?apikey=123456`

Feedback endpoints (no `/trigger`, no action, GET-only, public — no apikey needed):
- `https://adp-show-graphics.mohn-edgar.workers.dev/layouts-status?event=officehours` — precise per-layout on-air state
- `https://adp-show-graphics.mohn-edgar.workers.dev/status?event=officehours` — simple per-layer on-air state
