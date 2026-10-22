"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  LayoutGrid,
  Table as TableIcon,
  TrendingUp,
  Star,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { createClient } from "@/lib/supabase/client";
import {
  fetchAllSantriFiltered,
  fetchSetoranBulananMerged,
  insertSetoranLog,
  deleteSetoranBatch,
  deleteAllSetoran,
  saveSetoranBulanDirect,
} from "@/lib/services/tahfidz-service";
import { formatKamarDisplay } from "@/lib/services/hierarchy-service";
import {
  HALAQOH_BAGIAN_LIST,
  HALAQOH_KELAS_LIST,
  PEMETAAN_HALAQOH_KELAS,
  type HalaqohBagian,
  type Santri,
  type SetoranBulananRow,
  type TipeSetoran,
} from "@/types/database";
import { DataTable } from "@/components/ui/DataTable";
import { HalaqohBadge } from "@/components/ui/Badges";
import { exportJsonToExcel } from "@/lib/utils/excel";
import { useToast } from "@/components/ui/Toast";

function toLocalIsoDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

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

  // Mode Tampilan: Kartu vs Tabel (Default Kartu)
  const [viewMode, setViewMode] = useState<"kartu" | "tabel">("kartu");
  const [pageSize, setPageSize] = useState(15);
  const [cardPage, setCardPage] = useState(1);
  const cardPageSize = 6;

  // Status Modal Detail Evaluasi & Naik Halaqoh (Khusus Evaluasi)
  const [evaluasiModalOpen, setEvaluasiModalOpen] = useState(false);
  const [selectedEvaluasiSantri, setSelectedEvaluasiSantri] = useState<SetoranBulananRow | null>(null);
  const [naikHalaqohModalOpen, setNaikHalaqohModalOpen] = useState(false);
  const [selectedNaikHalaqohSantri, setSelectedNaikHalaqohSantri] = useState<SetoranBulananRow | null>(null);
  const [targetHalaqohChoice, setTargetHalaqohChoice] = useState<{ kelas: number; bagian: HalaqohBagian } | null>(null);
  const [submittingNaikHalaqoh, setSubmittingNaikHalaqoh] = useState(false);
  const [confirmWarningModalOpen, setConfirmWarningModalOpen] = useState(false);
  const [warningDialogData, setWarningDialogData] = useState<{
    title: string;
    desc: string;
    badge: string;
    isDanger: boolean;
  } | null>(null);

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
        if (confirmWarningModalOpen) setConfirmWarningModalOpen(false);
        else if (naikHalaqohModalOpen) setNaikHalaqohModalOpen(false);
        else if (evaluasiModalOpen) setEvaluasiModalOpen(false);
        else if (modalOpen) setModalOpen(false);
        else if (filterModalOpen) setFilterModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen, filterModalOpen, evaluasiModalOpen, naikHalaqohModalOpen, confirmWarningModalOpen]);

  // Kelompokkan data santri dan setoran per halaqoh untuk mode Kartu
  const halaqohGroups = useMemo(() => {
    const map = new Map<string, { kelas: number; bagian: HalaqohBagian; rows: SetoranBulananRow[] }>();

    rows.forEach((r) => {
      const k = Number(r.halaqoh_kelas) || 1;
      const b = (r.halaqoh_bagian || "A") as HalaqohBagian;
      const key = `${k}_${b}`;
      if (!map.has(key)) {
        map.set(key, { kelas: k, bagian: b, rows: [] });
      }
      map.get(key)!.rows.push(r);
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.kelas !== b.kelas) return a.kelas - b.kelas;
      return a.bagian.localeCompare(b.bagian);
    });
  }, [rows]);

  const totalHalaqohPages = Math.max(1, Math.ceil(halaqohGroups.length / cardPageSize));
  const paginatedHalaqohGroups = useMemo(() => {
    const start = (cardPage - 1) * cardPageSize;
    return halaqohGroups.slice(start, start + cardPageSize);
  }, [halaqohGroups, cardPage, cardPageSize]);

  // Daftar pilihan halaqoh di atas halaqoh santri saat ini (kelas > currentKelas)
  // KUNCI: Hanya izinkan halaqoh tepat di atasnya (+1) atau maksimal hingga 2-3 tingkat lebihnya (+2, +3)
  const availableHigherHalaqoh = useMemo(() => {
    if (!selectedNaikHalaqohSantri) return [];
    const currentK = Number(selectedNaikHalaqohSantri.halaqoh_kelas) || 1;
    const candidates: {
      kelas: number;
      bagian: HalaqohBagian;
      santriCount: number;
      isRekomendasi: boolean;
      targetJuz: string;
      tingkatDiff: number;
    }[] = [];

    // Filter hanya kelas yang lebih tinggi dan maksimal selisih 3 tingkat
    HALAQOH_KELAS_LIST.filter((k) => k > currentK && k <= currentK + 3).forEach((k) => {
      HALAQOH_BAGIAN_LIST.forEach((b) => {
        const count = santriOptions.filter(
          (s) => Number(s.halaqoh_kelas) === k && s.halaqoh_bagian === b
        ).length;
        candidates.push({
          kelas: k,
          bagian: b,
          santriCount: count,
          isRekomendasi: count < 5, // Kriteria rekomendasi: kurang dari 5 orang
          targetJuz: PEMETAAN_HALAQOH_KELAS[k] || "-",
          tingkatDiff: k - currentK,
        });
      });
    });

    // Urutkan: Kelas ASC (tingkat tepat di atasnya tampil paling awal), lalu rekomendasi, lalu bagian ASC
    return candidates.sort((a, b) => {
      if (a.kelas !== b.kelas) return a.kelas - b.kelas;
      if (a.isRekomendasi && !b.isRekomendasi) return -1;
      if (!a.isRekomendasi && b.isRekomendasi) return 1;
      return a.bagian.localeCompare(b.bagian);
    });
  }, [selectedNaikHalaqohSantri, santriOptions]);

  const executeConfirmNaikHalaqoh = async () => {
    if (!selectedNaikHalaqohSantri || !targetHalaqohChoice) return;

    setSubmittingNaikHalaqoh(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("santri")
        .update({
          halaqoh_kelas: targetHalaqohChoice.kelas,
          halaqoh_bagian: targetHalaqohChoice.bagian,
        })
        .eq("id", selectedNaikHalaqohSantri.santri_id);

      if (error) throw error;

      showToast(
        "success",
        `Alhamdulillah! ${selectedNaikHalaqohSantri.nama_lengkap} berhasil dipindahkan ke Halaqoh Kelas ${targetHalaqohChoice.kelas} - Bagian ${targetHalaqohChoice.bagian}.`
      );
      setConfirmWarningModalOpen(false);
      setNaikHalaqohModalOpen(false);
      setEvaluasiModalOpen(false);
      setSelectedNaikHalaqohSantri(null);
      setTargetHalaqohChoice(null);
      loadData();
    } catch (err: any) {
      showToast("error", err.message || "Gagal memperbarui halaqoh santri.");
    } finally {
      setSubmittingNaikHalaqoh(false);
    }
  };

  const handleInitiateNaikHalaqoh = () => {
    if (!selectedNaikHalaqohSantri || !targetHalaqohChoice) {
      showToast("error", "Pilih halaqoh tujuan terlebih dahulu.");
      return;
    }

    const currentK = Number(selectedNaikHalaqohSantri.halaqoh_kelas) || 1;
    const targetK = targetHalaqohChoice.kelas;
    const tingkatDiff = targetK - currentK;
    const targetMin = 3;
    const isTargetMet = selectedNaikHalaqohSantri.total_setoran >= targetMin;

    // Cek apakah ada kondisi yang memerlukan konfirmasi peringatan ulang:
    // 1. Santri belum mencapai target minimal (< 3 Juz)
    // 2. Atau memilih loncat 2 atau 3 tingkat (> 1 tingkat)
    if (!isTargetMet || tingkatDiff > 1) {
      let title = "Konfirmasi Pemindahan Halaqoh";
      let desc = "";
      let badge = "Konfirmasi Ulang";

      if (!isTargetMet && tingkatDiff > 1) {
        title = "Peringatan: Belum Target & Loncat Tingkat";
        desc = `Santri "${selectedNaikHalaqohSantri.nama_lengkap}" belum menyelesaikan target minimal hafalan di kelas saat ini (Capaian: ${selectedNaikHalaqohSantri.total_setoran} / ${targetMin} Juz) dan Anda memilih untuk meloncat ${tingkatDiff} tingkat langsung ke Kelas ${targetK} - Bagian ${targetHalaqohChoice.bagian}.\n\nApakah Anda yakin ingin tetap memproses pemindahan ini?`;
        badge = `Loncat ${tingkatDiff} Tingkat`;
      } else if (!isTargetMet) {
        title = "Konfirmasi Kenaikan Manual (Belum Target)";
        desc = `Santri "${selectedNaikHalaqohSantri.nama_lengkap}" belum menyelesaikan target minimal halaqoh di kelas saat ini (Capaian: ${selectedNaikHalaqohSantri.total_setoran} / ${targetMin} Juz).\n\nApakah Anda yakin ingin tetap menaikkan santri ini ke Kelas ${targetK} - Bagian ${targetHalaqohChoice.bagian}?`;
        badge = "Target Belum Tuntas";
      } else {
        title = "Konfirmasi: Loncat Tingkat Halaqoh";
        desc = `Santri "${selectedNaikHalaqohSantri.nama_lengkap}" akan dipindahkan meloncat ${tingkatDiff} tingkat (dari Kelas ${currentK} ke Kelas ${targetK} - Bagian ${targetHalaqohChoice.bagian}).\n\nApakah Anda yakin ingin melanjutkan?`;
        badge = `Loncat ${tingkatDiff} Tingkat`;
      }

      setWarningDialogData({
        title,
        desc,
        badge,
        isDanger: !isTargetMet,
      });
      setConfirmWarningModalOpen(true);
      return;
    }

    // Jika santri sudah tuntas target minimal dan naik tepat 1 tingkat di atasnya, langsung eksekusi
    executeConfirmNaikHalaqoh();
  };

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
    // Validasi batas akumulasi maksimal 30 Juz
    const currentSantri = rows.find((r) => r.santri_id === values.santri_id);
    const currentTotal = currentSantri?.total_setoran || 0;
    if (currentTotal + values.jumlah_juz_tambahan > 30) {
      const sisa = Math.max(0, Math.round((30 - currentTotal) * 100) / 100);
      showToast(
        "error",
        `Gagal: Akumulasi setoran maksimal adalah 30 Juz. Santri ini sudah mencapai ${currentTotal} Juz (Sisa maksimal yang dapat ditambah: ${sisa} Juz).`
      );
      return;
    }

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
      Kamar: formatKamarDisplay(r.kode_kamar, r.kamar),
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

  const monthKeys: { key: keyof SetoranBulananRow; label: string }[] = useMemo(
    () => [
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
    ],
    []
  );

  // 3 bulan terakhir untuk Mode Kartu agar ringkas dan muat dalam grid 2 kolom
  const cardMonthKeys = useMemo(() => {
    const today = new Date();
    const currentMonthNum = today.getFullYear() === tahun ? today.getMonth() + 1 : 12;
    const endMonth = Math.min(12, Math.max(3, currentMonthNum));
    return monthKeys.slice(endMonth - 3, endMonth);
  }, [tahun, monthKeys]);

  // Handle pengisian langsung nilai setoran per bulan pada tabel & kartu (otomatis simpan)
  const handleDirectMonthChange = async (
    santriId: string,
    monthNum: number,
    newVal: number,
    santriName: string
  ) => {
    const monthKey = monthKeys[monthNum - 1]?.key;
    if (!monthKey) return;

    if (newVal < 0) {
      showToast("error", "Jumlah setoran tidak boleh bernilai negatif.");
      loadData();
      return;
    }

    // Cari santri saat ini di state rows atau selectedEvaluasiSantri
    const currentSantri = rows.find((r) => r.santri_id === santriId);
    if (!currentSantri) return;

    // Hitung total 11 bulan lainnya (selain bulan yang sedang diubah)
    const otherMonthsTotal = monthKeys.reduce((sum, m) => {
      if (m.key === monthKey) return sum;
      return sum + (Number(currentSantri[m.key]) || 0);
    }, 0);

    const projectedTotal = Math.round((otherMonthsTotal + newVal) * 100) / 100;

    // KUNCI: Akumulasi setoran dalam setahun tidak boleh melebihi 30 Juz
    if (projectedTotal > 30) {
      const maxAllowed = Math.max(0, Math.round((30 - otherMonthsTotal) * 100) / 100);
      showToast(
        "error",
        `Gagal: Akumulasi setoran maksimal adalah 30 Juz (100%). Bulan ${monthKeys[monthNum - 1].label} maksimal hanya dapat diisi ${maxAllowed} Juz.`
      );
      loadData();
      return;
    }

    const safeTotal = Math.min(30, projectedTotal);

    // Optimistic update di list rows utama
    setRows((prev) =>
      prev.map((row) => {
        if (row.santri_id !== santriId) return row;
        const updatedRow = { ...row, [monthKey]: newVal };
        return { ...updatedRow, total_setoran: safeTotal };
      })
    );

    // Optimistic update di selectedEvaluasiSantri (jika modal detail sedang terbuka)
    setSelectedEvaluasiSantri((prev) => {
      if (!prev || prev.santri_id !== santriId) return prev;
      const updatedRow = { ...prev, [monthKey]: newVal };
      return { ...updatedRow, total_setoran: safeTotal };
    });

    try {
      await saveSetoranBulanDirect({
        santri_id: santriId,
        tahun,
        bulan: monthNum,
        tipe,
        jumlah_juz_tambahan: newVal,
      });
      showToast(
        "success",
        `Setoran ${santriName} bulan ${monthKeys[monthNum - 1].label} (${newVal} Juz) tersimpan.`
      );
    } catch (err) {
      console.error(err);
      showToast("error", "Gagal menyimpan setoran langsung.");
      loadData();
    }
  };

  const columns: ColumnDef<SetoranBulananRow>[] = [
    {
      id: "no",
      header: "NO",
      cell: ({ row }) => <span className="font-mono text-xs">{row.index + 1}</span>,
    },
    {
      accessorKey: "nama_lengkap",
      header: "NAMA",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => {
            setSelectedEvaluasiSantri(row.original);
            setEvaluasiModalOpen(true);
          }}
          className="text-left font-semibold text-emerald-800 hover:text-emerald-950 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300"
          title={tipe === "evaluasi" ? "Klik untuk detail Evaluasi Hafalan & Kenaikan Halaqoh" : "Klik untuk Detail Setoran Juz Baru"}
        >
          {row.original.nama_lengkap}
        </button>
      ),
    },
    {
      id: "kamar",
      header: "KAMAR",
      cell: ({ row }) => (
        <span className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300">
          {formatKamarDisplay(row.original.kode_kamar, row.original.kamar)}
        </span>
      ),
    },
    {
      id: "halaqoh",
      header: "HALAQOH",
      cell: ({ row }) => (
        <HalaqohBadge kelas={row.original.halaqoh_kelas} bagian={row.original.halaqoh_bagian} />
      ),
    },
    ...monthKeys.map((m, mIdx) => ({
      id: String(m.key),
      header: m.label,
      cell: ({ row }: { row: { original: SetoranBulananRow } }) => {
        const val = Number(row.original[m.key] ?? 0);
        return (
          <div className="flex items-center justify-center p-0">
            <input
              type="number"
              step="0.05"
              min="0"
              max="30"
              key={`${row.original.santri_id}_${String(m.key)}_${val}`}
              defaultValue={val > 0 ? val : ""}
              placeholder="-"
              onBlur={(e) => {
                const text = e.target.value.trim();
                const num = text === "" ? 0 : Number(text);
                if (num !== val) {
                  handleDirectMonthChange(
                    row.original.santri_id,
                    mIdx + 1,
                    num,
                    row.original.nama_lengkap
                  );
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="h-7 w-11 text-center font-mono text-xs font-bold bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded border border-transparent hover:border-slate-300 focus:border-emerald-500 dark:hover:bg-slate-800 dark:focus:bg-slate-900 transition"
              title={`Isi/ubah setoran ${row.original.nama_lengkap} bulan ${m.label}`}
            />
          </div>
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
    ...(tipe === "evaluasi"
      ? [
          {
            id: "status_evaluasi",
            header: "STATUS TARGET",
            cell: ({ row }: { row: { original: SetoranBulananRow } }) => {
              const isTargetMet = row.original.total_setoran >= 3;
              return (
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  {isTargetMet ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Selesai</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      Berjalan
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNaikHalaqohSantri(row.original);
                      setNaikHalaqohModalOpen(true);
                    }}
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold transition ${
                      isTargetMet
                        ? "border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                    title="Naikkan ke Halaqoh Baru"
                  >
                    <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Naik</span>
                  </button>
                </div>
              );
            },
          },
        ]
      : []),
  ];

  const handleDeleteSelected = async (selectedIds: string[]) => {
    try {
      await deleteSetoranBatch({
        santri_ids: selectedIds,
        tipe,
        tahun,
      });
      showToast(
        "success",
        `Catatan setoran untuk ${selectedIds.length} santri terpilih pada tahun ${tahun} telah berhasil dihapus.`
      );
      loadData();
    } catch (err: any) {
      showToast(
        "error",
        err.message || "Terjadi kesalahan saat menghapus data setoran."
      );
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllSetoran({
        tipe,
        tahun,
      });
      showToast(
        "success",
        `Seluruh riwayat setoran (${judul}) pada tahun ${tahun} telah berhasil dikosongkan.`
      );
      loadData();
    } catch (err: any) {
      showToast(
        "error",
        err.message || "Terjadi kesalahan saat mengosongkan data setoran."
      );
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Halaman */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{judul}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{deskripsi}</p>
      </div>

      {/* Bilah Toolbar yang Disederhanakan 1 Baris */}
      <div className="no-print flex flex-wrap sm:flex-nowrap items-center gap-2">
        {/* Switch Mode: Kartu vs Tabel */}
        <div className="inline-flex h-11 items-center rounded-xl border border-slate-300 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800 shrink-0 shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode("kartu")}
            className={`flex h-full items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition ${
              viewMode === "kartu"
                ? "bg-white text-emerald-800 shadow-sm dark:bg-slate-900 dark:text-emerald-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            <span>Kartu</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("tabel")}
            className={`flex h-full items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition ${
              viewMode === "tabel"
                ? "bg-white text-emerald-800 shadow-sm dark:bg-slate-900 dark:text-emerald-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <TableIcon className="h-4 w-4" />
            <span>Tabel</span>
          </button>
        </div>

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

      {/* Area Tampilan Setoran (Kartu Halaqoh / Tabel Utama) */}
      <div ref={printRef} className="space-y-4">
        <div className="hidden print:block mb-4">
          <h2 className="text-lg font-bold">LPTQ Pondok Pesantren Darussalam Blokagung</h2>
          <p className="text-xs">
            {judul} - Tahun {tahun}
          </p>
        </div>

        {viewMode === "kartu" ? (
          <div className="space-y-5">
            {loading ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
                <Loader2 className="h-7 w-7 animate-spin text-emerald-700" />
                <p className="text-xs text-slate-500">Memuat kartu halaqoh setoran...</p>
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30">
                <p className="text-sm font-semibold">{error}</p>
                <button
                  type="button"
                  onClick={loadData}
                  className="mt-2 inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Coba Lagi</span>
                </button>
              </div>
            ) : halaqohGroups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                Tidak ada data setoran santri yang sesuai kriteria pencarian atau filter.
              </div>
            ) : (
              (() => {
                const renderHalaqohCard = (grp: typeof paginatedHalaqohGroups[number]) => (
                  <div
                    key={`${grp.kelas}_${grp.bagian}`}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow dark:border-slate-800 dark:bg-slate-900"
                  >
                    {/* Header Kartu Halaqoh */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-800/40">
                      <div className="flex items-center gap-2">
                        <HalaqohBadge kelas={grp.kelas} bagian={grp.bagian} />
                        <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                          Target: {PEMETAAN_HALAQOH_KELAS[grp.kelas] || "-"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                          (3 Bln: {cardMonthKeys.map((m) => m.label).join(", ")})
                        </span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700 shadow-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {grp.rows.length} Santri
                        </span>
                      </div>
                    </div>

                    {/* Tabel Santri di dalam Kartu Halaqoh */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs table-auto">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/20 text-slate-600 dark:text-slate-400">
                            <th className="px-1.5 py-1.5 font-semibold w-7 text-center text-slate-400 text-[11px]">No</th>
                            <th className="px-1.5 py-1.5 font-semibold text-slate-700 dark:text-slate-300 text-[11px]">Nama Santri</th>
                            <th className="px-1 py-1.5 font-semibold text-center w-10 text-[11px]">Kamar</th>
                            {cardMonthKeys.map((m) => (
                              <th key={String(m.key)} className="px-0.5 py-1.5 text-center font-semibold w-10 text-[11px]">
                                {m.label}
                              </th>
                            ))}
                            <th className="px-1 py-1.5 font-semibold text-center w-11 text-[11px]">Total</th>
                            {tipe === "evaluasi" && (
                              <th className="no-print px-1.5 py-1.5 font-semibold text-center w-24 text-[11px]">Aksi</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {grp.rows.map((r, idx) => {
                            const isTargetMet = r.total_setoran >= 3;
                            return (
                              <tr key={r.santri_id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="px-1.5 py-1 font-mono text-slate-400 text-center text-[11px]">{idx + 1}</td>
                                <td className="px-1.5 py-1 font-semibold min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedEvaluasiSantri(r);
                                      setEvaluasiModalOpen(true);
                                    }}
                                    className="text-left font-semibold text-slate-800 hover:text-emerald-800 hover:underline dark:text-slate-100 dark:hover:text-emerald-400 truncate max-w-[110px] sm:max-w-[130px] block text-xs"
                                    title={tipe === "evaluasi" ? `Klik detail Evaluasi: ${r.nama_lengkap}` : `Klik detail Setoran: ${r.nama_lengkap}`}
                                  >
                                    {r.nama_lengkap}
                                  </button>
                                </td>
                                <td className="px-1 py-1 text-center font-mono font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                                  {formatKamarDisplay(r.kode_kamar, r.kamar)}
                                </td>
                                {cardMonthKeys.map((m) => {
                                  const val = Number(r[m.key] ?? 0);
                                  const mIdx = monthKeys.findIndex((mk) => mk.key === m.key);
                                  return (
                                    <td key={String(m.key)} className="px-0.5 py-1 text-center font-mono p-0">
                                      <input
                                        type="number"
                                        step="0.05"
                                        min="0"
                                        max="30"
                                        key={`${r.santri_id}_${String(m.key)}_${val}`}
                                        defaultValue={val > 0 ? val : ""}
                                        placeholder="-"
                                        onBlur={(e) => {
                                          const text = e.target.value.trim();
                                          const num = text === "" ? 0 : Number(text);
                                          if (num !== val) {
                                            handleDirectMonthChange(
                                              r.santri_id,
                                              mIdx + 1,
                                              num,
                                              r.nama_lengkap
                                            );
                                          }
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            (e.target as HTMLInputElement).blur();
                                          }
                                        }}
                                        className="h-6 w-9 text-center font-mono text-[11px] font-bold bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded border border-transparent hover:border-slate-300 focus:border-emerald-500 dark:hover:bg-slate-800 dark:focus:bg-slate-900 transition"
                                        title={`Isi/ubah setoran ${r.nama_lengkap} bulan ${m.label}`}
                                      />
                                    </td>
                                  );
                                })}
                                <td className="px-1 py-1 text-center font-mono font-bold text-emerald-900 dark:text-emerald-300 whitespace-nowrap text-[11px]">
                                  {r.total_setoran} <span className="text-[10px] text-emerald-600 font-normal">Jz</span>
                                </td>
                                {tipe === "evaluasi" && (
                                  <td className="no-print px-1.5 py-1 text-center">
                                    <div className="inline-flex items-center gap-1 whitespace-nowrap">
                                      {isTargetMet ? (
                                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                          <CheckCircle2 className="h-2.5 w-2.5" />
                                          <span>Selesai</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                          Proses
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedNaikHalaqohSantri(r);
                                          setNaikHalaqohModalOpen(true);
                                        }}
                                        className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold transition ${
                                          isTargetMet
                                            ? "border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                        }`}
                                        title="Naikkan ke Halaqoh Baru"
                                      >
                                        <TrendingUp className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                                        <span>Naik</span>
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );

                return (
                  <>
                    {/* Mode Desktop: Masonry 2 Kolom Independen (Merapatkan jarak vertikal antar kartu) */}
                    <div className="hidden lg:grid lg:grid-cols-2 gap-5 items-start">
                      <div className="flex flex-col gap-5">
                        {paginatedHalaqohGroups
                          .filter((_, idx) => idx % 2 === 0)
                          .map((grp) => renderHalaqohCard(grp))}
                      </div>
                      <div className="flex flex-col gap-5">
                        {paginatedHalaqohGroups
                          .filter((_, idx) => idx % 2 === 1)
                          .map((grp) => renderHalaqohCard(grp))}
                      </div>
                    </div>

                    {/* Mode Mobile / Tablet: 1 Kolom */}
                    <div className="flex flex-col gap-5 lg:hidden">
                      {paginatedHalaqohGroups.map((grp) => renderHalaqohCard(grp))}
                    </div>
                  </>
                );
              })()
            )}

            {/* Pagination untuk Kartu Halaqoh */}
            {totalHalaqohPages > 1 && (
              <div className="no-print flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Menampilkan kartu halaqoh{" "}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {(cardPage - 1) * cardPageSize + 1}
                  </strong>{" "}
                  -{" "}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {Math.min(cardPage * cardPageSize, halaqohGroups.length)}
                  </strong>{" "}
                  dari{" "}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {halaqohGroups.length}
                  </strong>{" "}
                  halaqoh
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCardPage((p) => Math.max(1, p - 1))}
                    disabled={cardPage <= 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {Array.from({ length: totalHalaqohPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCardPage(p)}
                      className={`h-8 min-w-[32px] rounded-lg px-2 text-xs font-bold transition ${
                        p === cardPage
                          ? "bg-emerald-800 text-white shadow"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                      }`}
                    >
                      {p}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setCardPage((p) => Math.min(totalHalaqohPages, p + 1))}
                    disabled={cardPage >= totalHalaqohPages}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={rows}
            loading={loading}
            error={error}
            onRetry={loadData}
            pageSize={pageSize}
            pageSizeOptions={[10, 15, 25, 50]}
            onPageSizeChange={setPageSize}
            getRowId={(row) => row.santri_id}
            onDeleteSelected={handleDeleteSelected}
            onDeleteAll={handleDeleteAll}
          />
        )}
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

      {/* ========================================================================= */}
      {/* POP-UP 3: DETAIL EVALUASI HAFALAN SANTRI (GAMBAR 4)                       */}
      {/* ========================================================================= */}
      {evaluasiModalOpen && selectedEvaluasiSantri && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-evaluasi-title"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            {/* Header Dialog */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {tipe === "evaluasi" ? <Award className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
                </div>
                <div>
                  <h2 id="modal-evaluasi-title" className="text-base font-bold text-slate-900 dark:text-white">
                    {tipe === "evaluasi" ? "Detail Evaluasi Hafalan" : "Detail Setoran Juz Baru"}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    LPTQ Pondok Pesantren Darussalam Blokagung
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEvaluasiModalOpen(false)}
                aria-label="Tutup dialog"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Biodata Santri */}
            <div className="my-4 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {selectedEvaluasiSantri.nama_lengkap}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      NIS: {selectedEvaluasiSantri.kode || "-"} • Kamar: {formatKamarDisplay(selectedEvaluasiSantri.kode_kamar, selectedEvaluasiSantri.kamar)} • {selectedEvaluasiSantri.asrama}
                    </p>
                  </div>
                  <HalaqohBadge
                    kelas={selectedEvaluasiSantri.halaqoh_kelas}
                    bagian={selectedEvaluasiSantri.halaqoh_bagian}
                    showMapping
                  />
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-200/80 pt-2.5 text-xs dark:border-slate-700/60">
                  <span className="text-slate-500">Target Halaqoh Ini:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {PEMETAAN_HALAQOH_KELAS[selectedEvaluasiSantri.halaqoh_kelas] || "-"} (Minimal 3 Juz)
                  </span>
                </div>
              </div>

              {/* Status & Progress Target */}
              {(() => {
                const targetMin = 3;
                const safeTotal = Math.min(30, selectedEvaluasiSantri.total_setoran);
                const isCompleted = safeTotal >= targetMin;
                const progressPct = Math.min(100, Math.round((safeTotal / targetMin) * 100));

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {tipe === "evaluasi" ? "Capaian Setoran Evaluasi:" : "Capaian Setoran Juz Baru:"}
                      </span>
                      <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300">
                        {safeTotal} / {targetMin} Juz ({progressPct}%)
                      </span>
                    </div>

                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isCompleted ? "bg-emerald-600" : "bg-emerald-500"
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    {isCompleted ? (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 dark:border-emerald-800/60 dark:bg-emerald-950/40">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div className="text-xs">
                            <p className="font-bold text-emerald-900 dark:text-emerald-200">
                              {tipe === "evaluasi" ? "Target Halaqoh Selesai!" : "Target Hafalan Tercapai!"}
                            </p>
                            <p className="text-emerald-700 dark:text-emerald-400">
                              {tipe === "evaluasi"
                                ? "Santri telah memenuhi target hafalan dan siap dinaikkan ke halaqoh berikutnya."
                                : `Santri telah mencapai total ${safeTotal} Juz hafalan baru.`}
                            </p>
                          </div>
                        </div>

                        {tipe === "evaluasi" && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedNaikHalaqohSantri(selectedEvaluasiSantri);
                              setNaikHalaqohModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-emerald-800 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-emerald-900 transition dark:bg-emerald-700 dark:hover:bg-emerald-800"
                          >
                            <TrendingUp className="h-4 w-4" />
                            <span>Naik Halaqoh</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-800/60 dark:bg-amber-950/30">
                        <div className="text-xs text-amber-900 dark:text-amber-200">
                          <p className="font-semibold">
                            {tipe === "evaluasi" ? "Masih dalam proses hafalan" : "Masih dalam proses setoran juz baru"}
                          </p>
                          <p className="text-[11px] text-amber-700 dark:text-amber-400">
                            Kurang {(targetMin - safeTotal).toFixed(2)} Juz untuk menyelesaikan target halaqoh ini.
                          </p>
                        </div>

                        {tipe === "evaluasi" && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedNaikHalaqohSantri(selectedEvaluasiSantri);
                              setNaikHalaqohModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 transition dark:border-amber-700 dark:bg-slate-800 dark:text-amber-300"
                            title="Buka opsi kenaikan halaqoh manual oleh penguji"
                          >
                            <TrendingUp className="h-3.5 w-3.5" />
                            <span>Naik Halaqoh Manual</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Rincian Evaluasi Bulanan (Jan - Des) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Rincian Setoran Bulanan ({tahun}):
                  </p>
                  <span className="text-[11px] text-slate-400">
                    Dapat diisi langsung & otomatis simpan
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-2 text-center text-xs">
                  {monthKeys.map((m, mIdx) => {
                    const val = Number(selectedEvaluasiSantri[m.key] ?? 0);
                    return (
                      <div
                        key={String(m.key)}
                        className={`rounded-xl p-2 border transition ${
                          val > 0
                            ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 font-bold"
                            : "border-slate-200 bg-white text-slate-400 dark:border-slate-800 dark:bg-slate-800/30"
                        }`}
                      >
                        <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">{m.label}</div>
                        <input
                          type="number"
                          step="0.05"
                          min="0"
                          max="30"
                          key={`${selectedEvaluasiSantri.santri_id}_${String(m.key)}_${val}`}
                          defaultValue={val > 0 ? val : ""}
                          placeholder="-"
                          onBlur={(e) => {
                            const text = e.target.value.trim();
                            const num = text === "" ? 0 : Number(text);
                            if (num !== val) {
                              handleDirectMonthChange(
                                selectedEvaluasiSantri.santri_id,
                                mIdx + 1,
                                num,
                                selectedEvaluasiSantri.nama_lengkap
                              );
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          className="w-full h-8 text-center font-mono text-sm font-bold bg-white/70 dark:bg-slate-900/70 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700"
                          title={`Ubah setoran bulan ${m.label}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEvaluasiModalOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POP-UP 4: MODAL NAIK HALAQOH (DENGAN REKOMENDASI < 5 SANTRI)              */}
      {/* ========================================================================= */}
      {naikHalaqohModalOpen && selectedNaikHalaqohSantri && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-naik-halaqoh-title"
        >
          <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="modal-naik-halaqoh-title" className="text-base font-bold text-slate-900 dark:text-white">
                    Naik Halaqoh Baru
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Santri: <strong className="text-slate-800 dark:text-slate-200">{selectedNaikHalaqohSantri.nama_lengkap}</strong> (Saat ini: Kelas {selectedNaikHalaqohSantri.halaqoh_kelas} - Bagian {selectedNaikHalaqohSantri.halaqoh_bagian})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNaikHalaqohModalOpen(false);
                  setTargetHalaqohChoice(null);
                }}
                aria-label="Tutup dialog naik halaqoh"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Keterangan & Kriteria Rekomendasi */}
            <div className="py-3 border-b border-slate-100 dark:border-slate-800 text-xs shrink-0 space-y-2">
              {(() => {
                const targetMin = 3;
                const safeTotal = Math.min(30, selectedNaikHalaqohSantri.total_setoran);
                const isTargetMet = safeTotal >= targetMin;

                if (!isTargetMet) {
                  return (
                    <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-200">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[11px]">Santri Belum Memenuhi Target Minimal</p>
                        <p className="text-[10px] text-amber-800 dark:text-amber-300">
                          Capaian setoran saat ini baru <strong>{safeTotal} / {targetMin} Juz</strong>. Pemindahan ke tingkat atasnya atau loncat tingkat memerlukan konfirmasi ulang.
                        </p>
                      </div>
                    </div>
                  );
                }
                return (
                  <p className="text-slate-600 dark:text-slate-300">
                    Pilih halaqoh tingkat di atasnya untuk memindahkan santri ini.
                  </p>
                );
              })()}

              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold dark:bg-emerald-950">
                  <Star className="h-3 w-3 fill-emerald-600 text-emerald-600 dark:fill-emerald-400 dark:text-emerald-400" />
                  Rekomendasi
                </span>
                <span>Halaqoh dengan jumlah anggota kurang dari 5 orang santri.</span>
              </div>
            </div>

            {/* Daftar Halaqoh di Atasnya */}
            <div className="flex-1 overflow-y-auto py-4 space-y-2.5 pr-1">
              {availableHigherHalaqoh.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500 dark:border-slate-700">
                  Santri telah berada pada jenjang halaqoh tertinggi (Kelas 10 - Khotmil 30 Juz).
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {availableHigherHalaqoh.map((item) => {
                    const isSelected =
                      targetHalaqohChoice?.kelas === item.kelas &&
                      targetHalaqohChoice?.bagian === item.bagian;

                    return (
                      <div
                        key={`${item.kelas}_${item.bagian}`}
                        onClick={() => setTargetHalaqohChoice({ kelas: item.kelas, bagian: item.bagian })}
                        className={`cursor-pointer rounded-xl border p-3 transition flex flex-col justify-between ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50/90 ring-2 ring-emerald-600 dark:border-emerald-500 dark:bg-emerald-950/60 dark:ring-emerald-500"
                            : item.isRekomendasi
                            ? "border-emerald-300 bg-emerald-50/40 hover:border-emerald-500 hover:bg-emerald-50 dark:border-emerald-800/80 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-850 dark:hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <HalaqohBadge kelas={item.kelas} bagian={item.bagian} />
                          <div className="flex items-center gap-1 flex-wrap justify-end">
                            {item.tingkatDiff === 1 ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                Tingkat Di Atasnya
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                Loncat {item.tingkatDiff} Tingkat
                              </span>
                            )}
                            {item.isRekomendasi && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                                <Star className="h-3 w-3 fill-emerald-600 text-emerald-600 dark:fill-emerald-400 dark:text-emerald-400" />
                                Rekomendasi
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-2.5 flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                            {item.targetJuz}
                          </span>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[11px] font-bold font-mono ${
                              item.isRekomendasi
                                ? "bg-emerald-200/80 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {item.santriCount} Santri
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setNaikHalaqohModalOpen(false);
                  setTargetHalaqohChoice(null);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={!targetHalaqohChoice || submittingNaikHalaqoh}
                onClick={handleInitiateNaikHalaqoh}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow transition disabled:opacity-40 disabled:cursor-not-allowed dark:bg-emerald-700 dark:hover:bg-emerald-800"
              >
                {submittingNaikHalaqoh ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Memproses Kenaikan...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>
                      {targetHalaqohChoice
                        ? `Pindahkan ke Kelas ${targetHalaqohChoice.kelas} - Bagian ${targetHalaqohChoice.bagian}`
                        : "Pilih Halaqoh Terlebih Dahulu"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POP-UP 5: MODAL KONFIRMASI PERINGATAN NAIK HALAQOH                        */}
      {/* ========================================================================= */}
      {confirmWarningModalOpen && warningDialogData && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 animate-in fade-in backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-amber-300 dark:border-amber-800 bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {warningDialogData.title}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    {warningDialogData.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                  {warningDialogData.desc}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmWarningModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submittingNaikHalaqoh}
                onClick={() => {
                  setConfirmWarningModalOpen(false);
                  executeConfirmNaikHalaqoh();
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md transition disabled:opacity-50"
              >
                {submittingNaikHalaqoh ? "Memproses..." : "Ya, Tetap Pindahkan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
