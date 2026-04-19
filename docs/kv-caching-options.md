# adp-show-graphics — KV Caching & vMix Update Latency

*Technical summary for discussion — André & Chad*

---

## The Problem

Two issues are stacked on top of each other:

**1. KV free tier exhaustion**
The output pages (graphic-h, graphic-v, bug-h, bug-v) poll the Worker's `/active` endpoint every 1.5 seconds, unconditionally — whether or not anything has changed. Each poll triggers 2 KV reads (`active:{event}` + `settings:{event}`).

With 4 browser sources open in vMix:
- ~5 KV reads/second just from idle polling
- ~18,000 reads/hour
- 100,000 free-tier limit exhausted in ~5.5 hours

This happens regardless of operator activity. Just having the sources open burns the quota.

**2. vMix is slow to pick up state changes**
The Worker's `/active` endpoint currently has no `Cache-Control` header on its response. Cloudflare's CDN and vMix's embedded Chromium may both cache this JSON response, meaning polls return stale state for minutes even when the operator has sent new content live.

Additionally: when KV 429 errors occur (quota exceeded), the output pages fail silently (`catch(e) {}`) and vMix freezes on the last-known state until midnight UTC reset.

---

## Root Causes — Quick Checklist

| Issue | Root Cause |
|---|---|
| KV quota exhausted | Polls hit KV on every request — no server-side caching |
| vMix slow to update | `/active` response missing `Cache-Control: no-store` → CDN/browser caches stale state |
| Silent failures during shows | 429 errors swallowed — output pages don't recover or alert |

---

## Options

### Option 1 — Worker Cache API Fix *(recommended)*

Keep the existing polling architecture, but make the Worker cache the `/active` response internally using Cloudflare's Cache API.

**How it works:**
- On `GET /active`: Worker checks `caches.default.match()` first. Cache hit → return immediately, **0 KV reads**.
- On any write (`PUT /select`, `PUT /live`, `PUT /clear`): existing `bustCache()` call invalidates the cache.
- KV is only read when the operator actually changes something — i.e., sends content live, clears a slot, etc.
- Add `Cache-Control: no-store` to the `/active` response to prevent CDN/browser from caching the JSON downstream.

**Result:**
- KV reads per show ≈ number of operator actions (dozens, not thousands)
- Free tier: comfortably within limits, could run 24/7 indefinitely
- vMix update latency: ≤1.5s after SEND LIVE
- Implementation effort: ~20 lines in `worker/index.js`

**Note on the existing code:** `bustCache()` and the `CACHE_PFX` constant are already in the Worker — the cache invalidation side is built. Only the cache-population side is missing.

---

### Option 2 — Option 1 + Reduced Poll Interval

Same as Option 1, but increase the output page poll interval from 1.5s → 3–5s as an additional safety margin.

- KV reads: same as Option 1 (near zero during steady state)
- vMix update latency: ≤3–5s — still within a typical 5-second workflow window
- Provides headroom if cache misses happen more frequently than expected
- Trivial extra change alongside Option 1

---

### Option 3 — Server-Sent Events (SSE)

Worker pushes a message to all connected output pages the instant state changes. No polling loop at all.

**How it works:**
- Output pages open a persistent `EventSource` connection to the Worker
- Worker emits an SSE event on every `PUT /live`, `PUT /select`, etc.
- Output pages update immediately on receipt

**Trade-offs:**
- Update latency: near-instant (<100ms)
- KV reads: only on state change (same as Option 1)
- **Problem:** Cloudflare Workers have a ~30s CPU time limit per invocation. Persistent SSE connections require **Durable Objects** to remain reliable — a paid Cloudflare add-on (~$5/month minimum + usage).
- On the free tier, the SSE stream would drop and clients would need to reconnect frequently, partly defeating the purpose.
- Implementation complexity: significantly higher than Options 1/2.

---

## Caching the HTML Pages Themselves (Chad's Point)

The output HTML pages are served as static files from GitHub Pages. GitHub Pages does not allow custom HTTP response headers, so full cache control over the document itself is not possible server-side.

**What can be done:**

| Technique | Effectiveness | Notes |
|---|---|---|
| `<meta http-equiv="Cache-Control" content="no-cache, no-store">` | Low–medium | Largely ignored by modern Chromium for the document itself; may help some edge cases |
| `<meta http-equiv="Pragma" content="no-cache">` | Low | HTTP/1.0 fallback; mostly ignored today |
| Versioned JS asset URLs (e.g. `?v=20260419`) | Medium | Forces fresh script fetch after a deploy; does not affect running pages |
| `Cache-Control: no-store` on Worker API responses | **High** | Fully controllable; directly prevents CDN and browser from caching live state JSON |

**Key point for vMix specifically:** A browser source that stays loaded and running is unaffected by HTML document caching — the page is already in memory. HTML caching only matters at initial load or if vMix re-initialises the source. The high-value fix is ensuring the **Worker's API responses** are never cached, not the HTML.

---

## Recommendation

Implement **Option 1**, with **Option 2** as an optional belt-and-suspenders addition.

This is the minimal-change path that resolves both problems:
- KV reads collapse to near zero (only on operator state changes)
- vMix sees fresh state within ≤1.5s of SEND LIVE
- Stays entirely within the free tier
- No architectural changes, no new Cloudflare products needed

SSE (Option 3) is the right long-term architecture if the project moves to Durable Objects, but adds complexity and cost without meaningfully improving the operator experience for the described workflow.

---

## For Reference — Typical Show Workflow

> Moderator mentions community join → Graphics OP sends QR live → vMix OP cuts to program.
> Target window: ≤5 seconds end-to-end.

With Option 1 in place: operator hits SEND LIVE → Worker writes new state to KV + busts cache → next poll (≤1.5s) → vMix browser source updates. The 5-second window is met with margin.

---

*adp-show-graphics v2 · adp-Lab*
