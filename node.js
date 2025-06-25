// README.md (Panduan Penyiapan Backend Node.js di Replit dengan AstraDB)
//
// 1. **Buat proyek Node.js baru di Replit:**
//    - Buka Replit.com dan login.
//    - Klik "+ Create Repl".
//    - Pilih template `Node.js`.
//    - Beri nama Repl Anda (misalnya, `ton-miner-backend`).
//    - Klik "Create Repl".
//
// 2. **Instal dependencies:**
//    - Di dalam Repl, buka tab `Shell`.
//    - Jalankan perintah berikut:
//      npm install express axios cors dotenv
//      (Tidak perlu `mongoose` karena kita akan pakai Data API AstraDB dengan `axios`)
//
// 3. **Konfigurasi Environment Variables (Secrets) di Replit:**
//    - Klik ikon gembok (`Secrets`) di panel kiri Replit.
//    - Tambahkan secrets berikut:
//      - Key: `ASTRA_DB_APPLICATION_TOKEN`
//        Value: `AstraCS:QxWehgvtOnQTLMfeGIWSGkDf:3151179e38d346b27c441219d805fce6c7c8a36aec064a9fb17d1bfaed02ddd9` (gunakan token Anda)
//      - Key: `ASTRA_DB_API_ENDPOINT`
//        Value: `https://882ae8b6-4e65-453b-89d1-81464910b382-us-east-2.apps.astra.datastax.com` (gunakan endpoint Anda)
//      - Key: `TON_API_ENDPOINT` (Opsional, untuk verifikasi TX nyata)
//        Value: `https://toncenter.com/api/v2/` (atau API TON lainnya seperti Blockchair, untuk verifikasi TX)
//
// 4. **Buat file `index.js` (atau `server.js`) dan tempelkan kode di bawah ini.**
//    Replit secara default menjalankan `index.js`.
//
// 5. **Jalankan server:**
//    - Klik tombol "Run" di Replit atau jalankan `node index.js` di Shell.
//    - URL publik backend Anda akan muncul di jendela output Replit (misalnya, `https://ton-miner-backend.username.replit.app`).
//    - **Gunakan URL ini untuk `API_BASE_URL` di proyek Frontend React Anda.**

// index.js (atau server.js)
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config(); // Untuk memuat variabel lingkungan dari file .env

const app = express();
const port = process.env.PORT || 3001;

// --- KONFIGURASI ASTRADB ---
const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN;
const ASTRA_DB_API_ENDPOINT = process.env.ASTRA_DB_API_ENDPOINT;
const COLLECTION_NAME = 'users'; // Nama koleksi di AstraDB

if (!ASTRA_DB_APPLICATION_TOKEN || !ASTRA_DB_API_ENDPOINT) {
  console.error('Error: ASTRA_DB_APPLICATION_TOKEN atau ASTRA_DB_API_ENDPOINT tidak disetel.');
  process.exit(1);
}

// Konfigurasi Axios untuk AstraDB
const astraDbAxios = axios.create({
  baseURL: `${ASTRA_DB_API_ENDPOINT}/api/rest/v2/namespaces/default_keyspace/collections/${COLLECTION_NAME}`, // Ganti default_keyspace jika Anda punya keyspace lain
  headers: {
    'X-Cassandra-Token': ASTRA_DB_APPLICATION_TOKEN,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});
// --- AKHIR KONFIGURASI ASTRADB ---

// --- KONFIGURASI TON API (Opsional untuk Verifikasi TX Nyata) ---
const TON_API_ENDPOINT = process.env.TON_API_ENDPOINT || 'https://toncenter.com/api/v2/';
// --- AKHIR KONFIGURASI TON API ---

// Middleware
app.use(cors()); // Izinkan semua origin (untuk development). Batasi ini di produksi!
app.use(express.json()); // Untuk parsing body JSON

// --- Fungsi utilitas untuk menghitung pendapatan pasif ---
const calculatePassiveEarnings = (user) => {
    const now = Date.now();
    // Pastikan user.lastOnlineTime adalah angka (timestamp)
    const lastOnline = typeof user.lastOnlineTime === 'number' ? user.lastOnlineTime : now;
    const offlineDuration = (now - lastOnline) / 1000; // dalam detik
    // Pastikan user.passiveRate adalah angka
    const passiveRate = typeof user.passiveRate === 'number' ? user.passiveRate : 0;
    return offlineDuration > 0 ? Math.floor(offlineDuration * passiveRate) : 0;
};

// --- Rute API ---

// 1. Mendapatkan data pengguna
app.get('/api/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const response = await astraDbAxios.get(`/${userId}`); // Ambil berdasarkan ID dokumen (userId)
    let user = response.data;

    if (!user) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }

    // Hitung passive earnings saat mengambil data
    const earnedOffline = calculatePassiveEarnings(user);
    user.coins = parseFloat(user.coins) + earnedOffline; // Pastikan koin adalah float
    user.lastOnlineTime = Date.now(); // Perbarui waktu online terakhir

    // Perbarui di AstraDB
    await astraDbAxios.put(`/${userId}`, {
        coins: user.coins,
        lastOnlineTime: user.lastOnlineTime
    });

    res.json(user);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }
    console.error('Error saat mengambil data pengguna dari AstraDB:', error.response?.data || error.message);
    res.status(500).json({ message: 'Terjadi kesalahan server saat memuat pengguna' });
  }
});

// 2. Membuat pengguna baru
app.post('/api/user', async (req, res) => {
    try {
        const { id, username } = req.body;
        // Cek apakah pengguna sudah ada
        try {
            const existingUser = await astraDbAxios.get(`/${id}`);
            if (existingUser.data) {
                return res.status(200).json(existingUser.data);
            }
        } catch (checkError) {
            // Jika 404, berarti tidak ada, lanjutkan membuat baru
            if (checkError.response && checkError.response.status !== 404) {
                throw checkError; // Lempar error lain
            }
        }

        const newUser = {
            id: id,
            username: username,
            coins: 0.00000000,
            passiveRate: 0.00000000, // Dimulai dari 0
            lastOnlineTime: Date.now(),
            lastClaimedHourly: 0, // Inisialisasi agar bisa langsung klaim
            lastClaimedDailyBonus: 0, // Inisialisasi agar bisa langsung klaim
            isVIP: false,
            vipTier: 0, // VIP tier
            walletAddress: null,
            adCounter: 0,
        };
        await astraDbAxios.put(`/${id}`, newUser); // Gunakan PUT untuk create/replace
        res.status(201).json(newUser);
    } catch (error) {
        console.error('Error saat membuat pengguna di AstraDB:', error.response?.data || error.message);
        res.status(500).json({ message: 'Terjadi kesalahan server saat membuat pengguna' });
    }
});

// 3. Menyimpan data pengguna
app.post('/api/save-user-data', async (req, res) => {
  try {
    const { userId, coins, lastOnlineTime, lastClaimedHourly, lastClaimedDailyBonus, isVIP, vipTier, walletAddress, adCounter } = req.body;
    
    // Perbarui dokumen di AstraDB
    await astraDbAxios.put(`/${userId}`, { 
        coins: parseFloat(coins), // Pastikan disimpan sebagai float
        lastOnlineTime: lastOnlineTime,
        lastClaimedHourly: lastClaimedHourly,
        lastClaimedDailyBonus: lastClaimedDailyBonus,
        isVIP: isVIP,
        vipTier: vipTier,
        walletAddress: walletAddress,
        adCounter: adCounter
    });
    res.json({ message: 'Data pengguna berhasil disimpan' });
  } catch (error) {
    console.error('Error saat menyimpan data pengguna ke AstraDB:', error.response?.data || error.message);
    res.status(500).json({ message: 'Terjadi kesalahan server saat menyimpan data' });
  }
});

// 4. Klaim koin per jam
app.post('/api/claim-hourly', async (req, res) => {
  try {
    const { userId } = req.body;
    const response = await astraDbAxios.get(`/${userId}`);
    let user = response.data;

    if (!user) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }

    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const HOURLY_MINE_AMOUNT = 0.0005300; // Define mining amount here as well for security

    if (now - user.lastClaimedHourly < oneHour) {
      return res.status(400).json({ message: 'Belum waktunya untuk mengklaim koin per jam.' });
    }

    const claimedCoins = HOURLY_MINE_AMOUNT;
    user.coins = parseFloat(user.coins) + claimedCoins;
    user.lastClaimedHourly = now;
    user.adCounter = parseInt(user.adCounter || 0) + 1; // Pastikan adCounter di parsing sebagai integer

    await astraDbAxios.put(`/${userId}`, {
        coins: user.coins,
        lastClaimedHourly: user.lastClaimedHourly,
        adCounter: user.adCounter
    });

    res.json({ message: 'Klaim berhasil', claimedCoins, user });
  } catch (error) {
    console.error('Error saat mengklaim koin per jam:', error.response?.data || error.message);
    res.status(500).json({ message: 'Terjadi kesalahan server saat klaim per jam' });
  }
});

// 5. Klaim bonus harian
app.post('/api/claim-daily-bonus', async (req, res) => {
  try {
    const { userId } = req.body;
    const response = await astraDbAxios.get(`/${userId}`);
    let user = response.data;

    if (!user) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }

    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const DAILY_BONUS_AMOUNT = 0.0010000; // Define bonus amount here as well for security

    if (now - user.lastClaimedDailyBonus < twentyFourHours) {
      return res.status(400).json({ message: 'Belum waktunya untuk mengklaim bonus harian.' });
    }

    const claimedCoins = DAILY_BONUS_AMOUNT;
    user.coins = parseFloat(user.coins) + claimedCoins;
    user.lastClaimedDailyBonus = now;
    user.adCounter = parseInt(user.adCounter || 0) + 2; // Klaim bonus harian 2x iklan

    await astraDbAxios.put(`/${userId}`, {
        coins: user.coins,
        lastClaimedDailyBonus: user.lastClaimedDailyBonus,
        adCounter: user.adCounter
    });

    res.json({ message: 'Bonus harian berhasil diklaim', claimedCoins, user });
  } catch (error) {
    console.error('Error saat mengklaim bonus harian:', error.response?.data || error.message);
    res.status(500).json({ message: 'Terjadi kesalahan server saat klaim harian' });
  }
});

// 6. Upgrade VIP
app.post('/api/upgrade-vip', async (req, res) => {
  try {
    const { userId, tier, transactionHash, cost } = req.body; // tier: 'vip1', 'vip2', 'vip3'
    const VIP_TIERS_COSTS = { vip1: 0.5, vip2: 1.0, vip3: 3.0 }; // Harga VIP di backend

    if (!VIP_TIERS_COSTS[tier] || cost !== VIP_TIERS_COSTS[tier]) {
        return res.status(400).json({ message: 'Tingkat VIP atau biaya tidak valid.' });
    }

    const response = await astraDbAxios.get(`/${userId}`);
    let user = response.data;

    if (!user) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }

    // Periksa apakah pengguna sudah memiliki level VIP yang sama atau lebih tinggi
    const currentVipTier = parseInt(user.vipTier || 0);
    const targetVipTier = parseInt(tier.replace('vip', ''));
    if (currentVipTier >= targetVipTier) {
      return res.status(400).json({ message: `Anda sudah menjadi ${tier} atau lebih tinggi.` });
    }

    // --- VERIFIKASI TRANSAKSI TON NYATA (PLACEHOLDER) ---
    // Di sini Anda akan menambahkan logika untuk memverifikasi transaksi
    // menggunakan Transaction Hash (TxID) yang diberikan.
    // Ini melibatkan:
    // 1. Memanggil TON API (misalnya Toncenter API) untuk mencari transaksiHash.
    // 2. Memeriksa apakah transaksi itu:
    //    - Berhasil.
    //    - Dikirim dari `user.walletAddress` (yang terhubung).
    //    - Dikirim ke `ADMIN_WALLET_FOR_VIP` (alamat dompet admin).
    //    - Dengan jumlah `cost` yang tepat (misalnya 0.5 TON untuk VIP 1).
    // Ini membutuhkan library TON seperti `ton` atau `tonweb` di backend.
    
    let isTransactionVerified = false;
    if (transactionHash && transactionHash.length > 10) { // Cek panjang hash minimal
        // --- SIMULASI VERIFIKASI (HAPUS INI UNTUK PRODUKSI) ---
        // Untuk demo, kita akan anggap hash yang tidak kosong adalah valid.
        // GANTI INI DENGAN LOGIKA VERIFIKASI TON API NYATA!
        console.log(`Simulasi verifikasi transaksi ${transactionHash} untuk ${cost} TON.`);
        isTransactionVerified = true; // Anggap berhasil untuk demo
        // --- AKHIR SIMULASI VERIFIKASI ---

        // Contoh kode untuk verifikasi nyata (membutuhkan library TON seperti @tonclient/core, axios):
        /*
        try {
            const txResponse = await axios.get(`${TON_API_ENDPOINT}/getTransactions?account=${user.walletAddress}&limit=10&lt=${transactionHash.split(':')[0]}`); // Contoh query
            const transaction = txResponse.data.result.find(tx => tx.hash === transactionHash && tx.in_msg.value === cost * 1e9); // Contoh
            if (transaction && transaction.out_msgs.some(msg => msg.destination === 'ADMIN_WALLET_FOR_VIP')) {
                isTransactionVerified = true;
            }
        } catch (tonApiError) {
            console.error("Error verifying TON transaction:", tonApiError.response?.data || tonApiError.message);
        }
        */
    }

    if (!isTransactionVerified) {
        return res.status(400).json({ message: 'Verifikasi transaksi gagal. Harap pastikan hash benar, jumlah dan alamat pengirim/penerima tepat.' });
    }
    // --- AKHIR VERIFIKASI TRANSAKSI TON NYATA (PLACEHOLDER) ---

    user.isVIP = true;
    user.vipTier = targetVipTier;
    // Tingkatkan passiveRate atau berikan bonus lainnya setelah upgrade
    user.passiveRate = parseFloat(user.passiveRate) + (0.00000010 * targetVipTier); // Contoh
    user.miningRate = parseInt(user.miningRate) + (100 * targetVipTier); // Contoh
    
    await astraDbAxios.put(`/${userId}`, {
        isVIP: user.isVIP,
        vipTier: user.vipTier,
        passiveRate: user.passiveRate,
        miningRate: user.miningRate
    });

    res.json({ message: 'Upgrade VIP berhasil', user });
  } catch (error) {
    console.error('Error saat upgrade VIP:', error.response?.data || error.message);
    res.status(500).json({ message: 'Terjadi kesalahan server saat upgrade VIP' });
  }
});

// 7. Withdraw (Penarikan)
app.post('/api/withdraw', async (req, res) => {
  try {
    const { userId, amount, walletAddress } = req.body;
    const response = await astraDbAxios.get(`/${userId}`);
    let user = response.data;

    if (!user) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }

    const MINIMUM_WITHDRAW = 0.05; // Definisi minimum withdraw di backend

    if (parseFloat(user.coins) < amount) {
      return res.status(400).json({ message: 'Saldo tidak cukup untuk penarikan' });
    }
    if (amount < MINIMUM_WITHDRAW) {
      return res.status(400).json({ message: `Jumlah penarikan minimal ${MINIMUM_WITHDRAW} TON.` });
    }
    if (!user.walletAddress || user.walletAddress !== walletAddress) {
      return res.status(400).json({ message: 'Alamat dompet tidak valid atau tidak terhubung' });
    }

    // --- LOGIKA PENGIRIMAN TON NYATA (PLACEHOLDER) ---
    // Bagian ini sangat KRITIS dan kompleks. Ini melibatkan:
    // 1. Menginstal TON SDK (misalnya `@ton/ton`, `tonweb`).
    // 2. Memuat private key dompet pengirim (bot/admin) secara aman.
    // 3. Membuat dan menandatangani transaksi TON.
    // 4. Mengirim transaksi ke jaringan TON.
    // Ini harus ditangani dengan sangat aman (misalnya, menggunakan vault rahasia untuk private key).
    
    let isTonSentSuccessfully = false;
    // --- SIMULASI PENGIRIMAN TON (HAPUS INI UNTUK PRODUKSI) ---
    console.log(`Simulasi pengiriman ${amount} TON ke ${walletAddress} dari ${userId}`);
    // Di produksi, ini akan menunggu konfirmasi transaksi di blockchain.
    isTonSentSuccessfully = true; // Anggap berhasil untuk demo
    // --- AKHIR SIMULASI PENGIRIMAN TON ---

    if (!isTonSentSuccessfully) {
        return res.status(500).json({ message: 'Pengiriman TON gagal. Silakan coba lagi.' });
    }

    // Kurangi saldo koin setelah pengiriman berhasil
    user.coins = parseFloat(user.coins) - amount; 
    await astraDbAxios.put(`/${userId}`, {
        coins: user.coins
    });

    res.json({ message: 'Permintaan penarikan diproses', user });
  } catch (error) {
    console.error('Error saat penarikan:', error.response?.data || error.message);
    res.status(500).json({ message: 'Terjadi kesalahan server saat penarikan' });
  }
});

// 8. Update Wallet Address
app.post('/api/update-wallet', async (req, res) => {
  try {
    const { userId, walletAddress } = req.body;
    const response = await astraDbAxios.get(`/${userId}`);
    let user = response.data;
    
    if (!user) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }

    await astraDbAxios.put(`/${userId}`, { walletAddress: walletAddress });
    user.walletAddress = walletAddress; // Perbarui objek user lokal
    res.json({ message: 'Alamat dompet berhasil diperbarui', user });
  } catch (error) {
    console.error('Error memperbarui alamat dompet di AstraDB:', error.response?.data || error.message);
    res.status(500).json({ message: 'Terjadi kesalahan server saat memperbarui dompet' });
  }
});


// Mulai server mendengarkan di port yang ditentukan
app.listen(port, () => {
  console.log(`Server backend berjalan di http://localhost:${port}`);
});
