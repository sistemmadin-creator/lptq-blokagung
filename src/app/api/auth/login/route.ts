import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { recordServerActivityLog } from "@/lib/services/activity-log-server";

// In-memory rate limiter untuk proteksi brute force
interface AttemptRecord {
  count: number;
  lockedUntil: number | null;
  lastAttempt: number;
}

const loginAttempts = new Map<string, AttemptRecord>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 menit
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

function cleanOldAttempts() {
  const now = Date.now();
  loginAttempts.forEach((record, key) => {
    if (now - record.lastAttempt > ATTEMPT_WINDOW_MS && (!record.lockedUntil || now > record.lockedUntil)) {
      loginAttempts.delete(key);
    }
  });
}

export async function POST(request: NextRequest) {
  cleanOldAttempts();

  try {
    const body = await request.json();
    const usernameRaw = body.username;
    const password = body.password;

    if (!usernameRaw || typeof usernameRaw !== "string" || !password || typeof password !== "string") {
      return NextResponse.json(
        { message: "Nama pengguna dan kata sandi wajib diisi." },
        { status: 400 }
      );
    }

    const username = usernameRaw.trim().toLowerCase();
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown-ip";
    const rateLimitKey = `${ip}:${username}`;

    // Periksa apakah IP/Username sedang dikunci (Lockout)
    const now = Date.now();
    const existingAttempt = loginAttempts.get(rateLimitKey);
    if (existingAttempt?.lockedUntil && now < existingAttempt.lockedUntil) {
      const remainingMinutes = Math.ceil((existingAttempt.lockedUntil - now) / 60000);
      return NextResponse.json(
        {
          message: `Terlalu banyak percobaan gagal. Akses akun dikunci sementara selama ${remainingMinutes} menit demi keamanan.`,
        },
        { status: 429 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const adminClient = createSupabaseAdmin(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Cari mapping username ke email melalui database app_settings atau auth admin
    let resolvedEmail: string | null = null;
    let isSuspended = false;

    const { data: permSettings } = await adminClient
      .from("app_settings")
      .select("value")
      .eq("key", "USER_PERMISSIONS")
      .maybeSingle();

    if (permSettings?.value && typeof permSettings.value === "object") {
      for (const item of Object.values(permSettings.value) as any[]) {
        if (
          item.username?.toLowerCase() === username ||
          item.email?.toLowerCase() === username ||
          item.email?.split("@")[0]?.toLowerCase() === username
        ) {
          resolvedEmail = item.email;
          if (item.status === "suspended") {
            isSuspended = true;
          }
          break;
        }
      }
    }

    // Jika belum ketemu di app_settings, cari di daftar pengguna auth admin
    if (!resolvedEmail) {
      const { data: userList } = await adminClient.auth.admin.listUsers();
      if (userList?.users) {
        for (const u of userList.users) {
          const uName = (u.user_metadata?.username || u.email?.split("@")[0] || "").toLowerCase();
          if (
            uName === username ||
            u.email?.toLowerCase() === username ||
            u.email?.split("@")[0]?.toLowerCase() === username
          ) {
            resolvedEmail = u.email || null;
            if (u.user_metadata?.status === "suspended") {
              isSuspended = true;
            }
            break;
          }
        }
      }
    }

    if (isSuspended) {
      return NextResponse.json(
        { message: "Akun Anda telah dinonaktifkan oleh Administrator. Hubungi pengurus LPTQ." },
        { status: 403 }
      );
    }

    if (!resolvedEmail) {
      // Catat percobaan gagal
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json(
        { message: "Nama pengguna atau kata sandi tidak valid." },
        { status: 401 }
      );
    }

    // Lakukan login dengan email dan password menggunakan Supabase SSR Client agar Cookie terpasang
    const cookieStore = cookies();
    const ssrClient = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    });

    const { data: authData, error: authError } = await ssrClient.auth.signInWithPassword({
      email: resolvedEmail,
      password,
    });

    if (authError || !authData.session) {
      const remainingAttempts = recordFailedAttempt(rateLimitKey);
      const warnMsg =
        remainingAttempts > 0
          ? `Nama pengguna atau kata sandi tidak valid. Sisa percobaan: ${remainingAttempts} kali.`
          : `Akun dikunci selama 15 menit karena 5 kali percobaan gagal.`;
      return NextResponse.json({ message: warnMsg }, { status: 401 });
    }

    // Berhasil login: reset rekor percobaan gagal
    loginAttempts.delete(rateLimitKey);

    // Catat log aktivitas login
    try {
      await recordServerActivityLog({
        user_id: authData.user?.id || "unknown",
        username,
        nama: authData.user?.user_metadata?.nama || username,
        role: (authData.user?.user_metadata?.role as any) || "asatidz",
        kategori: "auth",
        aksi: "Login ke Aplikasi",
        deskripsi: `Pengguna '${username}' berhasil login ke sistem LPTQ Blokagung.`,
        modul: "Otoritas & Akses",
        ip_address: ip,
      });
    } catch (logErr) {
      console.warn("Gagal mencatat log login:", logErr);
    }

    return NextResponse.json({
      success: true,
      message: "Berhasil masuk ke sistem LPTQ Blokagung.",
      user: {
        id: authData.user?.id,
        email: authData.user?.email,
        username,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message || "Terjadi kesalahan internal pada server autentikasi." },
      { status: 500 }
    );
  }
}

function recordFailedAttempt(key: string): number {
  const now = Date.now();
  const rec = loginAttempts.get(key) || { count: 0, lockedUntil: null, lastAttempt: now };
  rec.count += 1;
  rec.lastAttempt = now;

  if (rec.count >= MAX_ATTEMPTS) {
    rec.lockedUntil = now + LOCKOUT_DURATION_MS;
    loginAttempts.set(key, rec);
    return 0;
  }

  loginAttempts.set(key, rec);
  return MAX_ATTEMPTS - rec.count;
}
