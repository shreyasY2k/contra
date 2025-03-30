const CACHE_NAME = 'contra-game-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './js/game.js',
  './js/player.js',
  './js/weapons.js',
  './js/enemies.js',
  './js/vehicles.js',
  './js/environment.js',
  './js/minimap.js',
  './js/controls.js',
  './js/utils.js',
  './js/models.js',
  './js/pwa.js',
  './js/libs/GLTFLoader.js',
  './js/libs/joystick.js',
  './assets/icons/icon.svg',
  './assets/icons/icon.svg',
  './assets/icons/icon.svg',
  './assets/icons/icon.svg',
  './assets/icons/icon.svg',
  './assets/icons/icon.svg',
  './assets/icons/icon.svg',
  './assets/icons/icon.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Use individual cache.put() calls instead of cache.addAll() to avoid failing if one resource is missing
      return Promise.all(
        ASSETS.map(url => {
          // For external URLs like CDN resources, we'll try to fetch but won't fail if it doesn't work
          if (url.startsWith('http')) {
            return fetch(url)
              .then(response => cache.put(url, response))
              .catch(err => console.log(`Couldn't cache external resource: ${url}`, err));
          } else {
            return fetch(url)
              .then(response => {
                if (response.ok) {
                  return cache.put(url, response);
                }
                console.log(`Failed to fetch: ${url}`);
              })
              .catch(err => console.log(`Couldn't cache: ${url}`, err));
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).then(fetchResponse => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, fetchResponse.clone());
          return fetchResponse;
        });
      });
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});
