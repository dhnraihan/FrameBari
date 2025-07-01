// static/sw.js (Service Worker)
const CACHE_NAME = 'photo-editor-v1.0.0';
const STATIC_CACHE = 'static-v1.0.0';
const DYNAMIC_CACHE = 'dynamic-v1.0.0';

const STATIC_FILES = [
    '/',
    '/static/css/main.css',
    '/static/css/mobile.css',
    '/static/js/editor.js',
    '/static/js/mobile.js',
    '/static/icons/icon-192x192.png',
    '/static/icons/icon-512x512.png',
    '/offline/',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Install Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                return self.skipWaiting();
            })
    );
});

// Activate Service Worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                return self.clients.claim();
            })
    );
});

// Fetch Strategy
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Handle API requests
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            networkFirstStrategy(request)
        );
        return;
    }
    
    // Handle image uploads
    if (request.method === 'POST' && url.pathname.includes('/upload/')) {
        event.respondWith(
            networkOnlyStrategy(request)
        );
        return;
    }
    
    // Handle static files
    if (STATIC_FILES.includes(url.pathname) || url.pathname.startsWith('/static/')) {
        event.respondWith(
            cacheFirstStrategy(request)
        );
        return;
    }
    
    // Handle page requests
    if (request.destination === 'document') {
        event.respondWith(
            networkFirstStrategy(request)
        );
        return;
    }
    
    // Default to network first
    event.respondWith(
        networkFirstStrategy(request)
    );
});

// Cache Strategies
async function cacheFirstStrategy(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        if (networkResponse.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        return cachedResponse || caches.match('/offline/');
    }
}

async function networkFirstStrategy(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline page for document requests
        if (request.destination === 'document') {
            return caches.match('/offline/');
        }
        
        throw error;
    }
}

async function networkOnlyStrategy(request) {
    return fetch(request);
}

// Background Sync for offline uploads
self.addEventListener('sync', event => {
    if (event.tag === 'upload-photos') {
        event.waitUntil(
            syncUploads()
        );
    }
});

async function syncUploads() {
    // Implement offline upload sync
    const uploads = await getStoredUploads();
    
    for (const upload of uploads) {
        try {
            await uploadPhoto(upload);
            await removeStoredUpload(upload.id);
        } catch (error) {
            console.log('Upload sync failed:', error);
        }
    }
}

// Push Notifications
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'Your photos are ready!',
        icon: '/static/icons/icon-192x192.png',
        badge: '/static/icons/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: '1'
        },
        actions: [
            {
                action: 'explore',
                title: 'View Photos',
                icon: '/static/icons/view-96x96.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/static/icons/close-96x96.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('Photo Editor Pro', options)
    );
});

// Notification Click Handler
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/editor/')
        );
    }
});
