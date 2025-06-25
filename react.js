// README.md (Panduan Penyiapan Frontend React di Replit)
//
// 1. **Buat proyek React baru di Replit:**
//    - Buka Replit.com dan login.
//    - Klik "+ Create Repl".
//    - Pilih template `React.js`.
//    - Beri nama Repl Anda (misalnya, `ton-miner-frontend`).
//    - Klik "Create Repl".
//
// 2. **Instal dependencies:**
//    - Di dalam Repl, buka tab `Shell`.
//    - Jalankan perintah berikut:
//      npm install axios @tonconnect/ui-react tailwindcss postcss autoprefixer
//
// 3. **Inisialisasi Tailwind CSS:**
//    - Di tab `Shell`, jalankan:
//      npx tailwindcss init -p
//
// 4. **Konfigurasi `tailwind.config.js`:**
//    - Buka file `tailwind.config.js` di editor.
//    - Ganti isinya dengan kode berikut:
//      module.exports = {
//        content: [
//          "./src/**/*.{js,jsx,ts,tsx}",
//          "./public/index.html" // Tambahkan ini jika ada elemen HTML di public/index.html yang menggunakan Tailwind
//        ],
//        theme: {
//          extend: {},
//        },
//        plugins: [],
//      }
//
// 5. **Tambahkan direktif Tailwind ke `src/index.css`:**
//    - Buka file `src/index.css`.
//    - Ganti isinya dengan kode berikut:
//      @tailwind base;
//      @tailwind components;
//      @tailwind utilities;
//
//      /* Tambahan CSS untuk animasi koin */
//      @keyframes fade-out {
//        0% {
//          opacity: 1;
//          transform: translate(-50%, -50%) translateY(0);
//        }
//        100% {
//          opacity: 0;
//          transform: translate(-50%, -50%) translateY(-20px);
//        }
//      }
//      .animate-fade-out {
//        animation: fade-out 0.5s ease-out forwards;
//      }
//      .loading-screen {
//          display: flex;
//          justify-content: center;
//          align-items: center;
//          min-height: 100vh;
//          background-color: #1a202c; /* Warna latar belakang umum */
//          color: white;
//          font-size: 2rem;
//          font-weight: bold;
//      }
//      /* Atur font Inter */
//      body {
//        font-family: 'Inter', sans-serif;
//      }
//
// 6. **Tambahkan Script Monetag ke `public/index.html`:**
//    - Buka file `public/index.html`.
//    - Temukan tag `<head>`.
//    - Tempelkan script Monetag Anda tepat di bawah tag `<title>` atau di bagian `<head>` lainnya:
//      <script src='//libtl.com/sdk.js' data-zone='9472416' data-sdk='show_9472416'></script>
//
// 7. **Ganti isi `src/App.js` dan `src/index.js` dengan kode di bawah ini.**
//
// 8. **PENTING: Konfigurasi URL dan Alamat:**
//    - GANTI `API_BASE_URL` di `src/App.js` dengan URL publik backend Replit Anda.
//      (Setelah Anda menjalankan Repl backend, URL akan muncul di jendela output Replit, contoh: `https://your-backend-repl-name.username.replit.app/api`)
//    - GANTI `BOT_SHARE_URL` di `src/App.js` dengan URL bot Telegram Anda (`http://t.me/Game4ndroidBot`).
//    - GANTI `ADMIN_WALLET_FOR_VIP` di `src/App.js` dengan alamat dompet admin Anda (`UQDJ8EzagnREByZ-6dimfwRc7pBZJxCozZjzJeHYnlwUIGUj`).
//    - GANTI `manifestUrl` di `src/index.js` dengan URL manifest TON Connect Anda. Anda bisa membuat file `tonconnect-manifest.json` di folder `public` Anda, atau menggunakan contoh yang tersedia (misalnya, dari GitHub TON Connect).
//
// 9. **Jalankan aplikasi:**
//    - Klik tombol "Run" di Replit.
//    - URL Mini App Anda akan muncul di jendela output Replit (misalnya, `https://ton-miner-frontend.username.replit.app`). Ini adalah `LINK_WEB` Anda.

// src/App.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TonConnectButton, useTonConnectUI } from '@tonconnect/ui-react';
import axios from 'axios';

// --- KONFIGURASI PENTING ---
// GANTI dengan URL publik backend Replit Anda!
const API_BASE_URL = 'https://882ae8b6-4e65-453b-89d1-81464910b382-us-east-2.apps.astra.datastax.com'; 

// GANTI dengan username bot Telegram Anda untuk fitur share
const BOT_SHARE_URL = 'http://t.me/Game4ndroidBot'; 

// GANTI dengan alamat dompet admin untuk pembayaran VIP
const ADMIN_WALLET_FOR_VIP = 'UQDJ8EzagnREByZ-6dimfwRc7pBZJxCozZjzJeHYnlwUIGUj'; 
// --- AKHIR KONFIGURASI PENTING ---

// Tarif Mining dan Bonus
const HOURLY_MINE_AMOUNT = 0.0005300; // TON per klaim jam
const DAILY_BONUS_AMOUNT = 0.0010000; // TON per klaim harian
const MINIMUM_WITHDRAW = 0.05; // TON
const VIP_TIERS = {
  vip1: { cost: 0.5, name: 'VIP 1' },
  vip2: { cost: 1, name: 'VIP 2' },
  vip3: { cost: 3, name: 'VIP 3' },
};

function App() {
  const [tonConnectUI] = useTonConnectUI();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adCounter, setAdCounter] = useState(0); // Counter untuk iklan
  const [showMonetagPopup, setShowMonetagPopup] = useState(false);
  const [adCallbackQueue, setAdCallbackQueue] = useState([]); // Antrian callback iklan
  const [showVipModal, setShowVipModal] = useState(false);
  const [vipUpgradeTier, setVipUpgradeTier] = useState(null);
  const [transactionHashInput, setTransactionHashInput] = useState('');
  const [notification, setNotification] = useState({ message: '', type: '' });

  // Timers untuk mining per jam dan bonus harian
  const hourlyTimerRef = useRef(null);
  const dailyBonusTimerRef = useRef(null);

  // --- Fungsi Notifikasi Kustom ---
  const showNotification = useCallback((message, type = 'info', duration = 3000) => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), duration);
  }, []);

  // --- Fungsi Monetag Ads ---
  const showMonetagInterstitialAd = useCallback(() => {
    return new Promise((resolve, reject) => {
      // Tambahkan ke antrian jika ada iklan yang sudah berjalan
      setAdCallbackQueue(prevQueue => [...prevQueue, resolve]);

      // Jika tidak ada iklan yang sedang berjalan, tampilkan yang pertama
      if (!showMonetagPopup) {
        setShowMonetagPopup(true);
        // Panggil script Monetag Anda di sini
        // Pastikan `show_9472416` tersedia secara global setelah script Monetag dimuat di index.html
        if (typeof window.show_9472416 === 'function') {
          console.log("Memanggil iklan Monetag Interstitial...");
          window.show_9472416().then(() => {
            console.log("Monetag Ad Interstitial selesai.");
            // Iklan selesai, panggil callback pertama di antrian
            const nextCallback = adCallbackQueue[0];
            if (nextCallback) {
              nextCallback();
              setAdCallbackQueue(prevQueue => prevQueue.slice(1));
            }
            setShowMonetagPopup(false);
          }).catch(e => {
            console.error("Monetag Ad Interstitial Error:", e);
            showNotification("Gagal memuat iklan. Silakan coba lagi.", "error");
            // Selesaikan promise meskipun ada error agar aplikasi tidak stuck
            const nextCallback = adCallbackQueue[0];
            if (nextCallback) {
              nextCallback();
              setAdCallbackQueue(prevQueue => prevQueue.slice(1));
            }
            setShowMonetagPopup(false);
            reject(e);
          });
        } else {
          console.warn("Monetag SDK (show_9472416) belum dimuat. Mensimulasikan iklan.");
          // Simulasi jika SDK belum dimuat
          setTimeout(() => {
            console.log("Simulasi iklan Monetag Interstitial selesai.");
            const nextCallback = adCallbackQueue[0];
            if (nextCallback) {
              nextCallback();
              setAdCallbackQueue(prevQueue => prevQueue.slice(1));
            }
            setShowMonetagPopup(false);
            resolve();
          }, 2000); // Simulasi tampilan iklan selama 2 detik
        }
      }
    });
  }, [showMonetagPopup, adCallbackQueue, showNotification]);

  // --- Fungsi Telegram WebApp Utils ---
  const showTelegramPopup = useCallback((title, message) => {
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.showPopup({
        title: title,
        message: message,
        buttons: [{ id: 'ok', type: 'ok' }]
      });
    } else {
      alert(`${title}\n${message}`); // Fallback untuk dev di luar Telegram
    }
  }, []);

  const openTelegramShare = useCallback((text, url = BOT_SHARE_URL) => {
    if (window.Telegram && window.Telegram.WebApp) {
      const shareLink = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
      window.Telegram.WebApp.openTelegramLink(shareLink);
    } else {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
      console.warn("Fitur berbagi bekerja paling baik di dalam Telegram.");
    }
  }, []);
  // --- Akhir Fungsi Telegram WebApp Utils ---

  // --- Data Pengguna & Sync Backend ---
  const fetchUserData = useCallback(async (userId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/user/${userId}`);
      setUser(response.data);
      setAdCounter(response.data.adCounter || 0); // Muat adCounter
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log("Pengguna tidak ditemukan, membuat pengguna baru...");
        const initData = window.Telegram.WebApp.initDataUnsafe;
        const newUserResponse = await axios.post(`${API_BASE_URL}/api/user`, {
          id: userId,
          username: initData.user?.username || `user_${userId}`
        });
        setUser(newUserResponse.data);
        setAdCounter(newUserResponse.data.adCounter || 0);
        return newUserResponse.data;
      } else {
        console.error("Error saat mengambil data pengguna:", error);
        showTelegramPopup("Error", "Gagal memuat data pengguna. Silakan coba lagi.");
        return null;
      }
    } finally {
      setIsLoading(false);
    }
  }, [showTelegramPopup]);

  const saveUserData = useCallback(async () => {
    if (user && window.Telegram && window.Telegram.WebApp && !isLoading) {
      try {
        const payload = {
          userId: user.id,
          coins: user.coins,
          lastOnlineTime: Date.now(),
          lastClaimedHourly: user.lastClaimedHourly,
          lastClaimedDailyBonus: user.lastClaimedDailyBonus,
          isVIP: user.isVIP,
          vipTier: user.vipTier, // Simpan VIP tier
          walletAddress: user.walletAddress,
          adCounter: adCounter // Simpan adCounter
        };
        await axios.post(`${API_BASE_URL}/api/save-user-data`, payload);
        console.log("Data pengguna berhasil disimpan.");
      } catch (error) {
        console.error("Error saat menyimpan data pengguna:", error);
      }
    }
  }, [user, isLoading, adCounter]);

  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();

      const initData = window.Telegram.WebApp.initDataUnsafe;
      const userId = initData.user?.id;

      if (userId) {
        fetchUserData(userId);
      } else {
        console.error("ID Pengguna Telegram tidak ditemukan. Harap buka melalui bot Telegram.");
        setIsLoading(false);
      }

      // Simpan data secara berkala
      const intervalId = setInterval(saveUserData, 10000); // Simpan setiap 10 detik

      // Simpan data sebelum menutup/mengubah viewport
      window.Telegram.WebApp.onEvent('mainButtonData', saveUserData);
      window.Telegram.WebApp.onEvent('viewportChanged', saveUserData);
      window.Telegram.WebApp.onEvent('popupClosed', saveUserData);

      return () => {
        clearInterval(intervalId);
        window.Telegram.WebApp.offEvent('mainButtonData', saveUserData);
        window.Telegram.WebApp.offEvent('viewportChanged', saveUserData);
        window.Telegram.WebApp.offEvent('popupClosed', saveUserData);
      };
    }
  }, [fetchUserData, saveUserData]);

  // Update passive earnings setiap detik di frontend saja
  useEffect(() => {
    if (user && !isLoading) {
      const passiveEarnInterval = setInterval(() => {
        setUser(prevUser => ({
          ...prevUser,
          coins: prevUser.coins + (prevUser.passiveRate || 0) // Pastikan passiveRate ada
        }));
      }, 1000);
      return () => clearInterval(passiveEarnInterval);
    }
  }, [user, isLoading]);
  // --- Akhir Data Pengguna & Sync Backend ---

  // --- Fungsionalitas Mining & Klaim ---
  const calculateTimeRemaining = (lastClaimed, intervalHours) => {
    if (!lastClaimed) return 0;
    const nextClaimTime = new Date(lastClaimed + intervalHours * 60 * 60 * 1000);
    const remaining = nextClaimTime.getTime() - Date.now();
    return Math.max(0, remaining);
  };

  const formatTime = (ms) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const startHourlyTimer = useCallback((lastClaimed) => {
    if (hourlyTimerRef.current) clearInterval(hourlyTimerRef.current);
    hourlyTimerRef.current = setInterval(() => {
      setUser(prevUser => {
        if (!prevUser) return prevUser; // Safety check
        const remaining = calculateTimeRemaining(prevUser.lastClaimedHourly, 1);
        if (remaining <= 0) {
          clearInterval(hourlyTimerRef.current);
          return { ...prevUser, canClaimHourly: true }; // Tambahkan state canClaimHourly
        }
        return { ...prevUser, canClaimHourly: false, hourlyRemainingTime: remaining }; // Update remaining time
      });
    }, 1000);
  }, []);

  const startDailyBonusTimer = useCallback((lastClaimed) => {
    if (dailyBonusTimerRef.current) clearInterval(dailyBonusTimerRef.current);
    dailyBonusTimerRef.current = setInterval(() => {
      setUser(prevUser => {
        if (!prevUser) return prevUser; // Safety check
        const remaining = calculateTimeRemaining(prevUser.lastClaimedDailyBonus, 24);
        if (remaining <= 0) {
          clearInterval(dailyBonusTimerRef.current);
          return { ...prevUser, canClaimDailyBonus: true }; // Tambahkan state canClaimDailyBonus
        }
        return { ...prevUser, canClaimDailyBonus: false, dailyBonusRemainingTime: remaining }; // Update remaining time
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (user) {
      startHourlyTimer(user.lastClaimedHourly);
      startDailyBonusTimer(user.lastClaimedDailyBonus);
    }
    // Clean up timers on component unmount
    return () => {
        if (hourlyTimerRef.current) clearInterval(hourlyTimerRef.current);
        if (dailyBonusTimerRef.current) clearInterval(dailyBonusTimerRef.current);
    };
  }, [user, startHourlyTimer, startDailyBonusTimer]);

  const handleClaimHourly = async () => {
    if (!user) return;
    const remainingTime = calculateTimeRemaining(user.lastClaimedHourly, 1);
    if (remainingTime > 0) {
        showTelegramPopup("Belum Waktunya", `Anda bisa klaim lagi dalam ${formatTime(remainingTime)}.`);
        return;
    }

    try {
        await showMonetagInterstitialAd(); // Tunggu iklan pertama selesai
        const response = await axios.post(`${API_BASE_URL}/api/claim-hourly`, { userId: user.id });
        setUser(response.data.user);
        setAdCounter(response.data.user.adCounter); // Update adCounter dari backend
        showNotification(`Anda mendapatkan ${response.data.claimedCoins.toFixed(8)} TON!`, "success");
        // startHourlyTimer(response.data.user.lastClaimedHourly); // Restart timer (otomatis di useEffect)
    } catch (error) {
        console.error("Error claiming hourly:", error);
        showNotification("Gagal mengklaim koin per jam. Silakan coba lagi.", "error");
    }
  };

  const handleClaimDailyBonus = async () => {
    if (!user) return;
    const remainingTime = calculateTimeRemaining(user.lastClaimedDailyBonus, 24);
    if (remainingTime > 0) {
        showTelegramPopup("Belum Waktunya", `Anda bisa klaim bonus harian lagi dalam ${formatTime(remainingTime)}.`);
        return;
    }

    try {
        await showMonetagInterstitialAd(); // Iklan pertama
        await showMonetagInterstitialAd(); // Iklan kedua
        const response = await axios.post(`${API_BASE_URL}/api/claim-daily-bonus`, { userId: user.id });
        setUser(response.data.user);
        setAdCounter(response.data.user.adCounter); // Update adCounter dari backend
        showNotification(`Bonus Harian Berhasil! Anda mendapatkan ${response.data.claimedCoins.toFixed(8)} TON!`, "success");
        // startDailyBonusTimer(response.data.user.lastClaimedDailyBonus); // Restart timer (otomatis di useEffect)
    } catch (error) {
        console.error("Error claiming daily bonus:", error);
        showNotification("Gagal mengklaim bonus harian. Silakan coba lagi.", "error");
    }
  };

  const handleTap = () => {
    // Tap hanya untuk feedback atau bonus sangat kecil (misalnya 0.00000001 TON)
    // Koin utama berasal dari klaim per jam/harian
    setUser(prevUser => ({
      ...prevUser,
      coins: prevUser.coins + (prevUser.isVIP ? 0.00000010 : 0.00000001) // VIP dapat bonus tap lebih banyak
    }));
  };
  // --- Akhir Fungsionalitas Mining & Klaim ---

  // --- Fungsionalitas Upgrade VIP ---
  const handleOpenVipModal = (tier) => {
    setVipUpgradeTier(tier);
    setShowVipModal(true);
    setTransactionHashInput(''); // Reset input hash
  };

  const handleCloseVipModal = () => {
    setShowVipModal(false);
    setVipUpgradeTier(null);
    setTransactionHashInput('');
  };

  const handleVerifyVipPayment = async () => {
    if (!user || !vipUpgradeTier || !transactionHashInput) {
      showNotification("Harap lengkapi semua bidang.", "error");
      return;
    }

    showNotification("Memverifikasi pembayaran...", "info", 5000);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/upgrade-vip`, {
        userId: user.id,
        tier: vipUpgradeTier,
        transactionHash: transactionHashInput,
        cost: VIP_TIERS[vipUpgradeTier].cost
      });
      setUser(response.data.user);
      showNotification(`Selamat! Anda telah menjadi ${VIP_TIERS[vipUpgradeTier].name}!`, "success");
      handleCloseVipModal();
    } catch (error) {
      console.error("Error upgrading VIP:", error);
      const errorMessage = error.response?.data?.message || "Gagal meng-upgrade VIP. Silakan coba lagi.";
      showNotification(`Error: ${errorMessage}`, "error");
    }
  };
  // --- Akhir Fungsionalitas Upgrade VIP ---

  // --- Fungsionalitas Withdraw ---
  const handleWithdraw = async () => {
    if (!user) return;
    if (!user.walletAddress) {
      showTelegramPopup("Dompet Belum Terhubung", "Harap hubungkan dompet TON Anda terlebih dahulu.");
      return;
    }

    if (user.coins < MINIMUM_WITHDRAW) {
      showTelegramPopup("Saldo Tidak Cukup", `Minimal penarikan adalah ${MINIMUM_WITHDRAW.toFixed(8)} TON.`);
      return;
    }

    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.showConfirm(
        `Anda yakin ingin menarik ${user.coins.toFixed(8)} TON ke dompet ${user.walletAddress}?`,
        async (confirmed) => {
          if (confirmed) {
            showNotification("Memproses penarikan...", "info", 5000);
            try {
              const response = await axios.post(`${API_BASE_URL}/api/withdraw`, {
                userId: user.id,
                amount: user.coins, // Tarik semua saldo yang tersedia
                walletAddress: user.walletAddress
              });
              setUser(response.data.user); // Update saldo setelah penarikan
              showNotification("Penarikan Berhasil", "Permintaan penarikan Anda telah diproses!");
            } catch (error) {
              console.error("Error during withdrawal:", error);
              const errorMessage = error.response?.data?.message || "Gagal memproses penarikan. Silakan coba lagi.";
              showNotification(`Error: ${errorMessage}`, "error");
            }
          }
        }
      );
    } else {
        const confirmed = window.confirm(`Anda yakin ingin menarik ${user.coins.toFixed(8)} TON ke dompet ${user.walletAddress}?`);
        if (confirmed) {
            console.log("Simulasi Penarikan Dikonfirmasi. Implementasi Backend diperlukan.");
            showNotification("Simulasi", "Penarikan dikonfirmasi (simulasi).", "info");
        }
    }
  };
  // --- Akhir Fungsionalitas Withdraw ---

  // --- Fungsionalitas Wallet Connect ---
  useEffect(() => {
    const updateWalletAddress = async () => {
      if (!user) return;

      const currentConnectedAddress = tonConnectUI.connected && tonConnectUI.account ? tonConnectUI.account.address : null;

      if (user.walletAddress !== currentConnectedAddress) {
        try {
          const response = await axios.post(`${API_BASE_URL}/api/update-wallet`, {
            userId: user.id,
            walletAddress: currentConnectedAddress
          });
          setUser(response.data.user);
          if (currentConnectedAddress) {
            showNotification("Dompet Terhubung", `Dompet Anda (${currentConnectedAddress.substring(0, 8)}...) berhasil terhubung!`, "success");
          } else {
            showNotification("Dompet Terputus", "Dompet Anda telah terputus.", "info");
          }
        } catch (error) {
          console.error("Error memperbarui alamat dompet:", error);
          showNotification("Error", "Gagal memperbarui alamat dompet di server.", "error");
        }
      }
    };

    // Panggil saat status koneksi TON Connect berubah atau user dimuat
    updateWalletAddress();
  }, [tonConnectUI.connected, tonConnectUI.account, user, showNotification]);
  // --- Akhir Fungsionalitas Wallet Connect ---

  if (isLoading) {
    return <div className="loading-screen">Memuat Aplikasi Penambangan TON...</div>;
  }

  if (!user) {
    return <div className="loading-screen text-red-500">Gagal memuat pengguna. Coba buka ulang bot Telegram.</div>;
  }

  return (
    <div className="App bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center p-4 font-inter relative">
      {/* Notifikasi */}
      {notification.message && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 p-3 rounded-lg shadow-lg z-50 transition-all duration-300 ${
          notification.type === 'success' ? 'bg-green-500' : notification.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Monetag Ad Popup (Simulasi) */}
      {showMonetagPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl text-center text-gray-900">
            <h2 className="text-2xl font-bold mb-4">Iklan Sedang Berjalan!</h2>
            <p className="mb-6">Ini adalah simulasi iklan dari Monetag. Di aplikasi nyata, iklan akan ditampilkan di sini.</p>
            <button
              onClick={() => {
                // Selesaikan promise pertama di antrian
                const nextCallback = adCallbackQueue[0];
                if (nextCallback) {
                  nextCallback();
                  setAdCallbackQueue(prevQueue => prevQueue.slice(1));
                }
                setShowMonetagPopup(false);
              }}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-200"
            >
              Tutup Iklan (Simulasi)
            </button>
          </div>
        </div>
      )}

      {/* VIP Upgrade Modal */}
      {showVipModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-lg shadow-xl text-center w-96 border border-purple-600">
            <h2 className="text-2xl font-bold mb-4 text-purple-400">Upgrade {VIP_TIERS[vipUpgradeTier]?.name}</h2>
            <p className="mb-4 text-gray-300">Untuk meng-upgrade ke {VIP_TIERS[vipUpgradeTier]?.name}, silakan kirim **{VIP_TIERS[vipUpgradeTier]?.cost.toFixed(2)} TON** ke alamat berikut:</p>
            <div className="bg-gray-700 p-3 rounded-md mb-4 break-all text-sm">
              <span className="font-mono text-yellow-300">{ADMIN_WALLET_FOR_VIP}</span>
            </div>
            <p className="mb-4 text-gray-300">Setelah pembayaran berhasil, masukkan **Transaction Hash (TxID)** Anda di bawah untuk verifikasi:</p>
            <input
              type="text"
              className="w-full p-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-blue-500 mb-4"
              placeholder="Masukkan Transaction Hash (TxID)"
              value={transactionHashInput}
              onChange={(e) => setTransactionHashInput(e.target.value)}
            />
            <div className="flex justify-around gap-4">
              <button
                onClick={handleVerifyVipPayment}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-200 flex-1"
              >
                Verifikasi Pembayaran
              </button>
              <button
                onClick={handleCloseVipModal}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-200 flex-1"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute top-4 right-4 z-10">
        <TonConnectButton />
      </div>

      <h1 className="text-4xl font-bold mb-6 text-center text-blue-400">TON Miner App</h1>

      <div className="text-center mb-8 bg-gray-800 p-6 rounded-xl shadow-lg w-full max-w-sm border border-blue-700">
        <p className="text-2xl text-gray-400">Koin Anda:</p>
        <p className="text-6xl font-extrabold text-yellow-400 select-none cursor-pointer" onClick={handleTap}>
          {user.coins.toFixed(8)} <span className="text-4xl">💎</span>
        </p>
        <p className="text-md text-gray-500 mt-2">ID Pengguna: {user.id}</p>
        {user.walletAddress && (
          <p className="text-sm text-gray-400 mt-1">Dompet: {user.walletAddress.substring(0, 10)}...{user.walletAddress.slice(-4)}</p>
        )}
         {user.vipTier > 0 && (
          <p className="text-lg font-semibold text-purple-400 mt-2">{VIP_TIERS[`vip${user.vipTier}`]?.name} Aktif!</p>
        )}
      </div>

      {/* Area Klaim dan Bonus */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 w-full max-w-xl">
        {/* Klaim Koin Per Jam */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-md flex flex-col items-center text-center border border-green-600">
          <h2 className="text-xl font-semibold mb-2 text-gray-300">Klaim Per Jam</h2>
          <p className="text-3xl text-green-400 mb-4">{HOURLY_MINE_AMOUNT.toFixed(8)} TON</p>
          <button
            onClick={handleClaimHourly}
            className={`w-full py-3 px-6 rounded-lg text-lg font-bold transition-all duration-200 ${
              user.hourlyRemainingTime <= 0
                ? 'bg-green-500 hover:bg-green-600 active:scale-95 shadow-lg'
                : 'bg-gray-700 cursor-not-allowed opacity-70'
            }`}
            disabled={user.hourlyRemainingTime > 0}
          >
            {user.hourlyRemainingTime <= 0 ? 'Klaim Sekarang!' : `Tunggu: ${formatTime(user.hourlyRemainingTime)}`}
          </button>
          <p className="text-sm text-gray-400 mt-2">(1x Iklan)</p>
        </div>

        {/* Klaim Bonus Harian */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-md flex flex-col items-center text-center border border-yellow-600">
          <h2 className="text-xl font-semibold mb-2 text-gray-300">Bonus Harian</h2>
          <p className="text-3xl text-yellow-400 mb-4">{DAILY_BONUS_AMOUNT.toFixed(8)} TON</p>
          <button
            onClick={handleClaimDailyBonus}
            className={`w-full py-3 px-6 rounded-lg text-lg font-bold transition-all duration-200 ${
              user.dailyBonusRemainingTime <= 0
                ? 'bg-yellow-500 hover:bg-yellow-600 active:scale-95 shadow-lg'
                : 'bg-gray-700 cursor-not-allowed opacity-70'
            }`}
            disabled={user.dailyBonusRemainingTime > 0}
          >
            {user.dailyBonusRemainingTime <= 0 ? 'Klaim Bonus Harian!' : `Tunggu: ${formatTime(user.dailyBonusRemainingTime)}`}
          </button>
          <p className="text-sm text-gray-400 mt-2">(2x Iklan)</p>
        </div>
      </div>

      {/* Bagian Upgrade & Lainnya */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8 w-full max-w-xl">
        {/* Upgrade VIP */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-md flex flex-col items-center text-center border border-purple-600">
          <h2 className="text-xl font-semibold mb-2 text-gray-300">Upgrade VIP</h2>
          <p className="text-2xl text-purple-400 mb-4">{user.vipTier > 0 ? `Level ${user.vipTier}` : 'Non-VIP'}</p>
          <button
            onClick={() => handleOpenVipModal('vip1')}
            className={`w-full py-3 px-6 rounded-lg text-lg font-bold transition-all duration-200 mb-2 ${
              user.vipTier >= 1
                ? 'bg-gray-700 cursor-not-allowed opacity-70'
                : 'bg-purple-600 hover:bg-purple-700 active:scale-95 shadow-md'
            }`}
            disabled={user.vipTier >= 1}
          >
            {user.vipTier >= 1 ? 'VIP 1 Aktif' : `Upgrade VIP 1 (${VIP_TIERS.vip1.cost.toFixed(2)} TON)`}
          </button>
          <button
            onClick={() => handleOpenVipModal('vip2')}
            className={`w-full py-3 px-6 rounded-lg text-lg font-bold transition-all duration-200 mb-2 ${
              user.vipTier >= 2
                ? 'bg-gray-700 cursor-not-allowed opacity-70'
                : 'bg-purple-600 hover:bg-purple-700 active:scale-95 shadow-md'
            }`}
            disabled={user.vipTier >= 2}
          >
            {user.vipTier >= 2 ? 'VIP 2 Aktif' : `Upgrade VIP 2 (${VIP_TIERS.vip2.cost.toFixed(2)} TON)`}
          </button>
          <button
            onClick={() => handleOpenVipModal('vip3')}
            className={`w-full py-3 px-6 rounded-lg text-lg font-bold transition-all duration-200 ${
              user.vipTier >= 3
                ? 'bg-gray-700 cursor-not-allowed opacity-70'
                : 'bg-purple-600 hover:bg-purple-700 active:scale-95 shadow-md'
            }`}
            disabled={user.vipTier >= 3}
          >
            {user.vipTier >= 3 ? 'VIP 3 Aktif' : `Upgrade VIP 3 (${VIP_TIERS.vip3.cost.toFixed(2)} TON)`}
          </button>
        </div>

        {/* Withdraw */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-md flex flex-col items-center text-center border border-orange-600">
          <h2 className="text-xl font-semibold mb-2 text-gray-300">Withdraw</h2>
          <p className="text-3xl text-orange-400 mb-4">Min: {MINIMUM_WITHDRAW.toFixed(8)} TON</p>
          <button
            onClick={handleWithdraw}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-lg text-lg transform transition-all duration-200 active:scale-95 shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            Tarik Koin
          </button>
        </div>

        {/* Share */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-md flex flex-col items-center text-center border border-blue-600">
          <h2 className="text-xl font-semibold mb-2 text-gray-300">Bagikan</h2>
          <p className="text-3xl text-blue-400 mb-4">Ajak Teman</p>
          <button
            onClick={() => openTelegramShare(`Saya menambang TON di TON Miner App! Bergabunglah sekarang dan mulai menambang!`, `${BOT_SHARE_URL}?startapp=referral_${user.id}`)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg transform transition-all duration-200 active:scale-95 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Bagikan ke Telegram
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-gray-500 text-sm">
        <p>&copy; 2025 TON Miner App. Powered by Telegram Mini Apps.</p>
        <p>Iklan ditampilkan: {adCounter}</p>
      </div>
    </div>
  );
}

export default App;

// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Untuk import Tailwind CSS
import App from './App';
import reportWebVitals from './reportWebVitals';

// Impor dan konfigurasi TON Connect Provider
import { TonConnectUIProvider } from '@tonconnect/ui-react';

// GANTI dengan URL manifest TON Connect Anda.
// Anda bisa membuat manifest.json sendiri di folder public Anda,
// atau gunakan contoh dari TON Connect Cloud.
// Contoh: https://raw.githubusercontent.com/ton-community/ton-wallet-test-app/main/public/tonconnect-manifest.json
const manifestUrl = 'https://raw.githubusercontent.com/ton-community/ton-wallet-test-app/main/public/tonconnect-manifest.json';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <App />
    </TonConnectUIProvider>
  </React.StrictMode>
);

reportWebVitals();

// src/index.css (sudah termasuk dalam README.md, diulang di sini untuk kelengkapan)
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Tambahan CSS untuk animasi koin */
@keyframes fade-out {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) translateY(0);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) translateY(-20px);
  }
}

.animate-fade-out {
  animation: fade-out 0.5s ease-out forwards;
}

.loading-screen {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background-color: #1a202c; /* bg-gray-900 */
    color: white;
    font-size: 2rem;
    font-weight: bold;
}

/* Atur font Inter */
body {
  font-family: 'Inter', sans-serif;
}
