import { db } from './firebase-config.js';
import { ref, onValue, set } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

// Data Produk
const products = {
    bramo: { name: 'Bramo', sellPrice: 15500, buyPrice: 14500 },
    c4: { name: 'C4', sellPrice: 14500, buyPrice: 14000 },
    srinuk: { name: 'Srinuk/Mentik', sellPrice: 16000, buyPrice: 15000 },
    katul: { name: 'Katul', sellPrice: 4500, buyPrice: 0 },
    giling: { name: 'Ongkos Giling Padi', sellPrice: 400, buyPrice: 0 }
};

// Variabel Global
let cart = {};
let currentSlideIndex = 0;

// Fungsi yang dijalankan saat halaman selesai dimuat
document.addEventListener('DOMContentLoaded', function() {
    console.log('Toko Beras Sumber Rejeki - Public System Ready!');
    initializeApp();
});

function initializeApp() {
    updateCartDisplay();
    loadStoreStatus();
    loadPublicGrindingData();
    startSlider();

    const whatsappLink = document.getElementById('whatsapp-link');
    if (whatsappLink) {
        whatsappLink.addEventListener('click', openWhatsApp);
    }
}

// Navigasi Halaman
window.showPage = function(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    // Hapus kelas 'active' dari semua link dan tambahkan ke yang diklik
    document.querySelectorAll('nav a.nav-link').forEach(link => link.classList.remove('active'));
    // Cari link yang sesuai dengan pageId
    const activeLink = document.querySelector(`nav a[onclick="showPage('${pageId}')"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}


// Hero Slider
function startSlider() {
    // Pastikan elemen slider ada sebelum menjalankan
    if (document.querySelector('.slide')) {
        syncSlides();
        setInterval(nextSlide, 5000);
    }
}

function syncSlides() {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    if (slides.length === 0) return;
    slides.forEach((s, i) => s.classList.toggle('active', i === currentSlideIndex));
    dots.forEach((d, i) => d.classList.toggle('active', i === currentSlideIndex));
}

window.nextSlide = function() {
    const slides = document.querySelectorAll('.slide');
    if (!slides.length) return;
    currentSlideIndex = (currentSlideIndex + 1) % slides.length;
    syncSlides();
}

window.prevSlide = function() {
    const slides = document.querySelectorAll('.slide');
    if (!slides.length) return;
    currentSlideIndex = (currentSlideIndex - 1 + slides.length) % slides.length;
    syncSlides();
}

window.currentSlide = function(n) {
    currentSlideIndex = n - 1;
    syncSlides();
}

// Mengambil Status Toko dari Firebase secara Real-time
function loadStoreStatus() {
    const statusRef = ref(db, 'storeStatus');
    onValue(statusRef, (snapshot) => {
        const status = snapshot.val() || 'open';
        const statusEl = document.getElementById('store-status');
        if (statusEl) {
            statusEl.textContent = status === 'open' ? 'Buka' : 'Tutup';
            statusEl.className = `status-value ${status}`;
        }
    });
}

// Mengambil Data Gilingan dari Firebase secara Real-time
function loadPublicGrindingData() {
    const grindingRef = ref(db, 'grindingData');
    onValue(grindingRef, (snapshot) => {
        const grindingData = snapshot.val();
        const tbody = document.querySelector('#grinding-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!grindingData) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Belum ada data gilingan</td></tr>';
            return;
        }
        
        let index = 1;
        // Tampilkan data yang ada
        for (const key in grindingData) {
            const item = grindingData[key];
            const row = `
                <tr>
                    <td>${index++}</td>
                    <td>${item.clientName}</td>
                    <td>${item.status}</td>
                    <td>${item.pickupTime || '-'}</td>
                </tr>
            `;
            tbody.innerHTML += row;
        }
    });
}


// Fungsi Keranjang dan Checkout
window.addToCart = function(productId) {
    const qtyInput = document.getElementById(`qty-${productId}`);
    const quantity = parseFloat(qtyInput.value);
    if (quantity <= 0 || isNaN(quantity)) {
        alert('Jumlah harus lebih dari 0');
        return;
    }
    cart[productId] = (cart[productId] || 0) + quantity;
    qtyInput.value = 0; // Reset input setelah ditambahkan
    updateCartDisplay();
}

function updateCartDisplay() {
    const cartItemsDiv = document.getElementById('cart-items');
    const cartTotalSpan = document.getElementById('cart-total');
    if (!cartItemsDiv || !cartTotalSpan) return;

    cartItemsDiv.innerHTML = '';
    let total = 0;

    for (const [productId, quantity] of Object.entries(cart)) {
        const product = products[productId];
        const itemTotal = product.sellPrice * quantity;
        total += itemTotal;

        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <span>${product.name} (${quantity} kg)</span>
            <span>Rp ${itemTotal.toLocaleString('id-ID')}</span>
            <button onclick="removeFromCart('${productId}')" class="delete-btn">×</button>
        `;
        cartItemsDiv.appendChild(cartItem);
    }
    cartTotalSpan.textContent = total.toLocaleString('id-ID');
    document.getElementById('checkout-btn').disabled = total === 0;
}

window.removeFromCart = function(productId) {
    delete cart[productId];
    updateCartDisplay();
}

window.processCheckout = function() {
    if (Object.keys(cart).length === 0) return;
    const now = new Date();
    const dateKey = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const timeKey = now.getTime(); // Kunci unik berdasarkan timestamp

    const transaction = {
        id: timeKey,
        date: dateKey,
        time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        items: Object.entries(cart).map(([id, qty]) => ({
            productId: id,
            name: products[id].name,
            quantity: qty,
            sellPrice: products[id].sellPrice,
            buyPrice: products[id].buyPrice,
            revenue: products[id].sellPrice * qty,
            profit: (products[id].sellPrice - products[id].buyPrice) * qty
        })),
        totalRevenue: Object.entries(cart).reduce((sum, [id, qty]) => sum + (products[id].sellPrice * qty), 0),
        totalProfit: Object.entries(cart).reduce((sum, [id, qty]) => sum + ((products[id].sellPrice - products[id].buyPrice) * qty), 0)
    };
    
    // Menyimpan transaksi ke Firebase
    const transactionRef = ref(db, `transactions/${dateKey}/${timeKey}`);
    set(transactionRef, transaction).then(() => {
        cart = {}; // Kosongkan keranjang
        updateCartDisplay();
        alert(`Checkout berhasil! Total: Rp ${transaction.totalRevenue.toLocaleString('id-ID')}`);
    }).catch(error => {
        console.error("Gagal saat checkout:", error);
        alert("Terjadi kesalahan saat checkout. Silakan coba lagi.");
    });
}

// Fungsi WhatsApp
function openWhatsApp(e) {
    if (e) e.preventDefault();
    const message = encodeURIComponent("Assalamu'alaikum, saya ingin bertanya tentang layanan di toko beras Sumber Rejeki.");
    window.open(`https://wa.me/6285711140816?text=${message}`, '_blank');
}