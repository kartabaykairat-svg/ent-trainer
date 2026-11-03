/* Service worker менеджера паролей.
 * Кэширует только оболочку приложения (HTML/JS/CSS/иконки).
 * Запросы к Supabase и HaveIBeenPwned НЕ кэшируются здесь:
 * офлайн-копия хранилища — это зашифрованные строки в IndexedDB. */
const VERSION = '89d7d295659e';
const CACHE = `pm-shell-${VERSION}`;
const PRECACHE = [
  "./",
  "./index.html",
  "./config.js",
  "./theme-init.js",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./manifest.webmanifest",
  "./assets/index-C4-7Bguj.js",
  "./assets/wordlist-DDS40H4Q.js",
  "./assets/index-CndMthfU.css"
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('pm-shell-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // чужие домены — без кэша

  // Навигация: сначала сеть, без сети — кэш.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  // config.js — сеть в приоритете (его могут поменять без пересборки)
  if (url.pathname.endsWith('/config.js')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req)),
    );
    return;
  }

  // Статика с хешами в имени — сначала кэш.
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
