// Firebase Messaging Service Worker
// Required for background push notifications

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyCuFEa8Z-FACVQOu8pKN4b37W_cVZ-hZx0",
    authDomain: "shokher-srity.firebaseapp.com",
    projectId: "shokher-srity",
    storageBucket: "shokher-srity.firebasestorage.app",
    messagingSenderId: "207020465987",
    appId: "1:207020465987:web:daa3d48d9897182ce7d9f6",
    measurementId: "G-BY2J01BWY5"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message:', payload);

    const { title, body, icon, click_action } = payload.notification || {};

    const notificationOptions = {
        body: body || 'New update from ShokherSrity',
        icon: icon || '/attached_assets/logo.webp',
        badge: '/attached_assets/logo.webp',
        tag: 'shokhersrity-notification',
        data: {
            url: click_action || payload.data?.link || '/'
        },
        actions: [
            { action: 'open', title: 'View' },
            { action: 'dismiss', title: 'Dismiss' }
        ],
        vibrate: [200, 100, 200]
    };

    self.registration.showNotification(
        title || 'ShokherSrity',
        notificationOptions
    );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const url = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Focus existing tab if open
            for (const client of windowClients) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            // Open new tab
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});
