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
  LayoutGrid,
  Table,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import {
  fetchAllSantriFiltered,
  deleteSantriById,
  deleteSantriBatch,
  saveSantri,
  fetchSantriAlfaCounts,
} from "@/lib/services/tahfidz-service";
import {
  loadHalaqohFormasi,
  saveHalaqohFormasi,
  addFormasiHalaqoh,
  deleteFormasiHalaqoh,
  updatePembimbingMap,
  type FormasiHalaqohItem,
} from "@/lib/services/halaqoh-service";
import { formatKamarDisplay } from "@/lib/services/hierarchy-service";
import {
  PEMETAAN_HALAQOH_KELAS,
  HALAQOH_KELAS_LIST,
  type Santri,
  type HalaqohBagian,
} from "@/types/database";
import { DataTable } from "@/components/ui/DataTable";
import { DetailSantriModal } from "@/components/santri/DetailSantriModal";
import { HalaqohDetailModal } from "@/components/halaqoh/HalaqohDetailModal";
import { exportJsonToExcel } from "@/lib/utils/excel";
import { useToast } from "@/components/ui/Toast";
import type { ColumnDef } from "@tanstack/react-table";

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

export default function HalaqohPage() {
  const { showToast } = useToast();
  const printAreaRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const [tahunAbsen, setTahunAbsen] = useState<number>(now.getFullYear());
  const [bulanAbsen, setBulanAbsen] = useState<number>(now.getMonth() + 1);

  // Mode Tampilan: Kartu (Default) atau Tabel
  const [viewMode, setViewMode] = useState<"kartu" | "tabel">("kartu");

  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [formasiList, setFormasiList] = useState<FormasiHalaqohItem[]>([]);
  const [alfaMap, setAlfaMap] = useState<Record<string, number>>({});
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

  // Modal Detail Data Santri Halaqoh (Switch: Kegiatan & Juz Baru)
  const [halaqohDetailModalOpen, setHalaqohDetailModalOpen] = useState(false);
  const [selectedHalaqohForDetail, setSelectedHalaqohForDetail] = useState<FormasiHalaqohItem | null>(null);

  // State ekspansi kartu (maksimal 6 santri default, klik selengkapnya untuk seluruhnya)
  const [expandedHalaqohMap, setExpandedHalaqohMap] = useState<Record<string, boolean>>({});

  const toggleExpandHalaqoh = (id: string) => {
    setExpandedHalaqohMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Form input untuk modal Pembimbing Halaqoh
  const [tempPembimbingMap, setTempPembimbingMap] = useState<Record<string, string>>({});
  const [isSavingPembimbing, setIsSavingPembimbing] = useState(false);

  // Form input untuk modal Tambah Formasi Halaqoh Baru (+)
  const [formasiKelas, setFormasiKelas] = useState<number>(1);
  const [formasiBagian, setFormasiBagian] = useState<string>("A");
  const [formasiPembimbing, setFormasiPembimbing] = useState<string>("");
  const [isAddingFormasi, setIsAddingFormasi] = useState(false);

  // Muat data formasi, santri, dan rekap alfa absensi
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [formasi, santri, alfaData] = await Promise.all([
        loadHalaqohFormasi(),
        fetchAllSantriFiltered({}),
        fetchSantriAlfaCounts(tahunAbsen, bulanAbsen),
      ]);
      setFormasiList(formasi);
      setSantriList(santri);
      setAlfaMap(alfaData);

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
  }, [tahunAbsen, bulanAbsen]);

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

  // Helper render badge absensi alfa (sumber: /tahfidz/umum/kegiatan)
  // Hijau: tidak ada alfa (0)
  // Kuning: alfa > 3x (4 atau 5)
  // Merah: alfa > 5x (> 5)
  // Netral: 1 - 3 alfa
  const renderAlfaBadge = (santriId: string) => {
    const count = alfaMap[santriId] || 0;
    if (count === 0) {
      return (
        <span
          title="Tidak ada alfa (Aman)"
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 whitespace-nowrap"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"></span>
          0 Alfa
        </span>
      );
    }
    if (count > 5) {
      return (
        <span
          title={`Alfa lebih dari 5x: ${count} kali tidak hadir`}
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 whitespace-nowrap"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0"></span>
          {count} Alfa
        </span>
      );
    }
    if (count > 3) {
      return (
        <span
          title={`Alfa lebih dari 3x: ${count} kali tidak hadir`}
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700 whitespace-nowrap"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0"></span>
          {count} Alfa
        </span>
      );
    }
    return (
      <span
        title={`${count} kali alfa`}
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 whitespace-nowrap"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0"></span>
        {count} Alfa
      </span>
    );
  };

  // Render satu kartu halaqoh
  const renderHalaqohCard = (formasi: FormasiHalaqohItem) => {
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
    const isExpanded = !!expandedHalaqohMap[formasi.id];
    // Batasan maksimal 6 baris santri default, klik selengkapnya untuk menampilkan seluruhnya
    const displayedSantri = isExpanded ? santriInHalaqoh : santriInHalaqoh.slice(0, 6);

    return (
      <div
        key={formasi.id}
        className="w-full rounded-2xl border border-slate-200 bg-white shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Header Kartu: Halaqoh (Dapat diklik), Target Juz, Total Santri, dan Pembimbing */}
        <div className="p-4 bg-slate-50/80 border-b border-slate-100 dark:bg-slate-800/40 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2">
            {/* Judul Halaqoh & Badge (DAPAT DIKLIK -> BUKA POP UP DETAIL SANTRI HALAQOH KEGIATAN & JUZ BARU) */}
            <button
              type="button"
              onClick={() => {
                setSelectedHalaqohForDetail(formasi);
                setHalaqohDetailModalOpen(true);
              }}
              className="flex items-center gap-2.5 text-left group/title focus:outline-none transition-transform active:scale-95"
              title={`Klik untuk melihat detail presensi kegiatan & setoran Juz Baru Halaqoh ${formasi.kelas}${formasi.bagian}`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-800 text-white font-extrabold text-xs shadow-sm group-hover/title:bg-emerald-700 transition">
                {formasi.kelas}
                {formasi.bagian}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-extrabold text-slate-900 group-hover/title:text-emerald-700 transition dark:text-white dark:group-hover/title:text-emerald-300 flex items-center gap-1 underline-offset-2 group-hover/title:underline">
                    <span>
                      Halaqoh {formasi.kelas}
                      {formasi.bagian}
                    </span>
                    <ExternalLink className="h-3 w-3 text-emerald-600 opacity-60 group-hover/title:opacity-100" />
                  </h2>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                    {targetJuz}
                  </span>
                </div>
              </div>
            </button>

            <div className="flex items-center gap-1">
              <span className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 border border-slate-200 shadow-xs dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                {santriInHalaqoh.length} Santri
              </span>
              {santriInHalaqoh.length === 0 && (
                <button
                  type="button"
                  onClick={() => handleDeleteFormasi(formasi)}
                  title="Hapus formasi kosong"
                  className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Pembimbing */}
          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-1.5 truncate">
              <UserCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">Pembimbing:</span>
              {formasi.pembimbing ? (
                <strong className="text-emerald-900 font-bold truncate dark:text-emerald-300 text-xs">
                  {formasi.pembimbing}
                </strong>
              ) : (
                <span className="text-amber-600 italic text-[11px]">Belum diisi</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setModalPembimbingOpen(true)}
              title="Atur Pembimbing"
              className="text-[11px] font-medium text-emerald-700 hover:text-emerald-900 hover:underline dark:text-emerald-400 shrink-0 ml-1"
            >
              Atur
            </button>
          </div>
        </div>

        {/* Isi Kartu: Menampilkan No, Nama Santri, Kamar (Kode+Kamar), Status Alfa */}
        <div className="p-3 flex-1 flex flex-col justify-between">
          {santriInHalaqoh.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              Belum ada santri di halaqoh ini
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                      <th className="py-1.5 pl-1 pr-2 w-7">No</th>
                      <th className="py-1.5 px-2">Nama Santri</th>
                      <th className="py-1.5 px-2 text-center w-14">Kamar</th>
                      <th className="py-1.5 pl-2 pr-1 text-right w-20">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {displayedSantri.map((s, idx) => (
                      <tr
                        key={s.id}
                        onClick={() => {
                          setSelectedSantri(s);
                          setDetailModalOpen(true);
                        }}
                        className="hover:bg-slate-50/80 cursor-pointer transition dark:hover:bg-slate-800/50 group"
                      >
                        <td className="py-2 pl-1 pr-2 font-mono text-[11px] text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-2 font-semibold text-slate-900 group-hover:text-emerald-700 transition dark:text-slate-100 dark:group-hover:text-emerald-300">
                          {s.nama_lengkap}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className="inline-block font-mono font-bold text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {formatKamarDisplay(s.kode_kamar, s.kamar)}
                          </span>
                        </td>
                        <td className="py-2 pl-2 pr-1 text-right">
                          {renderAlfaBadge(s.id)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tombol Klik "Selengkapnya" jika santri > 6 */}
              {santriInHalaqoh.length > 6 && (
                <button
                  type="button"
                  onClick={() => toggleExpandHalaqoh(formasi.id)}
                  className="mt-2.5 w-full py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-emerald-50 text-emerald-800 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all duration-300 dark:bg-slate-800/80 dark:hover:bg-emerald-950/50 dark:text-emerald-300 shadow-xs"
                >
                  {isExpanded ? (
                    <>
                      <span>Tampilkan Lebih Sedikit (6 Santri)</span>
                      <ChevronUp className="h-3.5 w-3.5 transition-transform duration-300" />
                    </>
                  ) : (
                    <>
                      <span>Lihat Selengkapnya (+{santriInHalaqoh.length - 6} santri lainnya)</span>
                      <ChevronDown className="h-3.5 w-3.5 transition-transform duration-300" />
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

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

      {/* Toolbar Atas: [ Switch Kartu / Tabel ] -> [ Cari ] -> [ Filter Kelas ] -> [ Filter Bulan ] -> [ Tindakan ] */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 max-w-3xl">
          {/* Switch Mode: Kartu (Default) / Tabel */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
            <button
              type="button"
              onClick={() => setViewMode("kartu")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                viewMode === "kartu"
                  ? "bg-white text-emerald-800 shadow-sm dark:bg-slate-900 dark:text-emerald-300"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Kartu</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("tabel")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                viewMode === "tabel"
                  ? "bg-white text-emerald-800 shadow-sm dark:bg-slate-900 dark:text-emerald-300"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Table className="h-3.5 w-3.5" />
              <span>Tabel</span>
            </button>
          </div>

          {/* Pencarian Santri */}
          <div className="relative flex-1 min-w-[180px]">
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

          {/* Filter Bulan Absensi (Sumber Data Status Alfa Gambar 2) */}
          <select
            value={bulanAbsen}
            onChange={(e) => setBulanAbsen(Number(e.target.value))}
            title="Pilih Bulan Absensi Santri"
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {BULAN_NAMES.map((name, idx) => (
              <option key={name} value={idx + 1}>
                Absen: {name} {tahunAbsen}
              </option>
            ))}
          </select>
        </div>

        {/* Grup Tombol Tindakan */}
        <div className="flex items-center gap-2">
          {/* Tombol Pengaturan Pembimbing Halaqoh (Hanya Logo) */}
          <button
            type="button"
            onClick={() => setModalPembimbingOpen(true)}
            title="Pengaturan Pembimbing Halaqoh"
            aria-label="Pengaturan Pembimbing Halaqoh"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-600 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition shadow-sm dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-300"
          >
            <UserCheck className="h-4 w-4" />
          </button>

          {/* Tombol Tambah Formasi Halaqoh Baru (Hanya Logo) */}
          <button
            type="button"
            onClick={() => {
              setFormasiKelas(1);
              setFormasiBagian("A");
              setFormasiPembimbing("");
              setModalTambahFormasiOpen(true);
            }}
            title="Tambah Formasi Halaqoh Baru"
            aria-label="Tambah Formasi Halaqoh Baru"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 transition shadow"
          >
            <Plus className="h-4 w-4" />
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

      {/* Kontainer Siap Cetak: Tampilan Kartu (3 Kolom) atau Tampilan Tabel */}
      <div ref={printAreaRef} className="space-y-6">
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
        ) : viewMode === "kartu" ? (
          /* ========================================================================= */
          /* TAMPILAN KARTU: TATA LETAK KOLOM INDEPENDEN (DEMPET / RAPAT TANPA RUANG KOSONG) */
          /* Kartu 2B otomatis tepat berada di bawah 1A di kolom 1                     */
          /* ========================================================================= */
          <>
            {/* Tampilan Layar Kecil (Mobile < md): 1 Kolom berurutan */}
            <div className="flex md:hidden flex-col gap-5">
              {filteredFormasi.map((formasi) => renderHalaqohCard(formasi))}
            </div>

            {/* Tampilan Layar Sedang (Tablet md s.d. lg): 2 Kolom independen */}
            <div className="hidden md:flex lg:hidden flex-row gap-5 items-start">
              <div className="flex flex-col gap-5 flex-1 min-w-0">
                {filteredFormasi
                  .filter((_, idx) => idx % 2 === 0)
                  .map((formasi) => renderHalaqohCard(formasi))}
              </div>
              <div className="flex flex-col gap-5 flex-1 min-w-0">
                {filteredFormasi
                  .filter((_, idx) => idx % 2 === 1)
                  .map((formasi) => renderHalaqohCard(formasi))}
              </div>
            </div>

            {/* Tampilan Layar Besar (Desktop lg+): 3 Kolom independen (1A & 2B di Kolom 1) */}
            <div className="hidden lg:flex flex-row gap-5 items-start">
              {/* Kolom 1: 1A, 2B, 3C... */}
              <div className="flex flex-col gap-5 flex-1 min-w-0">
                {filteredFormasi
                  .filter((_, idx) => idx % 3 === 0)
                  .map((formasi) => renderHalaqohCard(formasi))}
              </div>
              {/* Kolom 2: 1B, 3A... */}
              <div className="flex flex-col gap-5 flex-1 min-w-0">
                {filteredFormasi
                  .filter((_, idx) => idx % 3 === 1)
                  .map((formasi) => renderHalaqohCard(formasi))}
              </div>
              {/* Kolom 3: 2A, 3B... */}
              <div className="flex flex-col gap-5 flex-1 min-w-0">
                {filteredFormasi
                  .filter((_, idx) => idx % 3 === 2)
                  .map((formasi) => renderHalaqohCard(formasi))}
              </div>
            </div>
          </>
        ) : (
          /* ========================================================================= */
          /* TAMPILAN TABEL: TABEL PENUH DENGAN FITUR LENGKAP                          */
          /* ========================================================================= */
          filteredFormasi.map((formasi) => {
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
                {/* Header Pengelompokan Halaqoh */}
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
      {/* MODAL 1: PEMBIMBING HALAQOH (PENGISIAN NAMA PEMBIMBING - 4 KOLOM DIPERLEBAR) */}
      {/* ========================================================================= */}
      {modalPembimbingOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] flex flex-col">
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

            {/* Daftar Kolom Pembimbing Halaqoh dalam 4 Kolom Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto pr-1 flex-1 py-1">
              {formasiList.map((f) => (
                <div
                  key={f.id}
                  className="flex flex-col gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:border-emerald-300 transition-colors dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-800 text-white font-extrabold text-xs shadow-xs">
                        {f.kelas}
                        {f.bagian}
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Halaqoh {f.kelas}
                        {f.bagian}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
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
                    placeholder="Nama pembimbing..."
                    className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
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

      {/* ========================================================================= */}
      {/* MODAL 4: DETAIL DATA SANTRI HALAQOH (SWITCH: KEGIATAN & JUZ BARU)         */}
      {/* ========================================================================= */}
      <HalaqohDetailModal
        isOpen={halaqohDetailModalOpen}
        onClose={() => {
          setHalaqohDetailModalOpen(false);
          setSelectedHalaqohForDetail(null);
        }}
        formasi={selectedHalaqohForDetail}
        santriList={santriList}
        onDataChanged={loadData}
        onSantriClick={(s) => {
          setSelectedSantri(s);
          setDetailModalOpen(true);
        }}
      />
    </div>
  );
}
