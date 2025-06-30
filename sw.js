// fritsky-admin-panel/sw.js
const CACHE_NAME_ADMIN = 'fritsky-admin-panel-cache-v2'; // Nombre de caché diferente
const urlsToCacheAdmin = [
    '/',
    '/index.html',
    '/admin.css',
    '/mainAdmin.js', // Si es modular, el navegador lo maneja, pero cachear el entry point es bueno
    '/manifest.json',
    // Fuentes para el admin panel
    '/font/CodecPro-Regular.ttf',
    '/font/Pusia-Bold.ttf',
    // Iconos del manifest del admin
    '/images/admin-icon-192.png',
    '/images/admin-icon-512.png',
    // SDKs de Firebase (opcional, pero puede ayudar)
    'https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js',
    'https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME_ADMIN)
            .then(cache => {
                console.log('[Admin SW] Cache abierto:', CACHE_NAME_ADMIN);
                return cache.addAll(urlsToCacheAdmin);
            })
            .then(() => self.skipWaiting())
            .catch(err => console.error('[Admin SW] Fallo al cachear:', err))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME_ADMIN) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    // Estrategia de caché (puedes usar la misma que en la PWA del cliente:
    // Network first para HTML, Cache first para assets)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
    } else {
        event.respondWith(
            caches.match(event.request).then(response => {
                return response || fetch(event.request);
            })
        );
    }
});