// README.md (Panduan Penyiapan Bot Telegram di Replit)
//
// 1. **Buat proyek Node.js baru di Replit:**
//    - Buka Replit.com dan login.
//    - Klik "+ Create Repl".
//    - Pilih template `Node.js`.
//    - Beri nama Repl Anda (misalnya, `ton-miner-bot`).
//    - Klik "Create Repl".
//
// 2. **Instal dependencies:**
//    - Di dalam Repl, buka tab `Shell`.
//    - Jalankan perintah berikut:
//      npm install telegraf dotenv
//
// 3. **Konfigurasi Environment Variables (Secrets) di Replit:**
//    - Klik ikon gembok (`Secrets`) di panel kiri Replit.
//    - Tambahkan secrets berikut:
//      - Key: `BOT_TOKEN`
//        Value: `1898020009:AAF28cW1GjDOsWil5Zg_FFlMiqIuXYIWn6Y` (gunakan token Anda)
//      - Key: `MINI_APP_WEB_LINK`
//        Value: `https://1b38d513-bd85-4ab3-9a3b-ae65afa32624-00-19v1wcsvgvq2p.sisko.replit.dev/` (gunakan URL publik Frontend React Anda)
//
// 4. **Buat file `index.js` (atau `bot.js`) dan tempelkan kode di bawah ini.**
//    Replit secara default menjalankan `index.js`.
//
// 5. **Jalankan bot:**
//    - Klik tombol "Run" di Replit atau jalankan `node index.js` di Shell.
//    - Bot akan mulai berjalan.
//
// **Langkah Terakhir: Konfigurasi BotFather (PENTING!)**
// - Buka `@BotFather` di Telegram.
// - Pilih bot Anda (`/mybots`).
// - Pilih "Bot settings" -> "Menu button" -> "Edit menu button URL".
// - Masukkan URL deep link Mini App Anda: `http://t.me/Game4ndroidBot/hasherton`
//   (Ini adalah URL yang Anda berikan. Bot Telegram akan mengarahkan pengguna ke `MINI_APP_WEB_LINK` Anda.)

// index.js (atau bot.js)
const { Telegraf } = require('telegraf');
require('dotenv').config(); // Untuk memuat variabel lingkungan dari file .env

// --- KONFIGURASI PENTING ---
const BOT_TOKEN = process.env.BOT_TOKEN; // Token bot Anda dari @BotFather
const MINI_APP_WEB_LINK = process.env.MINI_APP_WEB_LINK; // URL publik frontend React Anda
const BOT_USERNAME = 'Game4ndroidBot'; // Username bot Telegram Anda
// --- AKHIR KONFIGURASI PENTING ---

// Validasi keberadaan token dan URL
if (!BOT_TOKEN) {
  console.error('Error: Variabel lingkungan BOT_TOKEN tidak disetel.');
  process.exit(1);
}
if (!MINI_APP_WEB_LINK) {
  console.error('Error: Variabel lingkungan MINI_APP_WEB_LINK tidak disetel.');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Handler untuk perintah /start
bot.start((ctx) => {
  // Parsing deep link parameter jika ada (misalnya, dari referral)
  // Format: /start <payload>
  const payload = ctx.startPayload;
  let appUrl = MINI_APP_WEB_LINK;

  if (payload && payload.startsWith('referral_')) {
    const referrerId = payload.split('_')[1];
    // Teruskan referrerId ke Mini App melalui URL parameter
    // Mini App kemudian bisa membaca parameter ini dan memberikan bonus referral
    appUrl = `${MINI_APP_WEB_LINK}?ref=${referrerId}`;
    console.log(`Pengguna ${ctx.from.id} membuka dari referral oleh ${referrerId}`);
  }

  // Mengirim pesan dengan keyboard inline yang berisi tombol untuk membuka Mini App
  ctx.replyWithHTML(
    `👋 Halo <b>${ctx.from.first_name}</b>! Selamat datang di TON Miner App!\n\n` +
    `Ketuk tombol di bawah untuk mulai menambang koin TON Anda.`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚀 Buka Aplikasi Penambangan', web_app: { url: appUrl } }]
        ]
      }
    }
  );
});

// Handler untuk semua pesan teks lain yang bukan perintah
bot.on('text', (ctx) => {
  ctx.reply('Silakan gunakan tombol "Buka Aplikasi Penambangan" untuk berinteraksi dengan aplikasi.');
});

// Menangani error yang terjadi pada bot
bot.catch((err, ctx) => {
  console.error(`Terjadi error untuk ${ctx.updateType}`, err);
});

// Meluncurkan bot
bot.launch();
console.log('Bot Telegram telah dimulai...');

// Mengaktifkan penghentian bot secara anggun (graceful stop)
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
