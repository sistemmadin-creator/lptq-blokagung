"use client";


import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  Printer,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Award,
  Sparkles,
  X,
  ArrowLeft,
  UserCheck,
  BookOpen,
  Info,
  Loader2,
  Calendar,
  Check,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import {
  fetchAllSantriFiltered,
  fetchKhotmilAllNilai,
  fetchKhotmilRegisteredSantriIds,
  fetchPembimbingMap,
} from "@/lib/services/tahfidz-service";
import {
  KKM_DEFAULT,
  type JenisKhotmil,
  type Santri,
  type TahapConfig,
  type KhotmilNilaiRecord,
} from "@/types/database";
import { HalaqohBadge } from "@/components/ui/Badges";
import { exportJsonToExcel } from "@/lib/utils/excel";
import { useToast } from "@/components/ui/Toast";

export interface RekapKhotmilModuleProps {
  jenis: JenisKhotmil; // "khotmil15" | "khotmil30"
  judul: string;
  tahapList: TahapConfig[];
}

type RekapMode = "semua_tahap" | "nilai_100" | "dibawah_kkm";

function formatKamarDisplay(kodeKamar?: string | null, kamar?: string | null): string {
  const kKode = (kodeKamar || "").trim();
  const kKamar = (kamar || "").trim();
  if (!kKode && !kKamar) return "-";
  if (kKode && kKamar) {
    if (kKamar.toUpperCase().startsWith(kKode.toUpperCase())) {
      return kKamar;
    }
    return `${kKode}${kKamar}`;
  }
  return kKode || kKamar;
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, "...", total];
  }
  if (current >= total - 3) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "...", current - 1, current, current + 1, "...", total];
}

interface SantriTahapSummary {
  tahap: number;
  label: string;
  rentangLabel: string;
  scores: { juz: number; nilai: number }[];
  average: number | null;
  isComplete: boolean;
  isLulus: boolean;
  hasRemidi: boolean;
  has100: boolean;
}

interface SantriRekapRow {
  santri: Santri;
  tahapSummaries: SantriTahapSummary[];
  totalEvaluatedJuz: number;
  totalRequiredJuz: number;
  overallAverage: number | null;
  overallStatus: "lulus" | "remidi" | "proses";
  count100: number;
  countBawahKKM: number;
}

interface ItemNilaiDetail {
  id: string;
  santri: Santri;
  tahap: TahapConfig;
  juz: number;
  nilai: number;
  selisihKKM?: number;
}

export function RekapKhotmilModule({ jenis, judul, tahapList }: RekapKhotmilModuleProps) {
  const { showToast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  // Switch Poin Rekap (Sesuai permintaan: a. Semua Tahap, b. Nilai 100, c. Nilai dibawah KKM)
  const [rekapMode, setRekapMode] = useState<RekapMode>("semua_tahap");

  const [search, setSearch] = useState("");
  const [asramaFilter, setAsramaFilter] = useState("");
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const pageSizeOptions = [10, 15, 25, 50];

  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [allNilaiRecords, setAllNilaiRecords] = useState<KhotmilNilaiRecord[]>([]);
  const [pembimbingMap, setPembimbingMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Detail Rincian Santri
  const [selectedSantriDetail, setSelectedSantriDetail] = useState<SantriRekapRow | null>(null);

  const totalTahapCount = tahapList.length;
  const is15Juz = jenis === "khotmil15";

  // Muat data terdaftar & seluruh nilai dari Supabase
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [allSantri, nilaiData, scoredSantriIds, pbMap] = await Promise.all([
        fetchAllSantriFiltered({ search, asrama: asramaFilter }),
        fetchKhotmilAllNilai(jenis),
        fetchKhotmilRegisteredSantriIds(jenis),
        fetchPembimbingMap(),
      ]);

      // Ambil daftar santri terdaftar dari localStorage jika ada
      let localRegistered: string[] = [];
      try {
        const stored = localStorage.getItem(`lptq_registered_khotmil_${jenis}`);
        if (stored) localRegistered = JSON.parse(stored);
      } catch (e) {
        console.error("Gagal membaca localStorage:", e);
      }

      const registeredSet = new Set([...localRegistered, ...scoredSantriIds]);
      const registeredSantri = allSantri.filter((s) => registeredSet.has(s.id));

      setSantriList(registeredSantri);
      setAllNilaiRecords(nilaiData);
      setPembimbingMap(pbMap);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Gagal memuat rekapitulasi nilai khotmil");
    } finally {
      setLoading(false);
    }
  }, [jenis, search, asramaFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset page saat ganti filter atau switch mode
  useEffect(() => {
    setPage(1);
  }, [rekapMode, search, asramaFilter, pageSize]);

  // Map nilai: `${santri_id}_${tahap}_${juz}` -> number
  const nilaiLookup = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of allNilaiRecords) {
      map.set(`${r.santri_id}_${r.tahap}_${r.juz}`, r.nilai);
    }
    return map;
  }, [allNilaiRecords]);

  // Santri Map: santri_id -> Santri
  const santriMap = useMemo(() => {
    const map = new Map<string, Santri>();
    for (const s of santriList) {
      map.set(s.id, s);
    }
    return map;
  }, [santriList]);

  // Tahap Map: tahap number -> TahapConfig
  const tahapMap = useMemo(() => {
    const map = new Map<number, TahapConfig>();
    for (const t of tahapList) {
      map.set(t.tahap, t);
    }
    return map;
  }, [tahapList]);

  // 1. Data Agregasi Seluruh Tahap per Santri (Mode a)
  const rekapRows = useMemo<SantriRekapRow[]>(() => {
    return santriList.map((santri) => {
      let totalScoreSum = 0;
      let totalEvaluatedJuz = 0;
      let totalRequiredJuz = 0;
      let count100 = 0;
      let countBawahKKM = 0;
      let allTahapCompleteAndLulus = true;
      let anyRemidi = false;

      const tahapSummaries: SantriTahapSummary[] = tahapList.map((tCfg) => {
        totalRequiredJuz += tCfg.juzList.length;
        const scores: { juz: number; nilai: number }[] = [];
        let tahapSum = 0;

        for (const j of tCfg.juzList) {
          const val = nilaiLookup.get(`${santri.id}_${tCfg.tahap}_${j}`);
          if (val !== undefined) {
            scores.push({ juz: j, nilai: val });
            tahapSum += val;
            totalScoreSum += val;
            totalEvaluatedJuz++;
            if (val === 100) count100++;
            if (val < KKM_DEFAULT) countBawahKKM++;
          }
        }

        const isComplete = scores.length === tCfg.juzList.length;
        const average = scores.length > 0 ? tahapSum / scores.length : null;
        const hasRemidi = scores.some((sc) => sc.nilai < KKM_DEFAULT);
        const has100 = scores.some((sc) => sc.nilai === 100);
        const isLulus = isComplete && average !== null && average >= KKM_DEFAULT && !hasRemidi;

        if (!isLulus) {
          allTahapCompleteAndLulus = false;
        }
        if (hasRemidi) {
          anyRemidi = true;
        }

        return {
          tahap: tCfg.tahap,
          label: tCfg.label,
          rentangLabel: tCfg.rentangLabel,
          scores,
          average,
          isComplete,
          isLulus,
          hasRemidi,
          has100,
        };
      });

      const overallAverage =
        totalEvaluatedJuz > 0 ? totalScoreSum / totalEvaluatedJuz : null;

      let overallStatus: "lulus" | "remidi" | "proses" = "proses";
      if (anyRemidi) {
        overallStatus = "remidi";
      } else if (allTahapCompleteAndLulus && totalEvaluatedJuz === totalRequiredJuz) {
        overallStatus = "lulus";
      } else {
        overallStatus = "proses";
      }

      return {
        santri,
        tahapSummaries,
        totalEvaluatedJuz,
        totalRequiredJuz,
        overallAverage,
        overallStatus,
        count100,
        countBawahKKM,
      };
    });
  }, [santriList, tahapList, nilaiLookup]);

  // 2. Daftar Nilai Sempurna (100) (Mode b)
  const listNilai100 = useMemo<ItemNilaiDetail[]>(() => {
    const list: ItemNilaiDetail[] = [];
    for (const r of allNilaiRecords) {
      if (r.nilai === 100) {
        const santri = santriMap.get(r.santri_id);
        const tCfg = tahapMap.get(r.tahap);
        if (santri && tCfg) {
          list.push({
            id: `${r.santri_id}_${r.tahap}_${r.juz}`,
            santri,
            tahap: tCfg,
            juz: r.juz,
            nilai: r.nilai,
          });
        }
      }
    }
    // Urutkan berdasarkan nama santri lalu juz
    return list.sort((a, b) => {
      const cmp = a.santri.nama_lengkap.localeCompare(b.santri.nama_lengkap);
      if (cmp !== 0) return cmp;
      return a.juz - b.juz;
    });
  }, [allNilaiRecords, santriMap, tahapMap]);

  // 3. Daftar Nilai Di Bawah KKM (<85) (Mode c)
  const listNilaiBawahKKM = useMemo<ItemNilaiDetail[]>(() => {
    const list: ItemNilaiDetail[] = [];
    for (const r of allNilaiRecords) {
      if (r.nilai < KKM_DEFAULT) {
        const santri = santriMap.get(r.santri_id);
        const tCfg = tahapMap.get(r.tahap);
        if (santri && tCfg) {
          list.push({
            id: `${r.santri_id}_${r.tahap}_${r.juz}`,
            santri,
            tahap: tCfg,
            juz: r.juz,
            nilai: r.nilai,
            selisihKKM: r.nilai - KKM_DEFAULT,
          });
        }
      }
    }
    // Urutkan nilai terendah dahulu
    return list.sort((a, b) => a.nilai - b.nilai);
  }, [allNilaiRecords, santriMap, tahapMap]);

  // Statistik Ringkasan
  const stats = useMemo(() => {
    const totalSantri = santriList.length;
    const lulusCount = rekapRows.filter((r) => r.overallStatus === "lulus").length;
    const total100 = listNilai100.length;
    const santri100Count = new Set(listNilai100.map((i) => i.santri.id)).size;
    const totalBawahKKM = listNilaiBawahKKM.length;
    const santriBawahKKMCount = new Set(listNilaiBawahKKM.map((i) => i.santri.id)).size;

    return {
      totalSantri,
      lulusCount,
      total100,
      santri100Count,
      totalBawahKKM,
      santriBawahKKMCount,
    };
  }, [santriList, rekapRows, listNilai100, listNilaiBawahKKM]);

  // Pagination Data Sesuai Mode Aktif
  const { currentDataLength, paginatedData } = useMemo(() => {
    if (rekapMode === "semua_tahap") {
      const len = rekapRows.length;
      const start = (page - 1) * pageSize;
      return { currentDataLength: len, paginatedData: rekapRows.slice(start, start + pageSize) };
    }
    if (rekapMode === "nilai_100") {
      const len = listNilai100.length;
      const start = (page - 1) * pageSize;
      return { currentDataLength: len, paginatedData: listNilai100.slice(start, start + pageSize) };
    }
    // dibawah_kkm
    const len = listNilaiBawahKKM.length;
    const start = (page - 1) * pageSize;
    return { currentDataLength: len, paginatedData: listNilaiBawahKKM.slice(start, start + pageSize) };
  }, [rekapMode, rekapRows, listNilai100, listNilaiBawahKKM, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(currentDataLength / pageSize));

  // Fungsi Cetak (Print)
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `${judul} - ${rekapMode.toUpperCase()}`,
  });

  // Ekspor Excel
  const handleExportExcel = () => {
    if (rekapMode === "semua_tahap") {
      const rows = rekapRows.map((r, idx) => {
        const rowData: Record<string, any> = {
          No: idx + 1,
          Kode: r.santri.kode,
          Nama: r.santri.nama_lengkap,
          Kamar: formatKamarDisplay(r.santri.kode_kamar, r.santri.kamar),
          Halaqoh: `${r.santri.halaqoh_kelas ?? ""}${r.santri.halaqoh_bagian ?? ""}`,
        };

        r.tahapSummaries.forEach((ts) => {
          rowData[`${ts.label} (${ts.rentangLabel})`] =
            ts.average !== null ? Number(ts.average.toFixed(1)) : "-";
        });

        rowData["Nilai Akhir"] =
          r.overallAverage !== null ? Number(r.overallAverage.toFixed(1)) : "-";
        rowData["Status Kelulusan"] =
          r.overallStatus === "lulus"
            ? "LULUS / TUNTAS"
            : r.overallStatus === "remidi"
            ? "PERLU REMIDI"
            : "BELUM LENGKAP";

        return rowData;
      });

      exportJsonToExcel(rows, `${judul} - Semua Tahap`);
    } else if (rekapMode === "nilai_100") {
      const rows = listNilai100.map((item, idx) => ({
        No: idx + 1,
        Kode: item.santri.kode,
        Nama: item.santri.nama_lengkap,
        Kamar: formatKamarDisplay(item.santri.kode_kamar, item.santri.kamar),
        Halaqoh: `${item.santri.halaqoh_kelas ?? ""}${item.santri.halaqoh_bagian ?? ""}`,
        Tahap: `${item.tahap.label} (${item.tahap.rentangLabel})`,
        Juz: `Juz ${item.juz}`,
        Nilai: item.nilai,
        Predikat: "Mumtaz / Sempurna (100)",
      }));

      exportJsonToExcel(rows, `${judul} - Nilai Sempurna 100`);
    } else {
      const rows = listNilaiBawahKKM.map((item, idx) => ({
        No: idx + 1,
        Kode: item.santri.kode,
        Nama: item.santri.nama_lengkap,
        Kamar: formatKamarDisplay(item.santri.kode_kamar, item.santri.kamar),
        Halaqoh: `${item.santri.halaqoh_kelas ?? ""}${item.santri.halaqoh_bagian ?? ""}`,
        Tahap: `${item.tahap.label} (${item.tahap.rentangLabel})`,
        Juz: `Juz ${item.juz}`,
        Nilai: item.nilai,
        "Standar KKM": KKM_DEFAULT,
        Selisih: item.selisihKKM,
        Keterangan: "Perlu Remidi / Belum Tuntas",
      }));

      exportJsonToExcel(rows, `${judul} - Nilai Di Bawah KKM`);
    }

    showToast("success", "Data rekapitulasi berhasil diekspor ke format Excel.");
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman & Navigasi Cepat */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/tahfidz/khotmil/${is15Juz ? "15" : "30"}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 dark:text-emerald-300 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Penilaian Tahap</span>
            </Link>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Rekapitulasi Akumulasi
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
            {judul}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Standar KKM: <strong>85</strong>. Rekapitulasi progres kelulusan {totalTahapCount} tahap,
            capaian nilai sempurna (100), dan daftar remidi di bawah KKM.
          </p>
        </div>

        {/* Switch Antar Halaman Rekap (15 Juz vs 30 Juz) */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <Link
              href="/tahfidz/khotmil/rekap/15"
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                is15Juz
                  ? "bg-white text-emerald-800 shadow-xs dark:bg-slate-900 dark:text-emerald-300"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              Rekap 15 Juz (5 Tahap)
            </Link>
            <Link
              href="/tahfidz/khotmil/rekap/30"
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                !is15Juz
                  ? "bg-white text-emerald-800 shadow-xs dark:bg-slate-900 dark:text-emerald-300"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              Rekap 30 Juz (9 Tahap)
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Kartu Ringkasan Statistik */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Santri Terdaftar
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 font-mono">
              {stats.totalSantri}
            </span>
            <span className="text-xs text-slate-500">Santri</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Lulus / Tuntas
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-800 dark:text-emerald-300 font-mono">
              {stats.lulusCount}
            </span>
            <span className="text-xs text-slate-500">
              {stats.totalSantri > 0
                ? `(${((stats.lulusCount / stats.totalSantri) * 100).toFixed(0)}%)`
                : "0%"}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Nilai Sempurna (100)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-700 dark:text-amber-300 font-mono">
              {stats.total100}
            </span>
            <span className="text-xs text-slate-500">
              di {stats.santri100Count} santri
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Di Bawah KKM (&lt;85)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-rose-700 dark:text-rose-400 font-mono">
              {stats.totalBawahKKM}
            </span>
            <span className="text-xs text-slate-500">
              di {stats.santriBawahKKMCount} santri
            </span>
          </div>
        </div>
      </div>

      {/* TOOLBAR UTAMA & TOMBOL SWITCH 3 POIN REKAPITULASI */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        {/* Tombol Switch 3 Poin Rekapitulasi (Poin a, b, c sesuai permintaan) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setRekapMode("semua_tahap")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition ${
                rekapMode === "semua_tahap"
                  ? "bg-white text-emerald-900 shadow-sm dark:bg-slate-900 dark:text-emerald-300"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>Semua Tahap ({totalTahapCount} Tahap)</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 font-mono">
                {rekapRows.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRekapMode("nilai_100")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition ${
                rekapMode === "nilai_100"
                  ? "bg-white text-amber-900 shadow-sm dark:bg-slate-900 dark:text-amber-300"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Nilai Sempurna (100)</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-mono">
                {listNilai100.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRekapMode("dibawah_kkm")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition ${
                rekapMode === "dibawah_kkm"
                  ? "bg-white text-rose-900 shadow-sm dark:bg-slate-900 dark:text-rose-300"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Nilai Di Bawah KKM</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-mono">
                {listNilaiBawahKKM.length}
              </span>
            </button>
          </div>

          {/* Tombol Ekspor & Cetak */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
              title="Ekspor Rekap ke Excel"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
              <span className="hidden sm:inline">Ekspor Excel</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
              title="Cetak Rekapitulasi"
            >
              <Printer className="h-4 w-4 text-slate-700 dark:text-slate-300" />
              <span className="hidden sm:inline">Cetak</span>
            </button>
          </div>
        </div>

        {/* Input Pencarian & Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari santri, nomor kamar, atau nama halaqoh..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-800 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <button
              type="button"
              onClick={() => setFilterModalOpen(true)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                asramaFilter
                  ? "border-emerald-800 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filter Asrama</span>
              {asramaFilter && <span className="h-2 w-2 rounded-full bg-emerald-700" />}
            </button>

            {/* Pilihan Baris Per Halaman */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="hidden sm:inline">Tampilkan:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-none"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt} baris
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* KONTEN UTAMA: TABEL SESUAI SWITCH MODE */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 p-8">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-800 dark:text-emerald-400" />
            <p className="text-xs text-slate-500">Memuat data rekapitulasi khotmil...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-rose-600">{error}</div>
        ) : currentDataLength === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
              <BookOpen className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-100">
              Tidak ada data ditemukan
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              {rekapMode === "nilai_100"
                ? "Belum ada santri yang memperoleh nilai sempurna 100 pada ujian khotmil ini."
                : rekapMode === "dibawah_kkm"
                ? "Alhamdulillah! Tidak ada nilai di bawah KKM (seluruh nilai santri telah tuntas minimal 85)."
                : "Belum ada santri yang terdaftar atau data tidak cocok dengan filter pencarian."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto" ref={printRef}>
            {/* Header Dokumen untuk Cetak */}
            <div className="hidden print:block p-6 border-b border-slate-300 text-center">
              <h2 className="text-lg font-bold uppercase tracking-tight text-slate-900">
                Lembaga Pembinaan Tilawatil Qur&apos;an (LPTQ)
              </h2>
              <p className="text-xs text-slate-600">Pondok Pesantren Darussalam Blokagung Banyuwangi</p>
              <h3 className="text-base font-extrabold uppercase mt-2 text-slate-900">
                {judul} - {rekapMode === "semua_tahap" ? "Rekapitulasi Semua Tahap" : rekapMode === "nilai_100" ? "Capaian Nilai Sempurna (100)" : "Daftar Nilai Di Bawah KKM"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">Dicetak pada: {new Date().toLocaleDateString("id-ID", { dateStyle: "full" })}</p>
            </div>

            {/* TABEL A: REKAPITULASI SEMUA TAHAP (5 TAHAP / 9 TAHAP) */}
            {rekapMode === "semua_tahap" && (
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/50">
                    <th className="py-3.5 pl-4 pr-2 font-bold text-slate-700 dark:text-slate-300 w-10 text-center">
                      No
                    </th>
                    <th className="px-3 py-3.5 font-bold text-slate-700 dark:text-slate-300 min-w-[190px]">
                      Nama Santri
                    </th>
                    <th className="px-3 py-3.5 font-bold text-slate-700 dark:text-slate-300 w-20 text-center">
                      Kamar
                    </th>
                    <th className="px-3 py-3.5 font-bold text-slate-700 dark:text-slate-300 w-20 text-center">
                      Halaqoh
                    </th>

                    {/* Kolom Tiap Tahap */}
                    {tahapList.map((t) => (
                      <th
                        key={t.tahap}
                        className="px-2.5 py-3.5 font-bold text-slate-700 dark:text-slate-300 text-center min-w-[95px]"
                      >
                        <div>{t.label}</div>
                        <div className="text-[10px] font-normal text-slate-400">
                          {t.rentangLabel}
                        </div>
                      </th>
                    ))}

                    <th className="px-3 py-3.5 font-bold text-slate-700 dark:text-slate-300 text-center w-24">
                      Rata-rata
                    </th>
                    <th className="px-3 py-3.5 font-bold text-slate-700 dark:text-slate-300 text-center min-w-[120px]">
                      Status KKM
                    </th>
                    <th className="px-3 py-3.5 font-bold text-slate-700 dark:text-slate-300 text-center w-24 no-print">
                      Rincian
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(paginatedData as SantriRekapRow[]).map((row, idx) => {
                    const santri = row.santri;
                    const rowNumber = (page - 1) * pageSize + idx + 1;
                    return (
                      <tr
                        key={santri.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                      >
                        <td className="py-3 pl-4 pr-2 text-center font-mono text-slate-400">
                          {rowNumber}
                        </td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => setSelectedSantriDetail(row)}
                            className="text-left group"
                          >
                            <span className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-800 dark:group-hover:text-emerald-400 transition">
                              {santri.nama_lengkap}
                            </span>
                            <span className="block text-[10px] text-slate-400 font-mono">
                              {santri.kode || "-"}
                            </span>
                          </button>
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-semibold text-slate-600 dark:text-slate-300">
                          {formatKamarDisplay(santri.kode_kamar, santri.kamar)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <HalaqohBadge
                            kelas={santri.halaqoh_kelas}
                            bagian={santri.halaqoh_bagian}
                          />
                        </td>

                        {/* Nilai Rata-rata per Tahap */}
                        {row.tahapSummaries.map((ts) => {
                          const avg = ts.average;
                          return (
                            <td key={ts.tahap} className="px-2.5 py-3 text-center">
                              {avg === null ? (
                                <span className="text-slate-300 dark:text-slate-600 font-mono">
                                  -
                                </span>
                              ) : avg === 100 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 font-bold font-mono text-xs dark:bg-amber-950 dark:text-amber-200">
                                  <span>100</span>
                                  <Sparkles className="w-3 h-3 text-amber-600 fill-amber-400" />
                                </span>
                              ) : avg >= KKM_DEFAULT ? (
                                <span className="inline-flex px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-bold font-mono text-xs dark:bg-emerald-950 dark:text-emerald-300">
                                  {avg.toFixed(1)}
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-0.5 rounded-lg bg-rose-50 text-rose-800 font-bold font-mono text-xs dark:bg-rose-950 dark:text-rose-300">
                                  {avg.toFixed(1)}
                                </span>
                              )}
                            </td>
                          );
                        })}

                        {/* Rata-rata Akhir Keseluruhan */}
                        <td className="px-3 py-3 text-center">
                          {row.overallAverage !== null ? (
                            <span
                              className={`font-mono font-extrabold text-xs px-2 py-1 rounded-lg ${
                                row.overallAverage >= KKM_DEFAULT
                                  ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                                  : "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200"
                              }`}
                            >
                              {row.overallAverage.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono">-</span>
                          )}
                        </td>

                        {/* Status Kelulusan */}
                        <td className="px-3 py-3 text-center">
                          {row.overallStatus === "lulus" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold dark:bg-emerald-950 dark:text-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Lulus / Tuntas</span>
                            </span>
                          ) : row.overallStatus === "remidi" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold dark:bg-rose-950 dark:text-rose-300">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Perlu Remidi</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold dark:bg-slate-800 dark:text-slate-400">
                              <span>Belum Lengkap</span>
                            </span>
                          )}
                        </td>

                        {/* Tombol Lihat Rincian */}
                        <td className="px-3 py-3 text-center no-print">
                          <button
                            type="button"
                            onClick={() => setSelectedSantriDetail(row)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 text-slate-700 text-xs font-semibold transition dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <Info className="w-3.5 h-3.5" />
                            <span>Detail</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* TABEL B: REKAPITULASI NILAI SEMPURNA (100) */}
            {rekapMode === "nilai_100" && (
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-amber-50/60 dark:border-slate-800 dark:bg-amber-950/20">
                    <th className="py-3.5 pl-4 pr-2 font-bold text-amber-950 dark:text-amber-300 w-12 text-center">
                      No
                    </th>
                    <th className="px-4 py-3.5 font-bold text-amber-950 dark:text-amber-300 min-w-[200px]">
                      Nama Santri Berprestasi
                    </th>
                    <th className="px-3 py-3.5 font-bold text-amber-950 dark:text-amber-300 w-24 text-center">
                      Kamar
                    </th>
                    <th className="px-3 py-3.5 font-bold text-amber-950 dark:text-amber-300 w-24 text-center">
                      Halaqoh
                    </th>
                    <th className="px-4 py-3.5 font-bold text-amber-950 dark:text-amber-300">
                      Tahap Ujian
                    </th>
                    <th className="px-3 py-3.5 font-bold text-amber-950 dark:text-amber-300 text-center w-24">
                      Juz
                    </th>
                    <th className="px-4 py-3.5 font-bold text-amber-950 dark:text-amber-300 text-center w-28">
                      Nilai Sempurna
                    </th>
                    <th className="px-4 py-3.5 font-bold text-amber-950 dark:text-amber-300 text-center w-36">
                      Predikat
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(paginatedData as ItemNilaiDetail[]).map((item, idx) => {
                    const rowNumber = (page - 1) * pageSize + idx + 1;
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-amber-50/40 dark:hover:bg-amber-950/10 transition"
                      >
                        <td className="py-3 pl-4 pr-2 text-center font-mono text-slate-400">
                          {rowNumber}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-800 dark:text-slate-100">
                            {item.santri.nama_lengkap}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-mono">
                            {item.santri.kode || "-"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-semibold text-slate-600 dark:text-slate-300">
                          {formatKamarDisplay(item.santri.kode_kamar, item.santri.kamar)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <HalaqohBadge
                            kelas={item.santri.halaqoh_kelas}
                            bagian={item.santri.halaqoh_bagian}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {item.tahap.label}
                          </span>
                          <span className="text-slate-400 ml-1.5 text-[11px]">
                            ({item.tahap.rentangLabel})
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                          Juz {item.juz}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-100 text-amber-900 font-extrabold font-mono text-sm shadow-xs dark:bg-amber-950 dark:text-amber-200">
                            <span>100</span>
                            <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-amber-400" />
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                            <Award className="w-3.5 h-3.5 text-amber-600" />
                            <span>Mumtaz (100)</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* TABEL C: REKAPITULASI NILAI DI BAWAH KKM (<85) */}
            {rekapMode === "dibawah_kkm" && (
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-rose-50/60 dark:border-slate-800 dark:bg-rose-950/20">
                    <th className="py-3.5 pl-4 pr-2 font-bold text-rose-950 dark:text-rose-300 w-12 text-center">
                      No
                    </th>
                    <th className="px-4 py-3.5 font-bold text-rose-950 dark:text-rose-300 min-w-[200px]">
                      Nama Santri
                    </th>
                    <th className="px-3 py-3.5 font-bold text-rose-950 dark:text-rose-300 w-24 text-center">
                      Kamar
                    </th>
                    <th className="px-3 py-3.5 font-bold text-rose-950 dark:text-rose-300 w-24 text-center">
                      Halaqoh
                    </th>
                    <th className="px-4 py-3.5 font-bold text-rose-950 dark:text-rose-300">
                      Tahap Ujian
                    </th>
                    <th className="px-3 py-3.5 font-bold text-rose-950 dark:text-rose-300 text-center w-24">
                      Juz
                    </th>
                    <th className="px-3 py-3.5 font-bold text-rose-950 dark:text-rose-300 text-center w-24">
                      Nilai Ujian
                    </th>
                    <th className="px-3 py-3.5 font-bold text-rose-950 dark:text-rose-300 text-center w-24">
                      KKM
                    </th>
                    <th className="px-3 py-3.5 font-bold text-rose-950 dark:text-rose-300 text-center w-24">
                      Selisih
                    </th>
                    <th className="px-4 py-3.5 font-bold text-rose-950 dark:text-rose-300 text-center min-w-[130px]">
                      Tindakan
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(paginatedData as ItemNilaiDetail[]).map((item, idx) => {
                    const rowNumber = (page - 1) * pageSize + idx + 1;
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-rose-50/40 dark:hover:bg-rose-950/10 transition"
                      >
                        <td className="py-3 pl-4 pr-2 text-center font-mono text-slate-400">
                          {rowNumber}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-800 dark:text-slate-100">
                            {item.santri.nama_lengkap}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-mono">
                            {item.santri.kode || "-"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-semibold text-slate-600 dark:text-slate-300">
                          {formatKamarDisplay(item.santri.kode_kamar, item.santri.kamar)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <HalaqohBadge
                            kelas={item.santri.halaqoh_kelas}
                            bagian={item.santri.halaqoh_bagian}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {item.tahap.label}
                          </span>
                          <span className="text-slate-400 ml-1.5 text-[11px]">
                            ({item.tahap.rentangLabel})
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                          Juz {item.juz}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex px-2.5 py-1 rounded-xl bg-rose-100 text-rose-900 font-extrabold font-mono text-xs dark:bg-rose-950 dark:text-rose-200">
                            {item.nilai}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-semibold text-slate-500">
                          {KKM_DEFAULT}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 font-mono font-bold text-[11px] dark:bg-rose-950/60 dark:text-rose-300">
                            {item.selisihKKM}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-800 text-xs font-bold border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Perlu Remidi</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* PAGINATION FOOTER */}
        {!loading && currentDataLength > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/30">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Menampilkan{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {(page - 1) * pageSize + 1}
              </strong>{" "}
              -{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {Math.min(page * pageSize, currentDataLength)}
              </strong>{" "}
              dari{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {currentDataLength}
              </strong>{" "}
              data
            </span>

            <div className="flex items-center gap-1 font-semibold">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                title="Halaman Sebelumnya"
                className="inline-flex h-8 px-2.5 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {getPageNumbers(page, totalPages).map((p, idx) =>
                p === "..." ? (
                  <span key={`ell-${idx}`} className="px-1 text-slate-400 select-none">
                    ...
                  </span>
                ) : (
                  <button
                    key={`p-${p}`}
                    type="button"
                    onClick={() => setPage(Number(p))}
                    className={`h-8 min-w-[32px] px-2 rounded-xl font-mono text-xs transition ${
                      page === p
                        ? "bg-emerald-800 text-white font-bold shadow-xs"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                title="Halaman Berikutnya"
                className="inline-flex h-8 px-2.5 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DETAIL RINCIAN NILAI SANTRI (POPUP JIKA KLIK DETAIL / NAMA) */}
      {selectedSantriDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  Rincian Penilaian Khotmil
                </span>
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                  {selectedSantriDetail.santri.nama_lengkap}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Kode: {selectedSantriDetail.santri.kode || "-"} • Kamar:{" "}
                  {formatKamarDisplay(
                    selectedSantriDetail.santri.kode_kamar,
                    selectedSantriDetail.santri.kamar
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSantriDetail(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Rincian Per Tahap */}
            <div className="space-y-4 py-4">
              {selectedSantriDetail.tahapSummaries.map((ts) => (
                <div
                  key={ts.tahap}
                  className="rounded-xl border border-slate-200/80 p-3.5 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {ts.label} ({ts.rentangLabel})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Rata-rata:</span>
                      <span
                        className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                          ts.average === null
                            ? "bg-slate-200 text-slate-600"
                            : ts.average === 100
                            ? "bg-amber-100 text-amber-900 font-extrabold"
                            : ts.average >= KKM_DEFAULT
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-rose-100 text-rose-900"
                        }`}
                      >
                        {ts.average !== null ? ts.average.toFixed(1) : "-"}
                      </span>
                    </div>
                  </div>

                  {/* Nilai Tiap Juz pada Tahap Ini */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {tahapList
                      .find((t) => t.tahap === ts.tahap)
                      ?.juzList.map((j) => {
                        const scoreItem = ts.scores.find((s) => s.juz === j);
                        const val = scoreItem ? scoreItem.nilai : null;
                        return (
                          <div
                            key={j}
                            className={`rounded-lg p-2 text-center border ${
                              val === null
                                ? "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800"
                                : val === 100
                                ? "bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800"
                                : val >= KKM_DEFAULT
                                ? "bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800"
                                : "bg-rose-50 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800"
                            }`}
                          >
                            <span className="text-[10px] text-slate-500 block">Juz {j}</span>
                            <span
                              className={`text-sm font-extrabold font-mono ${
                                val === null
                                  ? "text-slate-300"
                                  : val === 100
                                  ? "text-amber-800 dark:text-amber-300"
                                  : val >= KKM_DEFAULT
                                  ? "text-emerald-800 dark:text-emerald-300"
                                  : "text-rose-700 dark:text-rose-400"
                              }`}
                            >
                              {val !== null ? val : "-"}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedSantriDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition dark:bg-slate-800 dark:text-slate-200"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FILTER MODAL */}
      {filterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Filter Rekapitulasi
              </h3>
              <button
                type="button"
                onClick={() => setFilterModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Asrama Santri
                </label>
                <input
                  type="text"
                  value={asramaFilter}
                  onChange={(e) => setAsramaFilter(e.target.value)}
                  placeholder="Contoh: Al Mubarokah..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setAsramaFilter("");
                  setFilterModalOpen(false);
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Reset Filter
              </button>
              <button
                type="button"
                onClick={() => setFilterModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-900 transition"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
