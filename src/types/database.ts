export type AppRole = "admin" | "pengurus" | "pembimbing" | "operator_absen" | "viewer";
export type SesiAbsen = "pagi" | "malam";
export type StatusAbsen = "hadir" | "alfa" | "izin" | "sakit";
export type TipeSetoran = "juz_baru" | "evaluasi";
export type JenisKhotmil = "khotmil15" | "khotmil30";
export type HalaqohBagian = "A" | "B" | "C" | "D" | "E" | "F";

export type ModuleKey =
  | "dashboard"
  | "santri"
  | "halaqoh"
  | "rekap_keseluruhan"
  | "kegiatan"
  | "juz_baru"
  | "evaluasi"
  | "khotmil_15"
  | "khotmil_30"
  | "flyer"
  | "wa"
  | "user_management"
  | "angkatan_15"
  | "angkatan_30";

export type PermissionLevel = "sembunyikan" | "baca" | "edit";

export type UserPermissions = Record<ModuleKey, PermissionLevel>;

export interface Profile {
  user_id: string;
  email: string | null;
  username?: string;
  nama: string | null;
  role: AppRole;
  halaqoh_kelas: number | null;
  halaqoh_bagian: HalaqohBagian | null;
  permissions?: UserPermissions;
  status?: "active" | "suspended";
  created_at: string;
}

export interface UserAccountItem {
  user_id: string;
  email: string;
  username: string;
  nama: string;
  role: AppRole;
  halaqoh_kelas?: number | null;
  halaqoh_bagian?: HalaqohBagian | null;
  status: "active" | "suspended";
  permissions: UserPermissions;
  created_at?: string;
  updated_at?: string;
}

export type LogKategori =
  | "Autentikasi"
  | "Manajemen Pengguna"
  | "Penilaian Tahfidz"
  | "Data Santri"
  | "Pengaturan Sistem"
  | "WhatsApp Gateway"
  | "Backup & Restore"
  | "Ekspor & Cetak"
  | "Lainnya";

export interface UserActivityLog {
  id: string;
  user_id: string;
  nama: string;
  username: string;
  role: AppRole | string;
  action: string;
  kategori: LogKategori;
  deskripsi: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface Santri {
  id: string;
  no_urut: number;
  kode: string;
  nama_lengkap: string;
  no_wa?: string | null;
  blok: string;
  asrama: string;
  kode_kamar?: string | null;
  kamar: string;
  halaqoh_kelas: number;
  halaqoh_bagian: HalaqohBagian;
  halaqoh: string;
  created_at: string;
  updated_at: string;
}

export interface AbsensiRecord {
  id: string;
  santri_id: string;
  tanggal: string;
  sesi: SesiAbsen;
  status: StatusAbsen;
  penginput: string | null;
}

export interface SetoranRecord {
  id: string;
  santri_id: string;
  tanggal: string;
  tipe: TipeSetoran;
  jumlah_juz_tambahan: number;
  jumlah_halaman?: number;
  catatan: string | null;
  penginput: string | null;
  created_at: string;
}

export interface RiwayatSetoranItem {
  id: string;
  santri_id: string;
  tanggal: string;
  tipe: TipeSetoran;
  jumlah_halaman: number;
  jumlah_juz_tambahan: number;
  catatan: string | null;
  penginput: string | null;
  created_at: string;
  no: number;
  totalHalamanKumulatif: number;
  rincianStatus: string;
}

export function formatHalamanToJuzStatus(totalHalaman: number): string {
  const safeHalaman = Math.max(0, Math.round(totalHalaman));
  const juz = Math.floor(safeHalaman / 20);
  const sisa = safeHalaman % 20;
  if (juz === 0) {
    return `Juz 0 Halaman ${sisa}`;
  }
  return `${juz} Juz Halaman ${sisa}`;
}

export interface SetoranBulananRow {
  santri_id: string;
  no_urut: number;
  kode: string;
  nama_lengkap: string;
  blok: string;
  asrama: string;
  kode_kamar?: string | null;
  kamar: string;
  halaqoh_kelas: number;
  halaqoh_bagian: HalaqohBagian;
  halaqoh: string;
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  mei: number;
  jun: number;
  jul: number;
  agu: number;
  sep: number;
  okt: number;
  nov: number;
  des: number;
  total_setoran: number;
  total_halaman?: number;
}

export interface KhotmilNilaiRecord {
  id: string;
  santri_id: string;
  jenis: JenisKhotmil;
  tahap: number;
  juz: number;
  nilai: number;
}

export interface KhotmilPesertaRecord {
  id: string;
  santri_id: string;
  jenis: JenisKhotmil;
  created_at: string;
}

export interface WaBroadcastLogRecord {
  id: string;
  santri_id: string;
  nama_santri: string;
  no_wa: string;
  jenis: string;
  tahap: string;
  status: "success" | "failed" | "manual";
  error?: string | null;
  created_at: string;
}

export interface TahapConfig {
  tahap: number;
  label: string;
  rentangLabel: string;
  juzList: number[];
}

export const HALAQOH_KELAS_LIST = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export const HALAQOH_BAGIAN_LIST: HalaqohBagian[] = ["A", "B", "C", "D", "E", "F"];

export const PEMETAAN_HALAQOH_KELAS: Record<number, string> = {
  1: "Juz 1 - 3",
  2: "Juz 4 - 6",
  3: "Juz 7 - 9",
  4: "Juz 10 - 12",
  5: "Juz 13 - 15",
  6: "Juz 16 - 18",
  7: "Juz 19 - 21",
  8: "Juz 22 - 24",
  9: "Juz 25 - 27",
  10: "Juz 28 - 30",
};

/**
 * Mengembalikan batas atas Juz target tuntas untuk kelas halaqoh tertentu (Kelas k -> k * 3).
 */
export function getTargetJuzMaxByKelas(kelas?: number | null): number {
  const safeKelas = Math.min(10, Math.max(1, Math.round(Number(kelas) || 1)));
  return safeKelas * 3;
}

/**
 * Mengembalikan batas bawah Juz awal untuk kelas halaqoh tertentu (Kelas k -> (k - 1) * 3 + 1).
 */
export function getTargetJuzMinByKelas(kelas?: number | null): number {
  const safeKelas = Math.min(10, Math.max(1, Math.round(Number(kelas) || 1)));
  return (safeKelas - 1) * 3 + 1;
}

export const SETORAN_MONTH_KEYS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "mei",
  "jun",
  "jul",
  "agu",
  "sep",
  "okt",
  "nov",
  "des",
] as const;

export type SetoranMonthKey = (typeof SETORAN_MONTH_KEYS)[number];

/**
 * Mengambil kondisi Juz terbaru pada mode Evaluasi dari bulan paling akhir yang terisi (> 0).
 */
export function getLatestEvaluasiJuz(
  row: Partial<Record<SetoranMonthKey, number>>
): number {
  for (let i = SETORAN_MONTH_KEYS.length - 1; i >= 0; i -= 1) {
    const val = Math.round(Number(row[SETORAN_MONTH_KEYS[i]] ?? 0));
    if (val > 0) {
      return Math.min(30, val);
    }
  }
  return 0;
}

const rangeJuz = (start: number, end: number): number[] =>
  Array.from({ length: end - start + 1 }, (_, idx) => start + idx);

export const KHOTMIL_15_TAHAP: TahapConfig[] = [
  { tahap: 1, label: "Tahap 1", rentangLabel: "Juz 1 - 5", juzList: rangeJuz(1, 5) },
  { tahap: 2, label: "Tahap 2", rentangLabel: "Juz 6 - 10", juzList: rangeJuz(6, 10) },
  { tahap: 3, label: "Tahap 3", rentangLabel: "Juz 1 - 10", juzList: rangeJuz(1, 10) },
  { tahap: 4, label: "Tahap 4", rentangLabel: "Juz 11 - 15", juzList: rangeJuz(11, 15) },
  { tahap: 5, label: "Tahap 5", rentangLabel: "Juz 1 - 15", juzList: rangeJuz(1, 15) },
];

export const KHOTMIL_30_TAHAP: TahapConfig[] = [
  { tahap: 1, label: "Tahap 1", rentangLabel: "Juz 1 - 5", juzList: rangeJuz(1, 5) },
  { tahap: 2, label: "Tahap 2", rentangLabel: "Juz 6 - 10", juzList: rangeJuz(6, 10) },
  { tahap: 3, label: "Tahap 3", rentangLabel: "Juz 1 - 10", juzList: rangeJuz(1, 10) },
  { tahap: 4, label: "Tahap 4", rentangLabel: "Juz 11 - 15", juzList: rangeJuz(11, 15) },
  { tahap: 5, label: "Tahap 5", rentangLabel: "Juz 16 - 20", juzList: rangeJuz(16, 20) },
  { tahap: 6, label: "Tahap 6", rentangLabel: "Juz 11 - 20", juzList: rangeJuz(11, 20) },
  { tahap: 7, label: "Tahap 7", rentangLabel: "Juz 21 - 25", juzList: rangeJuz(21, 25) },
  { tahap: 8, label: "Tahap 8", rentangLabel: "Juz 26 - 30", juzList: rangeJuz(26, 30) },
  { tahap: 9, label: "Tahap 9", rentangLabel: "Juz 21 - 30", juzList: rangeJuz(21, 30) },
];

export const KKM_DEFAULT = 85;

export interface AngkatanTahapSnapshot {
  tahap: number;
  label: string;
  rentangLabel: string;
  scores: { juz: number; nilai: number }[];
  average: number | null;
  isComplete: boolean;
  isLulus: boolean;
}

export interface KhotmilAngkatanRecord {
  id: string;
  jenis: JenisKhotmil;
  nama_angkatan: string;
  tanggal_khataman: string | null;
  keterangan: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  jumlah_peserta?: number;
}

export interface KhotmilAngkatanPesertaRecord {
  id: string;
  angkatan_id: string;
  santri_id: string | null;
  jenis: JenisKhotmil;
  kode_santri: string;
  nama_lengkap: string;
  asrama: string;
  kode_kamar: string | null;
  kamar: string;
  halaqoh_kelas: number | null;
  halaqoh_bagian: string | null;
  halaqoh: string;
  pembimbing: string;
  nilai_tahap_json: AngkatanTahapSnapshot[];
  rata_rata_akhir: number | null;
  jumlah_tahap_tuntas: number;
  total_tahap: number;
  status_kelulusan: "lulus" | "belum_tuntas";
  sumber: "tarik_khotmil" | "manual" | "import_excel";
  catatan: string | null;
  created_at: string;
  nama_angkatan?: string;
}
