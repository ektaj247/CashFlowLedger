/* CashFlow Ledger — service worker
 * Caches the app shell so the installed app opens offline.
 * Strategy: network-first for same-origin requests (so you always get the
 * latest version when online), falling back to the cached copy when offline.
 * Cross-origin requests (your Apps Script / Google Sheets calls) are left
 * untouched — your data sync is handled separately by the app's own queue.
 */
const CACHE = 'cfl-shell-v7';
const SHELL = ['./', './index.html', './sw.js', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Only handle same-origin GETs; let everything else (the API) pass through.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
  );
});