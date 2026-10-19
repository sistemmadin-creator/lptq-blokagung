"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2, FileSpreadsheet, X } from "lucide-react";
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
import { PrintButton } from "@/components/ui/PrintButton";
import { ExcelUploader } from "@/components/ui/ExcelUploader";
import { downloadSantriTemplateExcel, exportJsonToExcel } from "@/lib/utils/excel";
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

export default function SantriPage() {
  const { showToast } = useToast();
  const printAreaRef = useRef<HTMLDivElement>(null);

  const [rows, setRows] = useState<Santri[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [asramaFilter, setAsramaFilter] = useState("");
  const [blokFilter, setBlokFilter] = useState("");
  const [kamarFilter, setKamarFilter] = useState("");
  const [kelasFilter, setKelasFilter] = useState<number | "">("");
  const [bagianFilter, setBagianFilter] = useState("");
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSantri, setEditingSantri] = useState<Santri | null>(null);

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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modalOpen) {
        setModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen]);

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

  const handleExportExcel = async () => {
    try {
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

  const columns: ColumnDef<Santri>[] = [
    {
      id: "no",
      header: "No",
      cell: ({ row }) => <span className="font-mono">{(page - 1) * 25 + row.index + 1}</span>,
    },
    {
      accessorKey: "kode",
      header: "Kode",
      cell: ({ row }) => <span className="font-mono font-semibold">{row.original.kode}</span>,
    },
    {
      accessorKey: "nama_lengkap",
      header: "Nama Lengkap",
      cell: ({ row }) => <span className="font-medium">{row.original.nama_lengkap}</span>,
    },
    { accessorKey: "blok", header: "Blok" },
    { accessorKey: "asrama", header: "Asrama" },
    { accessorKey: "kamar", header: "Kamar" },
    {
      id: "halaqoh",
      header: "Halaqoh",
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
      header: "Aksi",
      cell: ({ row }) => (
        <div className="no-print flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => openEditModal(row.original)}
            className="inline-flex min-h-[38px] items-center gap-1 rounded border border-slate-300 px-2.5 py-1 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Edit</span>
          </button>
          <button
            type="button"
            onClick={() => handleDelete(row.original)}
            className="inline-flex min-h-[38px] items-center gap-1 rounded border border-red-700 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-900 hover:bg-red-100 dark:border-red-500 dark:bg-red-950 dark:text-red-200"
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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Data Santri Tahfidz</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Kelola biodata asrama, kamar, dan pengelompokan Halaqoh Kelas (1-10) serta Bagian (A-F).
          </p>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Santri</span>
          </button>

          <ExcelUploader
            requiredHeaders={[
              "Nama Lengkap",
              "Asrama",
              "Kode",
              "Kamar",
              "Halaqoh Kelas",
              "Halaqoh Bagian",
            ]}
            endpoint="/api/import/santri"
            onSuccess={loadData}
            onDownloadTemplate={downloadSantriTemplateExcel}
          />

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Ekspor Excel</span>
          </button>

          <PrintButton
            contentRef={printAreaRef}
            documentTitle="Data_Santri_Tahfidz_LPTQ_Blokagung"
          />
        </div>
      </div>

      {/* Bilah Pencarian dan Filter */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 rounded-md border border-slate-300 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Cari nama atau kode..."
          aria-label="Cari nama atau kode santri"
          className="min-h-[44px] rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
        />

        <input
          type="text"
          value={asramaFilter}
          onChange={(e) => {
            setAsramaFilter(e.target.value);
            setPage(1);
          }}
          placeholder="Filter Asrama..."
          aria-label="Filter Asrama"
          className="min-h-[44px] rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
        />

        <input
          type="text"
          value={blokFilter}
          onChange={(e) => {
            setBlokFilter(e.target.value);
            setPage(1);
          }}
          placeholder="Filter Blok..."
          aria-label="Filter Blok"
          className="min-h-[44px] rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
        />

        <input
          type="text"
          value={kamarFilter}
          onChange={(e) => {
            setKamarFilter(e.target.value);
            setPage(1);
          }}
          placeholder="Filter Kamar..."
          aria-label="Filter Kamar"
          className="min-h-[44px] rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
        />

        <select
          value={kelasFilter}
          onChange={(e) => {
            setKelasFilter(e.target.value ? Number(e.target.value) : "");
            setPage(1);
          }}
          aria-label="Filter Halaqoh Kelas"
          className="min-h-[44px] rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">Semua Kelas (1-10)</option>
          {HALAQOH_KELAS_LIST.map((k) => (
            <option key={k} value={k}>
              Kelas {k}
            </option>
          ))}
        </select>

        <select
          value={bagianFilter}
          onChange={(e) => {
            setBagianFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter Halaqoh Bagian"
          className="min-h-[44px] rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">Semua Bagian (A-F)</option>
          {HALAQOH_BAGIAN_LIST.map((b) => (
            <option key={b} value={b}>
              Bagian {b}
            </option>
          ))}
        </select>
      </div>

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

      {/* Modal Tambah / Edit Santri */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-santri-title"
        >
          <div className="w-full max-w-lg rounded-md border border-slate-300 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 id="modal-santri-title" className="text-base font-bold">
                {editingSantri ? "Edit Data Santri" : "Tambah Santri Baru"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Tutup dialog"
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded border border-slate-300 dark:border-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Kode Unik Santri</label>
                  <input
                    {...register("kode")}
                    placeholder="Contoh: S-1006"
                    className="w-full min-h-[44px] rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                  {errors.kode && (
                    <p className="mt-1 text-xs text-red-700 dark:text-red-400">
                      {errors.kode.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Nama Lengkap</label>
                  <input
                    {...register("nama_lengkap")}
                    placeholder="Contoh: Ahmad Fauzi"
                    className="w-full min-h-[44px] rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                  {errors.nama_lengkap && (
                    <p className="mt-1 text-xs text-red-700 dark:text-red-400">
                      {errors.nama_lengkap.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Blok</label>
                  <input
                    {...register("blok")}
                    placeholder="Contoh: A"
                    className="w-full min-h-[44px] rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Asrama</label>
                  <input
                    {...register("asrama")}
                    placeholder="Contoh: Al-Falah"
                    className="w-full min-h-[44px] rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                  {errors.asrama && (
                    <p className="mt-1 text-xs text-red-700 dark:text-red-400">
                      {errors.asrama.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Kamar</label>
                  <input
                    {...register("kamar")}
                    placeholder="Contoh: A1"
                    className="w-full min-h-[44px] rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                  {errors.kamar && (
                    <p className="mt-1 text-xs text-red-700 dark:text-red-400">
                      {errors.kamar.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Halaqoh Kelas (1-10)</label>
                  <select
                    {...register("halaqoh_kelas")}
                    className="w-full min-h-[44px] rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  >
                    {HALAQOH_KELAS_LIST.map((k) => (
                      <option key={k} value={k}>
                        Kelas {k}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Halaqoh Bagian (A-F)</label>
                  <select
                    {...register("halaqoh_bagian")}
                    className="w-full min-h-[44px] rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  >
                    {HALAQOH_BAGIAN_LIST.map((b: HalaqohBagian) => (
                      <option key={b} value={b}>
                        Bagian {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="min-h-[44px] rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold dark:border-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[44px] rounded-md bg-emerald-800 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-900 disabled:opacity-60"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Santri"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
