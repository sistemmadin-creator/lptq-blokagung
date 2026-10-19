"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, FileSpreadsheet, X } from "lucide-react";
import {
  fetchSetoranBulananMerged,
  insertSetoranLog,
} from "@/lib/services/tahfidz-service";
import {
  HALAQOH_BAGIAN_LIST,
  HALAQOH_KELAS_LIST,
  type SetoranBulananRow,
  type TipeSetoran,
} from "@/types/database";
import { DataTable } from "@/components/ui/DataTable";
import { HalaqohBadge } from "@/components/ui/Badges";
import { PrintButton } from "@/components/ui/PrintButton";
import { exportJsonToExcel } from "@/lib/utils/excel";
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

  const [rows, setRows] = useState<SetoranBulananRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SetoranFormValues>({
    resolver: zodResolver(setoranSchema),
    defaultValues: {
      santri_id: "",
      tanggal: now.toISOString().slice(0, 10),
      jumlah_juz_tambahan: 0.5,
      catatan: "",
    },
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSetoranBulananMerged(tahun, tipe, {
        search,
        asrama: asramaFilter,
        halaqoh_kelas: kelasFilter,
        halaqoh_bagian: bagianFilter,
      });
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat rekap setoran.");
    } finally {
      setLoading(false);
    }
  }, [tahun, tipe, search, asramaFilter, kelasFilter, bagianFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modalOpen) setModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen]);

  const onSubmit = async (values: SetoranFormValues) => {
    try {
      await insertSetoranLog({
        santri_id: values.santri_id,
        tanggal: values.tanggal,
        tipe,
        jumlah_juz_tambahan: values.jumlah_juz_tambahan,
        catatan: values.catatan,
      });
      showToast("success", "Log setoran berhasil disimpan dan diakumulasikan.");
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
      header: "No",
      cell: ({ row }) => <span className="font-mono">{row.index + 1}</span>,
    },
    {
      accessorKey: "nama_lengkap",
      header: "Nama",
      cell: ({ row }) => <span className="font-medium">{row.original.nama_lengkap}</span>,
    },
    { accessorKey: "kamar", header: "Kamar" },
    {
      id: "halaqoh",
      header: "Halaqoh",
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
          <span className={`font-mono ${val > 0 ? "font-bold text-emerald-800 dark:text-emerald-300" : "text-slate-500"}`}>
            {val > 0 ? val : "-"}
          </span>
        );
      },
    })),
    {
      accessorKey: "total_setoran",
      header: "Total Setoran",
      cell: ({ row }) => (
        <span className="font-mono font-bold text-emerald-900 dark:text-emerald-300">
          {row.original.total_setoran} Juz
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{judul}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">{deskripsi}</p>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              reset({
                santri_id: rows[0]?.santri_id ?? "",
                tanggal: new Date().toISOString().slice(0, 10),
                jumlah_juz_tambahan: 0.5,
                catatan: "",
              });
              setModalOpen(true);
            }}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900"
          >
            <Plus className="h-4 w-4" />
            <span>Input Log Setoran</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Ekspor Excel</span>
          </button>

          <PrintButton contentRef={printRef} documentTitle={`Rekap_${tipe}_${tahun}`} />
        </div>
      </div>

      {/* Filter Tahun, Pencarian, Asrama, Kelas, Bagian */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 rounded-md border border-slate-300 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
        <input
          type="number"
          value={tahun}
          onChange={(e) => setTahun(Number(e.target.value) || now.getFullYear())}
          aria-label="Tahun Rekap"
          className="min-h-[44px] rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-mono dark:border-slate-700 dark:bg-slate-800"
        />

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama atau kode..."
          aria-label="Cari santri"
          className="min-h-[44px] rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
        />

        <input
          type="text"
          value={asramaFilter}
          onChange={(e) => setAsramaFilter(e.target.value)}
          placeholder="Filter Asrama..."
          aria-label="Filter Asrama"
          className="min-h-[44px] rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
        />

        <select
          value={kelasFilter}
          onChange={(e) => setKelasFilter(e.target.value ? Number(e.target.value) : "")}
          aria-label="Filter Kelas"
          className="min-h-[44px] rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">Semua Kelas</option>
          {HALAQOH_KELAS_LIST.map((k) => (
            <option key={k} value={k}>
              Kelas {k}
            </option>
          ))}
        </select>

        <select
          value={bagianFilter}
          onChange={(e) => setBagianFilter(e.target.value)}
          aria-label="Filter Bagian"
          className="min-h-[44px] rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">Semua Bagian</option>
          {HALAQOH_BAGIAN_LIST.map((b) => (
            <option key={b} value={b}>
              Bagian {b}
            </option>
          ))}
        </select>
      </div>

      <div ref={printRef}>
        <DataTable columns={columns} data={rows} loading={loading} error={error} onRetry={loadData} />
      </div>

      {/* Modal Input Log Setoran */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-setoran-title"
        >
          <div className="w-full max-w-md rounded-md border border-slate-300 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-4">
              <h2 id="modal-setoran-title" className="text-base font-bold">
                Input Log Setoran ({tipe === "juz_baru" ? "Juz Baru" : "Evaluasi Pusat"})
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
              <div>
                <label className="block text-xs font-semibold mb-1">Pilih Santri</label>
                <select
                  {...register("santri_id")}
                  className="w-full min-h-[44px] rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="">-- Pilih Santri --</option>
                  {rows.map((r) => (
                    <option key={r.santri_id} value={r.santri_id}>
                      {r.kode} - {r.nama_lengkap} ({r.halaqoh})
                    </option>
                  ))}
                </select>
                {errors.santri_id && (
                  <p className="mt-1 text-xs text-red-700">{errors.santri_id.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Tanggal Setoran</label>
                <input
                  type="date"
                  {...register("tanggal")}
                  className="w-full min-h-[44px] rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Jumlah Juz Tambahan (Bisa Desimal, misal 0.25 / 0.5 / 1)
                </label>
                <input
                  type="number"
                  step="0.05"
                  {...register("jumlah_juz_tambahan")}
                  className="w-full min-h-[44px] rounded border border-slate-300 bg-white px-3 py-2 text-sm font-mono dark:border-slate-700 dark:bg-slate-800"
                />
                {errors.jumlah_juz_tambahan && (
                  <p className="mt-1 text-xs text-red-700">
                    {errors.jumlah_juz_tambahan.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Catatan (Opsional)</label>
                <input
                  type="text"
                  {...register("catatan")}
                  placeholder="Contoh: Juz 4 halaman 1-10 lancar"
                  className="w-full min-h-[44px] rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
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
