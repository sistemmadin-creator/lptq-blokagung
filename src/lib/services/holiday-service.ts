import { createClient } from "@/lib/supabase/client";
import { SesiAbsen } from "@/types/database";

export interface HariLiburItem {
  id: string;               // ID unik / timestamp
  tanggal: string;          // Format ISO: "YYYY-MM-DD"
  keterangan: string;       // Nama / alasan libur, misal: "Hari Santri Nasional"
  sesi: SesiAbsen | "semua";// "semua" | "pagi" | "malam"
  created_at: string;
}

const HOLIDAYS_STORAGE_KEY = "lptq_app_holidays_cache";

/**
 * Mengecek apakah tanggal tertentu adalah hari Jumat
 */
export function isFridayDate(year: number, month1Based: number, day: number): boolean {
  const d = new Date(year, month1Based - 1, day);
  return d.getDay() === 5;
}

/**
 * Mengambil daftar seluruh hari libur khusus dari Supabase app_settings
 */
export async function fetchCustomHolidays(): Promise<HariLiburItem[]> {
  // Cek cache lokal terlebih dahulu untuk rendering seketika
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(HOLIDAYS_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          // Revalidasi di background
          fetchRemoteHolidays().then((remote) => {
            if (remote) {
              localStorage.setItem(HOLIDAYS_STORAGE_KEY, JSON.stringify(remote));
            }
          });
          return parsed;
        }
      }
    } catch {}
  }

  const remote = await fetchRemoteHolidays();
  if (remote) {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(HOLIDAYS_STORAGE_KEY, JSON.stringify(remote));
      } catch {}
    }
    return remote;
  }

  return [];
}

async function fetchRemoteHolidays(): Promise<HariLiburItem[] | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "APP_HOLIDAYS")
      .maybeSingle();

    if (data?.value && Array.isArray(data.value)) {
      return data.value as HariLiburItem[];
    }
  } catch (err) {
    console.error("Gagal mengambil daftar hari libur:", err);
  }
  return null;
}

/**
 * Menyimpan atau menambahkan hari libur baru ke Supabase app_settings
 */
export async function saveCustomHoliday(
  newItem: Omit<HariLiburItem, "id" | "created_at">
): Promise<HariLiburItem[]> {
  const current = await fetchCustomHolidays();
  const id = `libur_${newItem.tanggal}_${Date.now()}`;
  const record: HariLiburItem = {
    ...newItem,
    id,
    created_at: new Date().toISOString(),
  };

  // Jangan duplikasi tanggal & sesi yang sama persis
  const filtered = current.filter(
    (h) => !(h.tanggal === newItem.tanggal && (h.sesi === newItem.sesi || h.sesi === "semua" || newItem.sesi === "semua"))
  );
  const updated = [...filtered, record].sort((a, b) => a.tanggal.localeCompare(b.tanggal));

  const supabase = createClient();
  const { error } = await supabase.from("app_settings").upsert(
    {
      key: "APP_HOLIDAYS",
      value: updated,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );

  if (error) {
    throw new Error(error.message || "Gagal menyimpan hari libur ke server.");
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(HOLIDAYS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("lptq-holidays-updated", { detail: updated }));
    } catch {}
  }

  return updated;
}

/**
 * Menghapus hari libur berdasarkan ID dari Supabase app_settings
 */
export async function deleteCustomHoliday(id: string): Promise<HariLiburItem[]> {
  const current = await fetchCustomHolidays();
  const updated = current.filter((h) => h.id !== id);

  const supabase = createClient();
  const { error } = await supabase.from("app_settings").upsert(
    {
      key: "APP_HOLIDAYS",
      value: updated,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );

  if (error) {
    throw new Error(error.message || "Gagal menghapus hari libur dari server.");
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(HOLIDAYS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("lptq-holidays-updated", { detail: updated }));
    } catch {}
  }

  return updated;
}

export interface HolidayCheckResult {
  isLibur: boolean;
  isFriday: boolean;
  keterangan?: string;
  sesi?: SesiAbsen | "semua";
}

/**
 * Memeriksa apakah tanggal dan sesi tertentu merupakan hari libur (Jumat atau libur khusus)
 */
export function checkIsHoliday(
  year: number,
  month1Based: number,
  day: number,
  holidays: HariLiburItem[],
  sesiTarget?: SesiAbsen | "semua"
): HolidayCheckResult {
  const isFri = isFridayDate(year, month1Based, day);
  if (isFri) {
    return {
      isLibur: true,
      isFriday: true,
      keterangan: "Hari Jumat (Libur Mingguan)",
      sesi: "semua",
    };
  }

  const dateStr = `${year}-${String(month1Based).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const matched = holidays.find((h) => {
    if (h.tanggal !== dateStr) return false;
    if (!sesiTarget || sesiTarget === "semua" || h.sesi === "semua") return true;
    return h.sesi === sesiTarget;
  });

  if (matched) {
    return {
      isLibur: true,
      isFriday: false,
      keterangan: matched.keterangan || "Hari Libur Khusus",
      sesi: matched.sesi,
    };
  }

  return {
    isLibur: false,
    isFriday: false,
  };
}
