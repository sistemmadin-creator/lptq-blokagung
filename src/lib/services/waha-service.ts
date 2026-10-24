/**
 * Service untuk Integrasi WhatsApp HTTP API (WAHA / Baileys)
 * Mendukung pengiriman pesan teks, gambar rapor, pengecekan sesi, dan fallback ke WhatsApp Web.
 */

export interface WahaConfig {
  baseUrl: string;
  apiKey: string;
  session: string;
  autoSendOnScore: boolean;
  delayMin: number; // detik
  delayMax: number; // detik
  messageTemplate: string;
}

export interface WahaSessionStatus {
  online: boolean;
  status: "WORKING" | "STARTING" | "SCAN_QR_CODE" | "FAILED" | "STOPPED" | "OFFLINE";
  phone?: string;
  qrCode?: string;
  message?: string;
}

export interface DeliveryLog {
  id: string;
  santriId: string;
  namaSantri: string;
  noWa: string;
  jenis: string;
  tahap: string | number;
  status: "success" | "failed" | "manual";
  tanggalKirim: string;
  error?: string;
}

export const DEFAULT_WAHA_CONFIG: WahaConfig = {
  baseUrl: "http://localhost:3000",
  apiKey: "",
  session: "default",
  autoSendOnScore: false,
  delayMin: 4,
  delayMax: 7,
  messageTemplate: `Assalamu'alaikum Wr. Wb.

Yth. Bapak/Ibu Wali dari Ananda:
*{nama}* (Asrama {asrama}, Kamar {kamar})

Alhamdulillah, ananda telah menyelesaikan ujian *{program} - {tahap}* dengan rincian:
• Nilai Rata-rata: *{rata_rata}*
• Status KKM: *{status}*
• Catatan Penguji: _{catatan}_

Berikut kami lampirkan kartu rapor evaluasi resmi dari LPTQ Pondok Pesantren Darussalam Blokagung. Semoga ananda senantiasa istiqomah dalam menjaga dan menyempurnakan hafalan Al-Qur'an.

Wassalamu'alaikum Wr. Wb.
*Pengurus LPTQ Darussalam Blokagung*`,
};

const CONFIG_STORAGE_KEY = "lptq_waha_config_v1";
const LOGS_STORAGE_KEY = "lptq_wa_delivery_logs_v1";

/**
 * Memuat konfigurasi WAHA dari LocalStorage
 */
export function getWahaConfig(): WahaConfig {
  if (typeof window === "undefined") return DEFAULT_WAHA_CONFIG;
  const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
  if (!saved) return DEFAULT_WAHA_CONFIG;
  try {
    return { ...DEFAULT_WAHA_CONFIG, ...JSON.parse(saved) };
  } catch {
    return DEFAULT_WAHA_CONFIG;
  }
}

/**
 * Menyimpan konfigurasi WAHA ke LocalStorage
 */
export function saveWahaConfig(config: WahaConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}

/**
 * Memformat nomor HP Indonesia ke format standar internasional (628...)
 * Menghilangkan strip, spasi, simbol +, dan mengubah awalan 08 / 8 menjadi 628.
 */
export function formatPhoneNumber(rawPhone: string): string {
  if (!rawPhone) return "";
  let cleaned = rawPhone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  } else if (cleaned.startsWith("8")) {
    cleaned = "62" + cleaned;
  } else if (!cleaned.startsWith("62") && cleaned.length > 5) {
    cleaned = "62" + cleaned;
  }
  return cleaned;
}

/**
 * Memformat nomor HP untuk WhatsApp Chat ID WAHA (misal: 628123456789@c.us)
 */
export function formatChatId(rawPhone: string): string {
  const num = formatPhoneNumber(rawPhone);
  if (!num) return "";
  return `${num}@c.us`;
}

/**
 * Membuat tautan langsung WhatsApp Web (Fallback wa.me)
 */
export function generateDirectWaLink(rawPhone: string, text: string): string {
  const num = formatPhoneNumber(rawPhone);
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${num}?text=${encodedText}`;
}

/**
 * Mengisi template pesan dengan data santri
 */
export function compileMessage(
  template: string,
  params: {
    nama: string;
    asrama: string;
    kamar: string;
    program: string;
    tahap: string;
    rata_rata: string;
    status: string;
    catatan: string;
  }
): string {
  return template
    .replace(/{nama}/g, params.nama)
    .replace(/{asrama}/g, params.asrama)
    .replace(/{kamar}/g, params.kamar)
    .replace(/{program}/g, params.program)
    .replace(/{tahap}/g, params.tahap)
    .replace(/{rata_rata}/g, params.rata_rata)
    .replace(/{status}/g, params.status)
    .replace(/{catatan}/g, params.catatan);
}

/**
 * Memeriksa status kesehatan dan sesi WAHA
 */
export async function checkWahaSession(config: WahaConfig): Promise<WahaSessionStatus> {
  const cleanUrl = config.baseUrl.replace(/\/+$/, "");
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (config.apiKey) {
    headers["X-Api-Key"] = config.apiKey;
  }

  try {
    const res = await fetch(`${cleanUrl}/api/sessions/${config.session}`, {
      method: "GET",
      headers,
    });

    if (!res.ok) {
      if (res.status === 404) {
        return {
          online: false,
          status: "STOPPED",
          message: `Sesi "${config.session}" belum dibuat di WAHA.`,
        };
      }
      return {
        online: false,
        status: "FAILED",
        message: `Server merespons kode ${res.status}: ${res.statusText}`,
      };
    }

    const data = await res.json();
    const status = data.status || "WORKING";

    return {
      online: status === "WORKING",
      status: status,
      phone: data.me?.id ? data.me.id.split("@")[0] : undefined,
      qrCode: data.qrCode || data.qr || undefined,
      message: data.message,
    };
  } catch (err: any) {
    // Berikan pesan khusus jika browser memblokir koneksi HTTP dari situs HTTPS (Mixed Content)
    const isHttpsOrigin = typeof window !== "undefined" && window.location.protocol === "https:";
    const isHttpTarget = cleanUrl.startsWith("http://");
    let errorMsg = err.message || "Network Error";

    if (isHttpsOrigin && isHttpTarget) {
      errorMsg = "Browser memblokir 'http://' dari situs HTTPS Vercel (Mixed Content). Gunakan URL HTTPS Tunnel atau buka web secara lokal.";
    }

    return {
      online: false,
      status: "OFFLINE",
      message: `Tidak dapat terhubung ke WAHA (${errorMsg}).`,
    };
  }
}

/**
 * Memutuskan sesi WhatsApp (Logout)
 */
export async function logoutWahaSession(config: WahaConfig): Promise<{ success: boolean; message?: string }> {
  const cleanUrl = config.baseUrl.replace(/\/+$/, "");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (config.apiKey) headers["X-Api-Key"] = config.apiKey;

  try {
    const res = await fetch(`${cleanUrl}/api/sessions/${config.session}/logout`, {
      method: "POST",
      headers,
    });
    if (!res.ok) {
      return { success: false, message: `Gagal logout (${res.status})` };
    }
    const data = await res.json();
    return { success: true, message: data.message || "Berhasil logout." };
  } catch (err: any) {
    return { success: false, message: err.message || "Gagal menghubungi server WAHA." };
  }
}

/**
 * Mengirim pesan bergambar (Kartu Rapor) melalui WAHA
 */
export async function sendWahaImage(
  config: WahaConfig,
  phone: string,
  imageUrl: string,
  caption: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const cleanUrl = config.baseUrl.replace(/\/+$/, "");
  const chatId = formatChatId(phone);

  if (!chatId) {
    return { success: false, error: "Nomor WhatsApp tidak valid." };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.apiKey) {
    headers["X-Api-Key"] = config.apiKey;
  }

  const payload = {
    session: config.session,
    chatId: chatId,
    file: {
      url: imageUrl,
      filename: "Rapor_Evaluasi_LPTQ.png",
      caption: caption,
    },
  };

  try {
    const res = await fetch(`${cleanUrl}/api/sendImage`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return {
        success: false,
        error: `Gagal mengirim gambar (${res.status}): ${errBody || res.statusText}`,
      };
    }

    const data = await res.json();
    return { success: true, messageId: data.id };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Gagal menghubungi server WAHA.",
    };
  }
}

/**
 * Mengambil log riwayat pengiriman dari LocalStorage
 */
export function getDeliveryLogs(): DeliveryLog[] {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem(LOGS_STORAGE_KEY);
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

/**
 * Menyimpan log pengiriman
 */
export function saveDeliveryLog(log: Omit<DeliveryLog, "id" | "tanggalKirim">): void {
  if (typeof window === "undefined") return;
  const current = getDeliveryLogs();
  const newLog: DeliveryLog = {
    ...log,
    id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    tanggalKirim: new Date().toISOString(),
  };

  // Simpan maksimal 500 riwayat terbaru
  const updated = [newLog, ...current].slice(0, 500);
  localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(updated));
}

/**
 * Mengecek apakah santri pada tahap tertentu sudah pernah dikirimi WA
 */
export function isAlreadyDelivered(santriId: string, tahap: string | number, jenis: string): boolean {
  const logs = getDeliveryLogs();
  return logs.some(
    (l) =>
      l.santriId === santriId &&
      String(l.tahap) === String(tahap) &&
      l.jenis === jenis &&
      l.status === "success"
  );
}
