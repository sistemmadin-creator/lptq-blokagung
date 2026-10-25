import { NextResponse } from "next/server";
import { createServerSupabase, getUserRole } from "@/lib/supabase/server";
import {
  getAndPruneServerActivityLogs,
  recordServerActivityLog,
  RETENTION_DAYS,
} from "@/lib/services/activity-log-server";
import type { LogKategori } from "@/types/database";

export async function GET() {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }

    const role = await getUserRole(supabase, user.id);
    if (role !== "admin" && role !== "pengurus") {
      return NextResponse.json(
        { error: "Peran Anda tidak diizinkan mengakses log aktivitas." },
        { status: 403 }
      );
    }

    const { logs, cleanedExpiredCount } = await getAndPruneServerActivityLogs(supabase);

    return NextResponse.json({
      logs,
      cleanedExpiredCount,
      retentionDays: RETENTION_DAYS,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal memuat log aktivitas.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }

    const role = await getUserRole(supabase, user.id);
    if (role !== "admin" && role !== "pengurus") {
      return NextResponse.json(
        { error: "Peran Anda tidak diizinkan mengelola log aktivitas." },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (body.action === "clean") {
      // Pembersihan manual log kedaluwarsa (> 6 bulan)
      const { logs, cleanedExpiredCount } = await getAndPruneServerActivityLogs(supabase);
      return NextResponse.json({
        success: true,
        cleanedExpiredCount,
        remainingCount: logs.length,
      });
    }

    // Pencatatan log aktivitas baru
    const newLog = await recordServerActivityLog(supabase, {
      user_id: user.id,
      nama: body.nama || user.user_metadata?.nama || "Pengguna",
      username: body.username || user.user_metadata?.username || "user",
      role: body.role || role,
      action: body.logAction || "ACTIVITY",
      kategori: (body.kategori as LogKategori) || "Sistem",
      deskripsi: body.deskripsi || "Melakukan aktivitas pada sistem",
      ip_address: body.ip_address || "-",
      user_agent: request.headers.get("user-agent") || "-",
    });

    return NextResponse.json({ success: true, log: newLog });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal memproses log aktivitas.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
