
const CACHE_NAME = 'drone-static'; // Cache name without versioning

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log("Service worker installed");
            return cache.addAll([
                '/drone/',
                '/drone/faust-ui/index.js',
                '/drone/faust-ui/index.css',
                '/drone/faustwasm/index.js',
                '/drone/drone.js',
                '/drone/drone.wasm',
                '/drone/drone.json',
            ]).catch(error => {
                // Catch and log any errors during the caching process
                console.error('Failed to cache resources during install:', error);
            });
        })
    );
});

self.addEventListener("activate", event => {
    console.log("Service worker activated");
});

self.addEventListener('fetch', event => {
    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
            return cachedResponse;
        } else {
            try {
                const fetchResponse = await fetch(event.request);
                // Ensure the response is valid before caching it
                if (event.request.method === 'GET' && fetchResponse && fetchResponse.status === 200 && fetchResponse.type === 'basic') {
                    cache.put(event.request, fetchResponse.clone());
                }
                return fetchResponse;
            } catch (e) {
                // Network access failure
                console.log('Network access error', e);
            }
        }
    })());
});