"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Users, CalendarCheck, BookOpen, Award, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  KHOTMIL_15_TAHAP,
  KHOTMIL_30_TAHAP,
  PEMETAAN_HALAQOH_KELAS,
  type SesiAbsen,
} from "@/types/database";
import { HalaqohBadge } from "@/components/ui/Badges";

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
  isTodayFriday: boolean;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSesi, setSelectedSesi] = useState<SesiAbsen>("pagi");
  const [selectedKhotmilTab, setSelectedKhotmilTab] = useState<"15" | "30">("15");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    try {
      const now = new Date();
      const todayIso = now.toISOString().slice(0, 10);
      const isFriday = now.getDay() === 5;
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const startMonth = `${year}-${String(month).padStart(2, "0")}-01`;

      const [santriRes, absenRes, setoranRes, khotmilRes, recentRes] = await Promise.all([
        supabase.from("santri").select("id", { count: "exact", head: true }),
        supabase
          .from("absensi")
          .select("sesi, status")
          .eq("tanggal", todayIso)
          .eq("status", "hadir"),
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
          .limit(5),
      ]);

      if (santriRes.error) throw santriRes.error;
      if (absenRes.error) throw absenRes.error;
      if (setoranRes.error) throw setoranRes.error;
      if (khotmilRes.error) throw khotmilRes.error;

      const hadirPagi = (absenRes.data ?? []).filter((a) => a.sesi === "pagi").length;
      const hadirMalam = (absenRes.data ?? []).filter((a) => a.sesi === "malam").length;

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

      (khotmilRes.data ?? []).forEach((row) => {
        if (row.jenis === "khotmil15") {
          const cfg = KHOTMIL_15_TAHAP.find((c) => c.tahap === row.tahap);
          const lengkap = cfg ? row.jumlah_juz_dinilai >= cfg.juzList.length : false;
          if (row.status_tuntas && lengkap) {
            k15[row.tahap].lulus += 1;
          } else {
            k15[row.tahap].belum += 1;
          }
        } else if (row.jenis === "khotmil30") {
          const cfg = KHOTMIL_30_TAHAP.find((c) => c.tahap === row.tahap);
          const lengkap = cfg ? row.jumlah_juz_dinilai >= cfg.juzList.length : false;
          if (row.status_tuntas && lengkap) {
            k30[row.tahap].lulus += 1;
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
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Memuat analitik dan ringkasan penilaian Lptq Blokagung...
        </p>
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
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white"
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
      {/* Baris Judul & Selector Sesi Absensi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Ringkasan Penilaian Tahfidz Santri
          </h1>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-1">
            Pantau kehadiran kegiatan harian, akumulasi setoran bulanan, dan ketuntasan Khotmil KKM
            85.
          </p>
        </div>

        <div className="inline-flex items-center p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm text-xs font-bold">
          <button
            type="button"
            onClick={() => setSelectedSesi("pagi")}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-lg transition ${
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
            className={`min-h-[38px] px-3.5 py-1.5 rounded-lg transition ${
              selectedSesi === "malam"
                ? "bg-brand text-white shadow-sm"
                : "text-slate-700 dark:text-slate-300 hover:text-slate-900"
            }`}
          >
            Sesi Malam
          </button>
        </div>
      </div>

      {/* 4 Kartu KPI Utama (Adaptasi Tata Letak Koki) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Total Santri */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold tracking-wider text-slate-600 dark:text-slate-400 uppercase">
                Total Santri
              </span>
              <span className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950 text-brand-dark dark:text-emerald-300 flex items-center justify-center">
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
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-4">
            Terdaftar aktif pada database LPTQ Blokagung
          </p>
        </div>

        {/* KPI 2: Kehadiran Hari Ini dengan Circular SVG Gauge ala Koki */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
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

          {/* Circular Gauge Persentase Kehadiran Nyata */}
          <div
            className="relative w-14 h-14 flex items-center justify-center shrink-0"
            aria-label={`Persentase hadir sesi ${selectedSesi}: ${persentaseHadir}%`}
          >
            <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
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
        </div>

        {/* KPI 3: Setoran Juz Baru Bulan Ini */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold tracking-wider text-slate-600 dark:text-slate-400 uppercase">
                Juz Baru (Bulan Ini)
              </span>
              <span className="w-8 h-8 rounded-full bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center">
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
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-4">
            Disetorkan kepada pembimbing halaqoh
          </p>
        </div>

        {/* KPI 4: Setoran Evaluasi Bulan Ini */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold tracking-wider text-slate-600 dark:text-slate-400 uppercase">
                Evaluasi Pusat
              </span>
              <span className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                <Award className="w-4 h-4" aria-hidden="true" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
                {metrics.setoranEvaluasiBulanIni}
              </span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Juz</span>
              <span className="text-xs font-bold text-amber-800 bg-amber-100 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded-full ml-auto">
                KKM 85
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-4">
            Diuji oleh pengurus pusat LPTQ
          </p>
        </div>
      </div>

      {/* Baris Analitik Ketuntasan Khotmil (2 Kolom) & Alur Tahapan Penilaian (1 Kolom) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grafik Bar & Tabel Ketuntasan Khotmil per Tahap */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Perbandingan Ketuntasan Tahfidz Khotmil per Tahap
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Jumlah santri Lulus (Nilai lengkap & rata-rata &gt;= 85) dibanding Belum Tuntas
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedKhotmilTab("15")}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedKhotmilTab === "15"
                    ? "bg-brand text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                Khotmil 15 Juz
              </button>
              <button
                type="button"
                onClick={() => setSelectedKhotmilTab("30")}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedKhotmilTab === "30"
                    ? "bg-brand text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
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
                      <span className="text-slate-600 dark:text-slate-400">
                        ({t.rentangLabel})
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono font-bold">
                      <span className="text-emerald-800 dark:text-emerald-400">
                        Lulus: {stat.lulus}
                      </span>
                      <span className="text-red-800 dark:text-red-400">
                        Belum: {stat.belum}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full bg-brand rounded-full transition-all"
                      style={{ width: `${persenLulus}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Kartu Alur 4 Langkah Penilaian (Adaptasi dari Kartu Track Order Koki) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Alur Penilaian Tahfidz
              </h2>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-2.5 py-0.5 rounded-full">
                AKTIF
              </span>
            </div>

            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl p-3.5 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 text-brand-dark dark:text-emerald-200 flex items-center justify-center">
                  <CalendarCheck className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Kegiatan Harian
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400">
                    Pagi & Malam (Jumat Libur)
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-extrabold font-mono text-brand-dark dark:text-emerald-300">
                  85
                </div>
                <div className="text-[10px] text-slate-600 dark:text-slate-400 uppercase font-bold">
                  Batas KKM
                </div>
              </div>
            </div>

            {/* Indikator 4 Tahap Kurikulum */}
            <div className="relative flex items-center justify-between px-2 mb-6">
              <div className="absolute left-6 right-6 top-3 h-0.5 bg-slate-200 dark:bg-slate-700 -z-0" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center text-[10px] font-bold">
                  1
                </div>
                <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 mt-1">
                  Absensi
                </span>
              </div>
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center text-[10px] font-bold">
                  2
                </div>
                <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 mt-1">
                  Juz Baru
                </span>
              </div>
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center text-[10px] font-bold">
                  3
                </div>
                <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 mt-1">
                  Evaluasi
                </span>
              </div>
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-6 h-6 rounded-full ring-4 ring-emerald-100 dark:ring-emerald-950 bg-brand text-white flex items-center justify-center text-[10px] font-bold">
                  4
                </div>
                <span className="text-[10px] font-bold text-brand-dark dark:text-emerald-300 mt-1">
                  Khotmil
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="font-bold text-slate-900 dark:text-white block">
                Aturan Penilaian Halaqoh
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-400 block leading-relaxed">
                Pembimbing menginput absensi dan setoran Juz Baru sesuai kelas/bagian, sedangkan
                Pengurus Pusat menginput Evaluasi & Nilai Khotmil.
              </span>
            </div>
          </div>

          <Link
            href="/tahfidz/umum/kegiatan"
            className="w-full mt-4 min-h-[44px] inline-flex items-center justify-center py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-800 dark:hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-sm"
          >
            Buka Grid Absensi Bulanan
          </Link>
        </div>
      </div>

      {/* Baris Bawah: Log Setoran Terbaru (2 Kolom) & Pemetaan Halaqoh Kelas 1-10 (1 Kolom) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabel Log Setoran Santri Terbaru */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Log Setoran Hafalan Terbaru
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Catatan setoran Juz Baru dan Evaluasi terakhir yang masuk ke database
                </p>
              </div>
              <Link
                href="/tahfidz/umum/juz-baru"
                className="text-xs font-bold text-brand-dark dark:text-emerald-400 hover:underline"
              >
                Lihat Rekap Bulanan
              </Link>
            </div>

            {metrics.recentSetoran.length === 0 ? (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-6 text-center">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Belum ada catatan setoran
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Buka menu Juz Baru atau Evaluasi untuk mulai mencatat setoran hafalan santri.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px]">
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
                        <tr key={item.id}>
                          <td className="py-3.5 font-mono font-bold text-brand-dark dark:text-emerald-400">
                            {item.santri?.kode ?? "-"}
                          </td>
                          <td className="py-3.5 font-mono text-slate-600 dark:text-slate-400">
                            {item.tanggal}
                          </td>
                          <td className="py-3.5">
                            <div className="flex items-center gap-2.5">
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
                          <td className="py-3.5">
                            {item.santri ? (
                              <HalaqohBadge
                                kelas={item.santri.halaqoh_kelas}
                                bagian={item.santri.halaqoh_bagian}
                              />
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="py-3.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                item.tipe === "juz_baru"
                                  ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                                  : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                              }`}
                            >
                              {item.tipe === "juz_baru" ? "Juz Baru" : "Evaluasi"}
                            </span>
                          </td>
                          <td className="py-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
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

          <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            <span>Menampilkan {metrics.recentSetoran.length} log setoran terbaru</span>
            <Link
              href="/santri"
              className="font-bold text-brand-dark dark:text-emerald-400 hover:underline"
            >
              Kelola Seluruh Santri
            </Link>
          </div>
        </div>

        {/* Widget Kanan: Pemetaan Halaqoh Kelas 1 s.d. 10 */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Pemetaan Halaqoh Kelas
            </h2>
            <span className="text-xs font-bold text-brand-dark dark:text-emerald-400">
              10 Kelas
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
            Target rentang Juz untuk masing-masing tingkatan Halaqoh Kelas (Bagian A s.d. F):
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {Object.entries(PEMETAAN_HALAQOH_KELAS).map(([kelas, juzRange]) => (
              <div
                key={kelas}
                className="flex items-center justify-between rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 px-3 py-2 text-xs"
              >
                <span className="font-bold text-slate-900 dark:text-white">Kelas {kelas}</span>
                <span className="font-mono font-semibold text-brand-dark dark:text-emerald-300">
                  {juzRange}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
