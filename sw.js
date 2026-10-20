// Önce ağ, olmazsa önbellek: internet varken her zaman en yeni arayüz gelir; yokken son görülen açılır.
// Okuma ucuna (başka adres) hiç dokunmaz, onun önbelleği uygulama içinde 12 saat kuralıyla yönetilir.
var AD = 'ogretmen-kabuk-v1';
var DOSYALAR = ['./', 'index.html', 'app.css', 'app.js', 'acilis.js', 'config.js', 'manifest.webmanifest', 'kazanim/index.json', 'ikon/logo.png', 'ikon/ikon-192.png',
  'fonts/bricolage-latin.woff2', 'fonts/bricolage-latin-ext.woff2', 'fonts/hanken-latin.woff2', 'fonts/hanken-latin-ext.woff2'];
self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(AD).then(function (c) { return Promise.all(DOSYALAR.map(function (u) { return c.add(new Request(u, { cache: 'reload' })).catch(function () {}); })); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (k) { return Promise.all(k.filter(function (x) { return x !== AD; }).map(function (x) { return caches.delete(x); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  e.respondWith(fetch(r, { cache: 'no-cache' }).then(function (res) {
    if (res && res.ok) { var kopya = res.clone(); caches.open(AD).then(function (c) { c.put(r, kopya); }); }
    return res;
  }).catch(function () { return caches.match(r, { ignoreSearch: true }).then(function (m) { return m || caches.match('index.html'); }); }));
});
