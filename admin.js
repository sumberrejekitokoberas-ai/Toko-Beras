// =============================
// admin.js (Versi Admin REAL-TIME)
// =============================

// =============================
// Product data
// =============================
const products = {
  bramo: { name: 'Bramo', sellPrice: 15500, buyPrice: 14500 },
  c4: { name: 'C4', sellPrice: 14500, buyPrice: 14000 },
  srinuk: { name: 'Srinuk/Mentik', sellPrice: 16000, buyPrice: 15000 },
  katul: { name: 'Katul', sellPrice: 4500, buyPrice: 0 },
  giling: { name: 'Ongkos Giling Padi', sellPrice: 400, buyPrice: 0 }
};

// =============================
// Global variables
// =============================
let cart = {};
let currentSlideIndex = 0;
let isAdmin = true; // Selalu true di admin.html
let localGrindingData = []; // Cache lokal untuk data gilingan
let localTransactions = []; // Cache lokal untuk transaksi

// =============================
// Initialize the application
// =============================
document.addEventListener('DOMContentLoaded', function() {
  console.log('Toko Beras Sumber Rejeki - Admin System Ready!');
  // Pastikan login (meskipun sudah ada di HTML)
  if (localStorage.getItem('adminSession') !== 'true') {
      window.location.href = 'login.html';
      return;
  }
  initializeApp();
});

function initializeApp() {
  updateCartDisplay();
  
  // Setup Listeners Real-time
  listenStoreStatus();
  listenGrindingData();
  listenTodayTransactions(); // Hanya listener untuk transaksi hari ini

  // Load data yang tidak real-time (saat dibutuhkan)
  loadAllTransactions().then(() => {
    populateMonthSelector();
    updateMonthlyReport();
    initializeDateSelector(); // Ini akan memanggil updateDailyRecap
    
    // Inisialisasi expense
    populateExpenseMonthSelector();
    initializeExpenseDateSelector();
    _syncExpensesFromInfoImpl(); // Sinkronisasi saat load
  });
  
  checkAdminStatus();
  startSlider();

  const initialHash = (location.hash || '').replace('#','');
  if (initialHash) {
    showPage(initialHash);
  }
}

// =============================
// Navigation functions
// =============================
function showPage(pageId, ev = window.event) {
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

  // Load page-specific data if necessary
  if (pageId === 'checkout') {
    // Data sudah di-load oleh listener, kita hanya perlu re-render
    renderTodayTransactions(localTransactions.filter(t => t.date === new Date().toISOString().split('T')[0]));
    updateMonthlyReport();
    updateDailyRecap();
    renderPengeluaranHarian();
    renderPengeluaranBulanan();
  } else if (pageId === 'informasi') {
    // Data sudah di-load oleh listener, kita hanya re-render
    displayGrindingTable(localGrindingData);
    // status juga sudah real-time
  }
  return false;
}

// =============================
// Hero Slider Functions
// =============================
function startSlider() { /* ... (sama seperti sebelumnya) ... */ }
function syncSlides() { /* ... (sama seperti sebelumnya) ... */ }
function nextSlide() { /* ... (sama seperti sebelumnya) ... */ }
function prevSlide() { /* ... (sama seperti sebelumnya) ... */ }
function currentSlideFunc(n) { /* ... (sama seperti sebelumnya) ... */ }
window.currentSlide = currentSlideFunc;

// =============================
// Store Status Functions (Real-time)
// =============================
function listenStoreStatus() {
  settingsRef.onSnapshot((doc) => {
    let status = 'open';
    if (doc.exists && doc.data().status) {
      status = doc.data().status;
    }
    updateStoreStatusDisplay(status);
  }, (error) => console.error("Error listening to store status: ", error));
}

function updateStoreStatusDisplay(status) {
  const statusElements = document.querySelectorAll('#store-status, #store-status-info');
  statusElements.forEach(el => {
    if (!el) return;
    el.textContent = status === 'open' ? 'Buka' : 'Tutup';
    el.className = `status-value ${status}`;
  });
}

async function changeStoreStatus() {
  const currentStatus = (document.getElementById('store-status').textContent || 'Buka').toLowerCase() === 'buka' ? 'open' : 'closed';
  const newStatus = currentStatus === 'open' ? 'closed' : 'open';
  
  try {
    await settingsRef.set({ status: newStatus }, { merge: true });
    alert(`Status toko berhasil diubah menjadi: ${newStatus === 'open' ? 'Buka' : 'Tutup'}`);
    // Tampilan akan update otomatis via listener
  } catch (error) {
    console.error("Error changing status: ", error);
    alert('Gagal mengubah status.');
  }
}

// =============================
// Admin Functions
// =============================
function checkAdminStatus() {
  isAdmin = true;
  document.body.classList.add('admin-mode');
}

function logoutAdmin() {
  if (!confirm('Logout akun admin?')) return;
  localStorage.removeItem('adminSession');
  window.location.href = 'login.html';
}

// =============================
// Grinding Data Functions (Real-time)
// =============================
function listenGrindingData() {
  grindingRef.orderBy("tanggal", "desc").onSnapshot((querySnapshot) => {
    localGrindingData = [];
    querySnapshot.forEach((doc) => {
      localGrindingData.push({ id: doc.id, ...doc.data() });
    });
    // Jika user sedang di halaman informasi, update tabelnya
    if (document.getElementById('informasi').classList.contains('active')) {
        displayGrindingTable(localGrindingData);
    }
    // Selalu sinkronkan data pengeluaran
    _syncExpensesFromInfoImpl(localGrindingData);
  }, (error) => console.error("Error listening to grinding data: ", error));
}

function displayGrindingTable(data) {
  const tbody = document.querySelector('#grinding-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" class="text-center">Belum ada data gilingan</td></tr>';
    return;
  }

  data.forEach((item, index) => {
    const cost = (item.grainAmount || 0) * 400;
    const itemIndex = item.id; // Gunakan ID Dokumen Firebase

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.clientName || '-'}</td>
      <td>${item.clientAddress || '-'}</td>
      <td>${item.grainAmount || 0}</td>
      <td>Rp ${cost.toLocaleString('id-ID')}</td>
      <td>
        <select onchange="updateGrindingData('${itemIndex}', { status: this.value })" class="admin-input">
          <option value="Belum digiling" ${item.status === 'Belum digiling' ? 'selected' : ''}>Belum digiling</option>
          <option value="On proses" ${item.status === 'On proses' ? 'selected' : ''}>On proses</option>
          <option value="Selesai" ${item.status === 'Selesai' ? 'selected' : ''}>Selesai</option>
        </select>
      </td>
      <td>
        <select onchange="updateGrindingData('${itemIndex}', { receiver: this.value })" class="select-penerima admin-input">
          <option value="">-- Pilih --</option>
          <option value="Mamah" ${item.receiver === 'Mamah' ? 'selected' : ''}>Mamah</option>
          <option value="Lany" ${item.receiver === 'Lany' ? 'selected' : ''}>Lany</option>
          <option value="Fadhil" ${item.receiver === 'Fadhil' ? 'selected' : ''}>Fadhil</option>
          <option value="Fairuz" ${item.receiver === 'Fairuz' ? 'selected' : ''}>Fairuz</option>
        </select>
      </td>
      <td class="status-bayar-wrapper">
        <input type="checkbox" onchange="updateGrindingData('${itemIndex}', { isPaid: this.checked })" ${item.isPaid ? 'checked' : ''} class="status-bayar-checkbox admin-input" id="paid-${itemIndex}">
        <label for="paid-${itemIndex}">${item.isPaid ? 'Sudah' : 'Belum'}</label>
      </td>
      <td>
        ${item.deliveryTime || ''}
        ${!item.deliveryTime ? `<button class="action-btn" onclick="setDeliveryTime('${itemIndex}')">Set</button>` : ''}
      </td>
      <td>
        ${item.pickupTime || ''}
        ${!item.pickupTime ? `<button class="action-btn" onclick="setPickupTime('${itemIndex}')">Set</button>` : ''}
      </td>
      <td class="admin-only">
        <button class="action-btn danger" onclick="deleteGrindingData('${itemIndex}')">Hapus</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function showAddGrindingForm() {
  document.getElementById('grinding-modal').style.display = 'block';
}

function closeGrindingModal() {
  document.getElementById('grinding-modal').style.display = 'none';
  // Reset form
  document.getElementById('client-name').value = '';
  document.getElementById('client-address').value = '';
  document.getElementById('grain-amount').value = '';
  document.getElementById('receiver-select').value = '';
  document.getElementById('status-bayar-checkbox').checked = false;
}

async function handleAddGrinding(event) {
  event.preventDefault();
  
  const clientName = document.getElementById('client-name').value;
  const clientAddress = document.getElementById('client-address').value;
  const grainAmount = parseFloat(document.getElementById('grain-amount').value || '0');
  const receiver = document.getElementById('receiver-select').value;
  const isPaid = document.getElementById('status-bayar-checkbox').checked;

  if (!clientName || !clientAddress || !grainAmount || grainAmount <= 0) {
    alert('Isi semua field dengan benar.');
    return;
  }

  const newData = {
    clientName,
    clientAddress,
    grainAmount,
    status: 'Belum digiling',
    deliveryTime: '',
    pickupTime: '',
    receiver,
    isPaid,
    gabah: grainAmount,
    tanggal: new Date().toISOString() // Simpan sebagai ISO string
  };

  try {
    await grindingRef.add(newData);
    alert('Data gilingan berhasil ditambahkan!');
    closeGrindingModal();
    // Tampilan akan update otomatis via listener
  } catch (error) {
    console.error("Error adding document: ", error);
    alert('Gagal menambah data.');
  }
}

// Fungsi helper baru untuk update data gilingan
async function updateGrindingData(docId, dataToUpdate) {
  try {
    await grindingRef.doc(docId).update(dataToUpdate);
    // Tampilan akan update otomatis via listener
  } catch (error) {
    console.error("Error updating document: ", error);
    alert('Gagal update data.');
  }
}

async function setDeliveryTime(docId) {
  await updateGrindingData(docId, { deliveryTime: new Date().toLocaleString('id-ID') });
}

async function setPickupTime(docId) {
  await updateGrindingData(docId, { pickupTime: new Date().toLocaleString('id-ID') });
}

async function deleteGrindingData(docId) {
  if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
  try {
    await grindingRef.doc(docId).delete();
    alert('Data berhasil dihapus!');
    // Tampilan & sinkronisasi akan update otomatis via listener
  } catch (error) {
    console.error("Error deleting document: ", error);
    alert('Gagal menghapus data.');
  }
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
function addToCart(productId) { /* ... (sama seperti sebelumnya) ... */ }
function updateCartDisplay() { /* ... (sama seperti sebelumnya) ... */ }
function removeFromCart(productId) { /* ... (sama seperti sebelumnya) ... */ }

async function processCheckout() {
  if (Object.keys(cart).length === 0) {
    alert('Keranjang kosong!');
    return;
  }

  const now = new Date();
  const transactionId = now.getTime();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('id-ID');

  let totalRevenue = 0;
  let totalProfit = 0;
  const items = [];

  for (const [productId, quantity] of Object.entries(cart)) {
    const product = products[productId];
    const revenue = product.sellPrice * quantity;
    const profit = (product.sellPrice - product.buyPrice) * quantity;
    totalRevenue += revenue;
    totalProfit += profit;
    items.push({
      productId,
      name: product.name,
      quantity,
      sellPrice: product.sellPrice,
      buyPrice: product.buyPrice,
      revenue,
      profit
    });
  }

  const transaction = {
    id: transactionId, // Simpan ID unik
    date: dateStr,
    time: timeStr,
    items,
    totalRevenue,
    totalProfit
  };

  try {
    // Tambah transaksi ke Firebase
    await transactionsRef.add(transaction);
    
    cart = {};
    updateCartDisplay();
    alert(`Checkout berhasil!\nTotal: Rp ${totalRevenue.toLocaleString('id-ID')}\nProfit: Rp ${totalProfit.toLocaleString('id-ID')}`);
    
    // Auto-navigasi ke halaman checkout
    const checkoutLink = document.querySelector('nav a[onclick*="checkout"]');
    if (checkoutLink) {
        showPage('checkout', { target: checkoutLink });
    }
  } catch (error) {
      console.error("Error processing checkout: ", error);
      alert("Checkout gagal. Silakan coba lagi.");
  }
}

// =============================
// Transaction DATA functions (Firebase)
// =============================

// Fungsi ini mengambil SEMUA transaksi sekali. Digunakan untuk rekap.
async function loadAllTransactions() {
  try {
    const snapshot = await transactionsRef.get();
    localTransactions = [];
    snapshot.forEach(doc => {
      localTransactions.push({ docId: doc.id, ...doc.data() });
    });
  } catch (error) {
    console.error("Error loading all transactions: ", error);
    alert("Gagal memuat riwayat transaksi.");
  }
}

// Fungsi ini HANYA mendengarkan transaksi HARI INI
function listenTodayTransactions() {
  const todayStr = new Date().toISOString().split('T')[0];
  transactionsRef.where("date", "==", todayStr).onSnapshot((querySnapshot) => {
    const todayTransactions = [];
    querySnapshot.forEach((doc) => {
      todayTransactions.push({ docId: doc.id, ...doc.data() });
    });
    // Update cache transaksi hari ini
    localTransactions = localTransactions.filter(t => t.date !== todayStr).concat(todayTransactions);
    // Render tabel jika sedang di halaman checkout
    if (document.getElementById('checkout').classList.contains('active')) {
      renderTodayTransactions(todayTransactions);
    }
  }, (error) => console.error("Error listening to today's transactions: ", error));
}

// Fungsi untuk me-RENDER tabel dari data
function renderTodayTransactions(transactions) {
  const tbody = document.querySelector('#today-transactions tbody');
  if (!tbody) return;

  tbody.innerHTML = '';
  let dailyRevenue = 0;
  let dailyProfit = 0;

  transactions.sort((a, b) => (a.id > b.id) ? 1 : -1); // Urutkan berdasarkan waktu

  transactions.forEach(transaction => {
    transaction.items.forEach(item => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${transaction.time}</td>
        <td>${item.name}</td>
        <td>${item.quantity}</td>
        <td>Rp ${item.sellPrice.toLocaleString('id-ID')}</td>
        <td>Rp ${item.revenue.toLocaleString('id-ID')}</td>
        <td>Rp ${item.profit.toLocaleString('id-ID')}</td>
        <td>
          <button onclick="deleteTransaction('${transaction.docId}', ${transaction.id})" class="delete-btn" title="Hapus Transaksi">
            🗑️ Hapus
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
    dailyRevenue += transaction.totalRevenue;
    dailyProfit += transaction.totalProfit;
  });

  const rev = document.getElementById('daily-revenue');
  const prof = document.getElementById('daily-profit');
  if (rev) rev.textContent = dailyRevenue.toLocaleString('id-ID');
  if (prof) prof.textContent = dailyProfit.toLocaleString('id-ID');
}

// =============================
// Report Display functions (Menggunakan data localTransactions)
// =============================
function populateMonthSelector() {
  const months = new Set();
  localTransactions.forEach(t => {
    const [year, month] = t.date.split('-');
    months.add(`${year}-${month}`);
  });
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  months.add(currentMonth);

  const select = document.getElementById('month-select');
  if (!select) return;
  select.innerHTML = '<option value="">Pilih Bulan</option>';
  const sortedMonths = Array.from(months).sort().reverse();
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  sortedMonths.forEach(monthYear => {
    const [year, month] = monthYear.split('-');
    const option = document.createElement('option');
    option.value = monthYear;
    option.textContent = `${monthNames[parseInt(month) - 1]} ${year}`;
    select.appendChild(option);
  });
  select.value = currentMonth;
}

function updateMonthlyReport() {
  const select = document.getElementById('month-select');
  if (!select) return;
  const selectedMonth = select.value;

  const elR = document.getElementById('monthly-revenue');
  const elP = document.getElementById('monthly-profit');
  const elT = document.getElementById('monthly-transactions');

  if (!selectedMonth) {
    if (elR) elR.textContent = '0';
    if (elP) elP.textContent = '0';
    if (elT) elT.textContent = '0';
    return;
  }

  const monthlyTransactions = localTransactions.filter(t => t.date.startsWith(selectedMonth));
  let monthlyRevenue = 0;
  let monthlyProfit = 0;

  monthlyTransactions.forEach(transaction => {
    monthlyRevenue += transaction.totalRevenue;
    monthlyProfit += transaction.totalProfit;
  });

  if (elR) elR.textContent = monthlyRevenue.toLocaleString('id-ID');
  if (elP) elP.textContent = monthlyProfit.toLocaleString('id-ID');
  if (elT) elT.textContent = monthlyTransactions.length;
}

function initializeDateSelector() {
  const dateSelect = document.getElementById('date-select');
  if (!dateSelect) return;
  const today = new Date().toISOString().split('T')[0];
  dateSelect.value = today;
  dateSelect.max = today;
  updateDailyRecap();
}

async function updateDailyRecap() {
  const dateSelect = document.getElementById('date-select');
  if (!dateSelect) return;
  const selectedDate = dateSelect.value;
  const todayStr = new Date().toISOString().split('T')[0];

  if (!selectedDate) {
    clearDailyRecap();
    return;
  }
  
  let transactions = [];
  
  // Jika tanggal yang dipilih adalah hari ini, gunakan data listener (localTransactions)
  if (selectedDate === todayStr) {
      transactions = localTransactions.filter(t => t.date === selectedDate);
      displayDailyRecap(selectedDate, transactions);
  } else {
      // Jika tanggal lalu, ambil data baru dari Firebase
      try {
          const snapshot = await transactionsRef.where("date", "==", selectedDate).get();
          snapshot.forEach(doc => {
              transactions.push({ docId: doc.id, ...doc.data() });
          });
          displayDailyRecap(selectedDate, transactions);
      } catch (error) {
          console.error("Error fetching daily recap: ", error);
          alert("Gagal memuat rekap harian.");
      }
  }
}

function clearDailyRecap() { /* ... (sama seperti sebelumnya) ... */ }
function displayDailyRecap(date, transactions) { /* ... (sama seperti sebelumnya) ... */ }

// =============================
// Delete transaction function (Firebase)
// =============================
async function deleteTransaction(docId, transactionId) {
  // transactionId hanya untuk konfirmasi, docId untuk delete
  if (!confirm('Apakah Anda yakin ingin menghapus transaksi ini? Tindakan ini tidak dapat dibatalkan.')) {
    return;
  }

  const transactionToDelete = localTransactions.find(t => t.docId === docId);

  if (transactionToDelete) {
      const transactionDetails = transactionToDelete.items.map(item =>
        `${item.name}: ${item.quantity} kg - Rp ${item.revenue.toLocaleString('id-ID')}`
      ).join('\n');
      const confirmMessage = `Menghapus transaksi pada ${transactionToDelete.time}:\n\n${transactionDetails}\n\nTotal: Rp ${transactionToDelete.totalRevenue.toLocaleString('id-ID')}\nLanjutkan menghapus?`;
      
      if (!confirm(confirmMessage)) return;
  }

  try {
    await transactionsRef.doc(docId).delete();
    alert('Transaksi berhasil dihapus!');
    // Tampilan akan update otomatis via listener jika itu transaksi hari ini
    // Untuk data lama, kita perlu re-fetch
    await loadAllTransactions();
    updateMonthlyReport();
    updateDailyRecap();
  } catch (error) {
    console.error("Error deleting transaction: ", error);
    alert("Gagal menghapus transaksi.");
  }
}

// =============================
// Utility functions (Firebase)
// =============================
async function deleteAllData() {
    if (!confirm('HAPUS SEMUA DATA TRANSAKSI? Tindakan ini tidak dapat dibatalkan!')) return;
    alert("Menghapus... Ini mungkin perlu waktu. Halaman akan dimuat ulang setelah selesai.");
    
    // Ini operasi berat, kita hapus satu per satu
    try {
        const snapshot = await transactionsRef.get();
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        
        // Hapus juga data gilingan & status
        const grindingSnapshot = await grindingRef.get();
        const grindingBatch = db.batch();
        grindingSnapshot.docs.forEach(doc => {
            grindingBatch.delete(doc.ref);
        });
        await grindingBatch.commit();
        
        await settingsRef.delete();

        alert('Semua data telah dihapus.');
        window.location.reload();
    } catch (error) {
        console.error("Error deleting all data: ", error);
        alert("Gagal menghapus semua data.");
    }
}

async function deleteMonthData() {
    const select = document.getElementById('month-select');
    const selectedMonth = select.value;
    if (!selectedMonth) {
        alert('Pilih bulan yang ingin dihapus datanya.');
        return;
    }
    if (!confirm(`HAPUS SEMUA DATA TRANSAKSI bulan ${selectedMonth}? Tindakan ini tidak dapat dibatalkan!`)) return;

    try {
        const [year, month] = selectedMonth.split('-');
        // Ambil data berdasarkan prefix (ini agak rumit di Firestore)
        // Kita harus query >= awal bulan DAN <= akhir bulan
        const startDate = `${selectedMonth}-01`;
        const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Hari terakhir bulan itu
        
        const snapshot = await transactionsRef.where("date", ">=", startDate).where("date", "<=", endDate).get();
        
        if (snapshot.empty) {
            alert("Tidak ada data untuk dihapus di bulan ini.");
            return;
        }

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        alert(`Data bulan ${selectedMonth} telah dihapus.`);
        await loadAllTransactions();
        listenTodayTransactions(); // Re-listen
        populateMonthSelector();
        updateMonthlyReport();
        updateDailyRecap();
    } catch (error) {
        console.error("Error deleting month data: ", error);
        alert("Gagal menghapus data bulan ini.");
    }
}

function deleteTodayData() {
    // Fungsi ini sekarang hanya sebagai alias untuk konfirmasi, 
    // karena listener real-time sudah menangani data hari ini.
    // Kita akan hapus semua dari cache lokal hari ini.
    const todayStr = new Date().toISOString().split('T')[0];
    const todayTransactions = localTransactions.filter(t => t.date === todayStr);

    if (todayTransactions.length === 0) {
        alert('Tidak ada transaksi hari ini untuk dihapus.');
        return;
    }
    const totalRevenue = todayTransactions.reduce((sum, t) => sum + t.totalRevenue, 0);
    const totalProfit = todayTransactions.reduce((sum, t) => sum + t.totalProfit, 0);

    const confirmMessage = `Menghapus SEMUA transaksi hari ini (${todayTransactions.length} transaksi)?\nTotal: Rp ${totalRevenue.toLocaleString('id-ID')}\nProfit: Rp ${totalProfit.toLocaleString('id-ID')}\n\nYakin?`;

    if (confirm(confirmMessage)) {
        alert("Menghapus data hari ini...");
        const deletePromises = todayTransactions.map(t => transactionsRef.doc(t.docId).delete());
        Promise.all(deletePromises)
            .then(() => {
                alert('Data hari ini berhasil dihapus.');
                // Tampilan akan update via listener
            })
            .catch(error => {
                console.error("Error deleting today's data: ", error);
                alert("Gagal menghapus data hari ini.");
            });
    }
}

function exportData() {
    // Export sekarang hanya mengekspor cache lokal
    const grindingData = localGrindingData;
    const transactions = localTransactions;
    const exportData = {
        transactions,
        grindingData,
        exportDate: new Date().toISOString()
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `toko-beras-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    alert('Data berhasil diexport!');
}

function formatCurrency(amount) {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

// =============================
// Perhitungan Pengeluaran Modal (dari data Firebase)
// =============================
// ... (Fungsi hitungPengeluaran, tambahPengeluaranHarian, tambahPengeluaranBulanan tetap sama) ...
function hitungPengeluaran(gabahKg) {
  let gabah = Number(gabahKg) || 0;
  let solarUnit = gabah / 100;
  let biayaSolar = solarUnit * 7000;
  let kwintal = gabah / 100;
  let biayaAir = kwintal * 6600;
  return {
    solar: Math.round(biayaSolar),
    air: Math.round(biayaAir),
    total: Math.round(biayaSolar + biayaAir),
  };
}

// Global untuk menyimpan data pengeluaran yang dihitung
let dailyExpenseData = {};
let monthlyExpenseData = {};

function renderPengeluaranHarian() {
  let tbody = document.querySelector("#today-expenses tbody");
  if (!tbody) return;
  tbody.innerHTML = '';
  
  const dateSelect = document.getElementById('expense-date-select');
  if (!dateSelect) return;
  const selectedDate = dateSelect.value;
  
  let dailyData = dailyExpenseData[selectedDate];
  const d = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

  if (!dailyData) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Tidak ada data</td></tr>';
    d('expense-daily-solar', '0');
    d('expense-daily-air', '0');
    d('expense-daily-total', '0');
    return;
  }

  let row = document.createElement("tr");
  row.innerHTML = `
    <td>${selectedDate}</td>
    <td>${Number(dailyData.gabah).toLocaleString()} Kg</td>
    <td>Rp ${Number(dailyData.solar).toLocaleString()}</td>
    <td>Rp ${Number(dailyData.air).toLocaleString()}</td>
    <td>Rp ${Number(dailyData.total).toLocaleString()}</td>
  `;
  tbody.appendChild(row);

  d('expense-daily-solar', Number(dailyData.solar).toLocaleString());
  d('expense-daily-air', Number(dailyData.air).toLocaleString());
  d('expense-daily-total', Number(dailyData.total).toLocaleString());
}

function renderPengeluaranBulanan() {
  const select = document.getElementById('month-select-expense');
  if (!select) return;
  const selectedMonth = select.value;
  
  let monthlyData = monthlyExpenseData[selectedMonth];
  const d = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

  if (!monthlyData) {
    d('expense-monthly-gabah', '0');
    d('expense-monthly-solar', '0');
    d('expense-monthly-air', '0');
    d('expense-monthly-total', '0');
    return;
  }

  d('expense-monthly-gabah', Number(monthlyData.gabah).toLocaleString());
  d('expense-monthly-solar', Number(monthlyData.solar).toLocaleString());
  d('expense-monthly-air', Number(monthlyData.air).toLocaleString());
  d('expense-monthly-total', Number(monthlyData.total).toLocaleString());
}

function populateExpenseMonthSelector() {
  const months = new Set(Object.keys(monthlyExpenseData));
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  months.add(currentMonth);

  const select = document.getElementById('month-select-expense');
  if (!select) return;
  select.innerHTML = '<option value="">Pilih Bulan</option>';
  const sortedMonths = Array.from(months).sort().reverse();
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  sortedMonths.forEach(monthYear => {
    const [year, month] = monthYear.split('-');
    const option = document.createElement('option');
    option.value = monthYear;
    option.textContent = `${monthNames[parseInt(month) - 1]} ${year}`;
    select.appendChild(option);
  });
  select.value = currentMonth;
}

function initializeExpenseDateSelector() {
    const dateSelect = document.getElementById('expense-date-select');
    if (!dateSelect) return;
    const today = new Date().toISOString().split('T')[0];
    dateSelect.value = today;
    dateSelect.max = today;
}

function updateExpenseDaily() {
    renderPengeluaranHarian();
}

function updateExpenseMonthly() {
    renderPengeluaranBulanan();
}

// Fungsi ini sekarang menerima data gilingan sebagai argumen
function prosesPengeluaranDariGrinding(grindingData) {
  dailyExpenseData = {};
  monthlyExpenseData = {};

  grindingData.forEach((entry) => {
    let gabahKg = Number(entry.gabah || entry.grainAmount || 0);
    let tanggalIso = entry.tanggal; // Ambil dari data
    if (!tanggalIso) return; // Lewati jika tidak ada tanggal

    // Hitung harian
    const tanggal = tanggalIso.split('T')[0];
    let pengeluaran = hitungPengeluaran(gabahKg);
    if (!dailyExpenseData[tanggal]) {
      dailyExpenseData[tanggal] = { gabah: 0, solar: 0, air: 0, total: 0 };
    }
    dailyExpenseData[tanggal].gabah += gabahKg;
    dailyExpenseData[tanggal].solar += pengeluaran.solar;
    dailyExpenseData[tanggal].air += pengeluaran.air;
    dailyExpenseData[tanggal].total += pengeluaran.total;

    // Hitung bulanan
    const dt = new Date(tanggalIso);
    const bulanKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2,'0')}`;
    if (!monthlyExpenseData[bulanKey]) {
      monthlyExpenseData[bulanKey] = { gabah: 0, solar: 0, air: 0, total: 0 };
    }
    monthlyExpenseData[bulanKey].gabah += gabahKg;
    monthlyExpenseData[bulanKey].solar += pengeluaran.solar;
    monthlyExpenseData[bulanKey].air += pengeluaran.air;
    monthlyExpenseData[bulanKey].total += pengeluaran.total;
  });
}

// =============================
// Sinkronisasi helper
// =============================
function _syncExpensesFromInfoImpl(data = null) {
  const statusEl = document.getElementById('sync-status');
  if (statusEl) statusEl.textContent = 'Status: Menyinkronkan...';
  
  // Gunakan data yang di-pass dari listener jika ada, jika tidak, gunakan cache lokal
  const dataToProcess = data || localGrindingData;
  
  prosesPengeluaranDariGrinding(dataToProcess);
  
  // Refresh selector & tampilan
  populateExpenseMonthSelector();
  renderPengeluaranHarian();
  renderPengeluaranBulanan();
  
  if (statusEl) statusEl.textContent = 'Status: Sinkron berhasil';
}
window._syncExpensesFromInfoImpl = _syncExpensesFromInfoImpl;