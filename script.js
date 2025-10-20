// =============================
// script.js (Versi Publik REAL-TIME)
// =============================

// Data produk tetap
const products = {
  bramo: { name: 'Bramo', sellPrice: 15500, buyPrice: 14500 },
  c4: { name: 'C4', sellPrice: 14500, buyPrice: 14000 },
  srinuk: { name: 'Srinuk/Mentik', sellPrice: 16000, buyPrice: 15000 },
  katul: { name: 'Katul', sellPrice: 4500, buyPrice: 0 },
  giling: { name: 'Ongkos Giling Padi', sellPrice: 400, buyPrice: 0 }
};

// Global variables
let cart = {};
let currentSlideIndex = 0;

// =============================
// Initialize the application
// =============================
document.addEventListener('DOMContentLoaded', function() {
  console.log('Toko Beras Sumber Rejeki - System Ready!');
  initializeApp();
});

function initializeApp() {
  updateCartDisplay();
  loadStoreStatus();     // Akan memanggil Firebase
  loadGrindingData();  // Akan memanggil Firebase
  startSlider();

  document.querySelectorAll('.admin-only, .admin-controls, #change-status-btn, .admin-link').forEach(el => {
      if (el) el.style.display = 'none';
  });
  
  const initialHash = (location.hash || '').replace('#','');
  if (initialHash) {
    showPage(initialHash);
  }
}

// =============================
// Navigation functions
// =============================
function showPage(pageId, ev = window.event) {
  if (pageId === 'checkout') {
    pageId = 'catalog';
  }

  const pages = document.querySelectorAll('.page');
  pages.forEach(page => page.classList.remove('active'));

  const target = document.getElementById(pageId);
  if (target) target.classList.add('active');

  const navLinks = document.querySelectorAll('nav a.nav-link');
  navLinks.forEach(link => link.classList.remove('active'));

  let targetLink = null;
  if (ev && ev.target && ev.target.classList && ev.target.classList.contains('nav-link')) {
    targetLink = ev.target;
  } else {
    for (const a of navLinks) {
      const onclick = a.getAttribute('onclick') || '';
      if (onclick.includes(`showPage('${pageId}'`) || onclick.includes(`showPage("${pageId}"`)) {
        targetLink = a;
        break;
      }
    }
  }
  if (targetLink) targetLink.classList.add('active');

  try { history.replaceState(null, '', `#${pageId}`); } catch (e) {}

  if (pageId === 'informasi') {
    // Data sudah di-load oleh listener, tapi kita panggil lagi untuk memastikan
    loadGrindingData(); 
    loadStoreStatus();
  }
  return false;
}

// =============================
// Hero Slider Functions
// =============================
function startSlider() {
  syncSlides();
  setInterval(() => { nextSlide(); }, 5000);
}

function syncSlides() {
  const slides = document.querySelectorAll('.slide');
  const dots = document.querySelectorAll('.dot');
  if (!slides.length || !dots.length) return;
  slides.forEach((s, i) => s.classList.toggle('active', i === currentSlideIndex));
  dots.forEach((d, i) => d.classList.toggle('active', i === currentSlideIndex));
}

function nextSlide() {
  const slides = document.querySelectorAll('.slide');
  if (!slides.length) return;
  currentSlideIndex = (currentSlideIndex + 1) % slides.length;
  syncSlides();
}

function prevSlide() {
  const slides = document.querySelectorAll('.slide');
  if (!slides.length) return;
  currentSlideIndex = (currentSlideIndex - 1 + slides.length) % slides.length;
  syncSlides();
}

function currentSlideFunc(n) {
  const slides = document.querySelectorAll('.slide');
  if (!slides.length) return;
  currentSlideIndex = Math.max(0, Math.min(slides.length - 1, n - 1));
  syncSlides();
}
window.currentSlide = currentSlideFunc;

// =============================
// Store Status Functions (Real-time)
// =============================
function loadStoreStatus() {
  // onSnapshot adalah listener real-time
  settingsRef.onSnapshot((doc) => {
    let status = 'open'; // Default jika dokumen belum ada
    if (doc.exists && doc.data().status) {
      status = doc.data().status;
    }
    updateStoreStatusDisplay(status);
  }, (error) => {
    console.error("Error listening to store status: ", error);
  });
}

function updateStoreStatusDisplay(status) {
  const statusElements = document.querySelectorAll('#store-status, #store-status-info');
  statusElements.forEach(el => {
    if (!el) return;
    el.textContent = status === 'open' ? 'Buka' : 'Tutup';
    el.className = `status-value ${status}`;
  });
}

// =============================
// Grinding Data Functions (Real-time Read-Only)
// =============================
function loadGrindingData() {
  // Listener real-time untuk koleksi 'grinding'
  grindingRef.orderBy("tanggal", "desc").onSnapshot((querySnapshot) => {
    const grindingData = [];
    querySnapshot.forEach((doc) => {
      grindingData.push({ id: doc.id, ...doc.data() });
    });
    displayGrindingTable(grindingData);
  }, (error) => {
    console.error("Error listening to grinding data: ", error);
  });
}

function displayGrindingTable(data) {
  const tbody = document.querySelector('#grinding-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="text-center">Belum ada data gilingan</td></tr>';
    return;
  }

  data.forEach((item, index) => {
    const cost = (item.grainAmount || 0) * 400;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.clientName || '-'}</td>
      <td>${item.clientAddress || '-'}</td>
      <td>${item.grainAmount || 0}</td>
      <td>Rp ${cost.toLocaleString('id-ID')}</td>
      <td>
        <select disabled class="disabled-input">
          <option ${item.status === 'Belum digiling' ? 'selected' : ''}>Belum digiling</option>
          <option ${item.status === 'On proses' ? 'selected' : ''}>On proses</option>
          <option ${item.status === 'Selesai' ? 'selected' : ''}>Selesai</option>
        </select>
      </td>
      <td>
        <select disabled class="select-penerima disabled-input">
          <option value="">--</option>
          <option ${item.receiver === 'Mamah' ? 'selected' : ''}>Mamah</option>
          <option ${item.receiver === 'Lany' ? 'selected' : ''}>Lany</option>
          <option ${item.receiver === 'Fadhil' ? 'selected' : ''}>Fadhil</option>
          <option ${item.receiver === 'Fairuz' ? 'selected' : ''}>Fairuz</option>
        </select>
      </td>
      <td class="status-bayar-wrapper">
        <input type="checkbox" ${item.isPaid ? 'checked' : ''} disabled class="status-bayar-checkbox disabled-input" id="paid-${index}-public">
        <label for="paid-${index}-public">${item.isPaid ? 'Sudah' : 'Belum'}</label>
      </td>
      <td>${item.deliveryTime || '-'}</td>
      <td>${item.pickupTime || '-'}</td>
    `;
    tbody.appendChild(row);
  });
}

// =============================
// WhatsApp Function
// =============================
function openWhatsApp() {
  const message = encodeURIComponent("Assalamu'alaikum, saya ingin bertanya tentang layanan toko beras Sumber Rejeki...");
  window.open(`https://wa.me/6285711140816?text=${message}`, '_blank');
}

// =============================
// Cart functions
// =============================
function addToCart(productId) {
  const qtyInput = document.getElementById(`qty-${productId}`);
  const quantity = parseFloat(qtyInput?.value || '0');

  if (quantity <= 0 || Number.isNaN(quantity)) {
    alert('Jumlah harus lebih dari 0');
    return;
  }

  if (cart[productId]) {
    cart[productId] += quantity;
  } else {
    cart[productId] = quantity;
  }

  if (qtyInput) qtyInput.value = 0;
  updateCartDisplay();
}

function updateCartDisplay() {
  const cartItemsDiv = document.getElementById('cart-items');
  const cartTotalSpan = document.getElementById('cart-total');
  if (!cartItemsDiv || !cartTotalSpan) return;

  cartItemsDiv.innerHTML = '';
  let total = 0;

  for (const [productId, quantity] of Object.entries(cart)) {
    if (quantity > 0) {
      const product = products[productId];
      const itemTotal = product.sellPrice * quantity;
      total += itemTotal;

      const cartItem = document.createElement('div');
      cartItem.className = 'cart-item';
      cartItem.innerHTML = `
        <span>${product.name} (${quantity} kg)</span>
        <span>Rp ${itemTotal.toLocaleString('id-ID')}</span>
        <button onclick="removeFromCart('${productId}')" class="delete-btn" style="padding:2px 6px; border-radius:3px;">×</button>
      `;
      cartItemsDiv.appendChild(cartItem);
    }
  }

  cartTotalSpan.textContent = total.toLocaleString('id-ID');

  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.disabled = total === 0;
    checkoutBtn.style.opacity = total === 0 ? '0.5' : '1';
  }
}

function removeFromCart(productId) {
  delete cart[productId];
  updateCartDisplay();
}

function processCheckout() {
  if (Object.keys(cart).length === 0) {
    alert('Keranjang kosong!');
    return;
  }
  alert('Fitur checkout hanya tersedia untuk Admin. Silakan hubungi toko di nomor WhatsApp pada halaman Informasi untuk memproses pesanan Anda.');
}

// =============================
// Format currency helper
// =============================
function formatCurrency(amount) {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}