"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  CalendarCheck,
  BookOpen,
  Award,
  RefreshCw,
  FileImage,
  MessageSquare,
  Settings,
  GraduationCap,
  Sparkles,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  KHOTMIL_15_TAHAP,
  KHOTMIL_30_TAHAP,
  PEMETAAN_HALAQOH_KELAS,
  type SesiAbsen,
} from "@/types/database";
import { HalaqohBadge } from "@/components/ui/Badges";
import {
  EvaluasiLineChart,
  type EvaluasiDayData,
} from "@/components/dashboard/EvaluasiLineChart";
import {
  fetchAppBranding,
  DEFAULT_BRANDING,
  type AppBrandingConfig,
} from "@/lib/services/branding-service";

function toLocalIsoDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface RecentSetoranItem {
  id: string;
  tanggal: string;
  tipe: "juz_baru" | "evaluasi";
  jumlah_juz_tambahan: number;
  santri: {
    kode: string;
    nama_lengkap: string;
    kamar: string;
    halaqoh_kelas: number;
    halaqoh_bagian: string;
  } | null;
}

interface DashboardMetrics {
  totalSantri: number;
  hadirHariIniPagi: number;
  hadirHariIniMalam: number;
  setoranJuzBaruBulanIni: number;
  setoranEvaluasiBulanIni: number;
  khotmil15LulusPerTahap: Record<number, { lulus: number; belum: number }>;
  khotmil30LulusPerTahap: Record<number, { lulus: number; belum: number }>;
  recentSetoran: RecentSetoranItem[];
  khatamanReadyCount: number;
  isTodayFriday: boolean;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [branding, setBranding] = useState<AppBrandingConfig>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSesi, setSelectedSesi] = useState<SesiAbsen>("pagi");
  const [selectedKhotmilTab, setSelectedKhotmilTab] = useState<"15" | "30">("15");

  // State untuk Line Chart Evaluasi Hafalan
  const [chartTimeframe, setChartTimeframe] = useState<"7d" | "14d" | "30d" | "month">("30d");
  const [chartFilterType, setChartFilterType] = useState<"evaluasi" | "juz_baru" | "all">("evaluasi");
  const [chartData, setChartData] = useState<EvaluasiDayData[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);

  // Load Branding Settings (KKM dll)
  useEffect(() => {
    fetchAppBranding().then(setBranding);
  }, []);

  // Fetch Data Line Chart Tren Setoran Evaluasi
  const loadChartData = useCallback(
    async (tf: "7d" | "14d" | "30d" | "month", fType: "evaluasi" | "juz_baru" | "all") => {
      setLoadingChart(true);
      try {
        const now = new Date();
        let daysCount = 30;
        if (tf === "7d") daysCount = 7;
        else if (tf === "14d") daysCount = 14;
        else if (tf === "30d") daysCount = 30;
        else if (tf === "month") {
          daysCount = Math.max(1, now.getDate());
        }

        const datesList: string[] = [];
        for (let i = daysCount - 1; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          datesList.push(toLocalIsoDate(d));
        }

        const startDate = datesList[0];
        const endDate = datesList[datesList.length - 1];

        const supabase = createClient();
        let query = supabase
          .from("setoran")
          .select("id, tanggal, tipe, jumlah_juz_tambahan, santri_id, santri:santri_id(nama_lengkap)")
          .gte("tanggal", startDate)
          .lte("tanggal", endDate);

        if (fType !== "all") {
          query = query.eq("tipe", fType);
        }

        const { data, error: qErr } = await query;
        if (qErr) throw qErr;

        // Grouping data per tanggal
        const groupedByDate: Record<
          string,
          { santriSet: Set<string>; totalJuz: number; santriNames: Set<string> }
        > = {};

        datesList.forEach((d) => {
          groupedByDate[d] = {
            santriSet: new Set(),
            totalJuz: 0,
            santriNames: new Set(),
          };
        });

        (data ?? []).forEach((row) => {
          const dStr = String(row.tanggal);
          if (groupedByDate[dStr]) {
            if (row.santri_id) {
              groupedByDate[dStr].santriSet.add(row.santri_id);
            }
            groupedByDate[dStr].totalJuz += Number(row.jumlah_juz_tambahan ?? 0);
            const rawSantri = Array.isArray(row.santri) ? row.santri[0] : row.santri;
            if (rawSantri?.nama_lengkap) {
              groupedByDate[dStr].santriNames.add(rawSantri.nama_lengkap);
            }
          }
        });

        const MONTH_NAMES = [
          "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
          "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
        ];
        const DAY_NAMES = [
          "Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu",
        ];

        const formatted: EvaluasiDayData[] = datesList.map((dStr) => {
          const parts = dStr.split("-");
          const yr = parseInt(parts[0], 10);
          const mo = parseInt(parts[1], 10) - 1;
          const dy = parseInt(parts[2], 10);
          const dt = new Date(yr, mo, dy);

          const dayNum = dt.getDate();
          const monthStr = MONTH_NAMES[dt.getMonth()];
          const dayName = DAY_NAMES[dt.getDay()];

          const grp = groupedByDate[dStr];
          return {
            tanggal: dStr,
            label: `${dayNum} ${monthStr}`,
            fullDateLabel: `${dayName}, ${dayNum} ${monthStr} ${dt.getFullYear()}`,
            santriCount: grp.santriSet.size,
            totalJuz: Number(grp.totalJuz.toFixed(2)),
            santriNames: Array.from(grp.santriNames),
          };
        });

        setChartData(formatted);
      } catch (err) {
        console.error("Gagal memuat tren evaluasi:", err);
      } finally {
        setLoadingChart(false);
      }
    },
    []
  );

  // Panggil chart saat timeframe atau filterType berubah
  useEffect(() => {
    loadChartData(chartTimeframe, chartFilterType);
  }, [loadChartData, chartTimeframe, chartFilterType]);

  // Load Seluruh Metrik Dashboard
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    try {
      const now = new Date();
      const todayIso = toLocalIsoDate(now);
      const isFriday = now.getDay() === 5;
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const startMonth = `${year}-${String(month).padStart(2, "0")}-01`;

      const [santriRes, absenRes, setoranRes, khotmilRes, recentRes] = await Promise.all([
        supabase.from("santri").select("id", { count: "exact", head: true }),
        supabase.from("absensi").select("sesi, status").eq("tanggal", todayIso),
        supabase
          .from("setoran")
          .select("tipe, jumlah_juz_tambahan")
          .gte("tanggal", startMonth),
        supabase
          .from("v_khotmil_rekap")
          .select("jenis, tahap, jumlah_juz_dinilai, status_tuntas"),
        supabase
          .from("setoran")
          .select(
            "id, tanggal, tipe, jumlah_juz_tambahan, santri:santri_id (kode, nama_lengkap, kamar, halaqoh_kelas, halaqoh_bagian)"
          )
          .order("tanggal", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      if (santriRes.error) throw santriRes.error;
      if (absenRes.error) throw absenRes.error;
      if (setoranRes.error) throw setoranRes.error;
      if (khotmilRes.error) throw khotmilRes.error;

      const totalSantriCount = santriRes.count ?? 0;
      const notHadirPagi = (absenRes.data ?? []).filter(
        (a) => a.sesi === "pagi" && a.status !== "hadir"
      ).length;
      const notHadirMalam = (absenRes.data ?? []).filter(
        (a) => a.sesi === "malam" && a.status !== "hadir"
      ).length;
      const hadirPagi = isFriday ? 0 : Math.max(0, totalSantriCount - notHadirPagi);
      const hadirMalam = isFriday ? 0 : Math.max(0, totalSantriCount - notHadirMalam);

      let totalJuzBaru = 0;
      let totalEvaluasi = 0;
      (setoranRes.data ?? []).forEach((s) => {
        if (s.tipe === "juz_baru") totalJuzBaru += Number(s.jumlah_juz_tambahan ?? 0);
        if (s.tipe === "evaluasi") totalEvaluasi += Number(s.jumlah_juz_tambahan ?? 0);
      });

      const k15: Record<number, { lulus: number; belum: number }> = {};
      KHOTMIL_15_TAHAP.forEach((t) => {
        k15[t.tahap] = { lulus: 0, belum: 0 };
      });

      const k30: Record<number, { lulus: number; belum: number }> = {};
      KHOTMIL_30_TAHAP.forEach((t) => {
        k30[t.tahap] = { lulus: 0, belum: 0 };
      });

      let khatamReady = 0;

      (khotmilRes.data ?? []).forEach((row) => {
        if (row.jenis === "khotmil15") {
          const cfg = KHOTMIL_15_TAHAP.find((c) => c.tahap === row.tahap);
          const lengkap = cfg ? row.jumlah_juz_dinilai >= cfg.juzList.length : false;
          if (row.status_tuntas && lengkap) {
            k15[row.tahap].lulus += 1;
            if (row.tahap === 5) khatamReady += 1;
          } else {
            k15[row.tahap].belum += 1;
          }
        } else if (row.jenis === "khotmil30") {
          const cfg = KHOTMIL_30_TAHAP.find((c) => c.tahap === row.tahap);
          const lengkap = cfg ? row.jumlah_juz_dinilai >= cfg.juzList.length : false;
          if (row.status_tuntas && lengkap) {
            k30[row.tahap].lulus += 1;
            if (row.tahap === 9) khatamReady += 1;
          } else {
            k30[row.tahap].belum += 1;
          }
        }
      });

      const formattedRecent: RecentSetoranItem[] = (recentRes.data ?? []).map((item) => {
        const rawSantri = Array.isArray(item.santri) ? item.santri[0] : item.santri;
        return {
          id: String(item.id),
          tanggal: String(item.tanggal),
          tipe: item.tipe as "juz_baru" | "evaluasi",
          jumlah_juz_tambahan: Number(item.jumlah_juz_tambahan ?? 0),
          santri: rawSantri
            ? {
                kode: String(rawSantri.kode),
                nama_lengkap: String(rawSantri.nama_lengkap),
                kamar: String(rawSantri.kamar),
                halaqoh_kelas: Number(rawSantri.halaqoh_kelas),
                halaqoh_bagian: String(rawSantri.halaqoh_bagian),
              }
            : null,
        };
      });

      setMetrics({
        totalSantri: santriRes.count ?? 0,
        hadirHariIniPagi: hadirPagi,
        hadirHariIniMalam: hadirMalam,
        setoranJuzBaruBulanIni: Number(totalJuzBaru.toFixed(2)),
        setoranEvaluasiBulanIni: Number(totalEvaluasi.toFixed(2)),
        khotmil15LulusPerTahap: k15,
        khotmil30LulusPerTahap: k30,
        recentSetoran: formattedRecent,
        khatamanReadyCount: khatamReady,
        isTodayFriday: isFriday,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat ringkasan data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Memuat analitik dan ringkasan penilaian {branding.app_name}...
          </p>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="rounded-2xl border border-red-300 bg-white p-6 space-y-3 shadow-sm dark:border-red-800 dark:bg-slate-900">
        <p className="text-sm font-semibold text-red-800 dark:text-red-300">
          Gagal memuat dashboard: {error}
        </p>
        <button
          type="button"
          onClick={loadDashboard}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white shadow-sm"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          <span>Muat Ulang</span>
        </button>
      </div>
    );
  }

  const hadirSesiAktif =
    selectedSesi === "pagi" ? metrics.hadirHariIniPagi : metrics.hadirHariIniMalam;
  const persentaseHadir =
    metrics.totalSantri > 0
      ? Math.min(100, Math.round((hadirSesiAktif / metrics.totalSantri) * 100))
      : 0;

  const activeTahapList = selectedKhotmilTab === "15" ? KHOTMIL_15_TAHAP : KHOTMIL_30_TAHAP;
  const activeRekapMap =
    selectedKhotmilTab === "15"
      ? metrics.khotmil15LulusPerTahap
      : metrics.khotmil30LulusPerTahap;

  return (
    <div className="space-y-7">
      {/* =================================================================== */}
      {/* 1. BARIS HEADER DASHBOARD & QUICK ACTION SHORTCUTS                  */}
      {/* =================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span>Ringkasan Penilaian Tahfidz Santri</span>
          </h1>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-1">
            Pantau kehadiran kegiatan harian, setoran Juz Baru, tren evaluasi hafalan, dan ketuntasan
            Khotmil KKM {branding.kkm_khotmil}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Toggle Sesi Pagi / Malam */}
          <div className="inline-flex items-center p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm text-xs font-bold">
            <button
              type="button"
              onClick={() => setSelectedSesi("pagi")}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-lg transition ${
                selectedSesi === "pagi"
                  ? "bg-brand text-white shadow-sm"
                  : "text-slate-700 dark:text-slate-300 hover:text-slate-900"
              }`}
            >
              Sesi Pagi
            </button>
            <button
              type="button"
              onClick={() => setSelectedSesi("malam")}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-lg transition ${
                selectedSesi === "malam"
                  ? "bg-brand text-white shadow-sm"
                  : "text-slate-700 dark:text-slate-300 hover:text-slate-900"
              }`}
            >
              Sesi Malam
            </button>
          </div>

          {/* Shortcut ke Pengaturan */}
          <Link
            href="/pengaturan"
            className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>Pengaturan</span>
          </Link>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. 4 KARTU KPI UTAMA (TERKONEKSI LANGSUNG DENGAN MODUL)             */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Total Santri */}
        <Link
          href="/santri"
          className="group bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-brand transition flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold tracking-wider text-slate-600 dark:text-slate-400 uppercase">
                Total Santri
              </span>
              <span className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950 text-brand-dark dark:text-emerald-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-4 h-4" aria-hidden="true" />
              </span>
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
                {metrics.totalSantri}
              </span>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-2.5 py-0.5 rounded-full">
                Kelas 1 - 10
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <span>Buka Data Santri</span>
            <ArrowRight className="w-3.5 h-3.5 text-brand group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* KPI 2: Kehadiran Hari Ini (Gauge) */}
        <Link
          href="/tahfidz/umum/kegiatan"
          className="group bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-brand transition flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold tracking-wider text-slate-600 dark:text-slate-400 uppercase block mb-1">
              Hadir ({selectedSesi.toUpperCase()})
            </span>
            <div className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
              {hadirSesiAktif}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Pagi: {metrics.hadirHariIniPagi} • Malam: {metrics.hadirHariIniMalam}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-emerald-800 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-600" aria-hidden="true" />
              <span>
                {metrics.isTodayFriday ? "Hari Jumat (Libur Absen)" : "Hari Kegiatan Aktif"}
              </span>
            </div>
          </div>

          <div
            className="relative w-14 h-14 flex items-center justify-center shrink-0"
            aria-label={`Persentase hadir: ${persentaseHadir}%`}
          >
            <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-200 dark:text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-brand"
                strokeDasharray={`${persentaseHadir}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-xs font-extrabold font-mono text-slate-800 dark:text-slate-100">
              {persentaseHadir}%
            </span>
          </div>
        </Link>

        {/* KPI 3: Setoran Juz Baru Bulan Ini */}
        <Link
          href="/tahfidz/umum/juz-baru"
          className="group bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-brand transition flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold tracking-wider text-slate-600 dark:text-slate-400 uppercase">
                Juz Baru (Bulan Ini)
              </span>
              <span className="w-8 h-8 rounded-full bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                <BookOpen className="w-4 h-4" aria-hidden="true" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
                {metrics.setoranJuzBaruBulanIni}
              </span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Juz</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <span>Disetor ke Pembimbing</span>
            <ArrowRight className="w-3.5 h-3.5 text-sky-600 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* KPI 4: Setoran Evaluasi Bulan Ini */}
        <Link
          href="/tahfidz/umum/evaluasi"
          className="group bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-brand transition flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold tracking-wider text-slate-600 dark:text-slate-400 uppercase">
                Evaluasi Pusat
              </span>
              <span className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Award className="w-4 h-4" aria-hidden="true" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
                {metrics.setoranEvaluasiBulanIni}
              </span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Juz</span>
              <span className="text-xs font-bold text-amber-800 bg-amber-100 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded-full ml-auto">
                KKM {branding.kkm_khotmil}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <span>Ujian Pengurus Pusat</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-600 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* =================================================================== */}
      {/* 3. LINE CHART UTAMA: PERKEMBANGAN SANTRI EVALUASI HAFALAN          */}
      {/* =================================================================== */}
      <EvaluasiLineChart
        data={chartData}
        timeframe={chartTimeframe}
        onTimeframeChange={setChartTimeframe}
        filterType={chartFilterType}
        onFilterTypeChange={setChartFilterType}
        loading={loadingChart}
      />

      {/* =================================================================== */}
      {/* 4. MODUL LANJUTAN: FLYER KHATAMAN, WA GATEWAY & KHOTMIL TAHAP       */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom 1 & 2: Ketuntasan Khotmil 15 & 30 Juz */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                Ketuntasan Khotmil Standar KKM {branding.kkm_khotmil}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Jumlah santri Lulus (nilai $\ge$ {branding.kkm_khotmil}) dibanding Belum Tuntas per
                tahap ujian
              </p>
            </div>
            <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setSelectedKhotmilTab("15")}
                className={`min-h-[34px] px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedKhotmilTab === "15"
                    ? "bg-brand text-white shadow-sm"
                    : "text-slate-700 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                Khotmil 15 Juz
              </button>
              <button
                type="button"
                onClick={() => setSelectedKhotmilTab("30")}
                className={`min-h-[34px] px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedKhotmilTab === "30"
                    ? "bg-brand text-white shadow-sm"
                    : "text-slate-700 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                Khotmil 30 Juz
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {activeTahapList.map((t) => {
              const stat = activeRekapMap[t.tahap] ?? { lulus: 0, belum: 0 };
              const totalDinilai = stat.lulus + stat.belum;
              const persenLulus =
                totalDinilai > 0 ? Math.round((stat.lulus / totalDinilai) * 100) : 0;

              return (
                <div
                  key={t.tahap}
                  className="rounded-xl border border-slate-200/80 dark:border-slate-800 p-3 bg-slate-50/60 dark:bg-slate-800/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-1.5">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">{t.label}</span>{" "}
                      <span className="text-slate-500 dark:text-slate-400">
                        ({t.rentangLabel})
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono font-bold">
                      <span className="text-emerald-700 dark:text-emerald-400">
                        Lulus: {stat.lulus}
                      </span>
                      <span className="text-rose-700 dark:text-rose-400">
                        Belum: {stat.belum}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full bg-brand rounded-full transition-all duration-500"
                      style={{ width: `${persenLulus}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Evaluasi Khotmil diuji langsung oleh Pengurus Pusat LPTQ.
            </span>
            <Link
              href={`/tahfidz/khotmil/${selectedKhotmilTab}`}
              className="font-bold text-brand hover:underline inline-flex items-center gap-1"
            >
              <span>Detail Khotmil {selectedKhotmilTab} Juz</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Kolom 3: Hub Modul Baru (Flyer Khataman & WhatsApp Gateway) */}
        <div className="space-y-5">
          {/* Card Shortcut 1: Flyer Khataman */}
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-white dark:to-slate-900 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-700/20">
                <FileImage className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Modul Baru
              </span>
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Flyer Khataman Otomatis
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Generate kartu ucapan wisuda khatam santri siap unduh HD & bagikan ke wali santri.
              </p>
            </div>
            <Link
              href="/alat/flyer-khataman"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-3.5 py-2 text-xs font-bold text-white hover:bg-brand-hover transition shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Buat Flyer Khataman</span>
            </Link>
          </div>

          {/* Card Shortcut 2: WhatsApp Gateway & Halaqoh */}
          <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp Gateway</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Online
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Kirim laporan absensi, setoran hafalan, dan ucapan khataman ke nomor WhatsApp wali santri.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                href="/alat/kirim-wa"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Kirim WA</span>
              </Link>
              <Link
                href="/halaqoh"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Halaqoh</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 5. LOG SETORAN HAFALAN TERBARU & TARGET KURIKULUM HALAQOH           */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Log Setoran Terbaru */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Log Setoran Hafalan Terbaru
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Aktivitas setoran Juz Baru & Evaluasi mutakhir yang tercatat di database
                </p>
              </div>
              <Link
                href="/tahfidz/umum/juz-baru"
                className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1"
              >
                <span>Lihat Semua</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {metrics.recentSetoran.length === 0 ? (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center">
                <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Belum ada catatan setoran terbaru
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Input setoran hafalan santri di modul Juz Baru atau Evaluasi Hafalan.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px]">
                      <th className="pb-3 font-bold">Kode</th>
                      <th className="pb-3 font-bold">Tanggal</th>
                      <th className="pb-3 font-bold">Nama Santri</th>
                      <th className="pb-3 font-bold">Halaqoh</th>
                      <th className="pb-3 font-bold">Tipe</th>
                      <th className="pb-3 font-bold text-right">Perolehan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {metrics.recentSetoran.map((item) => {
                      const initials = (item.santri?.nama_lengkap || "S")
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase();

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                          <td className="py-3 font-mono font-bold text-brand">
                            {item.santri?.kode ?? "-"}
                          </td>
                          <td className="py-3 font-mono text-slate-500 dark:text-slate-400">
                            {item.tanggal}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <span
                                aria-hidden="true"
                                className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-brand-dark dark:text-emerald-300 font-bold flex items-center justify-center text-[10px]"
                              >
                                {initials}
                              </span>
                              <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {item.santri?.nama_lengkap ?? "-"}
                              </span>
                            </div>
                          </td>
                          <td className="py-3">
                            {item.santri ? (
                              <HalaqohBadge
                                kelas={item.santri.halaqoh_kelas}
                                bagian={item.santri.halaqoh_bagian}
                              />
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.tipe === "juz_baru"
                                  ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                                  : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                              }`}
                            >
                              {item.tipe === "juz_baru" ? "Juz Baru" : "Evaluasi"}
                            </span>
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            +{item.jumlah_juz_tambahan} Juz
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <span>Menampilkan {metrics.recentSetoran.length} aktivitas setoran terakhir</span>
            <Link
              href="/santri"
              className="font-bold text-brand hover:underline"
            >
              Kelola Seluruh Santri
            </Link>
          </div>
        </div>

        {/* Pemetaan Halaqoh Kelas 1 s.d. 10 */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                Target Kurikulum Halaqoh
              </h2>
              <span className="text-xs font-bold text-brand">10 Kelas</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Target rentang Juz hafalan berjenjang untuk masing-masing tingkatan kelas:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(PEMETAAN_HALAQOH_KELAS).map(([kelas, juzRange]) => (
                <div
                  key={kelas}
                  className="flex items-center justify-between rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 px-3 py-2 text-xs"
                >
                  <span className="font-bold text-slate-900 dark:text-white">Kelas {kelas}</span>
                  <span className="font-mono font-semibold text-brand">
                    {juzRange}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/halaqoh"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 py-2.5 text-xs font-bold text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <GraduationCap className="w-4 h-4 text-brand" />
              <span>Buka Manajemen Halaqoh & Pengampu</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
