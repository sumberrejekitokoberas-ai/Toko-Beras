// =============================
// firebase-config.js
// =============================

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD-t8rX8cTRpkWjYkAP3JTkg2afOBlLB78",
  authDomain: "toko-beras-sumber-rejeki.firebaseapp.com",
  projectId: "toko-beras-sumber-rejeki",
  storageBucket: "toko-beras-sumber-rejeki.firebasestorage.app",
  messagingSenderId: "103035125217",
  appId: "1:103035125217:web:eaa5b49538c62b7ce8a6a0",
  measurementId: "G-35P683LZ0N"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(); // Ini penting untuk mengakses database

// Referensi ke koleksi (collection) di database Anda
const settingsRef = db.collection('settings').doc('store');
const grindingRef = db.collection('grinding');
const transactionsRef = db.collection('transactions');
