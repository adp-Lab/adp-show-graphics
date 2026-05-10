// adp-show-graphics Worker v3
// Layers: graphics, bugs | Slots: h, v | Events: multi-event
// v3: flat KV keys per slot — eliminates read-modify-write race conditions
//     cache TTL reduced to 3s | /trigger + /status endpoints for Companion

const CACHE_PFX  = '/__c__/';
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

// ── KV helpers ────────────────────────────────────────────────────────────────
// v3: each slot lives in its own KV key — no shared object, no race conditions

function slotKvKey(event, layer, slot) {
  return `slot:${event}:${layer}:${slot}`;
}

function cacheKey(base, event, layer, slot) {
  return `${base}${CACHE_PFX}${event}/${layer}/${slot}`;
}

async function bustCache(key) {
  await caches.default.delete(new Request(key));
}

async function readSlot(env, event, layer, slot) {
  return (await env.KV.get(slotKvKey(event, layer, slot), 'json')) || null;
}

async function writeSlot(env, event, layer, slot, data) {
  if (data === null) {
    await env.KV.delete(slotKvKey(event, layer, slot));
  } else {
    // Strip resolution — injected from settings at read time (/active), never stored per-slot
    const { resolution, ...clean } = data;
    await env.KV.put(slotKvKey(event, layer, slot), JSON.stringify({ ...clean, updatedAt: new Date().toISOString() }));
  }
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

    // ── PUBLIC: active state polled by output pages ────────────────────────────
    if (request.method === 'GET' && path === '/active') {
      const layer = url.searchParams.get('layer');
      const slot  = url.searchParams.get('slot');
      if (!layer || !slot) return error('layer and slot required', 400, origin);

      // Worker-side cache — zero KV reads on hit
      const ck       = cacheKey(url.origin, event, layer, slot);
      const cacheReq = new Request(ck);
      const cached   = await caches.default.match(cacheReq);
      if (cached) {
        const body = await cached.text();
        return new Response(body, {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...corsHeaders(origin) },
        });
      }

      const settings = (await env.KV.get(`settings:${event}`, 'json')) || DEFAULT_SETTINGS;
      const res      = settings.resolution?.[slot] || DEFAULT_SETTINGS.resolution[slot];
      const state    = await readSlot(env, event, layer, slot);
      const data     = state ? { ...state, resolution: res } : { live: false, resolution: res };
      const body     = JSON.stringify(data);

      // 3s TTL — limits cross-datacenter staleness to max 3 seconds
      await caches.default.put(cacheReq, new Response(body, {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3' },
      }));

      return new Response(body, {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...corsHeaders(origin) },
      });
    }

    // ── PUBLIC: status — all slots at once (Companion feedback polling) ────────
    // GET /status?event=X
    // Returns: { graphics: { h: {...}, v: {...} }, bugs: { h: {...}, v: {...} } }
    // 3s cache — Companion feedback tolerates brief staleness, saves KV reads
    if (request.method === 'GET' && path === '/status') {
      const ck       = `${url.origin}${CACHE_PFX}status/${event}`;
      const cacheReq = new Request(ck);
      const cached   = await caches.default.match(cacheReq);
      if (cached) {
        return new Response(await cached.text(), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        });
      }

      const settings = (await env.KV.get(`settings:${event}`, 'json')) || DEFAULT_SETTINGS;
      const result   = {};
      await Promise.all(LAYERS.flatMap(layer =>
        SLOTS_LIST.map(async slot => {
          const res   = settings.resolution?.[slot] || DEFAULT_SETTINGS.resolution[slot];
          const state = await readSlot(env, event, layer, slot);
          if (!result[layer]) result[layer] = {};
          result[layer][slot] = state ? { ...state, resolution: res } : { live: false, resolution: res };
        })
      ));

      const body = JSON.stringify(result);
      await caches.default.put(cacheReq, new Response(body, {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3' },
      }));
      return new Response(body, {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
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
        await bustCache(cacheKey(url.origin, event, layer, s));
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
            await bustCache(cacheKey(url.origin, event, layer, s));
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
            await bustCache(cacheKey(url.origin, event, layer, s));
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
            await bustCache(cacheKey(url.origin, event, layer, s));
          }
          return json({ ok: true, action: 'off', layer, slots: targetSlots, skipped: offSkipped }, 200, origin);
        }

        case 'go': {
          if (!layer || !key) return error('layer and key required', 400, origin);
          for (const s of targetSlots) {
            await writeSlot(env, event, layer, s, { key, name, x, y, scale, fit, live: true });
            await bustCache(cacheKey(url.origin, event, layer, s));
          }
          return json({ ok: true, action: 'go', layer, slots: targetSlots }, 200, origin);
        }

        case 'clear': {
          const layersToClear = layer ? [layer] : LAYERS;
          for (const l of layersToClear) {
            for (const s of targetSlots) {
              await writeSlot(env, event, l, s, null);
              await bustCache(cacheKey(url.origin, event, l, s));
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
          // Each write touches its own key — no race even in parallel
          const writes = [];
          for (const l of LAYERS) {
            if (doH && layout[l]?.h) writes.push((async () => {
              await writeSlot(env, event, l, 'h', { ...layout[l].h, live: false });
              await bustCache(cacheKey(url.origin, event, l, 'h'));
            })());
            if (doV && layout[l]?.v) writes.push((async () => {
              await writeSlot(env, event, l, 'v', { ...layout[l].v, live: false });
              await bustCache(cacheKey(url.origin, event, l, 'v'));
            })());
          }
          await Promise.all(writes);
          return json({ ok: true, action: 'layout', id: layoutId, slots: [doH && 'h', doV && 'v'].filter(Boolean) }, 200, origin);
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
      // Clean up all slot keys and metadata for this event
      await Promise.all([
        ...LAYERS.flatMap(layer => SLOTS_LIST.map(slot => env.KV.delete(slotKvKey(id, layer, slot)))),
        env.KV.delete(`image_index:${id}`),
        env.KV.delete(`layouts:${id}`),
        env.KV.delete(`layouts_order:${id}`),
        env.KV.delete(`settings:${id}`),
      ]);
      return json({ ok: true }, 200, origin);
    }

    // ── Settings ──────────────────────────────────────────────────────────────
    if (request.method === 'GET' && path === '/settings') {
      const s = (await env.KV.get(`settings:${event}`, 'json')) || DEFAULT_SETTINGS;
      return json(s, 200, origin);
    }

    if (request.method === 'PUT' && path === '/settings') {
      const s = await request.json();
      await env.KV.put(`settings:${event}`, JSON.stringify(s));
      return json({ ok: true }, 200, origin);
    }

    // ── Active state: select, live toggle, clear ───────────────────────────────
    if (request.method === 'PUT' && path === '/select') {
      const { layer, slot, key, name = key, scale = 100, fit = 'contain', x = 50, y = 50, rotate = 0, live } = await request.json();
      if (!layer || !slot || !key) return error('layer, slot and key required', 400, origin);
      const existing = await readSlot(env, event, layer, slot) || {};
      const newState = { ...existing, key, name, x, y, scale, fit, rotate, live: live !== undefined ? Boolean(live) : (existing.live || false) };
      await writeSlot(env, event, layer, slot, newState);
      await bustCache(cacheKey(url.origin, event, layer, slot));
      return json({ ok: true }, 200, origin);
    }

    if (request.method === 'PUT' && path === '/live') {
      const { layer, slot, live } = await request.json();
      if (!layer || !slot) return error('layer and slot required', 400, origin);
      const existing = await readSlot(env, event, layer, slot);
      if (!existing || !existing.key) return error('No image in slot', 400, origin);
      await writeSlot(env, event, layer, slot, { ...existing, live: Boolean(live) });
      await bustCache(cacheKey(url.origin, event, layer, slot));
      return json({ ok: true }, 200, origin);
    }

    if (request.method === 'PUT' && path === '/clear') {
      const { layer, slot } = await request.json();
      if (!layer || !slot) return error('layer and slot required', 400, origin);
      const slots = slot === 'both' ? SLOTS_LIST : [slot];
      for (const s of slots) {
        await writeSlot(env, event, layer, s, null);
        await bustCache(cacheKey(url.origin, event, layer, s));
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
