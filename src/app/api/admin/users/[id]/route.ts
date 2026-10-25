import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";
import { normalizePermissions } from "@/lib/services/user-permission-service";
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

  return { authorized: true, callerUser: user, adminClient };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authCheck = await verifyAdminAuth();
    if (!authCheck.authorized || !authCheck.adminClient) {
      return NextResponse.json({ message: authCheck.error }, { status: authCheck.status });
    }

    const targetUserId = params.id;
    const adminClient = authCheck.adminClient;
    const body = await request.json();

    const { data: existingUser } = await adminClient.auth.admin.getUserById(targetUserId);
    if (!existingUser?.user) {
      return NextResponse.json({ message: "Pengguna tidak ditemukan." }, { status: 404 });
    }

    // Ambil data USER_PERMISSIONS saat ini
    const { data: permSetting } = await adminClient
      .from("app_settings")
      .select("value")
      .eq("key", "USER_PERMISSIONS")
      .maybeSingle();

    const permMap = (permSetting?.value || {}) as Record<string, any>;
    const currentItem = permMap[targetUserId] || {};

    const usernameRaw = body.username || currentItem.username || existingUser.user.email?.split("@")[0] || "user";
    const username = usernameRaw.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "");

    const nama = (body.nama || currentItem.nama || username).trim();
    const role: AppRole = body.role || currentItem.role || "viewer";
    const status: "active" | "suspended" = body.status === "suspended" ? "suspended" : "active";
    const halaqoh_kelas = body.halaqoh_kelas !== undefined ? (body.halaqoh_kelas ? Number(body.halaqoh_kelas) : null) : undefined;
    const halaqoh_bagian = body.halaqoh_bagian !== undefined ? body.halaqoh_bagian : undefined;
    const permissions = normalizePermissions(body.permissions || currentItem.permissions, role);

    // Update password jika diberikan
    const authUpdatePayload: any = {
      user_metadata: {
        username,
        nama,
        status,
      },
    };

    if (body.password && typeof body.password === "string" && body.password.trim().length >= 6) {
      authUpdatePayload.password = body.password.trim();
    }

    await adminClient.auth.admin.updateUserById(targetUserId, authUpdatePayload);

    // Update profiles
    const profileUpdate: any = {
      user_id: targetUserId,
      nama,
      role,
    };
    if (halaqoh_kelas !== undefined) profileUpdate.halaqoh_kelas = halaqoh_kelas;
    if (halaqoh_bagian !== undefined) profileUpdate.halaqoh_bagian = halaqoh_bagian;

    await adminClient.from("profiles").upsert(profileUpdate, { onConflict: "user_id" });

    // Update app_settings
    permMap[targetUserId] = {
      user_id: targetUserId,
      email: existingUser.user.email,
      username,
      nama,
      role,
      status,
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

    const updatedItem: UserAccountItem = {
      user_id: targetUserId,
      email: existingUser.user.email || "",
      username,
      nama,
      role,
      halaqoh_kelas: halaqoh_kelas !== undefined ? halaqoh_kelas : null,
      halaqoh_bagian: halaqoh_bagian !== undefined ? halaqoh_bagian : null,
      status,
      permissions,
      updated_at: new Date().toISOString(),
    };

    // Catat log aktivitas update pengguna
    try {
      await recordServerActivityLog({
        user_id: authCheck.callerUser.id,
        username: authCheck.callerUser.user_metadata?.username || authCheck.callerUser.email?.split("@")[0] || "admin",
        nama: authCheck.callerUser.user_metadata?.nama || "Administrator",
        role: "admin",
        kategori: "user",
        aksi: "Perbarui Pengguna",
        deskripsi: `Memperbarui data dan otoritas pengguna "${nama}" (@${username}).`,
        modul: "Pengguna & Hak Akses",
      });
    } catch (logErr) {
      console.warn("Gagal mencatat log perbarui pengguna:", logErr);
    }

    return NextResponse.json({
      success: true,
      message: `Data pengguna "${nama}" (@${username}) berhasil diperbarui.`,
      user: updatedItem,
    });
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message || "Gagal memperbarui pengguna." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authCheck = await verifyAdminAuth();
    if (!authCheck.authorized || !authCheck.adminClient || !authCheck.callerUser) {
      return NextResponse.json({ message: authCheck.error }, { status: authCheck.status });
    }

    const targetUserId = params.id;
    if (targetUserId === authCheck.callerUser.id) {
      return NextResponse.json(
        { message: "Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan." },
        { status: 400 }
      );
    }

    const adminClient = authCheck.adminClient;

    // Hapus dari auth users
    await adminClient.auth.admin.deleteUser(targetUserId);

    // Hapus dari profiles
    await adminClient.from("profiles").delete().eq("user_id", targetUserId);

    // Hapus dari app_settings USER_PERMISSIONS
    const { data: permSetting } = await adminClient
      .from("app_settings")
      .select("value")
      .eq("key", "USER_PERMISSIONS")
      .maybeSingle();

    if (permSetting?.value && permSetting.value[targetUserId]) {
      const permMap = { ...permSetting.value };
      delete permMap[targetUserId];
      await adminClient.from("app_settings").upsert(
        {
          key: "USER_PERMISSIONS",
          value: permMap,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
    }

    // Catat log aktivitas hapus pengguna
    try {
      await recordServerActivityLog({
        user_id: authCheck.callerUser.id,
        username: authCheck.callerUser.user_metadata?.username || authCheck.callerUser.email?.split("@")[0] || "admin",
        nama: authCheck.callerUser.user_metadata?.nama || "Administrator",
        role: "admin",
        kategori: "user",
        aksi: "Hapus Pengguna",
        deskripsi: `Menghapus akun pengguna (ID: ${targetUserId}) dari sistem.`,
        modul: "Pengguna & Hak Akses",
      });
    } catch (logErr) {
      console.warn("Gagal mencatat log hapus pengguna:", logErr);
    }

    return NextResponse.json({
      success: true,
      message: "Akun pengguna berhasil dihapus dari sistem.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message || "Gagal menghapus pengguna." },
      { status: 500 }
    );
  }
}
