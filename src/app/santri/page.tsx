"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Plus,
  Pencil,
  Trash2,
  FileSpreadsheet,
  X,
  Search,
  SlidersHorizontal,
  Printer,
  Download,
  Upload,
  FileDown,
  Loader2,
  RotateCcw,
  Check,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import {
  fetchSantriPaginated,
  fetchAllSantriFiltered,
  saveSantri,
  deleteSantriById,
} from "@/lib/services/tahfidz-service";
import {
  HALAQOH_BAGIAN_LIST,
  HALAQOH_KELAS_LIST,
  type HalaqohBagian,
  type Santri,
} from "@/types/database";
import { DataTable } from "@/components/ui/DataTable";
import { HalaqohBadge } from "@/components/ui/Badges";
import {
  downloadSantriTemplateExcel,
  exportJsonToExcel,
  parseExcelFileWithValidation,
} from "@/lib/utils/excel";
import { useToast } from "@/components/ui/Toast";

const santriSchema = z.object({
  kode: z.string().min(2, "Kode wajib diisi (minimal 2 karakter)"),
  nama_lengkap: z.string().min(3, "Nama lengkap wajib diisi"),
  blok: z.string().min(1, "Blok wajib diisi"),
  asrama: z.string().min(2, "Asrama wajib diisi"),
  kamar: z.string().min(1, "Kamar wajib diisi"),
  halaqoh_kelas: z.coerce.number().min(1).max(10),
  halaqoh_bagian: z.enum(["A", "B", "C", "D", "E", "F"]),
});

type SantriFormValues = z.infer<typeof santriSchema>;

// Memotong array menjadi batch @100 baris agar aman dari batas waktu 10s serverless Vercel
function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export default function SantriPage() {
  const { showToast } = useToast();
  const printAreaRef = useRef<HTMLDivElement>(null);
  const excelFileInputRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<Santri[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter dan Pencarian
  const [search, setSearch] = useState("");
  const [asramaFilter, setAsramaFilter] = useState("");
  const [blokFilter, setBlokFilter] = useState("");
  const [kamarFilter, setKamarFilter] = useState("");
  const [kelasFilter, setKelasFilter] = useState<number | "">("");
  const [bagianFilter, setBagianFilter] = useState("");
  const [page, setPage] = useState(1);

  // Status Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [editingSantri, setEditingSantri] = useState<Santri | null>(null);

  // Status Impor Excel
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SantriFormValues>({
    resolver: zodResolver(santriSchema),
    defaultValues: {
      kode: "",
      nama_lengkap: "",
      blok: "A",
      asrama: "",
      kamar: "",
      halaqoh_kelas: 1,
      halaqoh_bagian: "A",
    },
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSantriPaginated({
        search,
        asrama: asramaFilter,
        blok: blokFilter,
        kamar: kamarFilter,
        halaqoh_kelas: kelasFilter,
        halaqoh_bagian: bagianFilter,
        page,
        pageSize: 25,
      });
      setRows(result.rows);
      setTotalCount(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data santri.");
    } finally {
      setLoading(false);
    }
  }, [search, asramaFilter, blokFilter, kamarFilter, kelasFilter, bagianFilter, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle tombol escape untuk menutup modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (modalOpen) setModalOpen(false);
        if (filterModalOpen) setFilterModalOpen(false);
        if (excelModalOpen) setExcelModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen, filterModalOpen, excelModalOpen]);

  // Hook cetak PDF via react-to-print
  const handlePrint = useReactToPrint({
    content: () => printAreaRef.current,
    documentTitle: "Data_Santri_Tahfidz_LPTQ_Blokagung",
  });

  // Hitung jumlah filter yang sedang aktif
  const activeFilterCount = [
    asramaFilter,
    blokFilter,
    kamarFilter,
    kelasFilter !== "" ? kelasFilter : "",
    bagianFilter,
  ].filter(Boolean).length;

  const resetAllFilters = () => {
    setAsramaFilter("");
    setBlokFilter("");
    setKamarFilter("");
    setKelasFilter("");
    setBagianFilter("");
    setPage(1);
    showToast("success", "Semua filter telah direset.");
  };

  const openAddModal = () => {
    setEditingSantri(null);
    reset({
      kode: "",
      nama_lengkap: "",
      blok: "A",
      asrama: "",
      kamar: "",
      halaqoh_kelas: 1,
      halaqoh_bagian: "A",
    });
    setModalOpen(true);
  };

  const openEditModal = (s: Santri) => {
    setEditingSantri(s);
    reset({
      kode: s.kode,
      nama_lengkap: s.nama_lengkap,
      blok: s.blok,
      asrama: s.asrama,
      kamar: s.kamar,
      halaqoh_kelas: s.halaqoh_kelas,
      halaqoh_bagian: s.halaqoh_bagian,
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: SantriFormValues) => {
    try {
      await saveSantri(values, editingSantri?.id);
      showToast(
        "success",
        editingSantri ? "Data santri berhasil diperbarui." : "Santri baru berhasil ditambahkan."
      );
      setModalOpen(false);
      loadData();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Gagal menyimpan data santri.");
    }
  };

  const handleDelete = async (s: Santri) => {
    if (!window.confirm(`Hapus data santri "${s.nama_lengkap}" (${s.kode})?`)) return;
    try {
      await deleteSantriById(s.id);
      showToast("success", `Santri ${s.nama_lengkap} berhasil dihapus.`);
      loadData();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Gagal menghapus santri.");
    }
  };

  // Ekspor Excel
  const handleExportExcel = async () => {
    try {
      setExcelModalOpen(false);
      const allFiltered = await fetchAllSantriFiltered({
        search,
        asrama: asramaFilter,
        blok: blokFilter,
        kamar: kamarFilter,
        halaqoh_kelas: kelasFilter,
        halaqoh_bagian: bagianFilter,
      });
      const formatted = allFiltered.map((s, idx) => ({
        No: idx + 1,
        Kode: s.kode,
        "Nama Lengkap": s.nama_lengkap,
        Blok: s.blok,
        Asrama: s.asrama,
        Kamar: s.kamar,
        "Halaqoh Kelas": s.halaqoh_kelas,
        "Halaqoh Bagian": s.halaqoh_bagian,
        Halaqoh: s.halaqoh,
      }));
      exportJsonToExcel(formatted, "Data_Santri_Tahfidz_Blokagung", "DataSantri");
      showToast("success", "Berkas Excel berhasil diunduh.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Gagal mengekspor Excel.");
    }
  };

  // Impor Excel / CSV
  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportProgress("Memvalidasi header berkas...");

    try {
      const requiredHeaders = [
        "Nama Lengkap",
        "Asrama",
        "Kode",
        "Kamar",
        "Halaqoh Kelas",
        "Halaqoh Bagian",
      ];
      const parsedRows = await parseExcelFileWithValidation(file, requiredHeaders);
      const chunks = chunkArray(parsedRows, 100);
      let importedCount = 0;

      for (let idx = 0; idx < chunks.length; idx++) {
        setImportProgress(`Mengunggah baris ${idx * 100 + 1} s.d ${Math.min((idx + 1) * 100, parsedRows.length)}...`);
        const res = await fetch("/api/import/santri", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: chunks[idx] }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Gagal mengimpor data ke server.");
        }
        importedCount += json.count ?? chunks[idx].length;
      }

      showToast("success", `Berhasil mengimpor ${importedCount} data santri.`);
      setExcelModalOpen(false);
      loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memproses berkas Excel.";
      showToast("error", msg);
    } finally {
      setImporting(false);
      setImportProgress("");
      if (excelFileInputRef.current) excelFileInputRef.current.value = "";
    }
  };

  const columns: ColumnDef<Santri>[] = [
    {
      id: "no",
      header: "NO",
      cell: ({ row }) => <span className="font-mono text-xs">{(page - 1) * 25 + row.index + 1}</span>,
    },
    {
      accessorKey: "kode",
      header: "KODE",
      cell: ({ row }) => <span className="font-mono font-semibold text-xs">{row.original.kode}</span>,
    },
    {
      accessorKey: "nama_lengkap",
      header: "NAMA LENGKAP",
      cell: ({ row }) => <span className="font-semibold text-slate-800 dark:text-slate-100">{row.original.nama_lengkap}</span>,
    },
    { accessorKey: "blok", header: "BLOK" },
    { accessorKey: "asrama", header: "ASRAMA" },
    { accessorKey: "kamar", header: "KAMAR" },
    {
      id: "halaqoh",
      header: "HALAQOH",
      cell: ({ row }) => (
        <HalaqohBadge
          kelas={row.original.halaqoh_kelas}
          bagian={row.original.halaqoh_bagian}
          showMapping
        />
      ),
    },
    {
      id: "aksi",
      header: "AKSI",
      cell: ({ row }) => (
        <div className="no-print flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => openEditModal(row.original)}
            className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Edit</span>
          </button>
          <button
            type="button"
            onClick={() => handleDelete(row.original)}
            className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Hapus</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Input File Tersembunyi untuk Import Excel */}
      <input
        ref={excelFileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleImportFileChange}
        className="hidden"
      />

      {/* Header Halaman */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Data Santri Tahfidz</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Kelola biodata asrama, kamar, dan pengelompokan Halaqoh Kelas (1-10) serta Bagian (A-F).
        </p>
      </div>

      {/* Bilah Toolbar yang Disederhanakan:
          Dari kiri: [ Pencarian ] -> [ Filter (Pop-up) ] -> [ Import/Export Excel (Pop-up) ] -> [ Cetak PDF ] -> [ Tambah Santri ] */}
      <div className="no-print flex items-center gap-2">
        {/* 1. Pencarian (Kiri) */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari santri, kode, asrama, kamar..."
            aria-label="Cari nama atau kode santri"
            className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-9 text-sm text-slate-800 placeholder-slate-400 shadow-sm transition focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Bersihkan pencarian"
              aria-label="Bersihkan pencarian"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* 2. Tombol Filter (Pop-up Pilihan Filter) */}
        <button
          type="button"
          onClick={() => setFilterModalOpen(true)}
          title={activeFilterCount > 0 ? `Filter aktif (${activeFilterCount})` : "Filter Data Santri"}
          aria-label="Filter Data Santri"
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

        {/* 3. Tombol Excel (Pop-up Pilihan Template, Impor, Ekspor) */}
        <button
          type="button"
          onClick={() => setExcelModalOpen(true)}
          title="Menu Excel (Template, Impor, Ekspor)"
          aria-label="Menu Excel"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <FileSpreadsheet className="h-5 w-5" />
        </button>

        {/* 4. Tombol Cetak / Unduh PDF */}
        <button
          type="button"
          onClick={handlePrint}
          title="Cetak / Unduh PDF"
          aria-label="Cetak / Unduh PDF"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Printer className="h-5 w-5" />
        </button>

        {/* 5. Tombol Tambah Santri */}
        <button
          type="button"
          onClick={openAddModal}
          title="Tambah Santri Baru"
          aria-label="Tambah Santri Baru"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-800 text-white shadow transition hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:bg-emerald-700 dark:hover:bg-emerald-800"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Indikator Filter Aktif (Chip ringkas jika ada filter) */}
      {activeFilterCount > 0 && (
        <div className="no-print flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Filter Aktif:</span>
          {asramaFilter && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
              Asrama: {asramaFilter}
              <button type="button" onClick={() => { setAsramaFilter(""); setPage(1); }} aria-label="Hapus filter asrama">
                <X className="h-3 w-3 hover:text-rose-600" />
              </button>
            </span>
          )}
          {blokFilter && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
              Blok: {blokFilter}
              <button type="button" onClick={() => { setBlokFilter(""); setPage(1); }} aria-label="Hapus filter blok">
                <X className="h-3 w-3 hover:text-rose-600" />
              </button>
            </span>
          )}
          {kamarFilter && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
              Kamar: {kamarFilter}
              <button type="button" onClick={() => { setKamarFilter(""); setPage(1); }} aria-label="Hapus filter kamar">
                <X className="h-3 w-3 hover:text-rose-600" />
              </button>
            </span>
          )}
          {kelasFilter !== "" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
              Kelas: {kelasFilter}
              <button type="button" onClick={() => { setKelasFilter(""); setPage(1); }} aria-label="Hapus filter kelas">
                <X className="h-3 w-3 hover:text-rose-600" />
              </button>
            </span>
          )}
          {bagianFilter && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
              Bagian: {bagianFilter}
              <button type="button" onClick={() => { setBagianFilter(""); setPage(1); }} aria-label="Hapus filter bagian">
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

      {/* Area Tabel (Siap Cetak PDF) */}
      <div ref={printAreaRef} className="space-y-2">
        <div className="hidden print:block mb-4">
          <h2 className="text-lg font-bold">LPTQ Pondok Pesantren Darussalam Blokagung</h2>
          <p className="text-xs">Daftar Santri Tahfidz</p>
        </div>

        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          error={error}
          onRetry={loadData}
          page={page}
          pageSize={25}
          totalCount={totalCount}
          onPageChange={setPage}
        />
      </div>

      {/* ========================================================================= */}
      {/* POP-UP 1: MODAL FILTER TERPADU                                            */}
      {/* ========================================================================= */}
      {filterModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-filter-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="modal-filter-title" className="text-base font-bold text-slate-900 dark:text-white">
                    Filter Data Santri
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Saring daftar santri berdasarkan kriteria</p>
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
                  onChange={(e) => {
                    setAsramaFilter(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Filter Asrama (misal: Al-Falah)"
                  className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Blok
                  </label>
                  <input
                    type="text"
                    value={blokFilter}
                    onChange={(e) => {
                      setBlokFilter(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Filter Blok (misal: A)"
                    className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kamar
                  </label>
                  <input
                    type="text"
                    value={kamarFilter}
                    onChange={(e) => {
                      setKamarFilter(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Filter Kamar (misal: A1)"
                    className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Halaqoh Kelas
                  </label>
                  <select
                    value={kelasFilter}
                    onChange={(e) => {
                      setKelasFilter(e.target.value ? Number(e.target.value) : "");
                      setPage(1);
                    }}
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
                    onChange={(e) => {
                      setBagianFilter(e.target.value);
                      setPage(1);
                    }}
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

      {/* ========================================================================= */}
      {/* POP-UP 2: MODAL MENU EXCEL (TEMPLATE, IMPOR, EKSPOR)                      */}
      {/* ========================================================================= */}
      {excelModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-excel-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="modal-excel-title" className="text-base font-bold text-slate-900 dark:text-white">
                    Menu Excel Santri
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Pilih tindakan berkas spreadsheet yang diinginkan</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExcelModalOpen(false)}
                disabled={importing}
                aria-label="Tutup dialog excel"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Jika sedang mengimpor berkas */}
            {importing ? (
              <div className="py-8 text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-700 mx-auto" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{importProgress}</p>
                <p className="text-xs text-slate-400">Mohon jangan menutup jendela ini hingga selesai...</p>
              </div>
            ) : (
              <div className="space-y-3 py-4">
                {/* Pilihan 1: Template Excel */}
                <button
                  type="button"
                  onClick={() => {
                    downloadSantriTemplateExcel();
                    showToast("success", "Template Excel berhasil diunduh.");
                    setExcelModalOpen(false);
                  }}
                  className="w-full flex items-center gap-3.5 p-3 rounded-xl border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/50 transition text-left group dark:border-slate-800 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/20"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-emerald-100 group-hover:text-emerald-800 transition dark:bg-slate-800 dark:text-slate-300">
                    <Download className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800 group-hover:text-emerald-900 dark:text-slate-200 dark:group-hover:text-emerald-300">
                      Template Excel
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Unduh format template kosong siap isi untuk impor massal
                    </p>
                  </div>
                </button>

                {/* Pilihan 2: Impor Excel / CSV */}
                <button
                  type="button"
                  onClick={() => excelFileInputRef.current?.click()}
                  className="w-full flex items-center gap-3.5 p-3 rounded-xl border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/50 transition text-left group dark:border-slate-800 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/20"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-emerald-100 group-hover:text-emerald-800 transition dark:bg-slate-800 dark:text-slate-300">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800 group-hover:text-emerald-900 dark:text-slate-200 dark:group-hover:text-emerald-300">
                      Impor Excel / CSV
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Unggah berkas data santri untuk ditambahkan ke database
                    </p>
                  </div>
                </button>

                {/* Pilihan 3: Ekspor Excel */}
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="w-full flex items-center gap-3.5 p-3 rounded-xl border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/50 transition text-left group dark:border-slate-800 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/20"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-emerald-100 group-hover:text-emerald-800 transition dark:bg-slate-800 dark:text-slate-300">
                    <FileDown className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800 group-hover:text-emerald-900 dark:text-slate-200 dark:group-hover:text-emerald-300">
                      Ekspor Excel
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Unduh seluruh santri aktif (sesuai pencarian/filter) ke file .xlsx
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POP-UP 3: MODAL TAMBAH / EDIT SANTRI                                      */}
      {/* ========================================================================= */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-santri-title"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h2 id="modal-santri-title" className="text-base font-bold text-slate-900 dark:text-white">
                {editingSantri ? "Edit Data Santri" : "Tambah Santri Baru"}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kode Unik Santri
                  </label>
                  <input
                    {...register("kode")}
                    placeholder="Contoh: S-1006"
                    className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  {errors.kode && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                      {errors.kode.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    {...register("nama_lengkap")}
                    placeholder="Nama lengkap santri"
                    className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  {errors.nama_lengkap && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                      {errors.nama_lengkap.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Blok
                  </label>
                  <input
                    {...register("blok")}
                    placeholder="Contoh: A"
                    className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  {errors.blok && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                      {errors.blok.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Asrama
                  </label>
                  <input
                    {...register("asrama")}
                    placeholder="Contoh: Al-Falah"
                    className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  {errors.asrama && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                      {errors.asrama.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kamar
                  </label>
                  <input
                    {...register("kamar")}
                    placeholder="Contoh: A1"
                    className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  {errors.kamar && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                      {errors.kamar.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Halaqoh Kelas (1-10)
                  </label>
                  <select
                    {...register("halaqoh_kelas")}
                    className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {HALAQOH_KELAS_LIST.map((k) => (
                      <option key={k} value={k}>
                        Kelas {k}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Halaqoh Bagian (A-F)
                  </label>
                  <select
                    {...register("halaqoh_bagian")}
                    className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {HALAQOH_BAGIAN_LIST.map((b) => (
                      <option key={b} value={b}>
                        Bagian {b}
                      </option>
                    ))}
                  </select>
                </div>
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
                  {isSubmitting ? "Menyimpan..." : editingSantri ? "Simpan Perubahan" : "Tambah Santri"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
