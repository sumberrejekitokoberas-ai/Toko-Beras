// Import fungsi yang dibutuhkan dari Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

// Konfigurasi Firebase dari akun Anda
const firebaseConfig = {
    apiKey: "AIzaSyDs3-6GndSNAIeGdXEATmRVzdU5hfuwmpA",
    authDomain: "toko-beras-b6695.firebaseapp.com",
    // PERHATIAN: Pastikan URL database Anda benar. Versi 9+ tidak menyertakannya secara default.
    databaseURL: "https://toko-beras-b6695-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "toko-beras-b6695",
    storageBucket: "toko-beras-b6695.appspot.com",
    messagingSenderId: "432390656285",
    appId: "1:432390656285:web:0fd24043a2b4323fbe51f4",
    measurementId: "G-4W7FHBNREC"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

// Ekspor service Firebase yang akan digunakan di file lain
export const db = getDatabase(app);
export const auth = getAuth(app);
