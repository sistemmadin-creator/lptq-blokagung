const express = require("express");
const cors = require("cors");
const pino = require("pino");
const QRCode = require("qrcode");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  delay,
} = require("@whiskeysockets/baileys");

const app = express();
const PORT = process.env.PORT || 3008;
const AUTH_DIR = path.join(__dirname, "auth_info_baileys");

// Enable CORS for all domains & preflight
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Api-Key", "Accept"],
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// State
let sock = null;
let currentStatus = "STARTING"; // STARTING | SCAN_QR_CODE | WORKING | STOPPED | FAILED
let currentQrCodeDataUrl = null;
let currentRawQr = null;
let connectedUser = null;
let connectionAttempts = 0;

const logger = pino({ level: "silent" });

async function initWhatsApp() {
  try {
    currentStatus = "STARTING";
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: true,
      auth: state,
      browser: ["LPTQ Blokagung", "Chrome", "1.0.0"],
      syncFullHistory: false,
      connectTimeoutMs: 60000,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentRawQr = qr;
        currentStatus = "SCAN_QR_CODE";
        try {
          currentQrCodeDataUrl = await QRCode.toDataURL(qr, {
            width: 340,
            margin: 2,
            color: { dark: "#0f5132", light: "#ffffff" },
          });
        } catch (e) {
          console.error("Gagal membuat dataURL QR", e);
        }
        console.log("\n=======================================================");
        console.log(">> QR CODE BARU TERSEDIA! Buka http://localhost:" + PORT + " untuk scan <<");
        console.log("=======================================================\n");
      }

      if (connection === "close") {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log("Koneksi terputus. Status code:", statusCode, "Reconnect:", shouldReconnect);
        currentStatus = "STOPPED";
        connectedUser = null;
        currentQrCodeDataUrl = null;

        if (statusCode === DisconnectReason.loggedOut) {
          console.log("Pengguna logout. Menghapus sesi lama...");
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          } catch (e) {}
          await delay(2000);
          initWhatsApp();
        } else if (shouldReconnect) {
          connectionAttempts++;
          const waitTime = Math.min(connectionAttempts * 2000, 10000);
          console.log(`Mencoba menyambung kembali dalam ${waitTime / 1000} detik...`);
          await delay(waitTime);
          initWhatsApp();
        }
      } else if (connection === "open") {
        connectionAttempts = 0;
        currentStatus = "WORKING";
        currentQrCodeDataUrl = null;
        currentRawQr = null;

        const user = sock.user;
        connectedUser = {
          id: user?.id ? user.id.split(":")[0] + "@c.us" : "WhatsApp User",
          phone: user?.id ? user.id.split(":")[0] : "",
          name: user?.name || "LPTQ Blokagung Bot",
        };

        console.log("\n=======================================================");
        console.log(">> WHATSAPP BERHASIL TERHUBUNG! <<");
        console.log("Nomor:", connectedUser.phone);
        console.log("Nama :", connectedUser.name);
        console.log("=======================================================\n");
      }
    });
  } catch (err) {
    console.error("Error inisialisasi Baileys:", err);
    currentStatus = "FAILED";
  }
}

// ==================== ENDPOINT COMPATIBILITY WAHA ====================

// 1. Cek Sesi Spesifik (dipanggil waha-service.ts -> checkWahaSession)
app.get("/api/sessions/:session", (req, res) => {
  res.json({
    name: req.params.session || "default",
    status: currentStatus,
    qrCode: currentStatus === "SCAN_QR_CODE" ? currentQrCodeDataUrl : null,
    me:
      currentStatus === "WORKING" && connectedUser
        ? {
            id: connectedUser.id,
            pushName: connectedUser.name,
          }
        : null,
  });
});

// 1b. Endpoint langsung QR Code image
app.get("/api/sessions/:session/auth/qr", (req, res) => {
  if (currentStatus === "SCAN_QR_CODE" && currentQrCodeDataUrl) {
    res.json({ status: "SCAN_QR_CODE", qrCode: currentQrCodeDataUrl });
  } else {
    res.json({ status: currentStatus, qrCode: null });
  }
});

// 2. Cek Semua Sesi
app.get("/api/sessions", (req, res) => {
  res.json([
    {
      name: "default",
      status: currentStatus,
      qrCode: currentStatus === "SCAN_QR_CODE" ? currentQrCodeDataUrl : null,
      me:
        currentStatus === "WORKING" && connectedUser
          ? {
              id: connectedUser.id,
              pushName: connectedUser.name,
            }
          : null,
    },
  ]);
});

// 3. Kirim Gambar (dipanggil waha-service.ts -> sendWahaImage)
app.post("/api/sendImage", async (req, res) => {
  try {
    if (currentStatus !== "WORKING" || !sock) {
      return res.status(503).json({
        error: "Server WhatsApp Gateway belum terhubung. Silakan scan QR code terlebih dahulu.",
      });
    }

    const { chatId, file } = req.body;
    if (!chatId || !file || !file.url) {
      return res.status(400).json({ error: "Parameter chatId dan file.url wajib disertakan." });
    }

    // Format target JID: ganti @c.us menjadi @s.whatsapp.net untuk Baileys
    let targetJid = chatId.replace("@c.us", "@s.whatsapp.net");
    if (!targetJid.includes("@")) {
      targetJid = `${targetJid}@s.whatsapp.net`;
    }

    // Unduh buffer gambar
    let imageBuffer;
    if (file.url.startsWith("data:image")) {
      const base64Data = file.url.replace(/^data:image\/\w+;base64,/, "");
      imageBuffer = Buffer.from(base64Data, "base64");
    } else {
      const resp = await axios.get(file.url, { responseType: "arraybuffer", timeout: 20000 });
      imageBuffer = Buffer.from(resp.data);
    }

    // Kirim pesan gambar + caption via Baileys
    const result = await sock.sendMessage(targetJid, {
      image: imageBuffer,
      caption: file.caption || "",
    });

    console.log(`[SUKSES] Gambar terkirim ke: ${targetJid} (ID: ${result?.key?.id})`);
    return res.json({
      id: result?.key?.id || `msg_${Date.now()}`,
      status: "success",
    });
  } catch (err) {
    console.error("[GAGAL] Gagal mengirim gambar:", err.message);
    return res.status(500).json({
      error: `Gagal mengirim gambar: ${err.message}`,
    });
  }
});

// 4. Kirim Teks
app.post("/api/sendText", async (req, res) => {
  try {
    if (currentStatus !== "WORKING" || !sock) {
      return res.status(503).json({ error: "Server WhatsApp belum terhubung." });
    }

    const { chatId, text } = req.body;
    let targetJid = chatId.replace("@c.us", "@s.whatsapp.net");
    if (!targetJid.includes("@")) targetJid = `${targetJid}@s.whatsapp.net`;

    const result = await sock.sendMessage(targetJid, { text: text || "" });
    return res.json({ id: result?.key?.id, status: "success" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. Logout Sesi
app.post("/api/sessions/:session/logout", async (req, res) => {
  try {
    if (sock) {
      await sock.logout();
    }
    try {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    } catch (e) {}
    currentStatus = "STOPPED";
    connectedUser = null;
    currentQrCodeDataUrl = null;
    res.json({ message: "Logout berhasil. Menginisialisasi QR baru..." });
    await delay(1500);
    initWhatsApp();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== DASHBOARD VISUAL SCAN QR ====================
app.get("/", (req, res) => {
  const isConnected = currentStatus === "WORKING";
  const isQr = currentStatus === "SCAN_QR_CODE" && currentQrCodeDataUrl;

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WhatsApp Gateway - LPTQ Blokagung</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    body { background: #f0fdf4; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; color: #1e293b; }
    .card { background: #ffffff; border: 1px solid #bbf7d0; border-radius: 28px; padding: 36px 32px; max-width: 480px; width: 100%; box-shadow: 0 20px 40px -15px rgba(22, 101, 52, 0.12); text-align: center; }
    .logo-badge { display: inline-flex; align-items: center; gap: 8px; background: #dcfce7; color: #166534; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 9999px; margin-bottom: 16px; border: 1px solid #86efac; }
    h1 { font-size: 20px; font-weight: 800; color: #14532d; margin-bottom: 8px; }
    p.desc { font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 24px; }
    .status-badge { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; padding: 8px 18px; border-radius: 14px; margin-bottom: 20px; }
    .status-working { background: #16a34a; color: white; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3); }
    .status-qr { background: #ca8a04; color: white; }
    .status-starting { background: #475569; color: white; }
    .qr-box { background: white; border: 3px dashed #86efac; border-radius: 20px; padding: 18px; display: inline-block; margin-bottom: 20px; }
    .qr-box img { display: block; border-radius: 12px; max-width: 100%; height: auto; }
    .steps { text-align: left; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 18px; padding: 18px 20px; margin-bottom: 22px; }
    .steps h3 { font-size: 12px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
    .steps ol { padding-left: 20px; font-size: 12px; color: #475569; line-height: 1.7; }
    .steps ol li strong { color: #166534; }
    .btn-logout { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; font-size: 12px; font-weight: 700; padding: 10px 20px; border-radius: 12px; cursor: pointer; transition: 0.2s; }
    .btn-logout:hover { background: #fecaca; }
    .connected-info { background: #dcfce7; border: 1px solid #86efac; border-radius: 18px; padding: 22px; margin-bottom: 20px; }
    .phone-number { font-size: 18px; font-weight: 800; color: #14532d; font-mono; letter-spacing: 0.5px; margin-top: 4px; }
    .api-hint { font-size: 11px; color: #64748b; margin-top: 18px; line-height: 1.5; background: #f1f5f9; padding: 10px; border-radius: 10px; }
    .pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
  </style>
  <script>
    // Polling status otomatis setiap 3 detik
    setInterval(async () => {
      try {
        const res = await fetch('/api/sessions/default');
        const data = await res.json();
        const currentIsWorking = ${isConnected ? "true" : "false"};
        if ((data.status === 'WORKING' && !currentIsWorking) || (data.status !== 'WORKING' && currentIsWorking)) {
          window.location.reload();
        }
      } catch (e) {}
    }, 3000);
  </script>
</head>
<body>
  <div class="card">
    <div class="logo-badge">
      <span>🕌</span>
      <span>LPTQ Blokagung</span>
    </div>

    <h1>WhatsApp Gateway</h1>
    <p class="desc">Server pengiriman otomatis nilai &amp; kartu rapor digital santri.</p>

    ${
      isConnected
        ? `
      <div class="status-badge status-working">
        <span>●</span>
        <span>TERHUBUNG SECARA ONLINE</span>
      </div>

      <div class="connected-info">
        <p style="font-size: 12px; color: #166534; font-weight: 600;">Nomor WhatsApp Terhubung:</p>
        <div class="phone-number">+${connectedUser?.phone || ""}</div>
        <p style="font-size: 12px; color: #15803d; margin-top: 4px;">Akun: <strong>${connectedUser?.name || "LPTQ Bot"}</strong></p>
      </div>

      <button class="btn-logout" onclick="fetch('/api/sessions/default/logout', {method:'POST'}).then(() => location.reload())">
        Putuskan Koneksi / Ganti Nomor
      </button>
    `
        : isQr
        ? `
      <div class="status-badge status-qr pulse">
        <span>📱</span>
        <span>SILAKAN SCAN QR CODE</span>
      </div>

      <div class="qr-box">
        <img src="${currentQrCodeDataUrl}" alt="QR Code WhatsApp" />
      </div>

      <div class="steps">
        <h3>Langkah Menghubungkan:</h3>
        <ol>
          <li>Buka aplikasi <strong>WhatsApp</strong> di HP Anda.</li>
          <li>Ketuk menu titik tiga (⋮) atau <strong>Pengaturan</strong> &gt; <strong>Perangkat Tertaut</strong>.</li>
          <li>Pilih <strong>Tautkan Perangkat</strong> dan arahkan kamera HP ke QR Code di atas.</li>
        </ol>
      </div>
    `
        : `
      <div class="status-badge status-starting pulse">
        <span>⏳</span>
        <span>MEMULAI ENGINE WHATSAPP...</span>
      </div>
      <p style="font-size: 12px; color: #64748b; margin: 20px 0;">Mohon tunggu beberapa saat, QR Code sedang dipersiapkan...</p>
    `
    }

    <div class="api-hint">
      <strong>URL Server untuk Aplikasi LPTQ:</strong><br>
      <code style="font-weight: 700; color: #0f172a;">http://localhost:${PORT}</code>
    </div>
  </div>
</body>
</html>`;

  res.send(html);
});

// Jalankan Server
app.listen(PORT, () => {
  console.log(`\n========================================================`);
  console.log(` WhatsApp Gateway LPTQ berjalan di: http://localhost:${PORT}`);
  console.log(` Buka URL di browser untuk melihat status dan Scan QR.`);
  console.log(`========================================================\n`);
  initWhatsApp();
});
