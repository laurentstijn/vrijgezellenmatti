// ================================
// Firebase configuratie (COMPAT)
// ================================
const firebaseConfig = {
  apiKey: "AIzaSyCBKlUwxs5X4Z0i3_Po25pb3jUDIxFuL84",
  authDomain: "vrijgezellen-8143f.firebaseapp.com",
  projectId: "vrijgezellen-8143f",
  storageBucket: "vrijgezellen-8143f.appspot.com",
  messagingSenderId: "89324838670",
  appId: "1:89324838670:web:622fb70c1a921c29e9015f"
};

// ================================
// Firebase init
// ================================
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

db.settings({
  experimentalForceLongPolling: true,
  useFetchStreams: false
});

console.log("🔥 Firebase correct geïnitialiseerd");
