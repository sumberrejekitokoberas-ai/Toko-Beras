import { db } from './firebase-config.js';
import { ref, onValue, set, push, remove, update } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

// Kredensial Admin (tetap di sisi klien, namun disarankan menggunakan Firebase Auth untuk keamanan lebih)
const adminCredentials = {
    email: 'sumberrejekitokoberas@gmail.com',
    password: 'sumberrejeki123' 
};

// Data Produk
const products = {
    bramo: { name: 'Bramo', sellPrice: 15500, buyPrice: 14500 },
    c4: { name: 'C4', sellPrice: 14500, buyPrice: 14000 },
    srinuk: { name: 'Srinuk/Mentik', sellPrice: 16000, buyPrice: 15000 },
    katul: { name: 'Katul', sellPrice: 4500, buyPrice: 0 },
    giling: { name: 'Ongkos Giling Padi', sellPrice: 400, buyPrice: 0 }
};


document.addEventListener('DOMContentLoaded', () => {
    const loginModal = document.getElementById('admin-login-modal');
    const dashboard = document.getElementById('admin-dashboard');
    const loginForm = document.getElementById('admin-login-form');
    const logoutBtn = document.getElementById('admin-logout-btn');

    // Cek status login dari sessionStorage
    if (sessionStorage.getItem('adminSession') === 'true') {
        showDashboard();
    }

    // Event listener untuk form login
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('admin-email').value;
        const password = document.getElementById('admin-password').value;

        if (email === adminCredentials.email && password === adminCredentials.password) {
            sessionStorage.setItem('adminSession', 'true');
            showDashboard();
        } else {
            alert('Email atau password yang Anda masukkan salah!');
        }
    });

    // Event listener untuk logout
    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('adminSession');
        loginModal.style.display = 'block';
        dashboard.style.display = 'none';
    });

    function showDashboard() {
        loginModal.style.display = 'none';
        dashboard.style.display = 'block';
        showAdminPage('informasi'); // Halaman default
        initializeAdminFeatures();
    }
    
    // Inisialisasi semua fitur admin saat dashboard tampil
    function initializeAdminFeatures() {
        // Event Listeners untuk semua tombol
        document.getElementById('change-status-btn').addEventListener('click', changeStoreStatus);
        document.getElementById('grinding-form').addEventListener('submit', handleAddGrinding);
        document.getElementById('clear-today-btn').addEventListener('click', clearTodayData);
        document.getElementById('date-select').addEventListener('change', updateDailyRecap);
        document.getElementById('month-select').addEventListener('change', updateMonthlyReport);

        // Memuat data awal dari Firebase
        loadAdminGrindingData();
        loadStoreStatus();
        loadTodayTransactions();
        populateMonthSelector();
        updateMonthlyReport();
        initializeDateSelector();
    }
});

// Navigasi Halaman Admin
window.showAdminPage = function(pageId) {
    document.querySelectorAll('#admin-dashboard .page').forEach(page => page.style.display = 'none');
    document.getElementById(pageId).style.display = 'block';
}

// Manajemen Status Toko
function loadStoreStatus() {
    const statusRef = ref(db, 'storeStatus');
    onValue(statusRef, (snapshot) => {
        const status = snapshot.val() || 'open';
        const statusEl = document.getElementById('store-status-info');
        if (statusEl) {
            statusEl.textContent = status === 'open' ? 'Buka' : 'Tutup';
            statusEl.className = `status-value ${status}`;
        }
    });
}

function changeStoreStatus() {
    const statusRef = ref(db, 'storeStatus');
    onValue(statusRef, (snapshot) => {
        const currentStatus = snapshot.val() || 'open';
        const newStatus = currentStatus === 'open' ? 'closed' : 'open';
        set(statusRef, newStatus)
            .then(() => alert(`Status toko berhasil diubah menjadi: ${newStatus === 'open' ? 'Buka' : 'Tutup'}`))
            .catch(error => console.error("Gagal mengubah status:", error));
    }, { onlyOnce: true }); // Hanya ambil sekali untuk mengubah
}

// Manajemen Gilingan
window.showAddGrindingForm = function() {
    document.getElementById('grinding-modal').style.display = 'block';
}

window.closeGrindingModal = function() {
    document.getElementById('grinding-modal').style.display = 'none';
    document.getElementById('grinding-form').reset();
}

function handleAddGrinding(e) {
    e.preventDefault();
    const newData = {
        clientName: document.getElementById('client-name').value,
        clientAddress: document.getElementById('client-address').value,
        grainAmount: parseFloat(document.getElementById('grain-amount').value),
        status: 'Belum digiling',
        deliveryTime: '',
        pickupTime: ''
    };
    
    const grindingRef = ref(db, 'grindingData');
    push(grindingRef, newData) // `push` akan membuat ID unik
        .then(() => closeGrindingModal())
        .catch(error => console.error("Gagal menambah data:", error));
}

function loadAdminGrindingData() {
    const grindingRef = ref(db, 'grindingData');
    onValue(grindingRef, (snapshot) => {
        const data = snapshot.val();
        const tbody = document.querySelector('#grinding-table-admin tbody');
        tbody.innerHTML = '';
        if (!data) return;

        let index = 1;
        for (const key in data) {
            const item = data[key];
            const cost = item.grainAmount * 400; // Harga giling per kg
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index++}</td>
                <td>${item.clientName}</td>
                <td>${item.clientAddress}</td>
                <td>${item.grainAmount} kg</td>
                <td>Rp ${cost.toLocaleString('id-ID')}</td>
                <td>
                    <select onchange="updateGrindingStatus('${key}', this.value)">
                        <option value="Belum digiling" ${item.status === 'Belum digiling' ? 'selected' : ''}>Belum digiling</option>
                        <option value="On proses" ${item.status === 'On proses' ? 'selected' : ''}>On proses</option>
                        <option value="Selesai" ${item.status === 'Selesai' ? 'selected' : ''}>Selesai</option>
                    </select>
                </td>
                <td>${item.deliveryTime || `<button class="action-btn" onclick="setDeliveryTime('${key}')">Antar</button>`}</td>
                <td>${item.pickupTime || `<button class="action-btn" onclick="setPickupTime('${key}')">Ambil</button>`}</td>
                <td><button class="action-btn danger" onclick="deleteGrindingData('${key}')">Hapus</button></td>
            `;
            tbody.appendChild(row);
        }
    });
}

window.updateGrindingStatus = function(key, newStatus) {
    const itemRef = ref(db, `grindingData/${key}`);
    update(itemRef, { status: newStatus });
}

window.setDeliveryTime = function(key) {
    const itemRef = ref(db, `grindingData/${key}`);
    const time = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
    update(itemRef, { deliveryTime: time });
}

window.setPickupTime = function(key) {
    const itemRef = ref(db, `grindingData/${key}`);
    const time = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
    update(itemRef, { pickupTime: time });
}

window.deleteGrindingData = function(key) {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    const itemRef = ref(db, `grindingData/${key}`);
    remove(itemRef);
}


// Fungsi Laporan dan Transaksi
function loadTodayTransactions() {
    const today = new Date().toISOString().split('T')[0];
    const transactionsRef = ref(db, `transactions/${today}`);
    
    onValue(transactionsRef, (snapshot) => {
        const transactions = snapshot.val();
        const tbody = document.querySelector('#today-transactions tbody');
        tbody.innerHTML = '';
        
        let dailyRevenue = 0;
        let dailyProfit = 0;

        if (transactions) {
            for (const key in transactions) {
                const transaction = transactions[key];
                transaction.items.forEach(item => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${transaction.time}</td>
                        <td>${item.name}</td>
                        <td>${item.quantity} kg</td>
                        <td>Rp ${item.sellPrice.toLocaleString('id-ID')}</td>
                        <td>Rp ${item.revenue.toLocaleString('id-ID')}</td>
                        <td>Rp ${item.profit.toLocaleString('id-ID')}</td>
                        <td><button onclick="deleteTransaction('${today}', '${key}')" class="delete-btn">Hapus</button></td>
                    `;
                    tbody.appendChild(row);
                });
                dailyRevenue += transaction.totalRevenue;
                dailyProfit += transaction.totalProfit;
            }
        }

        document.getElementById('daily-revenue').textContent = dailyRevenue.toLocaleString('id-ID');
        document.getElementById('daily-profit').textContent = dailyProfit.toLocaleString('id-ID');
        updateDailyRecap(); // Update rekap setiap ada perubahan
    });
}

window.deleteTransaction = function(dateKey, timeKey) {
    if (!confirm('Anda yakin ingin menghapus transaksi ini? Tindakan ini tidak dapat dibatalkan.')) return;
    const transactionRef = ref(db, `transactions/${dateKey}/${timeKey}`);
    remove(transactionRef);
}

function clearTodayData() {
    const today = new Date().toISOString().split('T')[0];
    if (confirm(`PERINGATAN: Anda akan menghapus semua data transaksi untuk tanggal ${today}. Apakah Anda yakin?`)) {
        const todayTransactionsRef = ref(db, `transactions/${today}`);
        remove(todayTransactionsRef)
            .then(() => alert('Semua data transaksi hari ini berhasil dihapus.'))
            .catch(error => console.error('Gagal menghapus data:', error));
    }
}

// Fungsi Rekap Harian dan Bulanan (memerlukan logika lebih kompleks untuk membaca semua data)
function initializeDateSelector() {
    const dateSelect = document.getElementById('date-select');
    dateSelect.value = new Date().toISOString().split('T')[0];
    updateDailyRecap();
}

function updateDailyRecap() {
    const selectedDate = document.getElementById('date-select').value;
    document.getElementById('selected-date').textContent = selectedDate;
    const recapRef = ref(db, `transactions/${selectedDate}`);

    onValue(recapRef, (snapshot) => {
        const data = snapshot.val();
        let totalRevenue = 0, totalProfit = 0, transactionCount = 0;
        const productBreakdown = {};

        if (data) {
            transactionCount = Object.keys(data).length;
            for (const key in data) {
                const trx = data[key];
                totalRevenue += trx.totalRevenue;
                totalProfit += trx.totalProfit;

                trx.items.forEach(item => {
                    if (!productBreakdown[item.productId]) {
                        productBreakdown[item.productId] = { name: item.name, qty: 0, revenue: 0, profit: 0 };
                    }
                    productBreakdown[item.productId].qty += item.quantity;
                    productBreakdown[item.productId].revenue += item.revenue;
                    productBreakdown[item.productId].profit += item.profit;
                });
            }
        }
        
        document.getElementById('recap-revenue').textContent = totalRevenue.toLocaleString('id-ID');
        document.getElementById('recap-profit').textContent = totalProfit.toLocaleString('id-ID');
        document.getElementById('recap-transactions').textContent = transactionCount;

        const breakdownTbody = document.getElementById('daily-breakdown').querySelector('tbody');
        breakdownTbody.innerHTML = '';
        for (const pid in productBreakdown) {
            const p = productBreakdown[pid];
            const avgPrice = p.qty > 0 ? (p.revenue / p.qty) : 0;
            const row = `
                <tr>
                    <td>${p.name}</td>
                    <td>${p.qty} kg</td>
                    <td>Rp ${p.revenue.toLocaleString('id-ID')}</td>
                    <td>Rp ${p.profit.toLocaleString('id-ID')}</td>
                    <td>Rp ${avgPrice.toLocaleString('id-ID')}</td>
                </tr>
            `;
            breakdownTbody.innerHTML += row;
        }
    });
}

function populateMonthSelector() {
    const monthSelect = document.getElementById('month-select');
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const currentYear = new Date().getFullYear();
    monthSelect.innerHTML = '';
    for (let i = 0; i < 12; i++) {
        const monthValue = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
        const option = new Option(`${months[i]} ${currentYear}`, monthValue);
        monthSelect.add(option);
    }
    monthSelect.value = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
}

function updateMonthlyReport() {
    const selectedMonth = document.getElementById('month-select').value; // e.g., "2025-10"
    const transactionsRef = ref(db, 'transactions');

    onValue(transactionsRef, (snapshot) => {
        const allTransactions = snapshot.val();
        let totalRevenue = 0, totalProfit = 0, transactionCount = 0;

        if (allTransactions) {
            for (const dateKey in allTransactions) {
                if (dateKey.startsWith(selectedMonth)) {
                    const dailyData = allTransactions[dateKey];
                    for (const timeKey in dailyData) {
                        const trx = dailyData[timeKey];
                        totalRevenue += trx.totalRevenue;
                        totalProfit += trx.totalProfit;
                        transactionCount++;
                    }
                }
            }
        }

        document.getElementById('monthly-revenue').textContent = totalRevenue.toLocaleString('id-ID');
        document.getElementById('monthly-profit').textContent = totalProfit.toLocaleString('id-ID');
        document.getElementById('monthly-transactions').textContent = transactionCount;
    }, { onlyOnce: true }); // Dijalankan sekali saja saat bulan diganti
}