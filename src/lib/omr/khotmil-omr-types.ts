import { JenisKhotmil, KKM_DEFAULT } from "@/types/database";

export interface KhotmilScoreBreakdown {
  kesalahan: number;
  halKosong: number;
  skorHalaman: number;
  skorKesalahan: number;
  nilai: number;
  lulusKkm: boolean;
}

/**
 * Menghitung nilai tahfidz khotmil berbasis bobot kesalahan (default 35%) dan bobot halaman tidak dibaca (default 65%):
 * - 1 Juz standar = 20 halaman
 * - Bobot halaman = bobotHalaman poin (pointPerHal = bobotHalaman / 20 poin/halaman)
 * - Bobot kesalahan = bobotKesalahan poin (1 kesalahan = -1 poin dari bobotKesalahan)
 * - Jika halaman kosong >= 20 (tidak membaca 1 juz penuh), nilai = 0
 */
export function calculateKhotmilScore(
  kesalahan: number,
  halKosong: number,
  kkm: number = KKM_DEFAULT,
  bobotKesalahan: number = 35,
  bobotHalaman: number = 65
): KhotmilScoreBreakdown {
  const safeHal = Math.max(0, Math.min(20, Math.round(halKosong || 0)));
  const safeSalah = Math.max(0, Math.round(kesalahan || 0));

  if (safeHal >= 20) {
    return {
      kesalahan: safeSalah,
      halKosong: safeHal,
      skorHalaman: 0,
      skorKesalahan: 0,
      nilai: 0,
      lulusKkm: false,
    };
  }

  const pointPerHal = bobotHalaman / 20;
  const skorHalaman = Math.max(0, bobotHalaman - safeHal * pointPerHal);
  const skorKesalahan = Math.max(0, bobotKesalahan - safeSalah * 1.0);
  const total = Math.min(100, Math.max(0, skorHalaman + skorKesalahan));
  const nilai = Math.round(total);

  return {
    kesalahan: safeSalah,
    halKosong: safeHal,
    skorHalaman: Number(skorHalaman.toFixed(2)),
    skorKesalahan: Number(skorKesalahan.toFixed(2)),
    nilai,
    lulusKkm: nilai >= kkm,
  };
}

export interface KhotmilQrData {
  prefix: "LPTQ";
  jenis: JenisKhotmil;
  tahap: number;
  santriId: string;
  kode: string;
  nama: string;
  juzList: number[];
}

/**
 * Format string QR Code kompak:
 * LPTQ|{jenis}|{tahap}|{santriId}|{kode}|{juzList}|{namaBase64}
 */
export function encodeKhotmilQrPayload(data: KhotmilQrData): string {
  const encNama = encodeURIComponent(data.nama);
  return `LPTQ|${data.jenis}|${data.tahap}|${data.santriId}|${data.kode || "-"}|${data.juzList.join(",")}|${encNama}`;
}

export function decodeKhotmilQrPayload(raw: string): KhotmilQrData | null {
  try {
    if (!raw || !raw.startsWith("LPTQ|")) return null;
    const parts = raw.split("|");
    if (parts.length < 6) return null;

    const [prefix, jenisRaw, tahapStr, santriId, kode, juzStr, encNama] = parts;
    if (prefix !== "LPTQ") return null;
    if (jenisRaw !== "khotmil15" && jenisRaw !== "khotmil30") return null;

    const tahap = parseInt(tahapStr, 10);
    if (Number.isNaN(tahap)) return null;

    const juzList = juzStr
      .split(",")
      .map((j) => parseInt(j.trim(), 10))
      .filter((n) => !Number.isNaN(n));

    const nama = encNama ? decodeURIComponent(encNama) : "";

    return {
      prefix: "LPTQ",
      jenis: jenisRaw as JenisKhotmil,
      tahap,
      santriId,
      kode: kode === "-" ? "" : kode,
      nama,
      juzList,
    };
  } catch (e) {
    console.error("Gagal mendecode payload QR Khotmil:", e);
    return null;
  }
}

export interface ScannedJuzRow {
  juz: number;
  kesalahan: number;
  halKosong: number;
  nilai: number;
  skorHalaman: number;
  skorKesalahan: number;
  lulusKkm: boolean;
  manualEdited?: boolean;
}

export interface ScannedSheetResult {
  santriId: string;
  santriKode?: string;
  santriNama?: string;
  jenis: JenisKhotmil;
  tahap: number;
  rows: ScannedJuzRow[];
  rataRata: number;
  lulusSemua: boolean;
  scannedAt: string;
}
