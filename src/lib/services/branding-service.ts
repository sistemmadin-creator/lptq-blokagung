import { createClient } from "@/lib/supabase/client";

export interface AppBrandingConfig {
  app_name: string;
  app_subtitle: string;
  logo_url: string | null;       // Base64 atau URL path logo (misal: /images/custom-logo.png)
  favicon_url: string | null;    // Base64 atau URL path favicon
  login_bg_url: string | null;   // URL foto latar belakang login
  login_bg_overlay: number;      // Opacity overlay (30 - 85, default 65)
  login_card_opacity: number;    // Opasitas kotak kartu login (10 - 100, default 60)
  kkm_khotmil: number;           // Standar KKM (default 85)
  target_setoran: number;        // Target setoran per bulan (default 3 juz)
  active_year: number;           // Tahun penilaian aktif (default 2026)
  petunjuk_penguji_ljk?: string; // Teks petunjuk penguji lembar LJK Khotmil
  bobot_kesalahan?: number;      // Bobot kesalahan LJK (default: 35%)
  bobot_halaman?: number;        // Bobot halaman kosong LJK (default: 65%)
  updated_at?: string;
}

export const DEFAULT_BRANDING: AppBrandingConfig = {
  app_name: "LPTQ Blokagung",
  app_subtitle: "Sistem Penilaian Tahfidz",
  logo_url: null,
  favicon_url: null,
  login_bg_url: "/images/login-bg.jpg",
  login_bg_overlay: 65,
  login_card_opacity: 60,
  kkm_khotmil: 85,
  target_setoran: 3,
  active_year: 2026,
  petunjuk_penguji_ljk:
    "Penguji tidak perlu menghitung nilai. Cukup arsir Total Kesalahan (35%) dan Halaman Kosong (65%).",
  bobot_kesalahan: 35,
  bobot_halaman: 65,
};

const BRANDING_STORAGE_KEY = "lptq_app_branding_cache";

/**
 * Mengambil konfigurasi branding dan pengaturan sistem dari app_settings Supabase
 */
export async function fetchAppBranding(): Promise<AppBrandingConfig> {
  // Cek cache lokal browser terlebih dahulu untuk rendering instan
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(BRANDING_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Tetap jalankan fetch async di background untuk refresh
        fetchRemoteBranding().then((remote) => {
          if (remote) {
            localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(remote));
          }
        });
        return { ...DEFAULT_BRANDING, ...parsed };
      }
    } catch {}
  }

  const remote = await fetchRemoteBranding();
  if (remote) {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(remote));
      } catch {}
    }
    return remote;
  }

  return DEFAULT_BRANDING;
}

async function fetchRemoteBranding(): Promise<AppBrandingConfig | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "APP_BRANDING")
      .maybeSingle();

    if (data?.value && typeof data.value === "object") {
      return { ...DEFAULT_BRANDING, ...data.value };
    }
  } catch {}
  return null;
}

/**
 * Menyimpan konfigurasi branding dan preferensi sistem ke app_settings Supabase
 */
export async function saveAppBranding(config: Partial<AppBrandingConfig>): Promise<AppBrandingConfig> {
  const current = await fetchAppBranding();
  const merged: AppBrandingConfig = {
    ...current,
    ...config,
    updated_at: new Date().toISOString(),
  };

  const res = await fetch("/api/admin/branding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(merged),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || "Gagal menyimpan pengaturan branding.");
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(merged));
      // Dispatch event agar komponen (AppShell, Form, dll) langsung ter-update realtime
      window.dispatchEvent(new CustomEvent("lptq-branding-updated", { detail: merged }));
    } catch {}
  }

  return merged;
}
