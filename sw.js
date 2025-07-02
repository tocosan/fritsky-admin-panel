// sw.js
const CACHE_NAME_ADMIN = 'fritsky-admin-panel-cache-v5'; // Cambia la versión si haces cambios mayores
const urlsToCacheAdmin = [
    '/',
    '/index.html',
    '/admin.css',
    '/mainAdmin.js', // Entry point principal

    // --- ¡AÑADIR TODOS LOS MÓDULOS AQUÍ! ---
    '/modules/authService.js',
    '/modules/firestoreService.js',
    '/modules/utils.js',
    '/modules/qrScannerService.js', // ¡Este es crucial para el escáner!
    // Si tuvieras más módulos, añádelos también.

    '/manifest.json',
    // Fuentes
    '/font/CodecPro-Regular.ttf',
    '/font/Pusia-Bold.ttf',
    
    // SDKs de Firebase (si prefieres cachearlos)
    'https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js',
    'https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME_ADMIN)
            .then(cache => {
                console.log('[Admin SW] Cache abierto:', CACHE_NAME_ADMIN);
                return cache.addAll(urlsToCacheAdmin); // Asegúrate que todos los módulos estén aquí
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
    // Estrategia de caché
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

self.addEventListener('push', event => {
    // Si no vas a implementar notificaciones push, puedes dejarlo vacío o solo registrar un mensaje.
    console.log('[Admin SW] Push event recibido (manejado vacío)');
    // Si tuvieras un evento push y quisieras mostrar una notificación:
    // const promiseChain = clients.matchAll()
    //   .then(windowClients => {
    //     for (const client of windowClients) {
    //       client.postMessage({ message: 'push', payload: event.data.text() });
    //     }
    //   });
    // event.waitUntil(promiseChain);
});