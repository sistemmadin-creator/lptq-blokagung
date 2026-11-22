import { createClient } from "@/lib/supabase/client";
import { normalizePermissions } from "@/lib/services/user-permission-service";
import type {
  AbsensiRecord,
  JenisKhotmil,
  KhotmilNilaiRecord,
  Profile,
  RiwayatSetoranItem,
  Santri,
  SesiAbsen,
  SetoranBulananRow,
  StatusAbsen,
  TipeSetoran,
} from "@/types/database";
import {
  formatHalamanToJuzStatus,
  getLatestEvaluasiJuz,
  KHOTMIL_30_TAHAP,
  SETORAN_MONTH_KEYS,
} from "@/types/database";

const SANTRI_COLUMNS =
  "id, no_urut, kode, nama_lengkap, no_wa, blok, asrama, kode_kamar, kamar, halaqoh_kelas, halaqoh_bagian, halaqoh, created_at, updated_at";
const SANTRI_FALLBACK_COLUMNS =
  "id, no_urut, kode, nama_lengkap, blok, asrama, kamar, halaqoh_kelas, halaqoh_bagian, halaqoh, created_at, updated_at";

export interface SantriFilterParams {
  search?: string;
  asrama?: string;
  blok?: string;
  kode_kamar?: string;
  kamar?: string;
  halaqoh_kelas?: number | "";
  halaqoh_bagian?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchCurrentUserProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("user_id, email, nama, role, halaqoh_kelas, halaqoh_bagian, created_at")
    .eq("user_id", user.id)
    .single();

  // Ambil perizinan pengguna dari app_settings
  let customPermissions = null;
  let customUsername = user.user_metadata?.username;
  let customStatus: "active" | "suspended" = user.user_metadata?.status || "active";

  try {
    const { data: permSetting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "USER_PERMISSIONS")
      .maybeSingle();

    if (permSetting?.value && permSetting.value[user.id]) {
      const uData = permSetting.value[user.id];
      if (uData.permissions) customPermissions = uData.permissions;
      if (uData.username) customUsername = uData.username;
      if (uData.status) customStatus = uData.status;
    }
  } catch {
    // Lewati jika belum terpasang
  }

  const role = (data?.role || "viewer") as Profile["role"];
  const finalPermissions = normalizePermissions(customPermissions, role);

  if (data) {
    return {
      ...(data as Profile),
      username: customUsername || (data.email ? data.email.split("@")[0] : "pengguna"),
      permissions: finalPermissions,
      status: customStatus,
    };
  }

  return {
    user_id: user.id,
    email: user.email ?? null,
    username: customUsername || (user.email ? user.email.split("@")[0] : "pengguna"),
    nama: user.user_metadata?.nama || (user.email ? user.email.split("@")[0] : "Pengguna"),
    role,
    halaqoh_kelas: null,
    halaqoh_bagian: null,
    permissions: finalPermissions,
    status: customStatus,
    created_at: new Date().toISOString(),
  };
}

// Karakter berikut bermakna khusus di sintaks filter PostgREST (.or) atau sebagai wildcard ilike.
// Dibuang dari input agar pencarian tidak error atau melebar ke semua baris.
function sanitizeSearchTerm(raw: string): string {
  return raw
    .replace(/[,()"'\\%*_.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type SantriFilterOnly = Omit<SantriFilterParams, "page" | "pageSize">;

// Tipe builder Supabase sangat dalam; dipersempit ke dua method yang dipakai agar compiler tidak
// menelusuri seluruh tipenya (TS2589).
interface FilterableQuery {
  or(filters: string): FilterableQuery;
  eq(column: string, value: string | number): FilterableQuery;
}

function applySantriFilters<T>(query: T, params: SantriFilterOnly): T {
  let q = query as unknown as FilterableQuery;

  const term = params.search ? sanitizeSearchTerm(params.search) : "";
  if (term !== "") {
    q = q.or(`nama_lengkap.ilike.%${term}%,kode.ilike.%${term}%`);
  }
  if (params.asrama) q = q.eq("asrama", params.asrama);
  if (params.blok) q = q.eq("blok", params.blok);
  if (params.kode_kamar) q = q.eq("kode_kamar", params.kode_kamar);
  if (params.kamar) q = q.eq("kamar", params.kamar);
  if (params.halaqoh_kelas) q = q.eq("halaqoh_kelas", Number(params.halaqoh_kelas));
  if (params.halaqoh_bagian) q = q.eq("halaqoh_bagian", params.halaqoh_bagian);

  return q as unknown as T;
}

export async function fetchSantriPaginated(params: SantriFilterParams) {
  const supabase = createClient();
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Coba muat dengan kolom lengkap
  try {
    const query = applySantriFilters(
      supabase
        .from("santri")
        .select(SANTRI_COLUMNS, { count: "exact" })
        .order("halaqoh_kelas", { ascending: true })
        .order("halaqoh_bagian", { ascending: true })
        .order("nama_lengkap", { ascending: true }),
      params
    );

    const { data, count, error } = await query.range(from, to);
    if (error) throw error;

    return {
      rows: (data ?? []) as Santri[],
      total: count ?? 0,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    // Jika Supabase belum menambahkan kolom no_wa / kode_kamar, gunakan fallback
    if (errorMsg.includes("no_wa") || errorMsg.includes("kode_kamar")) {
      const fallbackQuery = applySantriFilters(
        supabase
          .from("santri")
          .select(SANTRI_FALLBACK_COLUMNS, { count: "exact" })
          .order("halaqoh_kelas", { ascending: true })
          .order("halaqoh_bagian", { ascending: true })
          .order("nama_lengkap", { ascending: true }),
        params
      );
      const { data, count, error } = await fallbackQuery.range(from, to);
      if (error) throw new Error(error.message);
      return {
        rows: (data ?? []) as Santri[],
        total: count ?? 0,
      };
    }
    throw new Error(errorMsg);
  }
}

// Supabase membatasi satu respons (default 1000 baris), jadi data diambil bertahap hingga habis.
const FETCH_ALL_PAGE_SIZE = 1000;

export async function fetchAllSantriFiltered(params: SantriFilterOnly) {
  const supabase = createClient();
  const all: Santri[] = [];

  for (let from = 0; ; from += FETCH_ALL_PAGE_SIZE) {
    try {
      const query = applySantriFilters(
        supabase
          .from("santri")
          .select(SANTRI_COLUMNS)
          .order("halaqoh_kelas", { ascending: true })
          .order("halaqoh_bagian", { ascending: true })
          .order("nama_lengkap", { ascending: true })
          .order("id", { ascending: true }),
        params
      );

      const { data, error } = await query.range(from, from + FETCH_ALL_PAGE_SIZE - 1);
      if (error) throw error;

      const batch = (data ?? []) as Santri[];
      all.push(...batch);
      if (batch.length < FETCH_ALL_PAGE_SIZE) break;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes("no_wa") || errorMsg.includes("kode_kamar")) {
        const fallbackQuery = applySantriFilters(
          supabase
            .from("santri")
            .select(SANTRI_FALLBACK_COLUMNS)
            .order("halaqoh_kelas", { ascending: true })
            .order("halaqoh_bagian", { ascending: true })
            .order("nama_lengkap", { ascending: true })
            .order("id", { ascending: true }),
          params
        );
        const { data, error } = await fallbackQuery.range(from, from + FETCH_ALL_PAGE_SIZE - 1);
        if (error) throw new Error(error.message);
        const batch = (data ?? []) as Santri[];
        all.push(...batch);
        if (batch.length < FETCH_ALL_PAGE_SIZE) break;
      } else {
        throw new Error(errorMsg);
      }
    }
  }

  return all;
}

export async function saveSantri(
  payload: Omit<Santri, "id" | "no_urut" | "halaqoh" | "created_at" | "updated_at">,
  id?: string
) {
  const supabase = createClient();
  try {
    if (id) {
      const { error } = await supabase.from("santri").update(payload).eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("santri").insert(payload);
      if (error) throw error;
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    // Jika kolom baru belum ada di Supabase, coba simpan tanpa kolom tersebut
    if (errorMsg.includes("no_wa") || errorMsg.includes("kode_kamar")) {
      const { no_wa: _wa, kode_kamar: _kk, ...fallbackPayload } = payload;
      if (id) {
        const { error } = await supabase.from("santri").update(fallbackPayload).eq("id", id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("santri").insert(fallbackPayload);
        if (error) throw new Error(error.message);
      }
      return;
    }
    throw new Error(errorMsg);
  }
}

export async function deleteSantriById(id: string) {
  const supabase = createClient();
  // Bersihkan relasi nilai khotmil, setoran, dan absensi santri terlebih dahulu jika ada
  await supabase.from("khotmil_nilai").delete().eq("santri_id", id);
  await supabase.from("setoran").delete().eq("santri_id", id);
  await supabase.from("absensi").delete().eq("santri_id", id);

  const { error } = await supabase.from("santri").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteSantriBatch(ids: string[]) {
  if (!ids || ids.length === 0) return;
  const supabase = createClient();
  // Bersihkan relasi anak secara massal
  await supabase.from("khotmil_nilai").delete().in("santri_id", ids);
  await supabase.from("setoran").delete().in("santri_id", ids);
  await supabase.from("absensi").delete().in("santri_id", ids);

  const { error } = await supabase.from("santri").delete().in("id", ids);
  if (error) throw new Error(error.message);
}

export async function deleteAllSantri() {
  const supabase = createClient();
  const { error } = await supabase.from("santri").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) throw new Error(error.message);
}

export async function deleteSetoranBatch(params: {
  santri_ids: string[];
  tipe: TipeSetoran;
  tahun: number;
}) {
  if (!params.santri_ids || params.santri_ids.length === 0) return;
  const supabase = createClient();
  const startYear = `${params.tahun}-01-01`;
  const endYear = `${params.tahun}-12-31`;
  const { error } = await supabase
    .from("setoran")
    .delete()
    .in("santri_id", params.santri_ids)
    .eq("tipe", params.tipe)
    .gte("tanggal", startYear)
    .lte("tanggal", endYear);
  if (error) throw new Error(error.message);
}

export async function deleteAllSetoran(params: {
  tipe: TipeSetoran;
  tahun: number;
}) {
  const supabase = createClient();
  const startYear = `${params.tahun}-01-01`;
  const endYear = `${params.tahun}-12-31`;
  const { error } = await supabase
    .from("setoran")
    .delete()
    .eq("tipe", params.tipe)
    .gte("tanggal", startYear)
    .lte("tanggal", endYear);
  if (error) throw new Error(error.message);
}

export async function fetchAbsensiBulan(
  tahun: number,
  bulan: number,
  sesi?: SesiAbsen | "semua"
) {
  const supabase = createClient();
  const startDate = `${tahun}-${String(bulan).padStart(2, "0")}-01`;
  const lastDay = new Date(tahun, bulan, 0).getDate();
  const endDate = `${tahun}-${String(bulan).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const allRecords: AbsensiRecord[] = [];
  const BATCH_SIZE = 1000;

  for (let from = 0; ; from += BATCH_SIZE) {
    let query = supabase
      .from("absensi")
      .select("id, santri_id, tanggal, sesi, status, penginput")
      .gte("tanggal", startDate)
      .lte("tanggal", endDate)
      .order("tanggal", { ascending: true })
      .order("id", { ascending: true });

    if (sesi && sesi !== "semua") {
      query = query.eq("sesi", sesi);
    }

    const { data, error } = await query.range(from, from + BATCH_SIZE - 1);
    if (error) throw new Error(error.message);

    const batch = (data ?? []) as AbsensiRecord[];
    allRecords.push(...batch);
    if (batch.length < BATCH_SIZE) break;
  }

  return allRecords;
}

/**
 * Mengambil rekap jumlah ketidakhadiran (alfa) per santri untuk bulan & tahun tertentu.
 * Menggabungkan seluruh sesi (pagi & malam) dari tabel absensi dengan chunking loop.
 * Digunakan untuk menampilkan badge status kehadiran di kartu halaqoh santri:
 * - Hijau: tidak ada alfa (0)
 * - Kuning: alfa > 3x (misal 4-5)
 * - Merah: alfa > 5x (misal > 5)
 */
export async function fetchSantriAlfaCounts(
  tahun: number,
  bulan: number
): Promise<Record<string, number>> {
  const supabase = createClient();
  const startDate = `${tahun}-${String(bulan).padStart(2, "0")}-01`;
  const lastDay = new Date(tahun, bulan, 0).getDate();
  const endDate = `${tahun}-${String(bulan).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  try {
    const counts: Record<string, number> = {};
    const BATCH_SIZE = 1000;

    for (let from = 0; ; from += BATCH_SIZE) {
      const { data, error } = await supabase
        .from("absensi")
        .select("santri_id, status")
        .gte("tanggal", startDate)
        .lte("tanggal", endDate)
        .order("id", { ascending: true })
        .range(from, from + BATCH_SIZE - 1);

      if (error) {
        console.error("Gagal mengambil data alfa absensi:", error);
        break;
      }

      for (const row of data || []) {
        const st = String(row.status || "").toLowerCase();
        if (st === "alfa" || st === "a") {
          if (row.santri_id) {
            counts[row.santri_id] = (counts[row.santri_id] || 0) + 1;
          }
        }
      }

      if (!data || data.length < BATCH_SIZE) break;
    }

    return counts;
  } catch (err) {
    console.error("Error fetchSantriAlfaCounts:", err);
    return {};
  }
}

/**
 * Mendapatkan objek waktu saat ini dalam zona waktu WIB (UTC+7).
 */
export function getWibNow(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 7 * 3600000);
}

/**
 * Memeriksa apakah suatu tanggal dan sesi absensi sudah atau sedang berjalan (WIB).
 * Aturan waktu:
 * - Pagi: aktif mulai pukul 04.00 WIB
 * - Malam: aktif mulai pukul 17.00 WIB
 * Hari sebelum hari ini: sudah lewat (true).
 * Hari ini: aktif sesuai jam sesi (Pagi >= 04.00 WIB, Malam >= 17.00 WIB).
 * Hari mendatang: belum berjalan (false).
 */
export function isSessionPastOrCurrent(
  targetYear: number,
  targetMonth: number, // 1 - 12
  targetDay: number,
  sesi: SesiAbsen,
  nowWib: Date = getWibNow()
): boolean {
  const currentYear = nowWib.getFullYear();
  const currentMonth = nowWib.getMonth() + 1;
  const currentDay = nowWib.getDate();
  const currentHour = nowWib.getHours();

  if (targetYear < currentYear) return true;
  if (targetYear > currentYear) return false;

  if (targetMonth < currentMonth) return true;
  if (targetMonth > currentMonth) return false;

  if (targetDay < currentDay) return true;
  if (targetDay > currentDay) return false;

  // targetDay === currentDay (Hari Ini)
  if (sesi === "pagi") {
    return currentHour >= 4;
  }
  if (sesi === "malam") {
    return currentHour >= 17;
  }

  return false;
}

export async function upsertAbsensiCell(params: {
  santri_id: string;
  tanggal: string;
  sesi: SesiAbsen;
  status: StatusAbsen | "";
}) {
  const supabase = createClient();
  if (params.status === "") {
    const { error } = await supabase
      .from("absensi")
      .delete()
      .eq("santri_id", params.santri_id)
      .eq("tanggal", params.tanggal)
      .eq("sesi", params.sesi);
    if (error) throw new Error(error.message);
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("absensi").upsert(
    {
      santri_id: params.santri_id,
      tanggal: params.tanggal,
      sesi: params.sesi,
      status: params.status,
      penginput: user?.id ?? null,
    },
    { onConflict: "santri_id,tanggal,sesi" }
  );

  if (error) throw new Error(error.message);
}

/**
 * Menyimpan beberapa status absensi sekaligus secara batch ke tabel absensi Supabase.
 * Menggunakan upsert dengan onConflict: "santri_id,tanggal,sesi".
 */
export async function upsertAbsensiBatch(
  records: {
    santri_id: string;
    tanggal: string;
    sesi: SesiAbsen;
    status: StatusAbsen;
  }[]
) {
  if (!records || records.length === 0) return;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rows = records.map((r) => ({
    santri_id: r.santri_id,
    tanggal: r.tanggal,
    sesi: r.sesi,
    status: r.status,
    penginput: user?.id ?? null,
  }));

  // Batch dalam chunk 200 baris agar tidak melebihi batasan ukuran payload Supabase
  const CHUNK_SIZE = 200;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from("absensi")
      .upsert(chunk, { onConflict: "santri_id,tanggal,sesi" });
    if (error) throw new Error(error.message);
  }
}

export async function fetchSetoranBulananMerged(
  tahun: number,
  tipe: TipeSetoran,
  filter: Omit<SantriFilterParams, "page" | "pageSize">
): Promise<SetoranBulananRow[]> {
  const supabase = createClient();
  const startYear = `${tahun}-01-01`;
  const endYear = `${tahun}-12-31`;

  const [santriList, rekapResult] = await Promise.all([
    fetchAllSantriFiltered(filter),
    supabase
      .from("v_setoran_bulanan")
      .select(
        "santri_id, jan, feb, mar, apr, mei, jun, jul, agu, sep, okt, nov, des, total_setoran"
      )
      .eq("tahun", tahun)
      .eq("tipe", tipe),
  ]);

  if (rekapResult.error) throw new Error(rekapResult.error.message);

  // Ambil setoran halaman santri terfilter sesuai tahun kalender secara chunked
  const allSetoranRows: { santri_id: string; jumlah_halaman: number | null; jumlah_juz_tambahan: number | null }[] = [];
  const BATCH_SIZE = 1000;
  for (let from = 0; ; from += BATCH_SIZE) {
    const { data, error } = await supabase
      .from("setoran")
      .select("santri_id, jumlah_halaman, jumlah_juz_tambahan")
      .eq("tipe", tipe)
      .gte("tanggal", startYear)
      .lte("tanggal", endYear)
      .range(from, from + BATCH_SIZE - 1);

    if (error) throw new Error(error.message);
    const batch = data || [];
    allSetoranRows.push(...batch);
    if (batch.length < BATCH_SIZE) break;
  }

  const rekapMap = new Map<string, Record<string, number>>();
  (rekapResult.data ?? []).forEach((r) => {
    const normalizeMonthVal = (raw: unknown) => {
      const n = Number(raw ?? 0);
      return tipe === "evaluasi" ? Math.min(30, Math.max(0, Math.round(n))) : n;
    };
    const monthRecord = {
      jan: normalizeMonthVal(r.jan),
      feb: normalizeMonthVal(r.feb),
      mar: normalizeMonthVal(r.mar),
      apr: normalizeMonthVal(r.apr),
      mei: normalizeMonthVal(r.mei),
      jun: normalizeMonthVal(r.jun),
      jul: normalizeMonthVal(r.jul),
      agu: normalizeMonthVal(r.agu),
      sep: normalizeMonthVal(r.sep),
      okt: normalizeMonthVal(r.okt),
      nov: normalizeMonthVal(r.nov),
      des: normalizeMonthVal(r.des),
    };
    rekapMap.set(r.santri_id, {
      ...monthRecord,
      total_setoran:
        tipe === "evaluasi"
          ? getLatestEvaluasiJuz(monthRecord)
          : Math.min(30, Number(r.total_setoran ?? 0)),
    });
  });

  const totalHalamanMap = new Map<string, number>();
  allSetoranRows.forEach((row) => {
    const hlm =
      Number(row.jumlah_halaman) > 0
        ? Number(row.jumlah_halaman)
        : Math.round(Number(row.jumlah_juz_tambahan ?? 0) * 20);
    totalHalamanMap.set(
      row.santri_id,
      (totalHalamanMap.get(row.santri_id) || 0) + hlm
    );
  });

  return santriList.map((s) => {
    const val = rekapMap.get(s.id);
    const totalHlm = totalHalamanMap.get(s.id) || 0;
    const calculatedTotalJuz =
      tipe === "juz_baru"
        ? Math.min(30, Number((totalHlm / 20).toFixed(2)))
        : val
          ? getLatestEvaluasiJuz(val as Record<(typeof SETORAN_MONTH_KEYS)[number], number>)
          : 0;

    return {
      santri_id: s.id,
      no_urut: s.no_urut,
      kode: s.kode,
      nama_lengkap: s.nama_lengkap,
      blok: s.blok,
      asrama: s.asrama,
      kode_kamar: s.kode_kamar,
      kamar: s.kamar,
      halaqoh_kelas: s.halaqoh_kelas,
      halaqoh_bagian: s.halaqoh_bagian,
      halaqoh: s.halaqoh,
      jan: val?.jan ?? 0,
      feb: val?.feb ?? 0,
      mar: val?.mar ?? 0,
      apr: val?.apr ?? 0,
      mei: val?.mei ?? 0,
      jun: val?.jun ?? 0,
      jul: val?.jul ?? 0,
      agu: val?.agu ?? 0,
      sep: val?.sep ?? 0,
      okt: val?.okt ?? 0,
      nov: val?.nov ?? 0,
      des: val?.des ?? 0,
      total_setoran: calculatedTotalJuz,
      total_halaman: totalHlm,
    };
  });
}

/**
 * Mengambil seluruh riwayat setoran per halaman santri secara kronologis
 * dan menghitung status kumulatif (Juz X Halaman Y) per baris secara otomatis.
 */
export async function fetchRiwayatSetoranHalaman(
  santri_id: string,
  tipe: TipeSetoran = "juz_baru",
  tahun?: number
): Promise<RiwayatSetoranItem[]> {
  const supabase = createClient();
  let query = supabase
    .from("setoran")
    .select("id, santri_id, tanggal, tipe, jumlah_halaman, jumlah_juz_tambahan, catatan, penginput, created_at")
    .eq("santri_id", santri_id)
    .eq("tipe", tipe);

  if (tahun) {
    query = query.gte("tanggal", `${tahun}-01-01`).lte("tanggal", `${tahun}-12-31`);
  }

  const { data, error } = await query
    .order("tanggal", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  let runningHalaman = 0;
  return (data ?? []).map((row, idx) => {
    const hlm =
      Number(row.jumlah_halaman) > 0
        ? Number(row.jumlah_halaman)
        : Math.round(Number(row.jumlah_juz_tambahan ?? 0) * 20);
    runningHalaman += hlm;

    return {
      id: row.id,
      santri_id: row.santri_id,
      tanggal: row.tanggal,
      tipe: row.tipe as TipeSetoran,
      jumlah_halaman: hlm,
      jumlah_juz_tambahan: Number(row.jumlah_juz_tambahan ?? (hlm / 20)),
      catatan: row.catatan,
      penginput: row.penginput,
      created_at: row.created_at,
      no: idx + 1,
      totalHalamanKumulatif: runningHalaman,
      rincianStatus: formatHalamanToJuzStatus(runningHalaman),
    };
  });
}

/**
 * Menyimpan setoran berbasis halaman (+N halaman).
 * Mengisi jumlah_halaman dan jumlah_juz_tambahan (N / 20).
 */
export async function insertSetoranHalaman(payload: {
  santri_id: string;
  tanggal: string;
  tipe?: TipeSetoran;
  jumlah_halaman: number;
  catatan?: string;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const tipe = payload.tipe || "juz_baru";
  const jumlahHalaman = Math.max(1, Math.round(payload.jumlah_halaman));
  const jumlahJuz = Number((jumlahHalaman / 20).toFixed(2));

  const { error } = await supabase.from("setoran").insert({
    santri_id: payload.santri_id,
    tanggal: payload.tanggal,
    tipe,
    jumlah_halaman: jumlahHalaman,
    jumlah_juz_tambahan: jumlahJuz,
    catatan: payload.catatan?.trim() || null,
    penginput: user?.id ?? null,
  });

  if (error) throw new Error(error.message);
}

/**
 * Menghapus 1 baris log setoran berdasarkan ID.
 */
export async function deleteSetoranLogById(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("setoran").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export interface BulkCapaianJuzBaruItem {
  santri_id: string;
  targetTotalHalaman: number;
}

/**
 * Mengatur capaian total Juz & Halaman santri pada tahun aktif secara massal (tombol ++).
 * Mengganti seluruh catatan setoran juz_baru santri pada tahun terkait menjadi 1 data capaian awal baru.
 */
export async function batchSetCapaianJuzBaru(params: {
  tahun: number;
  tanggal: string;
  items: BulkCapaianJuzBaruItem[];
}): Promise<{
  succeededIds: string[];
  failedItems: { santri_id: string; error: string }[];
}> {
  if (!params.items || params.items.length === 0) {
    return { succeededIds: [], failedItems: [] };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const startYear = `${params.tahun}-01-01`;
  const endYear = `${params.tahun}-12-31`;
  const penginput = user?.id ?? null;

  const processItem = async (item: BulkCapaianJuzBaruItem): Promise<string> => {
    const safeHalaman = Math.max(0, Math.min(600, Math.round(item.targetTotalHalaman)));
    const jumlahJuz = Number((safeHalaman / 20).toFixed(2));
    const statusLabel = formatHalamanToJuzStatus(safeHalaman);
    const catatan = `[Atur Langsung ++] Capaian diatur menjadi ${statusLabel}`;

    const { data: existingRows, error: fetchErr } = await supabase
      .from("setoran")
      .select("id")
      .eq("santri_id", item.santri_id)
      .eq("tipe", "juz_baru")
      .gte("tanggal", startYear)
      .lte("tanggal", endYear);

    if (fetchErr) throw new Error(fetchErr.message);
    const existingIds = (existingRows ?? []).map((r) => r.id);

    if (safeHalaman === 0) {
      if (existingIds.length > 0) {
        const { error: delErr } = await supabase.from("setoran").delete().in("id", existingIds);
        if (delErr) throw new Error(delErr.message);
      }
      return item.santri_id;
    }

    if (existingIds.length === 1) {
      const { error: updErr } = await supabase
        .from("setoran")
        .update({
          tanggal: params.tanggal,
          jumlah_halaman: safeHalaman,
          jumlah_juz_tambahan: jumlahJuz,
          catatan,
          penginput,
        })
        .eq("id", existingIds[0]);

      if (updErr) throw new Error(updErr.message);
      return item.santri_id;
    }

    const { data: insertedRow, error: insErr } = await supabase
      .from("setoran")
      .insert({
        santri_id: item.santri_id,
        tanggal: params.tanggal,
        tipe: "juz_baru",
        jumlah_halaman: safeHalaman,
        jumlah_juz_tambahan: jumlahJuz,
        catatan,
        penginput,
      })
      .select("id")
      .single();

    if (insErr) throw new Error(insErr.message);

    if (existingIds.length > 0) {
      const { error: delErr } = await supabase.from("setoran").delete().in("id", existingIds);
      if (delErr) {
        // Rollback baris baru agar total halaman tidak menjadi ganda
        if (insertedRow?.id) {
          await supabase.from("setoran").delete().eq("id", insertedRow.id);
        }
        throw new Error(delErr.message);
      }
    }

    return item.santri_id;
  };

  const succeededIds: string[] = [];
  const failedItems: { santri_id: string; error: string }[] = [];
  const CHUNK_SIZE = 10;

  for (let i = 0; i < params.items.length; i += CHUNK_SIZE) {
    const chunk = params.items.slice(i, i + CHUNK_SIZE);
    const results = await Promise.allSettled(chunk.map((item) => processItem(item)));

    results.forEach((res, idx) => {
      const santriId = chunk[idx].santri_id;
      if (res.status === "fulfilled") {
        succeededIds.push(santriId);
      } else {
        const message = res.reason instanceof Error ? res.reason.message : String(res.reason);
        failedItems.push({ santri_id: santriId, error: message });
      }
    });
  }

  return { succeededIds, failedItems };
}

/**
 * Mengambil seluruh log setoran santri untuk 1 tahun tertentu, lengkap dengan catatan per tanggal.
 */
export async function fetchSantriSetoranDetailTahun(
  santri_id: string,
  tahun: number,
  tipe: TipeSetoran = "juz_baru"
) {
  const supabase = createClient();
  const startYear = `${tahun}-01-01`;
  const endYear = `${tahun}-12-31`;

  const { data, error } = await supabase
    .from("setoran")
    .select("id, santri_id, tanggal, tipe, jumlah_juz_tambahan, catatan, created_at")
    .eq("santri_id", santri_id)
    .eq("tipe", tipe)
    .gte("tanggal", startYear)
    .lte("tanggal", endYear)
    .order("tanggal", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as {
    id: string;
    santri_id: string;
    tanggal: string;
    tipe: TipeSetoran;
    jumlah_juz_tambahan: number;
    catatan: string | null;
    created_at: string;
  }[];
}

/**
 * Menyimpan / memperbarui jumlah juz dan catatan untuk bulan tertentu secara langsung tanpa membuka pop-up tambah log.
 */
export async function saveSetoranBulanDirect(params: {
  santri_id: string;
  tahun: number;
  bulan: number; // 1 - 12
  tipe: TipeSetoran;
  jumlah_juz_tambahan: number;
  tanggal?: string;
  catatan?: string;
}) {
  if (params.tipe === "evaluasi") {
    if (
      !Number.isInteger(params.jumlah_juz_tambahan) ||
      params.jumlah_juz_tambahan < 0 ||
      params.jumlah_juz_tambahan > 30
    ) {
      throw new Error("Nilai evaluasi harus berupa bilangan bulat 1 sampai 30 Juz.");
    }
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const startDate = `${params.tahun}-${String(params.bulan).padStart(2, "0")}-01`;
  const lastDay = new Date(params.tahun, params.bulan, 0).getDate();
  const endDate = `${params.tahun}-${String(params.bulan).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // Ambil record yang sudah ada di bulan tersebut (urut terbaru lebih dulu untuk evaluasi)
  const { data: existing, error: fetchErr } = await supabase
    .from("setoran")
    .select("id, jumlah_juz_tambahan, catatan")
    .eq("santri_id", params.santri_id)
    .eq("tipe", params.tipe)
    .gte("tanggal", startDate)
    .lte("tanggal", endDate)
    .order("tanggal", { ascending: false })
    .order("created_at", { ascending: false });

  if (fetchErr) throw new Error(fetchErr.message);

  const nilaiJuz =
    params.tipe === "evaluasi"
      ? Math.round(params.jumlah_juz_tambahan)
      : params.jumlah_juz_tambahan;
  const jumlahHalaman = Math.max(0, Math.round(nilaiJuz * 20));

  if (nilaiJuz <= 0) {
    // Jika diset ke 0 atau negatif, hapus record di bulan ini
    if (existing && existing.length > 0) {
      const ids = existing.map((r) => r.id);
      const { error: delErr } = await supabase.from("setoran").delete().in("id", ids);
      if (delErr) throw new Error(delErr.message);
    }
    return;
  }

  if (existing && existing.length > 0) {
    // Update record utama dan sinkronkan jumlah_halaman
    const firstId = existing[0].id;
    const updatePayload: Record<string, unknown> = {
      jumlah_juz_tambahan: nilaiJuz,
      jumlah_halaman: jumlahHalaman,
      penginput: user?.id ?? null,
    };
    if (params.tanggal) {
      updatePayload.tanggal = params.tanggal;
    }
    if (params.catatan !== undefined) {
      updatePayload.catatan = params.catatan.trim() || null;
    }
    const { error: updErr } = await supabase
      .from("setoran")
      .update(updatePayload)
      .eq("id", firstId);
    if (updErr) throw new Error(updErr.message);

    // Pada mode evaluasi, bersihkan record duplikat di bulan yang sama agar 1 bulan = 1 snapshot
    if (params.tipe === "evaluasi" && existing.length > 1) {
      const duplicateIds = existing.slice(1).map((r) => r.id);
      await supabase.from("setoran").delete().in("id", duplicateIds);
    }
  } else {
    // Insert baru lengkap dengan jumlah_halaman tersinkronisasi
    const { error: insErr } = await supabase.from("setoran").insert({
      santri_id: params.santri_id,
      tanggal: params.tanggal || startDate,
      tipe: params.tipe,
      jumlah_juz_tambahan: nilaiJuz,
      jumlah_halaman: jumlahHalaman,
      catatan: params.catatan?.trim() || null,
      penginput: user?.id ?? null,
    });
    if (insErr) throw new Error(insErr.message);
  }
}

export async function insertSetoranLog(payload: {
  santri_id: string;
  tanggal: string;
  tipe: TipeSetoran;
  jumlah_juz_tambahan: number;
  catatan?: string;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("setoran").insert({
    santri_id: payload.santri_id,
    tanggal: payload.tanggal,
    tipe: payload.tipe,
    jumlah_juz_tambahan: payload.jumlah_juz_tambahan,
    catatan: payload.catatan ?? null,
    penginput: user?.id ?? null,
  });

  if (error) throw new Error(error.message);
}

export async function fetchKhotmilTahapNilai(jenis: JenisKhotmil, tahap: number) {
  const supabase = createClient();
  const allRows: KhotmilNilaiRecord[] = [];
  const BATCH_SIZE = 1000;

  for (let from = 0; ; from += BATCH_SIZE) {
    const { data, error } = await supabase
      .from("khotmil_nilai")
      .select("id, santri_id, jenis, tahap, juz, nilai")
      .eq("jenis", jenis)
      .eq("tahap", tahap)
      .range(from, from + BATCH_SIZE - 1);

    if (error) throw new Error(error.message);
    const batch = (data ?? []) as KhotmilNilaiRecord[];
    allRows.push(...batch);
    if (batch.length < BATCH_SIZE) break;
  }

  return allRows;
}

/**
 * Mengambil seluruh catatan nilai khotmil untuk semua tahap pada jenis tertentu (15 Juz / 30 Juz).
 */
export async function fetchKhotmilAllNilai(jenis: JenisKhotmil): Promise<KhotmilNilaiRecord[]> {
  const supabase = createClient();
  const allRows: KhotmilNilaiRecord[] = [];
  const BATCH_SIZE = 1000;

  for (let from = 0; ; from += BATCH_SIZE) {
    const { data, error } = await supabase
      .from("khotmil_nilai")
      .select("id, santri_id, jenis, tahap, juz, nilai")
      .eq("jenis", jenis)
      .range(from, from + BATCH_SIZE - 1);

    if (error) throw new Error(error.message);
    const batch = (data ?? []) as KhotmilNilaiRecord[];
    allRows.push(...batch);
    if (batch.length < BATCH_SIZE) break;
  }

  return allRows;
}

export async function upsertKhotmilNilaiBatch(
  santri_id: string,
  jenis: JenisKhotmil,
  tahap: number,
  scores: { juz: number; nilai: number }[]
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rows = scores.map((item) => ({
    santri_id,
    jenis,
    tahap,
    juz: item.juz,
    nilai: item.nilai,
    penginput: user?.id ?? null,
  }));

  const { error } = await supabase
    .from("khotmil_nilai")
    .upsert(rows, { onConflict: "santri_id,jenis,tahap,juz" });

  if (error) throw new Error(error.message);

  // Pastikan santri juga terdaftar di tabel khotmil_peserta
  try {
    await supabase
      .from("khotmil_peserta")
      .upsert({ santri_id, jenis }, { onConflict: "santri_id,jenis" });
  } catch {
    // Lewati jika tabel belum siap
  }
}

/**
 * Mengambil riwayat absensi seorang santri dalam tahun tertentu.
 */
export async function fetchSantriAbsensiDetail(santri_id: string, tahun: number) {
  const supabase = createClient();
  const startYear = `${tahun}-01-01`;
  const endYear = `${tahun}-12-31`;

  const { data, error } = await supabase
    .from("absensi")
    .select("id, santri_id, tanggal, sesi, status, penginput, created_at")
    .eq("santri_id", santri_id)
    .gte("tanggal", startYear)
    .lte("tanggal", endYear)
    .order("tanggal", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Mengambil pemetaan pembimbing halaqoh dari tabel profiles.
 */
export async function fetchPembimbingMap(): Promise<Record<string, string>> {
  const supabase = createClient();
  const [profileRes, settingRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("nama, role, halaqoh_kelas, halaqoh_bagian")
      .not("halaqoh_kelas", "is", null)
      .not("halaqoh_bagian", "is", null),
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "HALAQOH_FORMASI")
      .maybeSingle(),
  ]);

  const map: Record<string, string> = {};

  // 1. Baca formasi dari app_settings
  if (settingRes.data?.value) {
    const list = Array.isArray(settingRes.data.value)
      ? settingRes.data.value
      : (settingRes.data.value as { formasi?: any[] })?.formasi;
    if (Array.isArray(list)) {
      list.forEach((f: any) => {
        if (f.kelas && f.bagian && f.pembimbing) {
          map[`${f.kelas}_${f.bagian}`] = f.pembimbing;
        }
      });
    }
  }

  // 2. Padukan dengan akun riil di profiles jika sudah ditetapkan
  for (const p of profileRes.data || []) {
    if (p.nama && p.halaqoh_kelas && p.halaqoh_bagian) {
      map[`${p.halaqoh_kelas}_${p.halaqoh_bagian}`] = p.nama;
    }
  }
  return map;
}

/**
 * Mengambil ID santri yang terdaftar dalam ujian khotmil (dari tabel khotmil_peserta & khotmil_nilai).
 */
export async function fetchKhotmilRegisteredSantriIds(
  jenis: JenisKhotmil
): Promise<string[]> {
  const supabase = createClient();

  const [pesertaRes, nilaiRes] = await Promise.all([
    supabase.from("khotmil_peserta").select("santri_id").eq("jenis", jenis),
    supabase.from("khotmil_nilai").select("santri_id").eq("jenis", jenis),
  ]);

  const idSet = new Set<string>();

  (pesertaRes.data || []).forEach((row) => {
    if (row.santri_id) idSet.add(row.santri_id);
  });
  (nilaiRes.data || []).forEach((row) => {
    if (row.santri_id) idSet.add(row.santri_id);
  });

  return Array.from(idSet);
}

/**
 * Mendaftarkan beberapa santri sekaligus ke ujian Khotmil (tersimpan di database khotmil_peserta).
 */
export async function registerKhotmilSantriBatch(
  santriIds: string[],
  jenis: JenisKhotmil
): Promise<void> {
  if (!santriIds || santriIds.length === 0) return;
  const supabase = createClient();

  const rows = santriIds.map((id) => ({
    santri_id: id,
    jenis,
  }));

  const { error } = await supabase
    .from("khotmil_peserta")
    .upsert(rows, { onConflict: "santri_id,jenis" });

  if (error) {
    console.error("Gagal mendaftarkan santri ke khotmil_peserta:", error);
    throw new Error(error.message);
  }
}

/**
 * Menghapus seluruh catatan pendaftaran & nilai khotmil seorang santri untuk jenis tertentu.
 */
export async function deleteKhotmilSantriRegistration(
  santriId: string,
  jenis: JenisKhotmil
): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("khotmil_peserta")
    .delete()
    .eq("santri_id", santriId)
    .eq("jenis", jenis);

  const { error } = await supabase
    .from("khotmil_nilai")
    .delete()
    .eq("santri_id", santriId)
    .eq("jenis", jenis);

  if (error) {
    console.error("Gagal menghapus nilai khotmil santri:", error);
    throw new Error(error.message);
  }
}

export interface SantriKhotmilTransferPreview {
  santriId: string;
  tahap1To4ScoresCount: number;
  migratedTahapNumbers: number[];
  hasTahap5Score: boolean;
  tahap5ScoreCount: number;
  alreadyIn30: boolean;
  conflictTahap1To4Count: number;
}

export interface TransferKhotmilBatchParams {
  santriIds: string[];
  carryOverTahap1To4: boolean;
  overwriteExisting30?: boolean;
  catatan?: string;
}

export interface TransferKhotmilBatchResult {
  transferredCount: number;
  copiedScoresCount: number;
  skippedConflictCount: number;
}

function getValidTahap1To4JuzSetFor30(): Set<string> {
  const valid = new Set<string>();
  KHOTMIL_30_TAHAP.filter((t) => t.tahap >= 1 && t.tahap <= 4).forEach((t) => {
    t.juzList.forEach((j) => {
      valid.add(`${t.tahap}_${j}`);
    });
  });
  return valid;
}

/**
 * Mengambil pratinjau nilai & status perpindahan santri dari Khotmil 15 Juz ke Khotmil 30 Juz.
 */
export async function fetchSantriKhotmilTransferPreview(
  santriIds: string[]
): Promise<Record<string, SantriKhotmilTransferPreview>> {
  const result: Record<string, SantriKhotmilTransferPreview> = {};
  if (!santriIds || santriIds.length === 0) return result;

  const supabase = createClient();
  const validKeys = getValidTahap1To4JuzSetFor30();

  const [nilaiRes, peserta30Res] = await Promise.all([
    supabase
      .from("khotmil_nilai")
      .select("santri_id, jenis, tahap, juz, nilai")
      .in("santri_id", santriIds)
      .in("jenis", ["khotmil15", "khotmil30"]),
    supabase
      .from("khotmil_peserta")
      .select("santri_id")
      .in("santri_id", santriIds)
      .eq("jenis", "khotmil30"),
  ]);

  if (nilaiRes.error) throw new Error(nilaiRes.error.message);
  if (peserta30Res.error) throw new Error(peserta30Res.error.message);

  const peserta30Set = new Set((peserta30Res.data || []).map((r) => String(r.santri_id)));
  const existing30KeysBySantri = new Map<string, Set<string>>();
  const nilai15BySantri = new Map<string, { tahap: number; juz: number; nilai: number }[]>();

  (nilaiRes.data || []).forEach((row) => {
    const sid = String(row.santri_id);
    if (row.jenis === "khotmil30") {
      if (!existing30KeysBySantri.has(sid)) existing30KeysBySantri.set(sid, new Set());
      existing30KeysBySantri.get(sid)!.add(`${row.tahap}_${row.juz}`);
    } else if (row.jenis === "khotmil15") {
      if (!nilai15BySantri.has(sid)) nilai15BySantri.set(sid, []);
      nilai15BySantri.get(sid)!.push({
        tahap: Number(row.tahap),
        juz: Number(row.juz),
        nilai: Number(row.nilai),
      });
    }
  });

  santriIds.forEach((sid) => {
    const rows15 = nilai15BySantri.get(sid) || [];
    const existing30 = existing30KeysBySantri.get(sid) || new Set<string>();
    const tahapSet = new Set<number>();
    let tahap1To4ScoresCount = 0;
    let tahap5ScoreCount = 0;
    let conflictTahap1To4Count = 0;

    rows15.forEach((r) => {
      const key = `${r.tahap}_${r.juz}`;
      if (r.tahap >= 1 && r.tahap <= 4 && validKeys.has(key)) {
        tahap1To4ScoresCount++;
        tahapSet.add(r.tahap);
        if (existing30.has(key)) {
          conflictTahap1To4Count++;
        }
      } else if (r.tahap === 5) {
        tahap5ScoreCount++;
      }
    });

    result[sid] = {
      santriId: sid,
      tahap1To4ScoresCount,
      migratedTahapNumbers: Array.from(tahapSet).sort((a, b) => a - b),
      hasTahap5Score: tahap5ScoreCount > 0,
      tahap5ScoreCount,
      alreadyIn30: peserta30Set.has(sid) || existing30.size > 0,
      conflictTahap1To4Count,
    };
  });

  return result;
}

/**
 * Memindahkan satu atau banyak santri sekaligus dari Khotmil 15 Juz ke Khotmil 30 Juz.
 * Menggunakan pola aman Write-Before-Delete: daftarkan & salin nilai ke khotmil30 dahulu,
 * baru hapus kepesertaan & nilai lama di khotmil15 agar tidak terjadi data hilang.
 */
export async function transferKhotmil15To30Batch(
  params: TransferKhotmilBatchParams
): Promise<TransferKhotmilBatchResult> {
  const { santriIds, carryOverTahap1To4, overwriteExisting30 = false, catatan } = params;
  const uniqueIds = Array.from(new Set(santriIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return { transferredCount: 0, copiedScoresCount: 0, skippedConflictCount: 0 };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Pastikan semua santri terdaftar di khotmil_peserta sebagai khotmil30
  const pesertaRows = uniqueIds.map((id) => ({
    santri_id: id,
    jenis: "khotmil30" as JenisKhotmil,
  }));
  const { error: pesertaErr } = await supabase
    .from("khotmil_peserta")
    .upsert(pesertaRows, { onConflict: "santri_id,jenis" });

  if (pesertaErr) {
    throw new Error("Gagal mendaftarkan santri ke Khotmil 30 Juz: " + pesertaErr.message);
  }

  let copiedScoresCount = 0;
  let skippedConflictCount = 0;

  // 2. Jika diminta, salin nilai Tahap 1-4 dari khotmil15 ke khotmil30
  if (carryOverTahap1To4) {
    const validKeys = getValidTahap1To4JuzSetFor30();
    const [nilai15Res, existing30Res] = await Promise.all([
      supabase
        .from("khotmil_nilai")
        .select("santri_id, tahap, juz, nilai")
        .in("santri_id", uniqueIds)
        .eq("jenis", "khotmil15")
        .in("tahap", [1, 2, 3, 4]),
      supabase
        .from("khotmil_nilai")
        .select("santri_id, tahap, juz")
        .in("santri_id", uniqueIds)
        .eq("jenis", "khotmil30")
        .in("tahap", [1, 2, 3, 4]),
    ]);

    if (nilai15Res.error) {
      throw new Error("Gagal membaca nilai Khotmil 15 Juz: " + nilai15Res.error.message);
    }
    if (existing30Res.error) {
      throw new Error("Gagal memeriksa nilai Khotmil 30 Juz yang ada: " + existing30Res.error.message);
    }

    const existing30PairSet = new Set(
      (existing30Res.data || []).map((r) => `${r.santri_id}_${r.tahap}_${r.juz}`)
    );

    const rowsToUpsert: {
      santri_id: string;
      jenis: JenisKhotmil;
      tahap: number;
      juz: number;
      nilai: number;
      penginput: string | null;
    }[] = [];

    (nilai15Res.data || []).forEach((row) => {
      const tahap = Number(row.tahap);
      const juz = Number(row.juz);
      if (!validKeys.has(`${tahap}_${juz}`)) return;

      const pairKey = `${row.santri_id}_${tahap}_${juz}`;
      if (!overwriteExisting30 && existing30PairSet.has(pairKey)) {
        skippedConflictCount++;
        return;
      }

      rowsToUpsert.push({
        santri_id: String(row.santri_id),
        jenis: "khotmil30",
        tahap,
        juz,
        nilai: Number(row.nilai),
        penginput: user?.id ?? null,
      });
    });

    const CHUNK_SIZE = 200;
    for (let i = 0; i < rowsToUpsert.length; i += CHUNK_SIZE) {
      const chunk = rowsToUpsert.slice(i, i + CHUNK_SIZE);
      const { error: upsertErr } = await supabase
        .from("khotmil_nilai")
        .upsert(chunk, { onConflict: "santri_id,jenis,tahap,juz" });

      if (upsertErr) {
        throw new Error("Gagal menyalin nilai Tahap 1-4 ke Khotmil 30 Juz: " + upsertErr.message);
      }
    }

    copiedScoresCount = rowsToUpsert.length;
  }

  // 3. Hapus kepesertaan dan nilai lama di Khotmil 15 Juz agar tidak ganda
  const { error: delPesertaErr } = await supabase
    .from("khotmil_peserta")
    .delete()
    .in("santri_id", uniqueIds)
    .eq("jenis", "khotmil15");

  if (delPesertaErr) {
    throw new Error("Gagal menghapus kepesertaan lama Khotmil 15 Juz: " + delPesertaErr.message);
  }

  const { error: delNilaiErr } = await supabase
    .from("khotmil_nilai")
    .delete()
    .in("santri_id", uniqueIds)
    .eq("jenis", "khotmil15");

  if (delNilaiErr) {
    throw new Error("Gagal menghapus nilai lama Khotmil 15 Juz: " + delNilaiErr.message);
  }

  // 4. Catat riwayat aktivitas secara non-blocking (hanya berlaku bagi admin/pengurus)
  if (typeof window !== "undefined") {
    try {
      const descParts = [
        `Memindahkan ${uniqueIds.length} santri dari Khotmil 15 Juz ke Khotmil 30 Juz`,
        carryOverTahap1To4
          ? `(${copiedScoresCount} nilai Tahap 1-4 disalin${skippedConflictCount > 0 ? `, ${skippedConflictCount} bentrok dilewati` : ""})`
          : "(ujian ulang dari nol / tanpa salin nilai)",
      ];
      if (catatan?.trim()) {
        descParts.push(`Catatan: ${catatan.trim()}`);
      }
      await fetch("/api/admin/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logAction: "TRANSFER_KHOTMIL_15_TO_30",
          kategori: "Penilaian Tahfidz",
          deskripsi: descParts.join(" "),
        }),
      });
    } catch {
      // Non-blocking audit log
    }
  }

  return {
    transferredCount: uniqueIds.length,
    copiedScoresCount,
    skippedConflictCount,
  };
}

