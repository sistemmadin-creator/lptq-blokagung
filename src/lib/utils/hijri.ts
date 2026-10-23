/**
 * Utility untuk konversi dan format tanggal Masehi & Hijriah dalam Bahasa Indonesia
 */

const NAMA_BULAN_MASEHI = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const NAMA_BULAN_HIJRIAH = [
  "Muharram",
  "Safar",
  "Rabiul Awwal",
  "Rabiul Akhir",
  "Jumadil Ula",
  "Jumadil Akhir",
  "Rajab",
  "Sya'ban",
  "Ramadhan",
  "Syawwal",
  "Dzulqa'dah",
  "Dzulhijjah",
];

export function formatTanggalMasehi(date: Date = new Date()): string {
  const d = date.getDate();
  const m = NAMA_BULAN_MASEHI[date.getMonth()];
  const y = date.getFullYear();
  return `${d} ${m} ${y} M`;
}

export function formatTanggalHijriah(date: Date = new Date()): string {
  try {
    // Coba gunakan Intl API bawaan browser modern
    const formatter = new Intl.DateTimeFormat("id-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const formatted = formatter.format(date);
    // Jika format mengembalikan "28 Muharam 1448 H"
    if (formatted && formatted.includes("14")) {
      return formatted.replace("Muharam", "Muharram");
    }
  } catch {
    // Fallback jika browser lama tidak mendukung locale islamic
  }

  // Algoritma estimasi Hijriah standar (Kuwaiti algorithm) jika Intl tidak tersedia
  const jd = Math.floor(date.getTime() / 86400000) + 2440587.5;
  const l = Math.floor(jd) - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
    Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 =
    l2 -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const month = Math.floor((24 * l3) / 709);
  const day = l3 - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;

  const namaBulan = NAMA_BULAN_HIJRIAH[Math.max(0, Math.min(11, month - 1))] || "Muharram";
  return `${day} ${namaBulan} ${year} H`;
}

export function formatTanggalLengkapKhatam(date: Date = new Date()): string {
  const masehi = formatTanggalMasehi(date);
  const hijriah = formatTanggalHijriah(date);
  return `${masehi} / ${hijriah}`;
}
