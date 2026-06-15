const CACHE_NAME = 'series-tracker-v1';
const BASE = '/missseries/';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                BASE + 'index.html',
                BASE + 'css/styles.css',
                BASE + 'js/config.js',
                BASE + 'js/app.js',
                BASE + 'js/ui.js',
                BASE + 'js/series.js',
                BASE + 'js/checklist.js',
                BASE + 'js/imageManager.js',
                BASE + 'js/auth.js',
                BASE + 'js/notifications.js',
                BASE + 'favicon.png',
                BASE + 'manifest.json'
            ]);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((names) => {
            return Promise.all(
                names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
            );
        })
    );
});
