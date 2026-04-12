importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCBKlUwxs5X4Z0i3_Po25pb3jUDIxFuL84",
  authDomain: "vrijgezellen-8143f.firebaseapp.com",
  projectId: "vrijgezellen-8143f",
  storageBucket: "vrijgezellen-8143f.firebasestorage.app",
  messagingSenderId: "89324838670",
  appId: "1:89324838670:web:622fb70c1a921c29e9015f"
});

const messaging = firebase.messaging();

// Achtergrondmeldingen — werkt ook als de telefoon in je zak steekt
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || '🎉 Vrijgezellen Weekend';
  const body  = payload.notification?.body  || 'Open de app voor de volgende vraag!';

  const options = {
    body,
    icon: './icon-192.png',
    badge: './icon-192.png',
    // Vibratiepatroon: kort-kort-lang
    vibrate: [200, 100, 200, 100, 400],
    // Blijft zichtbaar tot gebruiker interactie
    requireInteraction: true,
    // Voorkomt stapelen van meerdere meldingen
    tag: 'vrijgezellen-vraag',
    // Actie knop
    actions: [{ action: 'open', title: '📲 Open app' }],
    data: {
      url: payload.fcmOptions?.link || './'
    }
  };

  self.registration.showNotification(title, options);
});

// Klik op notificatie → open/focus de app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification?.data?.url || './';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Zoek een al open venster en focus dat
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Anders open een nieuw venster
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});
