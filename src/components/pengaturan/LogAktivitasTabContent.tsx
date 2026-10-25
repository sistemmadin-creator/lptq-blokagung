"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  History,
  Search,
  Filter,
  Download,
  RotateCcw,
  Clock,
  Shield,
  ShieldCheck,
  User,
  Activity,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Database,
  Sparkles,
  ArrowUpDown,
  Laptop,
} from "lucide-react";
import type { UserActivityLog, LogKategori } from "@/types/database";
import { fetchActivityLogsClient, RETENTION_DAYS } from "@/lib/services/activity-log-service";
import { exportJsonToExcel } from "@/lib/utils/excel";
import { useToast } from "@/components/ui/Toast";

interface LogAktivitasTabContentProps {
  onSwitchToUsers?: () => void;
}

export function LogAktivitasTabContent({ onSwitchToUsers }: LogAktivitasTabContentProps) {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<UserActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<string>("all");

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Load logs
  const loadLogs = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchActivityLogsClient();
      setLogs(data.logs);
      if (data.cleanedExpiredCount > 0) {
        showToast(
          "success",
          `Sistem otomatis membersihkan ${data.cleanedExpiredCount} log aktivitas yang telah melewati masa retensi 6 bulan.`
        );
      }
    } catch {
      showToast("error", "Gagal memuat log aktivitas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manual Trigger Pembersihan Log > 6 Bulan
  const handleCleanExpired = async () => {
    setCleaning(true);
    try {
      const res = await fetch("/api/admin/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clean" }),
      });
      const data = await res.json();
      if (data.cleanedExpiredCount > 0) {
        showToast(
          "success",
          `Berhasil membersihkan ${data.cleanedExpiredCount} log lama (> 6 bulan). Sisa log tersimpan: ${data.remainingCount}.`
        );
      } else {
        showToast(
          "success",
          `Semua log saat ini masih berada dalam batas retensi 6 bulan. Tidak ada log kedaluwarsa yang perlu dibersihkan.`
        );
      }
      loadLogs(true);
    } catch {
      showToast("error", "Gagal melakukan pembersihan log.");
    } finally {
      setCleaning(false);
    }
  };

  // Filter data log
  const filteredLogs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const now = Date.now();

    return logs.filter((log) => {
      // 1. Search Query
      if (q) {
        const matchSearch =
          log.nama.toLowerCase().includes(q) ||
          log.username.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.deskripsi.toLowerCase().includes(q) ||
          (log.ip_address && log.ip_address.toLowerCase().includes(q));
        if (!matchSearch) return false;
      }

      // 2. Kategori Filter
      if (kategoriFilter !== "all" && log.kategori !== kategoriFilter) {
        return false;
      }

      // 3. Role Filter
      if (roleFilter !== "all" && log.role.toLowerCase() !== roleFilter.toLowerCase()) {
        return false;
      }

      // 4. Rentang Waktu
      if (timeFilter !== "all") {
        const logTime = new Date(log.created_at).getTime();
        if (timeFilter === "today") {
          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);
          if (logTime < startOfDay.getTime()) return false;
        } else if (timeFilter === "7days") {
          if (now - logTime > 7 * 86400 * 1000) return false;
        } else if (timeFilter === "30days") {
          if (now - logTime > 30 * 86400 * 1000) return false;
        } else if (timeFilter === "90days") {
          if (now - logTime > 90 * 86400 * 1000) return false;
        }
      }

      return true;
    });
  }, [logs, searchQuery, kategoriFilter, roleFilter, timeFilter]);

  // Statistik Ringkasan
  const stats = useMemo(() => {
    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayCount = logs.filter(
      (l) => new Date(l.created_at).getTime() >= startOfDay.getTime()
    ).length;

    // Hitung kategori teraktif
    const catMap: Record<string, number> = {};
    logs.forEach((l) => {
      catMap[l.kategori] = (catMap[l.kategori] || 0) + 1;
    });
    let topCat = "-";
    let topCatCount = 0;
    Object.entries(catMap).forEach(([k, v]) => {
      if (v > topCatCount) {
        topCat = k;
        topCatCount = v;
      }
    });

    return {
      total: logs.length,
      today: todayCount,
      topCategory: topCat,
    };
  }, [logs]);

  // Ekspor Log ke Excel
  const handleExportExcel = () => {
    if (filteredLogs.length === 0) {
      showToast("error", "Tidak ada data log yang dapat diekspor.");
      return;
    }

    const exportRows = filteredLogs.map((l, idx) => ({
      No: idx + 1,
      "Waktu Aktivitas": formatDateTimeFull(l.created_at),
      "Nama Pengguna": l.nama,
      Username: `@${l.username}`,
      Peran: l.role.toUpperCase(),
      Kategori: l.kategori,
      Aksi: l.action,
      "Detail Deskripsi": l.deskripsi,
      "Alamat IP": l.ip_address || "-",
    }));

    exportJsonToExcel(
      exportRows,
      `Log_Aktivitas_Pengguna_LPTQ_${new Date().toISOString().split("T")[0]}`,
      "LogAktivitas"
    );
    showToast("success", `Berhasil mengekspor ${exportRows.length} baris log ke Excel.`);
  };

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, page, pageSize]);

  // Format Helper
  function formatDateTimeFull(iso: string) {
    try {
      const d = new Date(iso);
      return d.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }) + " WIB";
    } catch {
      return iso;
    }
  }

  function formatRelativeTime(iso: string) {
    try {
      const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
      if (diffSec < 60) return "Baru saja";
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin} mnt lalu`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour} jam lalu`;
      const diffDay = Math.floor(diffHour / 24);
      if (diffDay < 30) return `${diffDay} hari lalu`;
      const diffMonth = Math.floor(diffDay / 30);
      return `${diffMonth} bln lalu`;
    } catch {
      return "";
    }
  }

  function getCategoryColor(kat: LogKategori | string) {
    switch (kat) {
      case "Autentikasi":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
      case "Manajemen Pengguna":
        return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800";
      case "Penilaian Tahfidz":
        return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
      case "Data Santri":
        return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
      case "Pengaturan Sistem":
        return "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300";
    }
  }

  function getRoleBadge(role: string) {
    const r = role.toLowerCase();
    switch (r) {
      case "admin":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
      case "pengurus":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800";
      case "pembimbing":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
    }
  }

  return (
    <div className="space-y-6">
      {/* =================================================================== */}
      {/* 1. KARTU STATISTIK & RETENSI 6 BULAN                                */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 dark:bg-emerald-950/60 dark:text-emerald-400">
            <History className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block truncate">
              Total Log Tersimpan
            </span>
            <span className="text-xl font-black text-slate-900 dark:text-white">
              {stats.total}{" "}
              <span className="text-xs font-normal text-slate-400">aktivitas</span>
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 dark:bg-blue-950/60 dark:text-blue-400">
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block truncate">
              Aktivitas Hari Ini
            </span>
            <span className="text-xl font-black text-slate-900 dark:text-white">
              {stats.today}{" "}
              <span className="text-xs font-normal text-slate-400">peristiwa</span>
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 dark:bg-purple-950/60 dark:text-purple-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block truncate">
              Kategori Teraktif
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-white block truncate">
              {stats.topCategory}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 shadow-sm dark:border-emerald-800/60 dark:bg-emerald-950/30 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 block truncate">
              Retensi Log Otomatis
            </span>
            <span className="text-sm font-black text-emerald-900 dark:text-emerald-200 block">
              6 Bulan ({RETENTION_DAYS} Hari)
            </span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block">
              Otomatis terhapus berkala
            </span>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. BILAH PENCARIAN & KONTROL FILTER                                 */}
      {/* =================================================================== */}
      <div className="space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Input Pencarian */}
          <div className="relative flex-1 max-w-lg">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Cari nama pengguna, username, aksi, deskripsi, atau IP..."
              className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          {/* Tombol Aksi Kanan */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => loadLogs()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Segarkan data log"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-brand" : ""}`} />
              <span>Segarkan</span>
            </button>

            <button
              type="button"
              onClick={handleCleanExpired}
              disabled={cleaning}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Bersihkan log yang sudah berusia lebih dari 6 bulan"
            >
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>{cleaning ? "Memeriksa..." : "Bersihkan > 6 Bln"}</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={loading || filteredLogs.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand-hover transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title="Ekspor seluruh log yang tampil ke spreadsheet Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor ke Excel</span>
            </button>
          </div>
        </div>

        {/* Baris Filter Kategori, Peran, & Waktu */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <div className="flex items-center gap-1 text-slate-400 mr-1 text-[11px] font-bold uppercase tracking-wider">
            <Filter className="w-3 h-3" />
            <span>Filter:</span>
          </div>

          {/* Filter Kategori */}
          <select
            value={kategoriFilter}
            onChange={(e) => {
              setKategoriFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 font-semibold focus:border-brand focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="all">Semua Kategori</option>
            <option value="Autentikasi">Autentikasi</option>
            <option value="Manajemen Pengguna">Manajemen Pengguna</option>
            <option value="Penilaian Tahfidz">Penilaian Tahfidz</option>
            <option value="Data Santri">Data Santri</option>
            <option value="WhatsApp Gateway">WhatsApp Gateway</option>
            <option value="Pengaturan Sistem">Pengaturan Sistem</option>
            <option value="Backup & Restore">Backup & Restore</option>
            <option value="Ekspor & Cetak">Ekspor & Cetak</option>
            <option value="Lainnya">Lainnya</option>
          </select>

          {/* Filter Peran */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 font-semibold focus:border-brand focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="all">Semua Peran</option>
            <option value="admin">Admin</option>
            <option value="pengurus">Pengurus</option>
            <option value="pembimbing">Pembimbing</option>
            <option value="viewer">Viewer</option>
          </select>

          {/* Filter Waktu */}
          <select
            value={timeFilter}
            onChange={(e) => {
              setTimeFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 font-semibold focus:border-brand focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="all">Semua Waktu (Maks 6 Bulan)</option>
            <option value="today">Hari Ini</option>
            <option value="7days">7 Hari Terakhir</option>
            <option value="30days">30 Hari Terakhir</option>
            <option value="90days">3 Bulan Terakhir</option>
          </select>

          {(searchQuery || kategoriFilter !== "all" || roleFilter !== "all" || timeFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setKategoriFilter("all");
                setRoleFilter("all");
                setTimeFilter("all");
                setPage(1);
              }}
              className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-bold ml-1 transition"
            >
              Reset Filter
            </button>
          )}

          <div className="ml-auto text-xs text-slate-500 font-semibold">
            Menampilkan <strong className="text-slate-900 dark:text-white">{filteredLogs.length}</strong> dari{" "}
            <strong>{logs.length}</strong> log
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. TABEL LOG AKTIVITAS                                              */}
      {/* =================================================================== */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider">
                <th className="py-3 px-4 w-40">Waktu</th>
                <th className="py-3 px-4 w-52">Pengguna</th>
                <th className="py-3 px-3 w-28">Peran</th>
                <th className="py-3 px-3 w-36">Kategori</th>
                <th className="py-3 px-4">Aksi & Deskripsi Aktivitas</th>
                <th className="py-3 px-4 w-32 text-center">IP / Perangkat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-2.5" />
                    Memuat log aktivitas pengguna...
                  </td>
                </tr>
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <History className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    Tidak ada aktivitas yang sesuai dengan kriteria pencarian atau filter.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                  >
                    {/* WAKTU */}
                    <td className="py-3 px-4 align-top whitespace-nowrap">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                        {formatDateTimeFull(log.created_at)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {formatRelativeTime(log.created_at)}
                      </span>
                    </td>

                    {/* PENGGUNA */}
                    <td className="py-3 px-4 align-top">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-brand font-black flex items-center justify-center shrink-0 uppercase text-[11px] dark:bg-emerald-950 dark:text-emerald-300">
                          {log.nama ? log.nama.substring(0, 2) : "U"}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 dark:text-white block truncate">
                            {log.nama}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 block truncate">
                            @{log.username}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* PERAN */}
                    <td className="py-3 px-3 align-top">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getRoleBadge(
                          log.role
                        )}`}
                      >
                        {log.role}
                      </span>
                    </td>

                    {/* KATEGORI */}
                    <td className="py-3 px-3 align-top">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold border ${getCategoryColor(
                          log.kategori
                        )}`}
                      >
                        {log.kategori}
                      </span>
                    </td>

                    {/* AKSI & DESKRIPSI */}
                    <td className="py-3 px-4 align-top">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">
                          {log.action}
                        </span>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {log.deskripsi}
                        </p>
                      </div>
                    </td>

                    {/* IP / PERANGKAT */}
                    <td className="py-3 px-4 align-top text-center">
                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 block truncate">
                        {log.ip_address || "127.0.0.1"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* =================================================================== */}
        {/* 4. PAGINATION                                                       */}
        {/* =================================================================== */}
        {filteredLogs.length > 0 && (
          <div className="border-t border-slate-200 bg-slate-50/50 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs dark:border-slate-800 dark:bg-slate-800/30">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <span>Baris per halaman:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 font-bold focus:border-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>
                Menampilkan {(page - 1) * pageSize + 1} s.d{" "}
                {Math.min(page * pageSize, filteredLogs.length)} dari {filteredLogs.length} data
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                {page} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                aria-label="Halaman berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
