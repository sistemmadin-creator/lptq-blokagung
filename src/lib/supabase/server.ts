import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { AppRole } from "@/types/database";

export function createServerSupabase() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          const cookieStore = await cookies();
          return cookieStore.getAll();
        },
        async setAll(cookiesToSet) {
          try {
            const cookieStore = await cookies();
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Diabaikan ketika dipanggil dari Server Component murni
          }
        },
      },
    }
  );
}

// Validasi Origin terhadap Host untuk proteksi CSRF pada metode mutasi
export function verifyCsrfOrigin(request: Request): { valid: boolean; error?: string } {
  const method = request.method.toUpperCase();
  if (!["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    return { valid: true };
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    return { valid: true };
  }

  const rawHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const host = rawHost?.split(",")[0]?.trim();
  if (!host) {
    return { valid: false, error: "Header Host tidak ditemukan." };
  }

  try {
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      return { valid: false, error: "Permintaan lintas-origin (CSRF) ditolak." };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "Header Origin tidak valid." };
  }
}

// Membaca peran dari tabel profiles. Pengguna tanpa profil dianggap viewer.
export async function getUserRole(
  supabase: ReturnType<typeof createServerSupabase>,
  userId: string
): Promise<AppRole> {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.role as AppRole | undefined) ?? "viewer";
}

// Digunakan khusus pada Route Handler server-side setelah memverifikasi role pengguna
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createSupabaseAdmin(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
