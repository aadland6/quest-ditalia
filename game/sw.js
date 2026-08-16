// sw.js — offline support. App shell is precached; question shards and SRS data
// are cached on first fetch (stale-while-revalidate for same-origin GETs).
const VERSION = 'italiaquest-v1';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/game.css',
  './vendor/three.module.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  // stale-while-revalidate: serve cache fast, refresh in background
  e.respondWith(
    caches.open(VERSION).then(async cache => {
      const cached = await cache.match(e.request);
      const network = fetch(e.request)
        .then(resp => {
          if (resp.ok) cache.put(e.request, resp.clone());
          return resp;
        })
        .catch(() => null);
      return cached || network.then(r => r || new Response('offline', { status: 503 }));
    })
  );
});
