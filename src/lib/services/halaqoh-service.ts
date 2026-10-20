import { createClient } from "@/lib/supabase/client";
import { PEMETAAN_HALAQOH_KELAS } from "@/types/database";

export interface FormasiHalaqohItem {
  id: string; // e.g. "1-A"
  kelas: number; // 1 to 10
  bagian: string; // e.g. "A", "B", "C"
  pembimbing?: string;
  target_juz?: string;
}

const LOCAL_STORAGE_HALAQOH_KEY = "lptq_halaqoh_formasi";
const LOCAL_STORAGE_PEMBIMBING_KEY = "lptq_halaqoh_pembimbing";

// Daftar default formasi halaqoh
export const DEFAULT_FORMASI_HALAQOH: FormasiHalaqohItem[] = [
  { id: "1-A", kelas: 1, bagian: "A", pembimbing: "Ust. Ahmad Fauzan", target_juz: "Juz 1 - 3" },
  { id: "1-B", kelas: 1, bagian: "B", pembimbing: "Ust. M. Ridwan", target_juz: "Juz 1 - 3" },
  { id: "2-A", kelas: 2, bagian: "A", pembimbing: "Ust. Zainul Arifin", target_juz: "Juz 4 - 6" },
  { id: "2-B", kelas: 2, bagian: "B", pembimbing: "Ust. M. Syukron", target_juz: "Juz 4 - 6" },
  { id: "3-A", kelas: 3, bagian: "A", pembimbing: "Ust. Abdullah Kafabihi", target_juz: "Juz 7 - 9" },
  { id: "3-B", kelas: 3, bagian: "B", pembimbing: "Ust. Hasan Bisri", target_juz: "Juz 7 - 9" },
  { id: "4-A", kelas: 4, bagian: "A", pembimbing: "Ust. Luqman Hakim", target_juz: "Juz 10 - 12" },
  { id: "4-B", kelas: 4, bagian: "B", pembimbing: "Ust. Ali Maksum", target_juz: "Juz 10 - 12" },
  { id: "5-A", kelas: 5, bagian: "A", pembimbing: "Ust. M. Lutfi", target_juz: "Juz 13 - 15" },
  { id: "5-B", kelas: 5, bagian: "B", pembimbing: "Ust. Fathur Rozak", target_juz: "Juz 13 - 15" },
  { id: "6-A", kelas: 6, bagian: "A", pembimbing: "Ust. Muhsin Ali", target_juz: "Juz 16 - 18" },
  { id: "6-B", kelas: 6, bagian: "B", pembimbing: "Ust. M. Hidayat", target_juz: "Juz 16 - 18" },
  { id: "7-A", kelas: 7, bagian: "A", pembimbing: "Ust. Syamsul Huda", target_juz: "Juz 19 - 21" },
  { id: "7-B", kelas: 7, bagian: "B", pembimbing: "Ust. Khoirul Anam", target_juz: "Juz 19 - 21" },
  { id: "8-A", kelas: 8, bagian: "A", pembimbing: "Ust. Abdul Manan", target_juz: "Juz 22 - 24" },
  { id: "8-B", kelas: 8, bagian: "B", pembimbing: "Ust. Badawi", target_juz: "Juz 22 - 24" },
  { id: "9-A", kelas: 9, bagian: "A", pembimbing: "Ust. M. Shodiq", target_juz: "Juz 25 - 27" },
  { id: "9-B", kelas: 9, bagian: "B", pembimbing: "Ust. Ilham Akbar", target_juz: "Juz 25 - 27" },
  { id: "10-A", kelas: 10, bagian: "A", pembimbing: "Ust. Kholilur Rahman", target_juz: "Juz 28 - 30" },
  { id: "10-B", kelas: 10, bagian: "B", pembimbing: "Ust. Zainuddin", target_juz: "Juz 28 - 30" },
];

/**
 * Memuat formasi halaqoh dari Supabase app_settings atau localStorage
 */
export async function loadHalaqohFormasi(): Promise<FormasiHalaqohItem[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "HALAQOH_FORMASI")
      .maybeSingle();

    if (!error && data?.value) {
      const items = Array.isArray(data.value) ? data.value : data.value.formasi;
      if (Array.isArray(items) && items.length > 0) {
        if (typeof window !== "undefined") {
          localStorage.setItem(LOCAL_STORAGE_HALAQOH_KEY, JSON.stringify(items));
        }
        return items;
      }
    }
  } catch {
    // Abaikan jika supabase belum siap
  }

  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_HALAQOH_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // LocalStorage error
    }
  }

  return DEFAULT_FORMASI_HALAQOH;
}

/**
 * Menyimpan daftar formasi halaqoh ke Supabase dan localStorage
 */
export async function saveHalaqohFormasi(items: FormasiHalaqohItem[]): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_STORAGE_HALAQOH_KEY, JSON.stringify(items));
  }

  try {
    const supabase = createClient();
    await supabase.from("app_settings").upsert(
      [
        {
          key: "HALAQOH_FORMASI",
          value: items,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: "key" }
    );
  } catch {
    // Graceful offline
  }
}

/**
 * Memuat mapping nama pembimbing per id halaqoh ("1-A": "Ust. Ahmad")
 */
export async function loadPembimbingMap(): Promise<Record<string, string>> {
  const formasi = await loadHalaqohFormasi();
  const map: Record<string, string> = {};
  formasi.forEach((f) => {
    map[f.id] = f.pembimbing || "";
  });
  return map;
}

/**
 * Memperbarui nama pembimbing untuk setiap halaqoh
 */
export async function updatePembimbingMap(map: Record<string, string>): Promise<FormasiHalaqohItem[]> {
  const current = await loadHalaqohFormasi();
  const updated = current.map((item) => ({
    ...item,
    pembimbing: map[item.id] !== undefined ? map[item.id] : item.pembimbing,
  }));

  await saveHalaqohFormasi(updated);
  return updated;
}

/**
 * Menambah formasi halaqoh baru (tombol +)
 */
export async function addFormasiHalaqoh(
  kelas: number,
  bagian: string,
  pembimbing: string = ""
): Promise<FormasiHalaqohItem[]> {
  const cleanBagian = bagian.trim().toUpperCase();
  const id = `${kelas}-${cleanBagian}`;
  const target_juz = PEMETAAN_HALAQOH_KELAS[kelas] || "-";

  const current = await loadHalaqohFormasi();
  // Cek apakah sudah ada
  const existingIdx = current.findIndex((item) => item.id === id);
  let nextList: FormasiHalaqohItem[];

  if (existingIdx >= 0) {
    nextList = [...current];
    nextList[existingIdx] = {
      ...nextList[existingIdx],
      pembimbing: pembimbing || nextList[existingIdx].pembimbing,
      target_juz,
    };
  } else {
    const newItem: FormasiHalaqohItem = {
      id,
      kelas,
      bagian: cleanBagian,
      pembimbing: pembimbing || "",
      target_juz,
    };
    nextList = [...current, newItem];
  }

  // Urutkan berdasarkan kelas ascending lalu bagian
  nextList.sort((a, b) => {
    if (a.kelas !== b.kelas) return a.kelas - b.kelas;
    return a.bagian.localeCompare(b.bagian);
  });

  await saveHalaqohFormasi(nextList);
  return nextList;
}

/**
 * Menghapus formasi halaqoh
 */
export async function deleteFormasiHalaqoh(id: string): Promise<FormasiHalaqohItem[]> {
  const current = await loadHalaqohFormasi();
  const nextList = current.filter((item) => item.id !== id);
  await saveHalaqohFormasi(nextList);
  return nextList;
}

/**
 * Mendapatkan daftar unik Bagian dan Kelas dari formasi aktif
 * Digunakan untuk mengisi enum kolom (Gambar 5) secara dinamis
 */
export function getDynamicHalaqohOptions(formasi: FormasiHalaqohItem[]) {
  const kelasSet = new Set<number>();
  const bagianSet = new Set<string>();

  formasi.forEach((f) => {
    kelasSet.add(f.kelas);
    bagianSet.add(f.bagian);
  });

  // Pastikan selalu ada kelas 1-10
  for (let k = 1; k <= 10; k++) kelasSet.add(k);
  // Default A-F jika belum ada
  ["A", "B", "C", "D", "E", "F"].forEach((b) => bagianSet.add(b));

  return {
    kelasList: Array.from(kelasSet).sort((a, b) => a - b),
    bagianList: Array.from(bagianSet).sort(),
  };
}
