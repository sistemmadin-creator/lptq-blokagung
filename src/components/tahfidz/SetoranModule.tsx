"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Plus,
  FileSpreadsheet,
  Printer,
  SlidersHorizontal,
  X,
  Search,
  RotateCcw,
  Check,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import {
  fetchAllSantriFiltered,
  fetchSetoranBulananMerged,
  insertSetoranLog,
} from "@/lib/services/tahfidz-service";
import {
  HALAQOH_BAGIAN_LIST,
  HALAQOH_KELAS_LIST,
  type Santri,
  type SetoranBulananRow,
  type TipeSetoran,
} from "@/types/database";
import { DataTable } from "@/components/ui/DataTable";
import { HalaqohBadge } from "@/components/ui/Badges";
import { exportJsonToExcel } from "@/lib/utils/excel";
import { toLocalIsoDate } from "@/lib/utils/date";
import { useToast } from "@/components/ui/Toast";

const setoranSchema = z.object({
  santri_id: z.string().uuid("Pilih santri terlebih dahulu"),
  tanggal: z.string().min(10, "Tanggal wajib diisi"),
  jumlah_juz_tambahan: z.coerce
    .number()
    .min(0.05, "Jumlah setoran minimal 0.05 juz")
    .max(30, "Jumlah setoran maksimal 30 juz"),
  catatan: z.string().optional(),
});

type SetoranFormValues = z.infer<typeof setoranSchema>;

interface SetoranModuleProps {
  tipe: TipeSetoran;
  judul: string;
  deskripsi: string;
}

export function SetoranModule({ tipe, judul, deskripsi }: SetoranModuleProps) {
  const { showToast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const [tahun, setTahun] = useState(now.getFullYear());
  const [search, setSearch] = useState("");
  const [asramaFilter, setAsramaFilter] = useState("");
  const [kelasFilter, setKelasFilter] = useState<number | "">("");
  const [bagianFilter, setBagianFilter] = useState("");

  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const [santriOptions, setSantriOptions] = useState<Santri[]>([]);
  const [rows, setRows] = useState<SetoranBulananRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SetoranFormValues>({
    resolver: zodResolver(setoranSchema),
    defaultValues: {
      santri_id: "",
      tanggal: toLocalIsoDate(now),
      jumlah_juz_tambahan: 0.5,
      catatan: "",
    },
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mergedData, allSantri] = await Promise.all([
        fetchSetoranBulananMerged(tahun, tipe, {
          search,
          asrama: asramaFilter,
          halaqoh_kelas: kelasFilter,
          halaqoh_bagian: bagianFilter,
        }),
        fetchAllSantriFiltered({}),
      ]);
      setRows(mergedData);
      setSantriOptions(allSantri);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat rekap setoran.");
    } finally {
      setLoading(false);
    }
  }, [tahun, tipe, search, asramaFilter, kelasFilter, bagianFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle tombol escape untuk modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (modalOpen) setModalOpen(false);
        if (filterModalOpen) setFilterModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen, filterModalOpen]);

  // Hook cetak PDF via react-to-print
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Rekap_${tipe}_${tahun}`,
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

  const onSubmit = async (values: SetoranFormValues) => {
    try {
      await insertSetoranLog({
        santri_id: values.santri_id,
        tanggal: values.tanggal,
        tipe,
        jumlah_juz_tambahan: values.jumlah_juz_tambahan,
        catatan: values.catatan,
      });
      showToast(
        "success",
        `Setoran sebesar ${values.jumlah_juz_tambahan} Juz berhasil dicatat.`
      );
      setModalOpen(false);
      loadData();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Gagal menyimpan setoran.");
    }
  };

  const handleExportExcel = () => {
    const formatted = rows.map((r, idx) => ({
      No: idx + 1,
      Kode: r.kode,
      Nama: r.nama_lengkap,
      Kamar: r.kamar,
      Halaqoh: r.halaqoh,
      Jan: r.jan,
      Feb: r.feb,
      Mar: r.mar,
      Apr: r.apr,
      Mei: r.mei,
      Jun: r.jun,
      Jul: r.jul,
      Agu: r.agu,
      Sep: r.sep,
      Okt: r.okt,
      Nov: r.nov,
      Des: r.des,
      "Total Setoran": r.total_setoran,
    }));
    exportJsonToExcel(formatted, `Rekap_${tipe}_${tahun}`, "RekapSetoran");
    showToast("success", "Rekap setoran berhasil diekspor ke Excel.");
  };

  const monthKeys: { key: keyof SetoranBulananRow; label: string }[] = [
    { key: "jan", label: "Jan" },
    { key: "feb", label: "Feb" },
    { key: "mar", label: "Mar" },
    { key: "apr", label: "Apr" },
    { key: "mei", label: "Mei" },
    { key: "jun", label: "Jun" },
    { key: "jul", label: "Jul" },
    { key: "agu", label: "Agu" },
    { key: "sep", label: "Sep" },
    { key: "okt", label: "Okt" },
    { key: "nov", label: "Nov" },
    { key: "des", label: "Des" },
  ];

  const columns: ColumnDef<SetoranBulananRow>[] = [
    {
      id: "no",
      header: "NO",
      cell: ({ row }) => <span className="font-mono text-xs">{row.index + 1}</span>,
    },
    {
      accessorKey: "nama_lengkap",
      header: "NAMA",
      cell: ({ row }) => <span className="font-semibold text-slate-800 dark:text-slate-100">{row.original.nama_lengkap}</span>,
    },
    { accessorKey: "kamar", header: "KAMAR" },
    {
      id: "halaqoh",
      header: "HALAQOH",
      cell: ({ row }) => (
        <HalaqohBadge kelas={row.original.halaqoh_kelas} bagian={row.original.halaqoh_bagian} />
      ),
    },
    ...monthKeys.map((m) => ({
      id: String(m.key),
      header: m.label,
      cell: ({ row }: { row: { original: SetoranBulananRow } }) => {
        const val = Number(row.original[m.key] ?? 0);
        return (
          <span className={`font-mono text-xs ${val > 0 ? "font-bold text-emerald-800 dark:text-emerald-300" : "text-slate-400"}`}>
            {val > 0 ? val : "-"}
          </span>
        );
      },
    })),
    {
      accessorKey: "total_setoran",
      header: "TOTAL SETORAN",
      cell: ({ row }) => (
        <span className="font-mono font-bold text-emerald-900 dark:text-emerald-300">
          {row.original.total_setoran} Juz
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header Halaman */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{judul}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{deskripsi}</p>
      </div>

      {/* Bilah Toolbar yang Disederhanakan 1 Baris */}
      <div className="no-print flex items-center gap-2">
        {/* Input Tahun */}
        <input
          type="number"
          value={tahun}
          onChange={(e) => setTahun(Number(e.target.value) || now.getFullYear())}
          aria-label="Tahun Rekap"
          className="h-11 w-24 shrink-0 rounded-xl border border-slate-300 bg-white px-3 text-center text-sm font-mono font-bold text-slate-800 shadow-sm transition focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />

        {/* Kolom Pencarian Santri */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau kode santri..."
            aria-label="Cari santri"
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

        {/* Tombol Input Log Setoran (Hanya Logo) */}
        <button
          type="button"
          onClick={() => {
            reset({
              santri_id: santriOptions[0]?.id ?? "",
              tanggal: toLocalIsoDate(now),
              jumlah_juz_tambahan: 0.5,
              catatan: "",
            });
            setModalOpen(true);
          }}
          title="Input Log Setoran"
          aria-label="Input Log Setoran"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-800 text-white shadow transition hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:bg-emerald-700 dark:hover:bg-emerald-800"
        >
          <Plus className="h-5 w-5" />
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

      {/* Tabel Data Setoran */}
      <div ref={printRef}>
        <div className="hidden print:block mb-4">
          <h2 className="text-lg font-bold">LPTQ Pondok Pesantren Darussalam Blokagung</h2>
          <p className="text-xs">
            {judul} - Tahun {tahun}
          </p>
        </div>

        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          error={error}
          onRetry={loadData}
        />
      </div>

      {/* POP-UP 1: MODAL FILTER TERPADU */}
      {filterModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-filter-setoran-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="modal-filter-setoran-title" className="text-base font-bold text-slate-900 dark:text-white">
                    Filter Rekap Setoran
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

      {/* POP-UP 2: MODAL INPUT LOG SETORAN */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-setoran-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h2 id="modal-setoran-title" className="text-base font-bold text-slate-900 dark:text-white">
                Catat Log {tipe === "juz_baru" ? "Juz Baru" : "Evaluasi"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Tutup dialog"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pilih Santri
                </label>
                <select
                  {...register("santri_id")}
                  className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">-- Pilih Santri --</option>
                  {santriOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.kode} - {s.nama_lengkap} ({s.asrama})
                    </option>
                  ))}
                </select>
                {errors.santri_id && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                    {errors.santri_id.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    {...register("tanggal")}
                    className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  {errors.tanggal && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                      {errors.tanggal.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Jumlah Juz (Desimal)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    placeholder="Contoh: 0.5"
                    {...register("jumlah_juz_tambahan")}
                    className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-mono text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  {errors.jumlah_juz_tambahan && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                      {errors.jumlah_juz_tambahan.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  {...register("catatan")}
                  rows={2}
                  placeholder="Keterangan kelancaran atau tajwid..."
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 shadow transition dark:bg-emerald-700 dark:hover:bg-emerald-800"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Setoran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
