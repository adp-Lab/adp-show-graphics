# Diagnostics Cheatsheet — adp-show-graphics
2026-06-11 · Worker v4

Quick reference for diagnosing "graphics are late / missing / wrong" from any machine —
especially the cloud vMix instances.

## The one thing to understand

There are **two separate systems**:

| What | URL | Job |
|---|---|---|
| Output pages | `https://adp-lab.github.io/adp-show-graphics/graphic-h.html?event=officehours` (etc.) | What vMix loads as browser source. Polls the Worker every 1.5s. |
| Worker (API) | `https://adp-show-graphics.mohn-edgar.workers.dev` | Stores and serves the live state. This is what you diagnose. |

The diagnostic URLs below are **Worker URLs**. They are *not* appended to the output
pages — they're separate addresses you open directly in a normal browser tab.

**Where you run them matters.** Cloudflare answers from the edge datacenter nearest to
the *caller*. Run from your desk = your edge. To see what the **cloud vMix instance**
sees, open the URL in a browser *on that machine* (inside the DCV session — Edge/Chrome
on the instance desktop). Same URL, different answer.

---

## The URLs

### 1. `/health` — is the right code running? (no key needed)

```
https://adp-show-graphics.mohn-edgar.workers.dev/health
```

Returns:
```json
{ "ok": true, "version": "v4", "colo": "IAD", "now": "2026-06-13T18:00:00.000Z" }
```

- `version` must be **v4**. If it isn't, stop debugging anything else and tell André.
- `colo` = the Cloudflare datacenter serving *you* (IAD = Virginia, ORD = Chicago,
  LHR = London…). On the cloud instance this should be a North American code.
- `now` = server UTC time — handy to compare timestamps across machines.

### 2. `/status` — what does the Worker think is live right now? (no key needed)

```
https://adp-show-graphics.mohn-edgar.workers.dev/status?event=officehours
```

All four slots (graphics/bugs × h/v) with `live`, image `name`, and `updatedAt`.
`updatedAt` is the moment the operator last changed that slot — if it matches when
André hit the button, the backend is fine and any delay is on the vMix side.

### 3. `/active` — exactly what one output page sees (no key needed)

```
https://adp-show-graphics.mohn-edgar.workers.dev/active?event=officehours&layer=graphics&slot=h
```

`layer` = `graphics` | `bugs`, `slot` = `h` | `v`. This is the precise request the
browser source makes every 1.5s. If this shows the new content but vMix doesn't,
the problem is the vMix browser input, not the backend.

### 4. `/diag` — full write-path round-trip test (needs API key)

```
https://adp-show-graphics.mohn-edgar.workers.dev/diag?apikey=YOUR_API_KEY
```

Writes a test object to storage, reads it back, deletes it. Returns:
```json
{ "ok": true, "version": "v4", "colo": "IAD", "writeMs": 120, "readMs": 95, "consistent": true }
```

- `consistent: true` = read-after-write works from your location (this was the
  original 30s-delay bug — it must always be true on v4).
- `writeMs`/`readMs` = real storage latency from the edge near you. A few hundred ms
  is normal; it does **not** add up with the 1.5s polling — worst case to screen is
  roughly poll interval + read latency, ~2s.

---

## Triage flow: "graphics are late or missing in vMix"

1. **On the cloud instance** (DCV session, normal browser): open `/health`.
   → Not `v4`? Stop. Tell André — wrong code deployed.
2. Open `/status`. → Is `updatedAt` fresh (matches when the operator sent it) and
   `live: true`? **No** → operator/gallery side: content was never sent. **Yes** → continue.
3. Open the output page itself in the same browser:
   `https://adp-lab.github.io/adp-show-graphics/graphic-h.html?event=officehours`
   → Updates within ~2s of a gallery change? **Yes** → backend + page are fine; the
   issue is the vMix browser input on that instance → restart the input
   (right-click input → Browser → Reload, or close/reopen the preset).
   **No** → continue.
4. Run `/diag` (with key). → `consistent: false` or errors → screenshot it and send
   to André. High `readMs` (>1000) → network issue between that edge and storage —
   also screenshot for André.
5. When reporting: always include the `/health` output (version + colo) and a
   screenshot — it pins down *which machine saw what from where* in one image.

---

## Reference: what changed in v4 (June 2026)

Live state moved from Cloudflare KV (eventually consistent — up to 60s cross-region
lag, the cause of the old NA delays) to R2 (strongly consistent worldwide). Updates
now reach every region in ~1–2s. The `BrowserReload` removal in the vMix scripts
(done in May) stays as-is — pages self-update, reloads are never needed.
