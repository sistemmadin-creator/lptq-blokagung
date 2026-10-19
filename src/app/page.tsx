"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  KHOTMIL_15_TAHAP,
  KHOTMIL_30_TAHAP,
  PEMETAAN_HALAQOH_KELAS,
} from "@/types/database";

interface DashboardMetrics {
  totalSantri: number;
  hadirHariIniPagi: number;
  hadirHariIniMalam: number;
  setoranJuzBaruBulanIni: number;
  setoranEvaluasiBulanIni: number;
  khotmil15LulusPerTahap: Record<number, { lulus: number; belum: number }>;
  khotmil30LulusPerTahap: Record<number, { lulus: number; belum: number }>;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    try {
      const todayIso = new Date().toISOString().slice(0, 10);
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const startMonth = `${year}-${String(month).padStart(2, "0")}-01`;

      const [santriRes, absenRes, setoranRes, khotmilRes] = await Promise.all([
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

      setMetrics({
        totalSantri: santriRes.count ?? 0,
        hadirHariIniPagi: hadirPagi,
        hadirHariIniMalam: hadirMalam,
        setoranJuzBaruBulanIni: Number(totalJuzBaru.toFixed(2)),
        setoranEvaluasiBulanIni: Number(totalEvaluasi.toFixed(2)),
        khotmil15LulusPerTahap: k15,
        khotmil30LulusPerTahap: k30,
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
      <div className="rounded-md border border-slate-300 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-medium">Memuat ringkasan penilaian Lptq Blokagung...</p>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="rounded-md border border-red-300 bg-white p-6 space-y-3 dark:border-red-800 dark:bg-slate-900">
        <p className="text-sm font-semibold text-red-800 dark:text-red-300">
          Gagal memuat dashboard: {error}
        </p>
        <button
          type="button"
          onClick={loadDashboard}
          className="min-h-[44px] rounded-md bg-emerald-800 px-4 py-2 text-xs font-semibold text-white"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Ringkasan Penilaian Tahfidz Santri
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Pantau kehadiran harian, perolehan setoran bulan berjalan, dan ketuntasan Khotmil (KKM 85).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/santri"
            className="inline-flex min-h-[44px] items-center rounded-md bg-emerald-800 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-900"
          >
            Kelola Data Santri
          </Link>
          <Link
            href="/tahfidz/umum/kegiatan"
            className="inline-flex min-h-[44px] items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            Isi Absensi Hari Ini
          </Link>
        </div>
      </div>

      {/* Ringkasan Metrik Nyata dari Database */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-md border border-slate-300 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">
            Total Santri Terdaftar
          </p>
          <p className="mt-2 text-3xl font-bold font-mono text-slate-900 dark:text-white">
            {metrics.totalSantri}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Santri aktif sesuai cakupan halaqoh Anda
          </p>
        </div>

        <div className="rounded-md border border-slate-300 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">
            Kehadiran Hari Ini
          </p>
          <div className="mt-2 flex items-baseline gap-6 font-mono">
            <div>
              <span className="text-2xl font-bold text-emerald-800 dark:text-emerald-400">
                {metrics.hadirHariIniPagi}
              </span>
              <span className="ml-1.5 text-xs text-slate-600 dark:text-slate-400">Sesi Pagi</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-emerald-800 dark:text-emerald-400">
                {metrics.hadirHariIniMalam}
              </span>
              <span className="ml-1.5 text-xs text-slate-600 dark:text-slate-400">Sesi Malam</span>
            </div>
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Hari Jumat otomatis libur absensi kegiatan
          </p>
        </div>

        <div className="rounded-md border border-slate-300 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">
            Total Setoran Bulan Berjalan
          </p>
          <div className="mt-2 flex items-baseline gap-6 font-mono">
            <div>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {metrics.setoranJuzBaruBulanIni}
              </span>
              <span className="ml-1 text-xs text-slate-600 dark:text-slate-400">Juz Baru</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {metrics.setoranEvaluasiBulanIni}
              </span>
              <span className="ml-1 text-xs text-slate-600 dark:text-slate-400">Evaluasi</span>
            </div>
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Akumulasi setoran santri pada bulan aktif
          </p>
        </div>
      </div>

      {/* Rekap Ketuntasan Khotmil 15 & 30 per Tahap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="rounded-md border border-slate-300 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Ketuntasan Khotmil 15 Juz (Tahap 1 s.d. 5)
            </h2>
            <Link
              href="/tahfidz/khotmil/15"
              className="text-xs font-semibold text-emerald-800 hover:underline dark:text-emerald-400"
            >
              Buka Tabel Nilai
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <th className="py-2 pr-2">Tahap</th>
                  <th className="py-2 px-2">Cakupan Juz</th>
                  <th className="py-2 px-2 text-right">Tuntas (&gt;=85)</th>
                  <th className="py-2 pl-2 text-right">Belum Tuntas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {KHOTMIL_15_TAHAP.map((t) => {
                  const stat = metrics.khotmil15LulusPerTahap[t.tahap] ?? { lulus: 0, belum: 0 };
                  return (
                    <tr key={t.tahap}>
                      <td className="py-2 pr-2 font-semibold">{t.label}</td>
                      <td className="py-2 px-2">{t.rentangLabel}</td>
                      <td className="py-2 px-2 text-right font-mono font-semibold text-emerald-800 dark:text-emerald-400">
                        {stat.lulus} santri
                      </td>
                      <td className="py-2 pl-2 text-right font-mono font-semibold text-red-800 dark:text-red-400">
                        {stat.belum} santri
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-md border border-slate-300 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Ketuntasan Khotmil 30 Juz (Tahap 1 s.d. 9)
            </h2>
            <Link
              href="/tahfidz/khotmil/30"
              className="text-xs font-semibold text-emerald-800 hover:underline dark:text-emerald-400"
            >
              Buka Tabel Nilai
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <th className="py-2 pr-2">Tahap</th>
                  <th className="py-2 px-2">Cakupan Juz</th>
                  <th className="py-2 px-2 text-right">Tuntas (&gt;=85)</th>
                  <th className="py-2 pl-2 text-right">Belum Tuntas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {KHOTMIL_30_TAHAP.map((t) => {
                  const stat = metrics.khotmil30LulusPerTahap[t.tahap] ?? { lulus: 0, belum: 0 };
                  return (
                    <tr key={t.tahap}>
                      <td className="py-2 pr-2 font-semibold">{t.label}</td>
                      <td className="py-2 px-2">{t.rentangLabel}</td>
                      <td className="py-2 px-2 text-right font-mono font-semibold text-emerald-800 dark:text-emerald-400">
                        {stat.lulus} santri
                      </td>
                      <td className="py-2 pl-2 text-right font-mono font-semibold text-red-800 dark:text-red-400">
                        {stat.belum} santri
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Referensi Kurikulum Pemetaan Halaqoh Kelas 1-10 */}
      <section className="rounded-md border border-slate-300 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
          Pedoman Pemetaan Halaqoh Kelas (Kelas 1 s.d. Kelas 10)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
          {Object.entries(PEMETAAN_HALAQOH_KELAS).map(([kelas, juzRange]) => (
            <div
              key={kelas}
              className="rounded border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/60"
            >
              <span className="font-bold text-emerald-900 dark:text-emerald-300">
                Kelas {kelas}:
              </span>{" "}
              <span className="text-slate-800 dark:text-slate-200">{juzRange}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
