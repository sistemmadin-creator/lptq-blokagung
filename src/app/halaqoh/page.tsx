"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Search,
  Printer,
  Download,
  BookOpen,
  Phone,
  UserCheck,
  Check,
  X,
  Building,
  GraduationCap,
  Save,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import {
  fetchAllSantriFiltered,
  deleteSantriById,
  deleteSantriBatch,
  saveSantri,
} from "@/lib/services/tahfidz-service";
import {
  loadHalaqohFormasi,
  saveHalaqohFormasi,
  addFormasiHalaqoh,
  deleteFormasiHalaqoh,
  updatePembimbingMap,
  type FormasiHalaqohItem,
} from "@/lib/services/halaqoh-service";
import {
  PEMETAAN_HALAQOH_KELAS,
  HALAQOH_KELAS_LIST,
  type Santri,
  type HalaqohBagian,
} from "@/types/database";
import { DataTable } from "@/components/ui/DataTable";
import { DetailSantriModal } from "@/components/santri/DetailSantriModal";
import { exportJsonToExcel } from "@/lib/utils/excel";
import { useToast } from "@/components/ui/Toast";
import type { ColumnDef } from "@tanstack/react-table";

export default function HalaqohPage() {
  const { showToast } = useToast();
  const printAreaRef = useRef<HTMLDivElement>(null);

  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [formasiList, setFormasiList] = useState<FormasiHalaqohItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter pencarian dan filter kelas tampilan
  const [search, setSearch] = useState("");
  const [kelasFilter, setKelasFilter] = useState<number | "">("");

  // Modal State
  const [modalPembimbingOpen, setModalPembimbingOpen] = useState(false);
  const [modalTambahFormasiOpen, setModalTambahFormasiOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedSantri, setSelectedSantri] = useState<Santri | null>(null);

  // Form input untuk modal Pembimbing Halaqoh
  const [tempPembimbingMap, setTempPembimbingMap] = useState<Record<string, string>>({});
  const [isSavingPembimbing, setIsSavingPembimbing] = useState(false);

  // Form input untuk modal Tambah Formasi Halaqoh Baru (+)
  const [formasiKelas, setFormasiKelas] = useState<number>(1);
  const [formasiBagian, setFormasiBagian] = useState<string>("A");
  const [formasiPembimbing, setFormasiPembimbing] = useState<string>("");
  const [isAddingFormasi, setIsAddingFormasi] = useState(false);

  // Muat data formasi dan santri
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [formasi, santri] = await Promise.all([
        loadHalaqohFormasi(),
        fetchAllSantriFiltered({}),
      ]);
      setFormasiList(formasi);
      setSantriList(santri);

      // Inisialisasi map pembimbing
      const map: Record<string, string> = {};
      formasi.forEach((f) => {
        map[f.id] = f.pembimbing || "";
      });
      setTempPembimbingMap(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data halaqoh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Hook cetak PDF via react-to-print
  const handlePrint = useReactToPrint({
    content: () => printAreaRef.current,
    documentTitle: "Data_Pengelompokan_Halaqoh_LPTQ_Blokagung",
  });

  // Ekspor Excel seluruh data halaqoh
  const handleExportExcel = () => {
    try {
      const formatted = santriList.map((s, idx) => ({
        No: idx + 1,
        "Nama Lengkap": s.nama_lengkap,
        "Nomor WhatsApp": s.no_wa || "-",
        Blok: s.blok,
        Asrama: s.asrama,
        Kode: s.kode_kamar || "-",
        Kamar: s.kamar,
        "Halaqoh Kelas": s.halaqoh_kelas,
        "Halaqoh Bagian": s.halaqoh_bagian,
        Target: PEMETAAN_HALAQOH_KELAS[s.halaqoh_kelas] || "-",
        Pembimbing:
          formasiList.find(
            (f) => f.kelas === s.halaqoh_kelas && f.bagian === s.halaqoh_bagian
          )?.pembimbing || "-",
      }));
      exportJsonToExcel(formatted, "Data_Pengelompokan_Halaqoh_Blokagung", "HalaqohSantri");
      showToast("success", "Berkas Excel halaqoh berhasil diunduh.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Gagal mengekspor data Excel.");
    }
  };

  // Simpan pembimbing halaqoh
  const handleSavePembimbing = async () => {
    setIsSavingPembimbing(true);
    try {
      const updated = await updatePembimbingMap(tempPembimbingMap);
      setFormasiList(updated);
      showToast("success", "Nama-nama pembimbing halaqoh berhasil disimpan.");
      setModalPembimbingOpen(false);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Gagal menyimpan pembimbing.");
    } finally {
      setIsSavingPembimbing(false);
    }
  };

  // Tambah formasi halaqoh baru (+)
  const handleAddFormasiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formasiBagian.trim()) {
      showToast("error", "Bagian halaqoh wajib diisi (misal: A, B, C).");
      return;
    }

    setIsAddingFormasi(true);
    try {
      const updated = await addFormasiHalaqoh(
        formasiKelas,
        formasiBagian.trim().toUpperCase(),
        formasiPembimbing.trim()
      );
      setFormasiList(updated);
      showToast(
        "success",
        `Formasi Halaqoh Kelas ${formasiKelas} Bagian ${formasiBagian.toUpperCase()} berhasil ditambahkan.`
      );
      setModalTambahFormasiOpen(false);
      setFormasiPembimbing("");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Gagal menambahkan formasi halaqoh.");
    } finally {
      setIsAddingFormasi(false);
    }
  };

  // Hapus santri tunggal
  const handleDeleteSantri = async (s: Santri) => {
    if (!window.confirm(`Hapus santri "${s.nama_lengkap}"?`)) return;
    try {
      await deleteSantriById(s.id);
      showToast("success", `Santri ${s.nama_lengkap} berhasil dihapus.`);
      if (selectedSantri?.id === s.id) {
        setDetailModalOpen(false);
        setSelectedSantri(null);
      }
      loadData();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Gagal menghapus santri.");
    }
  };

  // Hapus santri terpilih per tabel halaqoh
  const handleDeleteBatchSantri = async (selectedIds: string[]) => {
    try {
      await deleteSantriBatch(selectedIds);
      showToast("success", `Berhasil menghapus ${selectedIds.length} santri terpilih.`);
      loadData();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Gagal menghapus santri terpilih.");
    }
  };

  // Hapus semua santri dalam satu halaqoh tertentu
  const handleDeleteAllInHalaqoh = async (kelas: number, bagian: string) => {
    const toDelete = santriList
      .filter((s) => s.halaqoh_kelas === kelas && s.halaqoh_bagian === bagian)
      .map((s) => s.id);
    if (toDelete.length === 0) return;

    try {
      await deleteSantriBatch(toDelete);
      showToast("success", `Seluruh santri dalam Halaqoh ${kelas}${bagian} berhasil dihapus.`);
      loadData();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Gagal mengosongkan halaqoh.");
    }
  };

  // Hapus formasi halaqoh kosong
  const handleDeleteFormasi = async (f: FormasiHalaqohItem) => {
    const count = santriList.filter(
      (s) => s.halaqoh_kelas === f.kelas && s.halaqoh_bagian === f.bagian
    ).length;
    if (count > 0) {
      alert(
        `Tidak dapat menghapus formasi Halaqoh ${f.kelas}${f.bagian} karena masih memiliki ${count} santri.`
      );
      return;
    }
    if (!window.confirm(`Hapus formasi Halaqoh ${f.kelas}${f.bagian}?`)) return;

    try {
      const updated = await deleteFormasiHalaqoh(f.id);
      setFormasiList(updated);
      showToast("success", `Formasi Halaqoh ${f.kelas}${f.bagian} berhasil dihapus.`);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Gagal menghapus formasi.");
    }
  };

  // Kelompokkan santri per halaqoh
  const filteredFormasi = useMemo(() => {
    return formasiList.filter((f) => {
      if (kelasFilter !== "" && f.kelas !== kelasFilter) return false;
      return true;
    });
  }, [formasiList, kelasFilter]);

  // Kolom standar untuk tabel santri di setiap halaqoh
  const getHalaqohColumns = (): ColumnDef<Santri>[] => [
    {
      id: "no",
      header: "NO",
      cell: ({ row }) => <span className="font-mono text-xs">{row.index + 1}</span>,
    },
    {
      accessorKey: "nama_lengkap",
      header: "NAMA LENGKAP",
      cell: ({ row }) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {row.original.nama_lengkap}
        </span>
      ),
    },
    {
      accessorKey: "no_wa",
      header: "NOMOR WHATSAPP",
      cell: ({ row }) => {
        const wa = row.original.no_wa;
        if (!wa) return <span className="text-slate-400 font-mono text-xs">-</span>;
        let clean = wa.replace(/\D/g, "");
        if (clean.startsWith("0")) clean = "62" + clean.slice(1);
        else if (!clean.startsWith("62")) clean = "62" + clean;
        return (
          <a
            href={`https://wa.me/${clean}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 font-mono text-xs text-emerald-700 hover:text-emerald-900 hover:underline dark:text-emerald-400"
            title="Kirim pesan WhatsApp"
          >
            <Phone className="h-3 w-3 shrink-0 text-emerald-600" />
            <span>{wa}</span>
          </a>
        );
      },
    },
    { accessorKey: "blok", header: "BLOK" },
    { accessorKey: "asrama", header: "ASRAMA" },
    {
      accessorKey: "kode_kamar",
      header: "KODE",
      cell: ({ row }) => (
        <span className="font-mono font-semibold text-xs text-slate-700 dark:text-slate-300">
          {row.original.kode_kamar || "-"}
        </span>
      ),
    },
    { accessorKey: "kamar", header: "KAMAR" },
    {
      id: "aksi",
      header: "AKSI",
      cell: ({ row }) => (
        <div className="no-print flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => handleDeleteSantri(row.original)}
            className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 transition dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Hapus</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-emerald-700" />
          <span>Pengelompokan Halaqoh Santri</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Kelola pembagian halaqoh, daftar santri per halaqoh, dan penugasan nama pembimbing tahfidz.
        </p>
      </div>

      {/* Toolbar Atas: [ Cari ] -> [ Filter Kelas ] -> [ Pembimbing Halaqoh ] -> [ + Tambah Formasi ] -> [ Cetak ] -> [ Ekspor ] */}
      <div className="no-print flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl">
          {/* Pencarian Santri */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari santri dalam halaqoh..."
              className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-8 text-xs text-slate-800 placeholder-slate-400 shadow-sm focus:border-emerald-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Kelas */}
          <select
            value={kelasFilter}
            onChange={(e) => setKelasFilter(e.target.value ? Number(e.target.value) : "")}
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="">Semua Kelas (1-10)</option>
            {HALAQOH_KELAS_LIST.map((k) => (
              <option key={k} value={k}>
                Kelas {k}
              </option>
            ))}
          </select>
        </div>

        {/* Grup Tombol Tindakan */}
        <div className="flex items-center gap-2">
          {/* Tombol Pembimbing Halaqoh */}
          <button
            type="button"
            onClick={() => setModalPembimbingOpen(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-50 px-3.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-sm dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-300"
          >
            <UserCheck className="h-4 w-4" />
            <span>Pembimbing Halaqoh</span>
          </button>

          {/* Tombol Tambah Formasi Halaqoh Baru (+) */}
          <button
            type="button"
            onClick={() => {
              setFormasiKelas(1);
              setFormasiBagian("A");
              setFormasiPembimbing("");
              setModalTambahFormasiOpen(true);
            }}
            title="Tambah Formasi Halaqoh Baru"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-800 px-3.5 text-xs font-bold text-white hover:bg-emerald-900 transition shadow"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Halaqoh</span>
          </button>

          {/* Tombol Cetak PDF */}
          <button
            type="button"
            onClick={handlePrint}
            title="Cetak Data Halaqoh"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Printer className="h-4 w-4" />
          </button>

          {/* Tombol Ekspor Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            title="Ekspor Seluruh Halaqoh ke Excel"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Kontainer Siap Cetak & Tabel-Tabel Pengelompokan Halaqoh */}
      <div ref={printAreaRef} className="space-y-8">
        <div className="hidden print:block mb-4">
          <h2 className="text-lg font-bold">LPTQ Pondok Pesantren Darussalam Blokagung</h2>
          <p className="text-xs">Daftar Pengelompokan Halaqoh Santri & Pembimbing</p>
        </div>

        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Memuat data pengelompokan halaqoh...
            </p>
          </div>
        ) : filteredFormasi.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Belum ada formasi halaqoh yang terdaftar.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Gunakan tombol (+) di atas untuk menambahkan pengelompokan halaqoh baru.
            </p>
          </div>
        ) : (
          filteredFormasi.map((formasi) => {
            // Filter santri yang berada pada halaqoh ini
            const santriInHalaqoh = santriList.filter((s) => {
              const matchHalaqoh =
                s.halaqoh_kelas === formasi.kelas &&
                String(s.halaqoh_bagian).toUpperCase() === String(formasi.bagian).toUpperCase();
              if (!matchHalaqoh) return false;
              if (search) {
                const term = search.toLowerCase();
                return (
                  s.nama_lengkap.toLowerCase().includes(term) ||
                  (s.no_wa && s.no_wa.includes(term)) ||
                  (s.asrama && s.asrama.toLowerCase().includes(term)) ||
                  (s.kamar && s.kamar.toLowerCase().includes(term))
                );
              }
              return true;
            });

            const targetJuz = PEMETAAN_HALAQOH_KELAS[formasi.kelas] || "-";

            return (
              <div
                key={formasi.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 dark:border-slate-800 dark:bg-slate-900"
              >
                {/* Header Pengelompokan Halaqoh: Nama Halaqoh, Target Juz, dan NAMA PEMBIMBING DI ATAS TABEL */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-800 text-white font-extrabold text-sm shadow">
                      {formasi.kelas}
                      {formasi.bagian}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                          Halaqoh {formasi.kelas}
                          {formasi.bagian}
                        </h2>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                          {targetJuz}
                        </span>
                      </div>

                      {/* NAMA PEMBIMBING DI ATAS TABEL */}
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>Pembimbing:</span>
                        {formasi.pembimbing ? (
                          <strong className="text-emerald-900 font-bold dark:text-emerald-300">
                            {formasi.pembimbing}
                          </strong>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setModalPembimbingOpen(true)}
                            className="text-amber-600 font-semibold hover:underline italic"
                          >
                            (Belum diisi - Klik untuk atur)
                          </button>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      Total: <strong>{santriInHalaqoh.length} Santri</strong>
                    </span>
                    {santriInHalaqoh.length === 0 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteFormasi(formasi)}
                        title="Hapus formasi kosong"
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Tabel Pengelompokan Santri dalam Halaqoh ini */}
                <DataTable
                  columns={getHalaqohColumns()}
                  data={santriInHalaqoh}
                  loading={false}
                  error={null}
                  emptyTitle={`Belum ada santri di Halaqoh ${formasi.kelas}${formasi.bagian}`}
                  emptyDescription="Tambahkan santri dan pilih kelas & bagian halaqoh ini di menu Data Santri."
                  onRowClick={(s) => {
                    setSelectedSantri(s);
                    setDetailModalOpen(true);
                  }}
                  enableSelection={true}
                  onDeleteSelected={handleDeleteBatchSantri}
                  onDeleteAll={() => handleDeleteAllInHalaqoh(formasi.kelas, formasi.bagian)}
                />
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: PEMBIMBING HALAQOH (PENGISIAN NAMA PEMBIMBING)                   */}
      {/* ========================================================================= */}
      {modalPembimbingOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Pengaturan Pembimbing Halaqoh
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Isi nama pembimbing yang akan otomatis tampil di atas masing-masing tabel halaqoh
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalPembimbingOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1 flex-1 py-1">
              {formasiList.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div className="flex h-9 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-800 text-white font-extrabold text-xs shadow-sm">
                    {f.kelas}
                    {f.bagian}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Halaqoh {f.kelas}
                        {f.bagian}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {PEMETAAN_HALAQOH_KELAS[f.kelas] || ""}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={tempPembimbingMap[f.id] || ""}
                      onChange={(e) =>
                        setTempPembimbingMap((prev) => ({
                          ...prev,
                          [f.id]: e.target.value,
                        }))
                      }
                      placeholder="Ketik nama pembimbing (misal: Ust. Ahmad Fauzan)"
                      className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
              <button
                type="button"
                onClick={() => setModalPembimbingOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSavingPembimbing}
                onClick={handleSavePembimbing}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 shadow transition disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{isSavingPembimbing ? "Menyimpan..." : "Simpan Pembimbing"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TAMBAH FORMASI HALAQOH BARU (+) (SESUAI GAMBAR 4 & 5)            */}
      {/* ========================================================================= */}
      {modalTambahFormasiOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-800 text-white">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Formasi Halaqoh Baru
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tambah pengelompokan kelas (1-10) dan bagian
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalTambahFormasiOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddFormasiSubmit} className="space-y-4">
              {/* Kolom Kelas (Otomatis 1-10 dan Target Rentang Juz) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kelas (Otomatis Kelas 1 s.d. 10)
                </label>
                <select
                  value={formasiKelas}
                  onChange={(e) => setFormasiKelas(Number(e.target.value))}
                  className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 font-semibold focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {HALAQOH_KELAS_LIST.map((k) => (
                    <option key={k} value={k}>
                      Kelas {k} ({PEMETAAN_HALAQOH_KELAS[k]})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                  Target Hafalan: {PEMETAAN_HALAQOH_KELAS[formasiKelas]}
                </p>
              </div>

              {/* Kolom Bagian (Mempengaruhi enum kolom Gambar 5) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bagian Halaqoh
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={formasiBagian}
                  onChange={(e) => setFormasiBagian(e.target.value.toUpperCase())}
                  placeholder="Contoh: A, B, C, D, E, F..."
                  className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold uppercase text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  required
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  Bagian ini otomatis ditambahkan ke pilihan dropdown Form Santri & Filter.
                </p>
              </div>

              {/* Kolom Nama Pembimbing (Opsional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Pembimbing <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <input
                  type="text"
                  value={formasiPembimbing}
                  onChange={(e) => setFormasiPembimbing(e.target.value)}
                  placeholder="Contoh: Ust. Ahmad Fauzan"
                  className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalTambahFormasiOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isAddingFormasi}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 shadow transition disabled:opacity-50"
                >
                  {isAddingFormasi ? "Menambahkan..." : "Tambah Formasi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DETAIL DATA SANTRI                                               */}
      {/* ========================================================================= */}
      <DetailSantriModal
        santri={selectedSantri}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedSantri(null);
        }}
        onEdit={(s) => {
          setDetailModalOpen(false);
          // Redirect ke santri page jika ingin edit lengkap
          window.location.href = `/santri`;
        }}
        onDelete={(s) => handleDeleteSantri(s)}
      />
    </div>
  );
}
