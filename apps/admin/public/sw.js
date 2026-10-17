/*
  HIG Admin service worker.

  Caches the APP SHELL only: static build assets (JS, CSS, fonts), icons and a
  bilingual offline page. It never stores HTML pages, RSC payloads, server
  actions or any Supabase/API traffic, because those contain personal and
  permission data that must not sit in a shared phone's cache or be served
  after sign-out. Offline navigation falls back to /offline.

  Bump VERSION to drop every old cache.
*/
const VERSION = "v1";
const SHELL_CACHE = `hig-shell-${VERSION}`;
const ASSET_CACHE = `hig-assets-${VERSION}`;
const PRECACHE = ["/offline", "/icons/pwa-192.png", "/icons/pwa-512.png", "/icons/apple-touch-icon.png"];
const MAX_ASSETS = 160;

// Cache the offline page plus everything it needs to render (its JS, CSS and the fonts that CSS names),
// so it looks right even if the very first visit is the last time the user was online.
async function precacheShell() {
  const shell = await caches.open(SHELL_CACHE);
  await shell.addAll(PRECACHE);

  const assets = await caches.open(ASSET_CACHE);
  try {
    const html = await (await shell.match("/offline")).text();
    const urls = new Set([...html.matchAll(/(?:href|src)="(\/_next\/static\/[^"?]+(?:\?[^"]*)?)"/g)].map((m) => m[1]));
    for (const url of [...urls]) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        await assets.put(url, res.clone());
        if (url.endsWith(".css")) {
          const css = await res.text();
          for (const m of css.matchAll(/url\(["']?([^)"']+\.woff2)["']?\)/g)) urls.add(new URL(m[1], new URL(url, self.location.origin)).pathname);
        }
      } catch {
        /* best effort */
      }
    }
    for (const url of urls) {
      if (!url.endsWith(".woff2")) continue;
      try {
        if (!(await assets.match(url))) await assets.add(url);
      } catch {
        /* best effort */
      }
    }
  } catch {
    /* the offline page itself is cached; assets will fill in at runtime */
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheShell());
  // No skipWaiting here: the page asks for it (SKIP_WAITING) so a refresh never interrupts a form.
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, ASSET_CACHE]);
      for (const key of await caches.keys()) if (key.startsWith("hig-") && !keep.has(key)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

// Content-hashed build files never change: cache first.
async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok && res.type === "basic") {
    cache.put(request, res.clone());
    trim(ASSET_CACHE, MAX_ASSETS);
  }
  return res;
}

// Un-hashed public files (icons, brand): serve fast, refresh in the background.
async function staleWhileRevalidate(request) {
  const cache = await caches.open(SHELL_CACHE);
  const hit = await cache.match(request);
  const refresh = fetch(request)
    .then((res) => {
      if (res.ok && res.type === "basic") cache.put(request, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit || refresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase and other origins go straight to the network

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match("/offline", { cacheName: SHELL_CACHE })) || Response.error()),
    );
    return;
  }
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (url.pathname.startsWith("/icons/") || url.pathname.startsWith("/brand/")) {
    event.respondWith(staleWhileRevalidate(request));
  }
  // Everything else (RSC fetches, API routes, images) is not cached.
});
