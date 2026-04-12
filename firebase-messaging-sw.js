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

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Vrijgezellen vraag';
  const options = {
    body: payload.notification?.body || 'Open de app voor de volgende vraag.',
    icon: './icon-192.png',
    badge: './icon-192.png',
    data: {
      url: payload.fcmOptions?.link || './'
    }
  };
  self.registration.showNotification(title, options);
});
