# adp-show-graphics — Architecture Update Plan
*Summary for Chad & John — feedback welcome*

---

## TL;DR

The graphics tool works reliably on local vMix but has a 15–30 second update delay on cloud vMix instances. Root cause identified: a Cloudflare infrastructure limitation, not a tool bug. Fix is confirmed and planned in two phases. Phase 1 solves the cloud latency within the existing Cloudflare setup. Phase 2 adds CasperCG support (John), near-instant updates for everyone, and an automatic fallback system.

---

## The Problem

When a graphics operator sends a new GFX or Bug live in the gallery, browser sources in vMix update by polling a Cloudflare server every 1.5 seconds. On local vMix this works fine — update appears in ~500ms. On cloud vMix instances (North America), there is a 15–30 second delay, sometimes longer, occasionally never.

The cause: the tool currently stores its live state in **Cloudflare KV**, which is an eventually consistent database. A change made in Europe can take up to 60 seconds to propagate to a North American server node. This is a documented Cloudflare limitation — not something that can be tuned or worked around within KV itself.

**Secondary issue (Chad's vMix scripts):** The current `Bug In` and `SetGraphicDisplay` scripts call `BrowserReload` before putting sources on air. This forces a cold page reload, which clears all state and takes 1–3 seconds to re-initialize — far longer than the 200ms sleep that follows. The browser source goes blank during that window. Removing these reloads is a quick, no-cost fix independent of the phases below.

---

## Phase 1 — Fix the cloud latency (CF-only, free)

Move state storage from KV to **Cloudflare R2**, Cloudflare's object storage service. Unlike KV, R2 is globally strongly consistent — a write is immediately visible to all readers worldwide. Confirmed in Cloudflare's official documentation.

The change is contained to the server-side Worker only.

**Expected result:** Update delay drops from 15–30s to **1–2 seconds** for both local and cloud vMix, worldwide.

### Chad — action items for Phase 1

- **Remove `BrowserReload`** from `Bug In` and `SetGraphicDisplay`. The browser pages self-update by polling every 1.5s — a reload is unnecessary and makes updates slower and less reliable.
- **Check the `GraphicDisplay` input.** `CleanStartH/V` navigates `Input:="Graphics"` but `SetGraphicDisplay` reloads `Input:="GraphicDisplay"` — these appear to be two different inputs. Worth confirming this does what you intend, as reloading the wrong input would have no effect.
- **Browser source URLs stay the same** — no changes to vMix browser source configuration.

### Workflow note

Even at 1–2s update delay, for time-sensitive cues (e.g. donate QR) it is good practice to send the graphic live 3–5 seconds before it is needed on air, so the vMix operator sees it appear in the confidence tile before cutting to it.

---

## Phase 2 — Maggie as primary server + CasperCG support

For daily show operations and CasperCG integration, the tool moves to a self-hosted server running on Maggie (our Mac Mini in Berlin), accessible globally via a free Cloudflare Tunnel.

### Key improvements over Phase 1

- **Near-instant updates** — instead of polling every 1.5s, browser sources receive a server push the moment state changes (Server-Sent Events). Update delay drops to **under 1 second** regardless of location.
- **CasperCG integration (John)** — Maggie can send AMCP commands directly to CasperCG over TCP. When a graphic goes live in the gallery, Maggie triggers the CasperCG template update simultaneously. This requires CasperCG to be reachable from Maggie — either on the same LAN, via VPN, or via a public IP. Cloudflare Workers cannot do this (no TCP support), which is why CasperCG support requires Phase 2.
- **Daily show scale** — designed for 7 days/week, 2–4h shows with no free-tier request limits.
- **Full control** — no cloud service dependencies for core functionality.

### Chad — action items for Phase 2

- **Update browser source URLs** in vMix from the current Cloudflare Worker URL to the new Maggie tunnel URL. One-time change. Format and structure stay identical.

---

## The Fallback

Phase 1 (CF Worker + R2) stays running as a warm standby after Phase 2 is live. Whenever Maggie writes a state change, it simultaneously syncs to CF R2. If Maggie is ever unreachable (maintenance, internet outage), browser sources automatically fall back to the CF Worker within 2 seconds. The last known graphic stays visible. The show continues.

| | Primary (Phase 2) | Fallback (Phase 1) |
|---|---|---|
| Server | Maggie (Berlin) | Cloudflare Worker |
| State store | SQLite on Maggie | Cloudflare R2 |
| Update speed | Under 1 second (push) | 1–2 seconds (poll) |
| CasperCG | Yes | No |
| Failure mode | Auto-fallback to Phase 1 | Show continues on last state |

---

## What changes per phase

| | Phase 1 | Phase 2 |
|---|---|---|
| Browser source URLs | No change | Update to Maggie URL (one-time) |
| Gallery UI | No change | No change |
| Chad's vMix scripts | Remove BrowserReload, verify GraphicDisplay | No further changes |
| CasperCG output (John) | Not available | AMCP commands from Maggie |
| Image library & assets | No change | No change |
| API key auth | No change | No change |
| Update speed (cloud) | 1–2 seconds | Under 1 second |

---

## Open questions for you both

**Chad:**
- What is `GraphicDisplay` in your vMix setup — browser source, MultiView, or something else?
- Are there other vMix scripts that interact with the browser sources we should know about?

**John:**
- Which CasperCG version are you running?
- Are your templates HTML-based or Flash-based?
- Is your CasperCG instance on a fixed IP / reachable remotely, or only accessible on a local LAN?
- Any requirements around how CasperCG templates receive data (CG UPDATE with XML/JSON, or a full template reload)?
