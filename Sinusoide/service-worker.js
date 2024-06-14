

const CACHE_NAME = 'Sinusoide-static'; // Cache name without versioning

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log("Caching datas");
            return cache.addAll([
                'Sinusoide/',
                'Sinusoide/faust-ui/index.js',
                'Sinusoide/faust-ui/index.css',
                'Sinusoide/faustwasm/index.js',
                'Sinusoide/index.html',
                'Sinusoide/Sinusoide.js',
                'Sinusoide/Sinusoide.wasm',
                'Sinusoide/Sinusoide.json',
            ]).catch(error => {
                // Catch and log any errors during the caching process
                console.error('Failed to cache resources during install:', error);
            });
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        // Delete caches that do not match the current cache name
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            // Return the cached response if found, else fetch from network
            return response || fetch(event.request).catch(() => {
                // Fallback content or page for failed network requests
                return caches.match('./offline.html');
            });
        })
    );
});
