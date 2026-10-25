import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";
import { normalizePermissions, DEFAULT_PERMISSIONS_BY_ROLE } from "@/lib/services/user-permission-service";
import { recordServerActivityLog } from "@/lib/services/activity-log-server";
import type { AppRole, UserAccountItem } from "@/types/database";
import { NextResponse, type NextRequest } from "next/server";

async function verifyAdminAuth() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, error: "Sesi telah berakhir. Silakan masuk kembali.", status: 401 };
  }

  const adminClient = createServiceRoleClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  // Cek juga perizinan khusus dari app_settings
  const { data: permSetting } = await adminClient
    .from("app_settings")
    .select("value")
    .eq("key", "USER_PERMISSIONS")
    .maybeSingle();

  const userPerms = permSetting?.value?.[user.id]?.permissions;
  const isSuperAdmin = profile?.role === "admin";
  const hasUserMgmtEdit = userPerms?.user_management === "edit";

  if (!isSuperAdmin && !hasUserMgmtEdit) {
    return { authorized: false, error: "Anda tidak memiliki wewenang untuk mengelola pengguna.", status: 403 };
  }

  return { authorized: true, user, adminClient };
}

export async function GET() {
  try {
    const authCheck = await verifyAdminAuth();
    if (!authCheck.authorized || !authCheck.adminClient) {
      return NextResponse.json({ message: authCheck.error }, { status: authCheck.status });
    }

    const adminClient = authCheck.adminClient;

    // Ambil auth users
    const { data: authUsers } = await adminClient.auth.admin.listUsers();
    // Ambil profiles
    const { data: profiles } = await adminClient.from("profiles").select("*");
    // Ambil user_permissions
    const { data: permSetting } = await adminClient
      .from("app_settings")
      .select("value")
      .eq("key", "USER_PERMISSIONS")
      .maybeSingle();

    const permMap = (permSetting?.value || {}) as Record<string, any>;
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    const usersList: UserAccountItem[] = (authUsers?.users || []).map((u) => {
      const prof = profileMap.get(u.id);
      const permItem = permMap[u.id];

      const rawRole = (prof?.role || "viewer") as AppRole;
      const username =
        permItem?.username ||
        u.user_metadata?.username ||
        u.email?.split("@")[0] ||
        "pengguna";
      const nama =
        permItem?.nama ||
        prof?.nama ||
        u.user_metadata?.nama ||
        username;
      const status = permItem?.status || u.user_metadata?.status || "active";
      const permissions = normalizePermissions(permItem?.permissions, rawRole);

      return {
        user_id: u.id,
        email: u.email || "",
        username,
        nama,
        role: rawRole,
        halaqoh_kelas: prof?.halaqoh_kelas ?? null,
        halaqoh_bagian: prof?.halaqoh_bagian ?? null,
        status,
        permissions,
        created_at: u.created_at,
        updated_at: permItem?.updated_at || u.updated_at,
      };
    });

    return NextResponse.json({ users: usersList });
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message || "Gagal memuat daftar pengguna." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authCheck = await verifyAdminAuth();
    if (!authCheck.authorized || !authCheck.adminClient) {
      return NextResponse.json({ message: authCheck.error }, { status: authCheck.status });
    }

    const adminClient = authCheck.adminClient;
    const body = await request.json();

    const usernameRaw = body.username;
    const namaRaw = body.nama;
    const password = body.password;
    const role: AppRole = body.role || "viewer";
    const halaqoh_kelas = body.halaqoh_kelas ? Number(body.halaqoh_kelas) : null;
    const halaqoh_bagian = body.halaqoh_bagian || null;
    const permissions = normalizePermissions(body.permissions, role);

    if (!usernameRaw || typeof usernameRaw !== "string" || usernameRaw.trim().length < 3) {
      return NextResponse.json(
        { message: "Nama pengguna minimal 3 karakter." },
        { status: 400 }
      );
    }

    const username = usernameRaw.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "");
    if (!username) {
      return NextResponse.json(
        { message: "Format nama pengguna hanya boleh huruf, angka, titik, atau garis bawah." },
        { status: 400 }
      );
    }

    if (!namaRaw || typeof namaRaw !== "string" || !namaRaw.trim()) {
      return NextResponse.json(
        { message: "Nama lengkap pengguna wajib diisi." },
        { status: 400 }
      );
    }
    const nama = namaRaw.trim();

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { message: "Kata sandi minimal 6 karakter." },
        { status: 400 }
      );
    }

    // Ambil data USER_PERMISSIONS yang ada
    const { data: permSetting } = await adminClient
      .from("app_settings")
      .select("value")
      .eq("key", "USER_PERMISSIONS")
      .maybeSingle();

    const permMap = (permSetting?.value || {}) as Record<string, any>;

    // Cek apakah username sudah dipakai
    for (const item of Object.values(permMap)) {
      if (item.username?.toLowerCase() === username) {
        return NextResponse.json(
          { message: `Nama pengguna "${username}" sudah digunakan. Gunakan nama pengguna lain.` },
          { status: 400 }
        );
      }
    }

    // Periksa juga di auth users
    const { data: existingAuthUsers } = await adminClient.auth.admin.listUsers();
    if (existingAuthUsers?.users) {
      for (const u of existingAuthUsers.users) {
        if (
          (u.user_metadata?.username || "").toLowerCase() === username ||
          (u.email || "").toLowerCase() === `${username}@lptq.local` ||
          (u.email || "").toLowerCase() === `${username}@blokagung.net`
        ) {
          return NextResponse.json(
            { message: `Nama pengguna "${username}" sudah digunakan.` },
            { status: 400 }
          );
        }
      }
    }

    const internalEmail = `${username}@lptq.local`;

    // Buat akun di Supabase Auth
    const { data: createdAuth, error: createError } = await adminClient.auth.admin.createUser({
      email: internalEmail,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        nama,
        status: "active",
      },
    });

    if (createError || !createdAuth.user) {
      return NextResponse.json(
        { message: createError?.message || "Gagal membuat pengguna di sistem autentikasi." },
        { status: 400 }
      );
    }

    const newUserId = createdAuth.user.id;

    // Upsert ke profiles
    await adminClient.from("profiles").upsert(
      {
        user_id: newUserId,
        email: internalEmail,
        nama,
        role,
        halaqoh_kelas,
        halaqoh_bagian,
      },
      { onConflict: "user_id" }
    );

    // Simpan ke app_settings USER_PERMISSIONS
    permMap[newUserId] = {
      user_id: newUserId,
      email: internalEmail,
      username,
      nama,
      role,
      status: "active",
      permissions,
      updated_at: new Date().toISOString(),
    };

    await adminClient.from("app_settings").upsert(
      {
        key: "USER_PERMISSIONS",
        value: permMap,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    const newUserItem: UserAccountItem = {
      user_id: newUserId,
      email: internalEmail,
      username,
      nama,
      role,
      halaqoh_kelas,
      halaqoh_bagian,
      status: "active",
      permissions,
      created_at: createdAuth.user.created_at,
      updated_at: new Date().toISOString(),
    };

    // Catat log aktivitas pembuatan pengguna
    try {
      await recordServerActivityLog({
        user_id: authCheck.user.id,
        username: authCheck.user.user_metadata?.username || authCheck.user.email?.split("@")[0] || "admin",
        nama: authCheck.user.user_metadata?.nama || "Administrator",
        role: "admin",
        kategori: "user",
        aksi: "Tambah Pengguna Baru",
        deskripsi: `Menambahkan pengguna baru "${nama}" (@${username}) dengan peran ${role.toUpperCase()}.`,
        modul: "Pengguna & Hak Akses",
      });
    } catch (logErr) {
      console.warn("Gagal mencatat log tambah pengguna:", logErr);
    }

    return NextResponse.json({
      success: true,
      message: `Pengguna "${nama}" (@${username}) berhasil ditambahkan.`,
      user: newUserItem,
    });
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message || "Gagal memproses penambahan pengguna." },
      { status: 500 }
    );
  }
}
