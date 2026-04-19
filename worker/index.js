// adp-show-graphics Worker v2
// Layers: graphics, bugs | Slots: h, v | Events: multi-event

const CACHE_PFX = '/__c__/';

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

function cacheKey(base, event, layer, slot) {
  return `${base}${CACHE_PFX}${event}/${layer}/${slot}`;
}

async function bustCache(key) {
  await caches.default.delete(new Request(key));
}

export default {
  async fetch(request, env) {
    const origin = getOrigin(request, env);
    const url = new URL(request.url);
    const path = url.pathname;
    const event = url.searchParams.get('event') || 'default';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // ── PUBLIC: active state polled by output pages ────────────────────────────
    if (request.method === 'GET' && path === '/active') {
      const layer = url.searchParams.get('layer');
      const slot  = url.searchParams.get('slot');
      if (!layer || !slot) return error('layer and slot required', 400, origin);

      // Check worker-side cache first — zero KV reads on hit
      const ck        = cacheKey(url.origin, event, layer, slot);
      const cacheReq  = new Request(ck);
      const cached    = await caches.default.match(cacheReq);
      if (cached) {
        const body = await cached.text();
        return new Response(body, {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...corsHeaders(origin) },
        });
      }

      // Cache miss — read KV
      const active   = (await env.KV.get(`active:${event}`, 'json')) || {};
      const settings = (await env.KV.get(`settings:${event}`, 'json')) || DEFAULT_SETTINGS;
      const res      = settings.resolution?.[slot] || DEFAULT_SETTINGS.resolution[slot];
      const state    = active[layer]?.[slot] || null;
      const data     = state ? { ...state, resolution: res } : { live: false, resolution: res };
      const body     = JSON.stringify(data);

      // Populate cache (30 s safety TTL; busted immediately on any operator change)
      await caches.default.put(cacheReq, new Response(body, {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30' },
      }));

      return new Response(body, {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...corsHeaders(origin) },
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

    // ── PUBLIC: GET /go — quick trigger for vMix scripts ──────────────────────
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
      const slots = slot === 'both' ? ['h', 'v'] : [slot];

      const active = (await env.KV.get(`active:${event}`, 'json')) || {};
      if (!active[layer]) active[layer] = {};
      for (const s of slots) {
        active[layer][s] = { key, name, x, y, scale, fit, live: true, updatedAt: new Date().toISOString() };
        await bustCache(cacheKey(url.origin, event, layer, s));
      }
      await env.KV.put(`active:${event}`, JSON.stringify(active));
      return json({ ok: true }, 200, origin);
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
      // clean up event data
      await Promise.all([
        env.KV.delete(`active:${id}`),
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
      const active = (await env.KV.get(`active:${event}`, 'json')) || {};
      if (!active[layer]) active[layer] = {};
      const existing = active[layer][slot] || {};
      active[layer][slot] = { ...existing, key, name, x, y, scale, fit, rotate, live: live !== undefined ? Boolean(live) : (existing.live || false), updatedAt: new Date().toISOString() };
      await env.KV.put(`active:${event}`, JSON.stringify(active));
      await bustCache(cacheKey(url.origin, event, layer, slot));
      return json({ ok: true }, 200, origin);
    }

    if (request.method === 'PUT' && path === '/live') {
      const { layer, slot, live } = await request.json();
      if (!layer || !slot) return error('layer and slot required', 400, origin);
      const active = (await env.KV.get(`active:${event}`, 'json')) || {};
      if (!active[layer]) active[layer] = {};
      if (!active[layer][slot]) active[layer][slot] = {};
      active[layer][slot].live = Boolean(live);
      active[layer][slot].updatedAt = new Date().toISOString();
      await env.KV.put(`active:${event}`, JSON.stringify(active));
      await bustCache(cacheKey(url.origin, event, layer, slot));
      return json({ ok: true }, 200, origin);
    }

    if (request.method === 'PUT' && path === '/clear') {
      const { layer, slot } = await request.json();
      if (!layer || !slot) return error('layer and slot required', 400, origin);
      const active = (await env.KV.get(`active:${event}`, 'json')) || {};
      if (!active[layer]) active[layer] = {};
      const slots = slot === 'both' ? ['h', 'v'] : [slot];
      for (const s of slots) {
        active[layer][s] = null;
        await bustCache(cacheKey(url.origin, event, layer, s));
      }
      await env.KV.put(`active:${event}`, JSON.stringify(active));
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
      const keys = await request.json();
      const index = (await env.KV.get(`image_index:${event}`, 'json')) || [];
      const map = Object.fromEntries(index.map(i => [i.key, i]));
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
      const index = listed.objects.map(obj => {
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

    return error('Not found', 404, origin);
  },
};
