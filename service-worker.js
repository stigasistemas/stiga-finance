// ================================================================
// STIGA FINANCE — SERVICE WORKER
// Cache dos arquivos estáticos para funcionar offline
// ================================================================

const CACHE_NAME = 'stiga-finance-v1';

const STATIC_FILES = [
    '/stiga-finance/index.html',
    '/stiga-finance/style.css',
    '/stiga-finance/mobile-fixes.css',
    '/stiga-finance/script.js',
    '/stiga-finance/mobile-fixes.js',
    '/stiga-finance/logo-stiga.png',
    '/stiga-finance/manifest.json'
];

// Instalar: salvar arquivos no cache
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('✅ Cache criado');
            return cache.addAll(STATIC_FILES);
        })
    );
    self.skipWaiting();
});

// Ativar: limpar caches antigos
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

// Fetch: servir do cache se offline, senão buscar da rede
self.addEventListener('fetch', event => {
    // Ignorar requisições do Firebase (sempre precisam de rede)
    if (event.request.url.includes('firebase') ||
        event.request.url.includes('googleapis') ||
        event.request.url.includes('firestore')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                // Salvar no cache se for um arquivo estático
                if (response.ok && event.request.method === 'GET') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => cached);
        })
    );
});
