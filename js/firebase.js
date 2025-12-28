// Firebase init
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCBKlUwxs5X4Z0i3_Po25pb3jUDIxFuL84",
  authDomain: "vrijgezellen-8143f.firebaseapp.com",
  projectId: "vrijgezellen-8143f",
  storageBucket: "vrijgezellen-8143f.firebasestorage.app",
  messagingSenderId: "89324838670",
  appId: "1:89324838670:web:622fb70c1a921c29e9015f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);