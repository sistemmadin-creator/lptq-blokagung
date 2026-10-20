"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FileSpreadsheet,
  Printer,
  SlidersHorizontal,
  X,
  RotateCcw,
  Check,
  Search,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import {
  fetchAllSantriFiltered,
  fetchAbsensiBulan,
  upsertAbsensiCell,
} from "@/lib/services/tahfidz-service";
import {
  HALAQOH_BAGIAN_LIST,
  HALAQOH_KELAS_LIST,
  type Santri,
  type SesiAbsen,
  type StatusAbsen,
} from "@/types/database";
import { HalaqohBadge } from "@/components/ui/Badges";
import { exportJsonToExcel } from "@/lib/utils/excel";
import { useToast } from "@/components/ui/Toast";

const BULAN_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

// Mengecek apakah tanggal tertentu adalah hari Jumat (getDay() === 5)
function isFridayDate(year: number, month1Based: number, day: number): boolean {
  const d = new Date(year, month1Based - 1, day);
  return d.getDay() === 5;
}

export default function KegiatanAbsensiPage() {
  const { showToast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const [tahun, setTahun] = useState(now.getFullYear());
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [sesi, setSesi] = useState<SesiAbsen>("pagi");

  const [search, setSearch] = useState("");
  const [asramaFilter, setAsramaFilter] = useState("");
  const [kelasFilter, setKelasFilter] = useState<number | "">("");
  const [bagianFilter, setBagianFilter] = useState("");

  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const [santriList, setSantriList] = useState<Santri[]>([]);
  // Key absenMap: `${santri_id}_${tgl}` => "hadir" | "alfa" | "izin" | "sakit"
  const [absenMap, setAbsenMap] = useState<Record<string, StatusAbsen>>({});
  const [loading, setLoading] = useState(true);

  // Jumlah hari dalam bulan terpilih (28 - 31)
  const totalDays = new Date(tahun, bulan, 0).getDate();
  const dayNumbers = Array.from({ length: totalDays }, (_, i) => i + 1);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allSantri, absensiRows] = await Promise.all([
        fetchAllSantriFiltered({
          search,
          asrama: asramaFilter,
          halaqoh_kelas: kelasFilter,
          halaqoh_bagian: bagianFilter,
        }),
        fetchAbsensiBulan(bulan, tahun, sesi),
      ]);

      setSantriList(allSantri);

      const map: Record<string, StatusAbsen> = {};
      for (const row of absensiRows) {
        const d = new Date(row.tanggal).getDate();
        map[`${row.santri_id}_${d}`] = row.status;
      }
      setAbsenMap(map);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Gagal memuat data absensi.");
    } finally {
      setLoading(false);
    }
  }, [bulan, tahun, sesi, search, asramaFilter, kelasFilter, bagianFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle tombol escape untuk modal filter
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && filterModalOpen) {
        setFilterModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filterModalOpen]);

  // Hook cetak PDF via react-to-print
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Absensi_${BULAN_NAMES[bulan - 1]}_${tahun}_${sesi}`,
  });

  // Hitung filter aktif
  const activeFilterCount = [
    asramaFilter,
    kelasFilter !== "" ? kelasFilter : "",
    bagianFilter,
  ].filter(Boolean).length;

  const resetAllFilters = () => {
    setAsramaFilter("");
    setKelasFilter("");
    setBagianFilter("");
    showToast("success", "Semua filter telah direset.");
  };

  // Simpan nilai absensi per sel secara cepat (in-cell editing)
  const handleCellChange = async (santriId: string, day: number, newStatus: string) => {
    const key = `${santriId}_${day}`;
    if (!newStatus) {
      const updated = { ...absenMap };
      delete updated[key];
      setAbsenMap(updated);
      return;
    }

    const padMonth = String(bulan).padStart(2, "0");
    const padDay = String(day).padStart(2, "0");
    const dateStr = `${tahun}-${padMonth}-${padDay}`;

    // Pembaruan optimistik di UI
    setAbsenMap((prev) => ({ ...prev, [key]: newStatus as StatusAbsen }));

    try {
      await upsertAbsensiCell({
        santri_id: santriId,
        tanggal: dateStr,
        sesi,
        status: newStatus as StatusAbsen,
      });
    } catch (err) {
      showToast("error", "Gagal menyimpan absensi tanggal " + day);
      loadData();
    }
  };

  // Hitung rekap status per santri
  const countStatus = (santriId: string, st: StatusAbsen): number => {
    let c = 0;
    for (const d of dayNumbers) {
      if (isFridayDate(tahun, bulan, d)) continue;
      if (absenMap[`${santriId}_${d}`] === st) c++;
    }
    return c;
  };

  const handleExportExcel = () => {
    const rows = santriList.map((s, idx) => {
      const rowObj: Record<string, unknown> = {
        No: idx + 1,
        Kode: s.kode,
        "Nama Santri": s.nama_lengkap,
        Asrama: s.asrama,
        Kamar: s.kamar,
        Halaqoh: s.halaqoh,
      };
      for (const d of dayNumbers) {
        const fri = isFridayDate(tahun, bulan, d);
        const val = absenMap[`${s.id}_${d}`];
        rowObj[`Tgl_${d}`] = fri ? "JUMAT" : val ? val[0].toUpperCase() : "-";
      }
      rowObj["Total Hadir"] = countStatus(s.id, "hadir");
      rowObj["Total Alfa"] = countStatus(s.id, "alfa");
      rowObj["Total Izin"] = countStatus(s.id, "izin");
      rowObj["Total Sakit"] = countStatus(s.id, "sakit");
      return rowObj;
    });

    exportJsonToExcel(
      rows,
      `Absensi_${BULAN_NAMES[bulan - 1]}_${tahun}_Sesi_${sesi}`,
      "RekapAbsensi"
    );
    showToast("success", "Rekap absensi bulanan berhasil diekspor ke Excel.");
  };

  return (
    <div className="space-y-5">
      {/* Header Halaman */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Kegiatan Tahfidz Umum (Absensi Harian Pagi & Malam)
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Pilih status di dalam sel tanggal (H: Hadir, A: Alfa, I: Izin, S: Sakit). Kolom hari
          Jumat otomatis diarsir dan dinonaktifkan.
        </p>
      </div>

      {/* Bilah Toolbar yang Disederhanakan 1 Baris */}
      <div className="no-print flex flex-wrap items-center gap-2">
        {/* Pemilih Bulan */}
        <select
          value={bulan}
          onChange={(e) => setBulan(Number(e.target.value))}
          aria-label="Pilih Bulan"
          className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm transition focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          {BULAN_NAMES.map((name, idx) => (
            <option key={name} value={idx + 1}>
              {name}
            </option>
          ))}
        </select>

        {/* Pemilih Tahun */}
        <input
          type="number"
          value={tahun}
          onChange={(e) => setTahun(Number(e.target.value) || now.getFullYear())}
          aria-label="Pilih Tahun"
          className="h-11 w-24 rounded-xl border border-slate-300 bg-white px-3 text-center text-sm font-mono font-bold text-slate-800 shadow-sm transition focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />

        {/* Toggle Sesi Pagi / Malam */}
        <div className="flex h-11 items-center rounded-xl border border-slate-300 bg-slate-100 p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setSesi("pagi")}
            className={`h-full px-3 rounded-lg text-xs font-bold uppercase transition ${
              sesi === "pagi"
                ? "bg-emerald-800 text-white shadow"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            }`}
          >
            Pagi
          </button>
          <button
            type="button"
            onClick={() => setSesi("malam")}
            className={`h-full px-3 rounded-lg text-xs font-bold uppercase transition ${
              sesi === "malam"
                ? "bg-emerald-800 text-white shadow"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            }`}
          >
            Malam
          </button>
        </div>

        {/* Kolom Pencarian Santri */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama santri..."
            aria-label="Cari nama santri"
            className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-9 text-sm text-slate-800 placeholder-slate-400 shadow-sm transition focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Bersihkan pencarian"
              aria-label="Bersihkan pencarian"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Tombol Filter (Pop-up Pilihan Filter) */}
        <button
          type="button"
          onClick={() => setFilterModalOpen(true)}
          title={activeFilterCount > 0 ? `Filter aktif (${activeFilterCount})` : "Filter Asrama & Halaqoh"}
          aria-label="Filter Asrama & Halaqoh"
          className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm transition focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
            activeFilterCount > 0
              ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-emerald-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          }`}
        >
          <SlidersHorizontal className="h-5 w-5" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white shadow">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Tombol Ekspor Excel (Hanya Logo) */}
        <button
          type="button"
          onClick={handleExportExcel}
          title="Ekspor Rekap Excel"
          aria-label="Ekspor Rekap Excel"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <FileSpreadsheet className="h-5 w-5" />
        </button>

        {/* Tombol Cetak / Unduh PDF (Hanya Logo) */}
        <button
          type="button"
          onClick={handlePrint}
          title="Cetak / Unduh PDF"
          aria-label="Cetak / Unduh PDF"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Printer className="h-5 w-5" />
        </button>
      </div>

      {/* Indikator Filter Aktif */}
      {activeFilterCount > 0 && (
        <div className="no-print flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Filter Aktif:</span>
          {asramaFilter && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
              Asrama: {asramaFilter}
              <button type="button" onClick={() => setAsramaFilter("")} aria-label="Hapus filter asrama">
                <X className="h-3 w-3 hover:text-rose-600" />
              </button>
            </span>
          )}
          {kelasFilter !== "" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
              Kelas: {kelasFilter}
              <button type="button" onClick={() => setKelasFilter("")} aria-label="Hapus filter kelas">
                <X className="h-3 w-3 hover:text-rose-600" />
              </button>
            </span>
          )}
          {bagianFilter && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
              Bagian: {bagianFilter}
              <button type="button" onClick={() => setBagianFilter("")} aria-label="Hapus filter bagian">
                <X className="h-3 w-3 hover:text-rose-600" />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={resetAllFilters}
            className="text-xs font-semibold text-rose-600 hover:underline dark:text-rose-400"
          >
            Reset Semua
          </button>
        </div>
      )}

      {/* Grid Tabel Absensi */}
      <div ref={printRef} className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-3 mb-3 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800 dark:text-slate-100">
              Bulan: {BULAN_NAMES[bulan - 1]} {tahun} | Sesi: {sesi.toUpperCase()}
            </h2>
            <p className="text-xs text-slate-500">
              Total {santriList.length} santri terdaftar
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="font-semibold">Keterangan:</span>
            <span>H = Hadir</span>
            <span>A = Alfa</span>
            <span>I = Izin</span>
            <span>S = Sakit</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">JUM = Hari Jumat (Libur)</span>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">Memuat data absensi...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                  <th className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-800 px-2.5 py-2 font-semibold">No</th>
                  <th className="sticky left-8 z-10 bg-slate-50 dark:bg-slate-800 min-w-[160px] px-2.5 py-2 font-semibold">
                    Nama Santri
                  </th>
                  <th className="px-2 py-2 font-semibold text-center">Halaqoh</th>
                  {dayNumbers.map((d) => {
                    const fri = isFridayDate(tahun, bulan, d);
                    return (
                      <th
                        key={d}
                        className={`min-w-[34px] px-1 py-2 text-center font-mono text-[11px] ${
                          fri ? "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 font-bold" : ""
                        }`}
                      >
                        {d}
                        {fri && <div className="text-[9px] font-normal">JUM</div>}
                      </th>
                    );
                  })}
                  <th className="px-2 py-2 text-center font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300">H</th>
                  <th className="px-2 py-2 text-center font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-300">A</th>
                  <th className="px-2 py-2 text-center font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300">I</th>
                  <th className="px-2 py-2 text-center font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300">S</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {santriList.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 px-2.5 py-1.5 font-mono text-[11px] text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="sticky left-8 z-10 bg-white dark:bg-slate-900 px-2.5 py-1.5 font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                      {s.nama_lengkap}
                      <span className="block text-[10px] font-normal text-slate-400">
                        {s.asrama} - {s.kamar}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <HalaqohBadge kelas={s.halaqoh_kelas} bagian={s.halaqoh_bagian} />
                    </td>
                    {dayNumbers.map((d) => {
                      const fri = isFridayDate(tahun, bulan, d);
                      if (fri) {
                        return (
                          <td
                            key={d}
                            className="bg-slate-100 dark:bg-slate-800 text-center text-[10px] text-slate-400 select-none"
                            title="Hari Jumat Libur"
                          >
                            -
                          </td>
                        );
                      }
                      const cur = absenMap[`${s.id}_${d}`] || "";
                      return (
                        <td key={d} className="p-0.5 text-center">
                          <select
                            value={cur}
                            onChange={(e) => handleCellChange(s.id, d, e.target.value)}
                            aria-label={`Absen santri ${s.nama_lengkap} tanggal ${d}`}
                            className={`h-7 w-8 rounded text-center font-bold text-[11px] border focus:outline-none ${
                              cur === "hadir"
                                ? "bg-emerald-100 text-emerald-900 border-emerald-400 dark:bg-emerald-950 dark:text-emerald-200"
                                : cur === "alfa"
                                ? "bg-rose-100 text-rose-900 border-rose-400 dark:bg-rose-950 dark:text-rose-200"
                                : cur === "izin"
                                ? "bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-950 dark:text-amber-200"
                                : cur === "sakit"
                                ? "bg-blue-100 text-blue-900 border-blue-400 dark:bg-blue-950 dark:text-blue-200"
                                : "bg-white text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700"
                            }`}
                          >
                            <option value="">-</option>
                            <option value="hadir">H</option>
                            <option value="alfa">A</option>
                            <option value="izin">I</option>
                            <option value="sakit">S</option>
                          </select>
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5 text-center font-mono font-bold bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800">
                      {countStatus(s.id, "hadir")}
                    </td>
                    <td className="px-2 py-1.5 text-center font-mono font-bold bg-rose-50/50 dark:bg-rose-950/20 text-rose-800">
                      {countStatus(s.id, "alfa")}
                    </td>
                    <td className="px-2 py-1.5 text-center font-mono font-bold bg-amber-50/50 dark:bg-amber-950/20 text-amber-800">
                      {countStatus(s.id, "izin")}
                    </td>
                    <td className="px-2 py-1.5 text-center font-mono font-bold bg-blue-50/50 dark:bg-blue-950/20 text-blue-800">
                      {countStatus(s.id, "sakit")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* POP-UP MODAL FILTER */}
      {filterModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-filter-kegiatan-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="modal-filter-kegiatan-title" className="text-base font-bold text-slate-900 dark:text-white">
                    Filter Absensi Santri
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Saring daftar santri berdasarkan asrama dan halaqoh</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFilterModalOpen(false)}
                aria-label="Tutup dialog filter"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3.5 py-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Asrama
                </label>
                <input
                  type="text"
                  value={asramaFilter}
                  onChange={(e) => setAsramaFilter(e.target.value)}
                  placeholder="Filter Asrama (misal: Al-Falah)"
                  className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Halaqoh Kelas
                  </label>
                  <select
                    value={kelasFilter}
                    onChange={(e) => setKelasFilter(e.target.value ? Number(e.target.value) : "")}
                    className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="">Semua Kelas (1-10)</option>
                    {HALAQOH_KELAS_LIST.map((k) => (
                      <option key={k} value={k}>
                        Kelas {k}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Halaqoh Bagian
                  </label>
                  <select
                    value={bagianFilter}
                    onChange={(e) => setBagianFilter(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="">Semua Bagian (A-F)</option>
                    {HALAQOH_BAGIAN_LIST.map((b) => (
                      <option key={b} value={b}>
                        Bagian {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition dark:text-rose-400 dark:hover:bg-rose-950/40"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Filter</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterModalOpen(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow transition"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Tutup & Terapkan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
