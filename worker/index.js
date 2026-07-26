// adp-show-graphics Worker v4
// Layers: graphics, bugs | Slots: h, v | Events: multi-event
// v4: slot state + settings migrated from KV to R2 (globally strongly consistent)
//     Worker Cache on /active and /status removed — no longer needed

const VERSION    = 'v4.2';
const LAYERS     = ['graphics', 'bugs'];
const SLOTS_LIST = ['h', 'v'];

const DEFAULT_SETTINGS = {
  resolution: {
    h: { w: 3840, h: 2160 },
    v: { w: 2160, h: 3840 },
  },
};

function slugify(s) {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `evt_${Date.now()}`;
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
  };
}

function json(data, status = 200, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

function error(msg, status = 400, origin) {
  return json({ error: msg }, status, origin);
}

function checkAuth(req, env) {
  return req.headers.get('X-API-Key') === env.API_KEY;
}

function getOrigin(req, env) {
  const o = req.headers.get('Origin');
  const allowed = env.ALLOWED_ORIGIN || 'https://adp-lab.github.io';
  return o === allowed ? o : allowed;
}

// ── R2 helpers ────────────────────────────────────────────────────────────────
// v4: slot state + settings stored in R2 — globally strongly consistent

function slotR2Key(event, layer, slot) {
  return `state/${event}/slot/${layer}/${slot}.json`;
}

function settingsR2Key(event) {
  return `state/${event}/settings.json`;
}

async function readSlot(env, event, layer, slot) {
  const obj = await env.BUCKET.get(slotR2Key(event, layer, slot));
  return obj ? await obj.json() : null;
}

async function writeSlot(env, event, layer, slot, data) {
  if (data === null) {
    await env.BUCKET.delete(slotR2Key(event, layer, slot));
  } else {
    const { resolution, ...clean } = data;
    await env.BUCKET.put(
      slotR2Key(event, layer, slot),
      JSON.stringify({ ...clean, updatedAt: new Date().toISOString() }),
      { httpMetadata: { contentType: 'application/json' } }
    );
  }
}

async function readSettings(env, event) {
  const obj = await env.BUCKET.get(settingsR2Key(event));
  return obj ? await obj.json() : DEFAULT_SETTINGS;
}

async function writeSettings(env, event, data) {
  await env.BUCKET.put(
    settingsR2Key(event),
    JSON.stringify(data),
    { httpMetadata: { contentType: 'application/json' } }
  );
}

export default {
  async fetch(request, env) {
    const origin = getOrigin(request, env);
    const url    = new URL(request.url);
    const path   = url.pathname;
    const event  = url.searchParams.get('event') || 'default';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // ── PUBLIC: health — deployed-version check ────────────────────────────────
    // colo = Cloudflare edge datacenter serving THIS request (i.e. nearest to caller)
    if (request.method === 'GET' && path === '/health') {
      return json({
        ok: true,
        version: VERSION,
        colo: request.cf?.colo || null,
        now: new Date().toISOString(),
      }, 200, origin);
    }

    // ── AUTH: diag — R2 write-path round-trip test ─────────────────────────────
    // GET /diag?apikey=...  — writes a test object, reads it back, deletes it.
    // Proves the write path works and measures R2 latency from the caller's edge.
    if (request.method === 'GET' && path === '/diag') {
      const k = url.searchParams.get('apikey') || request.headers.get('X-API-Key');
      if (k !== env.API_KEY) return error('Unauthorized', 401, origin);

      const diagKey = `state/_diag/${crypto.randomUUID()}.json`;
      const token   = Date.now();
      const t0 = Date.now();
      await env.BUCKET.put(diagKey, JSON.stringify({ token }), {
        httpMetadata: { contentType: 'application/json' },
      });
      const t1 = Date.now();
      const obj  = await env.BUCKET.get(diagKey);
      const body = obj ? await obj.json() : null;
      const t2 = Date.now();
      await env.BUCKET.delete(diagKey);

      return json({
        ok: true,
        version: VERSION,
        colo: request.cf?.colo || null,
        now: new Date().toISOString(),
        writeMs: t1 - t0,
        readMs: t2 - t1,
        consistent: body?.token === token,
      }, 200, origin);
    }

    // ── PUBLIC: active state polled by output pages ────────────────────────────
    if (request.method === 'GET' && path === '/active') {
      const layer = url.searchParams.get('layer');
      const slot  = url.searchParams.get('slot');
      if (!layer || !slot) return error('layer and slot required', 400, origin);

      const settings = await readSettings(env, event);
      const res      = settings.resolution?.[slot] || DEFAULT_SETTINGS.resolution[slot];
      const state    = await readSlot(env, event, layer, slot);
      const data     = state ? { ...state, resolution: res } : { live: false, resolution: res };

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...corsHeaders(origin) },
      });
    }

    // ── PUBLIC: status — all slots at once (Companion feedback polling) ────────
    // GET /status?event=X
    // Returns: { graphics: { h: {...}, v: {...} }, bugs: { h: {...}, v: {...} } }
    if (request.method === 'GET' && path === '/status') {
      const settings = await readSettings(env, event);
      const result   = {};
      await Promise.all(LAYERS.flatMap(layer =>
        SLOTS_LIST.map(async slot => {
          const res   = settings.resolution?.[slot] || DEFAULT_SETTINGS.resolution[slot];
          const state = await readSlot(env, event, layer, slot);
          if (!result[layer]) result[layer] = {};
          result[layer][slot] = state ? { ...state, resolution: res } : { live: false, resolution: res };
        })
      ));
      return json(result, 200, origin);
    }

    // ── PUBLIC: layouts-status — per-saved-layout on-air state (Companion feedback) ──
    // GET /layouts-status?event=X
    // Returns: { [layoutId]: { h: bool, v: bool } }. A slot is true only when EVERY
    // layer that layout actually contains for that slot is both loaded AND live with
    // a matching key right now — mirrors gallery.html's own per-layout tally logic
    // (orientCls), just computed server-side so Companion feedback never needs a
    // hardcoded R2 key that goes stale if the underlying image is swapped later.
    if (request.method === 'GET' && path === '/layouts-status') {
      const layoutsData = (await env.KV.get(`layouts:${event}`, 'json')) || {};
      const current = {};
      await Promise.all(LAYERS.flatMap(layer =>
        SLOTS_LIST.map(async slot => {
          if (!current[layer]) current[layer] = {};
          current[layer][slot] = await readSlot(env, event, layer, slot);
        })
      ));

      const result = {};
      for (const [id, layout] of Object.entries(layoutsData)) {
        const onAir = (slot) => {
          let hasAny = false;
          for (const layer of LAYERS) {
            const want = layout[layer]?.[slot]?.key;
            if (!want) continue;
            hasAny = true;
            const cur = current[layer]?.[slot];
            if (!cur || cur.key !== want || !cur.live) return false;
          }
          return hasAny;
        };
        result[id] = { h: onAir('h'), v: onAir('v') };
      }
      return json(result, 200, origin);
    }

    // ── PUBLIC: serve image from R2 ────────────────────────────────────────────
    if (request.method === 'GET' && path.startsWith('/img/')) {
      const key = decodeURIComponent(path.slice(5));
      const obj = await env.BUCKET.get(key);
      if (!obj) return new Response('Not found', { status: 404 });
      return new Response(obj.body, {
        headers: { 'Content-Type': obj.httpMetadata?.contentType || 'image/png', ...corsHeaders(origin) },
      });
    }

    // ── PUBLIC: GET /go — quick trigger (vMix scripts, backwards compat) ──────
    if (request.method === 'GET' && path === '/go') {
      const k = url.searchParams.get('apikey') || request.headers.get('X-API-Key');
      if (k !== env.API_KEY) return error('Unauthorized', 401, origin);
      const layer = url.searchParams.get('layer') || 'graphics';
      const slot  = url.searchParams.get('slot');
      const key   = url.searchParams.get('key');
      if (!slot || !key) return error('slot and key required', 400, origin);

      const name  = url.searchParams.get('name') || key;
      const scale = parseFloat(url.searchParams.get('scale') || '100');
      const fit   = url.searchParams.get('fit') || 'contain';
      const x     = parseFloat(url.searchParams.get('x') || '50');
      const y     = parseFloat(url.searchParams.get('y') || '50');
      const slots = slot === 'both' ? SLOTS_LIST : [slot];

      for (const s of slots) {
        await writeSlot(env, event, layer, s, { key, name, x, y, scale, fit, live: true });
      }
      return json({ ok: true }, 200, origin);
    }

    // ── PUBLIC: GET /trigger — Companion / vMix HTTP trigger ──────────────────
    // Auth: ?apikey=... (GET-friendly, no custom headers needed for Companion)
    //
    // Actions:
    //   preview  — set image to slot, NOT live     (?layer= &slot= &key=)
    //   live     — set live=true                   (?layer= &slot=)
    //   off      — set live=false                  (?layer= &slot=)
    //   go       — set image + go live immediately (?layer= &slot= &key=)
    //   clear    — clear slot(s)                   (?layer= &slot=)  layer optional = both layers
    //   layout   — recall saved layout to preview  (?layout= &slot=)
    //              add &live=true to go straight to live in the same call (one-shot for
    //              Companion buttons — writes the layout's slots with live=true instead of
    //              false, for whichever layers the layout actually contains)
    //
    // slot accepts: h | v | both (default: both)
    if (request.method === 'GET' && path === '/trigger') {
      const k = url.searchParams.get('apikey') || request.headers.get('X-API-Key');
      if (k !== env.API_KEY) return error('Unauthorized', 401, origin);

      const action   = url.searchParams.get('action');
      const layer    = url.searchParams.get('layer');
      const slot     = url.searchParams.get('slot') || 'both';
      const key      = url.searchParams.get('key');
      const layoutId = url.searchParams.get('layout');
      const goLive   = url.searchParams.get('live') === 'true';
      const name     = url.searchParams.get('name') || key || '';
      const scale    = parseFloat(url.searchParams.get('scale') || '100');
      const fit      = url.searchParams.get('fit') || 'contain';
      const x        = parseFloat(url.searchParams.get('x') || '50');
      const y        = parseFloat(url.searchParams.get('y') || '50');

      const targetSlots = slot === 'both' ? SLOTS_LIST : [slot];

      switch (action) {

        case 'preview': {
          if (!layer || !key) return error('layer and key required', 400, origin);
          for (const s of targetSlots) {
            const existing = await readSlot(env, event, layer, s) || {};
            await writeSlot(env, event, layer, s, { x: 50, y: 50, scale: 100, fit: 'contain', ...existing, key, name, live: false });
          }
          return json({ ok: true, action: 'preview', layer, slots: targetSlots }, 200, origin);
        }

        case 'live': {
          if (!layer) return error('layer required', 400, origin);
          const liveSkipped = [];
          for (const s of targetSlots) {
            const existing = await readSlot(env, event, layer, s);
            if (!existing) { liveSkipped.push(s); continue; }
            await writeSlot(env, event, layer, s, { ...existing, live: true });
          }
          return json({ ok: true, action: 'live', layer, slots: targetSlots, skipped: liveSkipped }, 200, origin);
        }

        case 'off': {
          if (!layer) return error('layer required', 400, origin);
          const offSkipped = [];
          for (const s of targetSlots) {
            const existing = await readSlot(env, event, layer, s);
            if (!existing) { offSkipped.push(s); continue; }
            await writeSlot(env, event, layer, s, { ...existing, live: false });
          }
          return json({ ok: true, action: 'off', layer, slots: targetSlots, skipped: offSkipped }, 200, origin);
        }

        case 'go': {
          if (!layer || !key) return error('layer and key required', 400, origin);
          for (const s of targetSlots) {
            await writeSlot(env, event, layer, s, { key, name, x, y, scale, fit, live: true });
          }
          return json({ ok: true, action: 'go', layer, slots: targetSlots }, 200, origin);
        }

        case 'clear': {
          const layersToClear = layer ? [layer] : LAYERS;
          for (const l of layersToClear) {
            for (const s of targetSlots) {
              await writeSlot(env, event, l, s, null);
            }
          }
          return json({ ok: true, action: 'clear', layers: layersToClear, slots: targetSlots }, 200, origin);
        }

        case 'layout': {
          if (!layoutId) return error('layout required', 400, origin);
          const layoutsData = (await env.KV.get(`layouts:${event}`, 'json')) || {};
          const layout = layoutsData[layoutId];
          if (!layout) return error('Layout not found', 404, origin);
          const doH = slot === 'h' || slot === 'both';
          const doV = slot === 'v' || slot === 'both';
          const writes = [];
          for (const l of LAYERS) {
            if (doH && layout[l]?.h) writes.push(writeSlot(env, event, l, 'h', { ...layout[l].h, live: goLive }));
            if (doV && layout[l]?.v) writes.push(writeSlot(env, event, l, 'v', { ...layout[l].v, live: goLive }));
          }
          await Promise.all(writes);
          return json({ ok: true, action: 'layout', id: layoutId, live: goLive, slots: [doH && 'h', doV && 'v'].filter(Boolean) }, 200, origin);
        }

        default:
          return error('Unknown action. Valid: preview, live, off, go, clear, layout', 400, origin);
      }
    }

    // ── AUTH REQUIRED ──────────────────────────────────────────────────────────
    if (!checkAuth(request, env)) return error('Unauthorized', 401, origin);

    // ── Events ────────────────────────────────────────────────────────────────
    if (request.method === 'GET' && path === '/events') {
      const evts = (await env.KV.get('events', 'json')) || [{ id: 'default', name: 'Default', created: new Date().toISOString() }];
      return json(evts, 200, origin);
    }

    if (request.method === 'POST' && path === '/events') {
      const { name } = await request.json();
      if (!name) return error('name required', 400, origin);
      const evts = (await env.KV.get('events', 'json')) || [{ id: 'default', name: 'Default', created: new Date().toISOString() }];
      const base = slugify(name);
      let id = base; let n = 2;
      while (evts.some(e => e.id === id)) { id = `${base}_${n++}`; }
      evts.push({ id, name, created: new Date().toISOString() });
      await env.KV.put('events', JSON.stringify(evts));
      return json({ ok: true, id }, 200, origin);
    }

    if (request.method === 'PUT' && path.startsWith('/events/')) {
      const id = decodeURIComponent(path.slice(8));
      const { name } = await request.json();
      const evts = (await env.KV.get('events', 'json')) || [];
      const ev = evts.find(e => e.id === id);
      if (!ev) return error('Not found', 404, origin);
      ev.name = name;
      await env.KV.put('events', JSON.stringify(evts));
      return json({ ok: true }, 200, origin);
    }

    if (request.method === 'DELETE' && path.startsWith('/events/')) {
      const id = decodeURIComponent(path.slice(8));
      if (id === 'default') return error('Cannot delete default event', 400, origin);
      let evts = (await env.KV.get('events', 'json')) || [];
      evts = evts.filter(e => e.id !== id);
      await env.KV.put('events', JSON.stringify(evts));
      // Clean up KV metadata
      await Promise.all([
        env.KV.delete(`image_index:${id}`),
        env.KV.delete(`layouts:${id}`),
        env.KV.delete(`layouts_order:${id}`),
      ]);
      // Clean up R2 state
      await Promise.all([
        ...LAYERS.flatMap(layer =>
          SLOTS_LIST.map(slot => env.BUCKET.delete(slotR2Key(id, layer, slot)))
        ),
        env.BUCKET.delete(settingsR2Key(id)),
      ]);
      return json({ ok: true }, 200, origin);
    }

    // ── Settings ──────────────────────────────────────────────────────────────
    if (request.method === 'GET' && path === '/settings') {
      return json(await readSettings(env, event), 200, origin);
    }

    if (request.method === 'PUT' && path === '/settings') {
      const s = await request.json();
      await writeSettings(env, event, s);
      return json({ ok: true }, 200, origin);
    }

    // ── Active state: select, live toggle, clear ───────────────────────────────
    if (request.method === 'PUT' && path === '/select') {
      const { layer, slot, key, name = key, scale = 100, fit = 'contain', x = 50, y = 50, rotate = 0, live } = await request.json();
      if (!layer || !slot || !key) return error('layer, slot and key required', 400, origin);
      const existing = await readSlot(env, event, layer, slot) || {};
      const newState = { ...existing, key, name, x, y, scale, fit, rotate, live: live !== undefined ? Boolean(live) : (existing.live || false) };
      await writeSlot(env, event, layer, slot, newState);
      return json({ ok: true }, 200, origin);
    }

    if (request.method === 'PUT' && path === '/live') {
      const { layer, slot, live } = await request.json();
      if (!layer || !slot) return error('layer and slot required', 400, origin);
      const existing = await readSlot(env, event, layer, slot);
      if (!existing || !existing.key) return error('No image in slot', 400, origin);
      await writeSlot(env, event, layer, slot, { ...existing, live: Boolean(live) });
      return json({ ok: true }, 200, origin);
    }

    if (request.method === 'PUT' && path === '/clear') {
      const { layer, slot } = await request.json();
      if (!layer || !slot) return error('layer and slot required', 400, origin);
      const slots = slot === 'both' ? SLOTS_LIST : [slot];
      for (const s of slots) {
        await writeSlot(env, event, layer, s, null);
      }
      return json({ ok: true }, 200, origin);
    }

    // ── Images ────────────────────────────────────────────────────────────────
    if (request.method === 'GET' && path === '/list') {
      const index = (await env.KV.get(`image_index:${event}`, 'json')) || [];
      return json(index, 200, origin);
    }

    if (request.method === 'POST' && path === '/upload') {
      const form = await request.formData();
      const file = form.get('file');
      const name = form.get('name') || file.name;
      const tags = form.get('tags') || '';
      if (!file) return error('file required', 400, origin);
      const ext = file.name.split('.').pop().toLowerCase();
      const key = `${event}/${Date.now()}_${name.replace(/[^a-z0-9]/gi, '_')}.${ext}`;
      await env.BUCKET.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
      const index = (await env.KV.get(`image_index:${event}`, 'json')) || [];
      index.push({ key, name, tags: tags.split(',').map(t => t.trim()).filter(Boolean), uploadedAt: new Date().toISOString() });
      await env.KV.put(`image_index:${event}`, JSON.stringify(index));
      return json({ ok: true, key }, 200, origin);
    }

    if (request.method === 'DELETE' && path.startsWith('/img/')) {
      const key = decodeURIComponent(path.slice(5));
      await env.BUCKET.delete(key);
      const index = ((await env.KV.get(`image_index:${event}`, 'json')) || []).filter(i => i.key !== key);
      await env.KV.put(`image_index:${event}`, JSON.stringify(index));
      return json({ ok: true }, 200, origin);
    }

    if (request.method === 'PUT' && path === '/image-order') {
      const keys  = await request.json();
      const index = (await env.KV.get(`image_index:${event}`, 'json')) || [];
      const map   = Object.fromEntries(index.map(i => [i.key, i]));
      const reordered = keys.map(k => map[k]).filter(Boolean);
      index.forEach(i => { if (!keys.includes(i.key)) reordered.push(i); });
      await env.KV.put(`image_index:${event}`, JSON.stringify(reordered));
      return json({ ok: true }, 200, origin);
    }

    if (request.method === 'PUT' && path.startsWith('/tags/')) {
      const key = decodeURIComponent(path.slice(6));
      const { tags } = await request.json();
      const index = (await env.KV.get(`image_index:${event}`, 'json')) || [];
      const entry = index.find(i => i.key === key);
      if (!entry) return error('Not found', 404, origin);
      entry.tags = Array.isArray(tags) ? tags : [];
      await env.KV.put(`image_index:${event}`, JSON.stringify(index));
      return json({ ok: true }, 200, origin);
    }

    if (request.method === 'PUT' && path.startsWith('/rename/')) {
      const key = decodeURIComponent(path.slice(8));
      const { name } = await request.json();
      const index = (await env.KV.get(`image_index:${event}`, 'json')) || [];
      const entry = index.find(i => i.key === key);
      if (!entry) return error('Not found', 404, origin);
      entry.name = name;
      await env.KV.put(`image_index:${event}`, JSON.stringify(index));
      return json({ ok: true }, 200, origin);
    }

    if (request.method === 'GET' && path === '/rebuild') {
      const listed = await env.BUCKET.list({ prefix: `${event}/` });
      const index  = listed.objects.map(obj => {
        const noExt = obj.key.replace(/\.[^.]+$/, '');
        const name  = noExt.replace(/^[^/]+\/\d+_/, '').replace(/_/g, ' ');
        return { key: obj.key, name, tags: [], uploadedAt: new Date(obj.uploaded).toISOString() };
      });
      await env.KV.put(`image_index:${event}`, JSON.stringify(index));
      return json({ ok: true, rebuilt: index.length }, 200, origin);
    }

    // ── Layouts ───────────────────────────────────────────────────────────────
    if (request.method === 'GET' && path === '/layouts') {
      const layouts = (await env.KV.get(`layouts:${event}`, 'json')) || {};
      const order   = (await env.KV.get(`layouts_order:${event}`, 'json')) || [];
      return json({ layouts, order }, 200, origin);
    }

    if (request.method === 'PUT' && path.startsWith('/layouts/')) {
      const id = decodeURIComponent(path.slice(9));
      const body = await request.json();
      const layouts = (await env.KV.get(`layouts:${event}`, 'json')) || {};
      layouts[id] = body;
      await env.KV.put(`layouts:${event}`, JSON.stringify(layouts));
      return json({ ok: true }, 200, origin);
    }

    if (request.method === 'DELETE' && path.startsWith('/layouts/')) {
      const id = decodeURIComponent(path.slice(9));
      const layouts = (await env.KV.get(`layouts:${event}`, 'json')) || {};
      delete layouts[id];
      await env.KV.put(`layouts:${event}`, JSON.stringify(layouts));
      const order = ((await env.KV.get(`layouts_order:${event}`, 'json')) || []).filter(o => o !== id);
      await env.KV.put(`layouts_order:${event}`, JSON.stringify(order));
      return json({ ok: true }, 200, origin);
    }

    if (request.method === 'PUT' && path === '/layout-order') {
      const order = await request.json();
      await env.KV.put(`layouts_order:${event}`, JSON.stringify(order));
      return json({ ok: true }, 200, origin);
    }

    // ── Categories & Tag Rules (global) ───────────────────────────────────────
    if (request.method === 'GET' && path === '/categories') {
      return json((await env.KV.get('image_categories', 'json')) || [], 200, origin);
    }

    if (request.method === 'PUT' && path === '/categories') {
      await env.KV.put('image_categories', JSON.stringify(await request.json()));
      return json({ ok: true }, 200, origin);
    }

    if (request.method === 'GET' && path === '/tag-rules') {
      return json((await env.KV.get('tag_rules', 'json')) || {}, 200, origin);
    }

    if (request.method === 'PUT' && path === '/tag-rules') {
      await env.KV.put('tag_rules', JSON.stringify(await request.json()));
      return json({ ok: true }, 200, origin);
    }

    // ── Migrate: clean up pre-v3 orphan KV keys ────────────────────────────────
    if (request.method === 'POST' && path === '/migrate') {
      const list = await env.KV.list({ prefix: 'active:' });
      await Promise.all(list.keys.map(k => env.KV.delete(k.name)));
      return json({ ok: true, cleaned: list.keys.map(k => k.name) }, 200, origin);
    }

    return error('Not found', 404, origin);
  },
};
