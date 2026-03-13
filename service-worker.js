// ================================================================
// STIGA FINANCE — SERVICE WORKER v3
// Cache inteligente: estáticos offline + rede para Firebase
// ================================================================

const CACHE_STATIC = 'stiga-static-v3';
const CACHE_DYNAMIC = 'stiga-dynamic-v3';

const STATIC_FILES = [
    '/stiga-finance/',
    '/stiga-finance/index.html',
    '/stiga-finance/login.html',
    '/stiga-finance/style.css',
    '/stiga-finance/mobile-fixes.css',
    '/stiga-finance/script.js',
    '/stiga-finance/mobile-fixes.js',
    '/stiga-finance/logo-stiga.png',
    '/stiga-finance/icon-192.png',
    '/stiga-finance/icon-512.png',
    '/stiga-finance/manifest.json'
];

// Instalar: pré-cachear arquivos estáticos
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_STATIC).then(cache => {
            console.log('✅ Cache estático criado');
            return cache.addAll(STATIC_FILES);
        })
    );
    self.skipWaiting();
});

// Ativar: limpar caches antigos automaticamente
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(k => k !== CACHE_STATIC && k !== CACHE_DYNAMIC)
                    .map(k => { console.log('🗑️ Cache antigo removido:', k); return caches.delete(k); })
            )
        )
    );
    self.clients.claim();
});

// Verificar se é requisição de API/Firebase (sempre rede)
function isNetworkOnly(url) {
    return url.includes('firebase') ||
           url.includes('googleapis') ||
           url.includes('firestore') ||
           url.includes('gstatic.com') ||
           url.includes('cdn.jsdelivr') ||
           url.includes('cdnjs.cloudflare') ||
           url.includes('fonts.googleapis') ||
           url.includes('chart.js');
}

// Verificar se é arquivo estático do site
function isStaticAsset(url) {
    return url.includes('/stiga-finance/') &&
           (url.endsWith('.html') || url.endsWith('.css') ||
            url.endsWith('.js')   || url.endsWith('.png') ||
            url.endsWith('.json') || url.endsWith('/'));
}

self.addEventListener('fetch', event => {
    const url = event.request.url;

    // 1. Firebase/APIs — sempre da rede, nunca cacheia
    if (isNetworkOnly(url)) return;

    // 2. Arquivos estáticos — cache-first com atualização em background
    if (isStaticAsset(url)) {
        event.respondWith(
            caches.open(CACHE_STATIC).then(cache =>
                cache.match(event.request).then(cached => {
                    // Atualiza em background mesmo servindo do cache
                    const networkFetch = fetch(event.request).then(response => {
                        if (response.ok) cache.put(event.request, response.clone());
                        return response;
                    }).catch(() => null);

                    return cached || networkFetch;
                })
            )
        );
        return;
    }

    // 3. Demais requisições — network-first com fallback para cache
    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (response.ok && event.request.method === 'GET') {
                    caches.open(CACHE_DYNAMIC).then(cache =>
                        cache.put(event.request, response.clone())
                    );
                }
                return response;
            })
            .catch(() =>
                caches.match(event.request).then(cached =>
                    cached || new Response('Offline — sem conexão', {
                        status: 503,
                        headers: { 'Content-Type': 'text/plain' }
                    })
                )
            )
    );
});

// Limitar tamanho do cache dinâmico (máx 50 itens)
async function trimCache(cacheName, maxItems) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
        await cache.delete(keys[0]);
        trimCache(cacheName, maxItems);
    }
}

self.addEventListener('message', event => {
    if (event.data === 'SKIP_WAITING') self.skipWaiting();
    if (event.data === 'TRIM_CACHE') trimCache(CACHE_DYNAMIC, 50);
});
