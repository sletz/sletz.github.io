
const CACHE_NAME = 'Atomicro-static'; // Cache name without versioning

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log("Caching datas");
            return cache.addAll([
                '/Atomicro/',
                '/Atomicro/faust-ui/index.js',
                '/Atomicro/faust-ui/index.css',
                '/Atomicro/faustwasm/index.js',
                '/Atomicro/Atomicro.js',
                '/Atomicro/Atomicro.wasm',
                '/Atomicro/Atomicro.json',
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
    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        // Get the resource from the cache
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
            return cachedResponse;
        } else {
            try {
                // If the resource was not in the cache, try the network
                const fetchResponse = await fetch(event.request);
                // Save the resource in the cache and return it
                cache.put(event.request, fetchResponse.clone());
                return fetchResponse;
            } catch (e) {
                // The network faile
                console.log('Network access error', CACHE_NAME);
            }
        }
    })());
});