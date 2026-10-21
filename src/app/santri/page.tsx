"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  Settings,
  Phone,
  Building,
  LayoutGrid,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import {
  fetchSantriPaginated,
  fetchAllSantriFiltered,
  saveSantri,
  deleteSantriById,
  deleteSantriBatch,
  deleteAllSantri,
} from "@/lib/services/tahfidz-service";
import {
  loadHierarchyRules,
  saveHierarchyRules,
  parseHierarchyTree,
  formatKamarDisplay,
  type HierarchyRule,
  type HierarchyTree,
} from "@/lib/services/hierarchy-service";
import {
  loadHalaqohFormasi,
  getDynamicHalaqohOptions,
  type FormasiHalaqohItem,
} from "@/lib/services/halaqoh-service";
import {
  HALAQOH_BAGIAN_LIST,
  HALAQOH_KELAS_LIST,
  PEMETAAN_HALAQOH_KELAS,
  type HalaqohBagian,
  type Santri,
} from "@/types/database";
import { DataTable } from "@/components/ui/DataTable";
import { HalaqohBadge } from "@/components/ui/Badges";
import { KetikDanPilih } from "@/components/ui/KetikDanPilih";
import { DetailSantriModal } from "@/components/santri/DetailSantriModal";
import { HierarchySettingsModal } from "@/components/santri/HierarchySettingsModal";
import {
  downloadSantriTemplateExcel,
  exportJsonToExcel,
  parseExcelFileWithValidation,
} from "@/lib/utils/excel";
import { useToast } from "@/components/ui/Toast";

const santriSchema = z.object({
  kode: z.string().optional(),
  nama_lengkap: z.string().min(3, "Nama lengkap wajib diisi"),
  no_wa: z.string().optional(),
  blok: z.string().min(1, "Blok wajib diisi"),
  asrama: z.string().min(1, "Asrama wajib diisi (isi \"-\" jika belum ada)"),
  kode_kamar: z.string().optional(),
  kamar: z.string().min(1, "Kamar wajib diisi"),
  halaqoh_kelas: z.coerce.number().min(1).max(10),
  halaqoh_bagian: z.string().min(1, "Halaqoh bagian wajib dipilih"),
});

type SantriFormValues = z.infer<typeof santriSchema>;

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
  const [kodeFilter, setKodeFilter] = useState("");
  const [kamarFilter, setKamarFilter] = useState("");
  const [kelasFilter, setKelasFilter] = useState<number | "">("");
  const [bagianFilter, setBagianFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [viewMode, setViewMode] = useState<"kartu" | "tabel">("kartu");
  const [allSantriRows, setAllSantriRows] = useState<Santri[]>([]);
  const [cardPage, setCardPage] = useState(1);
  const cardPageSize = 6;

  // Status Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [hierarchyModalOpen, setHierarchyModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedSantri, setSelectedSantri] = useState<Santri | null>(null);
  const [editingSantri, setEditingSantri] = useState<Santri | null>(null);

  // Hierarki Dropdown Rules & Tree (Blok > Asrama > Kode > Kamar)
  const [hierarchyRules, setHierarchyRules] = useState<HierarchyRule[]>([]);
  const hierarchyTree: HierarchyTree = useMemo(
    () => parseHierarchyTree(hierarchyRules),
    [hierarchyRules]
  );

  // Daftar Formasi Halaqoh Dinamis (berpengaruh pada enum kelas & bagian)
  const [halaqohFormasi, setHalaqohFormasi] = useState<FormasiHalaqohItem[]>([]);
  const halaqohOptions = useMemo(
    () => getDynamicHalaqohOptions(halaqohFormasi),
    [halaqohFormasi]
  );

  // Status Impor Excel
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SantriFormValues>({
    resolver: zodResolver(santriSchema),
    defaultValues: {
      kode: "",
      nama_lengkap: "",
      no_wa: "",
      blok: "",
      asrama: "",
      kode_kamar: "",
      kamar: "",
      halaqoh_kelas: 1,
      halaqoh_bagian: "A",
    },
  });

  // Watch field hierarki form santri untuk cascading dropdown
  const watchBlok = watch("blok");
  const watchAsrama = watch("asrama");
  const watchKodeKamar = watch("kode_kamar");

  // Muat aturan hierarki & formasi halaqoh saat pertama kali dibuka
  useEffect(() => {
    async function initData() {
      const [rules, formasi] = await Promise.all([
        loadHierarchyRules(),
        loadHalaqohFormasi(),
      ]);
      setHierarchyRules(rules);
      setHalaqohFormasi(formasi);
    }
    initData();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [paginatedResult, allResult] = await Promise.all([
        fetchSantriPaginated({
          search,
          asrama: asramaFilter,
          blok: blokFilter,
          kode_kamar: kodeFilter,
          kamar: kamarFilter,
          halaqoh_kelas: kelasFilter,
          halaqoh_bagian: bagianFilter,
          page,
          pageSize,
        }),
        fetchAllSantriFiltered({
          search,
          asrama: asramaFilter,
          blok: blokFilter,
          kode_kamar: kodeFilter,
          kamar: kamarFilter,
          halaqoh_kelas: kelasFilter,
          halaqoh_bagian: bagianFilter,
        }),
      ]);
      setRows(paginatedResult.rows);
      setTotalCount(paginatedResult.total);
      setAllSantriRows(allResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data santri.");
    } finally {
      setLoading(false);
    }
  }, [search, asramaFilter, blokFilter, kodeFilter, kamarFilter, kelasFilter, bagianFilter, page, pageSize]);

  // Kelompokkan santri berdasarkan halaqoh untuk mode Tampilan Kartu
  const halaqohGroups = useMemo(() => {
    const map = new Map<string, { kelas: number; bagian: HalaqohBagian; santri: Santri[] }>();

    allSantriRows.forEach((s) => {
      const k = Number(s.halaqoh_kelas) || 1;
      const b = (s.halaqoh_bagian || "A") as HalaqohBagian;
      const key = `${k}_${b}`;
      if (!map.has(key)) {
        map.set(key, { kelas: k, bagian: b, santri: [] });
      }
      map.get(key)!.santri.push(s);
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.kelas !== b.kelas) return a.kelas - b.kelas;
      return a.bagian.localeCompare(b.bagian);
    });
  }, [allSantriRows]);

  const totalHalaqohPages = Math.max(1, Math.ceil(halaqohGroups.length / cardPageSize));
  const paginatedHalaqohGroups = useMemo(() => {
    const start = (cardPage - 1) * cardPageSize;
    return halaqohGroups.slice(start, start + cardPageSize);
  }, [halaqohGroups, cardPage, cardPageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle tombol escape untuk menutup modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (detailModalOpen) setDetailModalOpen(false);
        if (hierarchyModalOpen) setHierarchyModalOpen(false);
        if (modalOpen) setModalOpen(false);
        if (filterModalOpen) setFilterModalOpen(false);
        if (excelModalOpen) setExcelModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detailModalOpen, hierarchyModalOpen, modalOpen, filterModalOpen, excelModalOpen]);

  // Hook cetak PDF via react-to-print
  const handlePrint = useReactToPrint({
    content: () => printAreaRef.current,
    documentTitle: "Data_Santri_Tahfidz_LPTQ_Blokagung",
  });

  // Opsi unik untuk "Ketik dan Pilih" filter (gabungan dari data santri aktif dan hierarki)
  const uniqueFilterOptions = useMemo(() => {
    const bloks = new Set<string>();
    const asramas = new Set<string>();
    const kodes = new Set<string>();
    const kamars = new Set<string>();

    rows.forEach((s) => {
      if (s.blok) bloks.add(s.blok);
      if (s.asrama) asramas.add(s.asrama);
      if (s.kode_kamar) kodes.add(s.kode_kamar);
      if (s.kamar) kamars.add(s.kamar);
    });

    Object.keys(hierarchyTree).forEach((b) => {
      bloks.add(b);
      Object.keys(hierarchyTree[b] || {}).forEach((a) => {
        asramas.add(a);
        Object.keys(hierarchyTree[b][a] || {}).forEach((kd) => {
          kodes.add(kd);
          (hierarchyTree[b][a][kd] || []).forEach((km) => {
            kamars.add(km);
          });
        });
      });
    });

    return {
      bloks: Array.from(bloks).filter(Boolean).sort(),
      asramas: Array.from(asramas).filter(Boolean).sort(),
      kodes: Array.from(kodes).filter(Boolean).sort(),
      kamars: Array.from(kamars).filter(Boolean).sort(),
    };
  }, [rows, hierarchyTree]);

  // Opsi dropdown untuk Form Tambah / Edit Santri berdasarkan Cascading Hierarki
  const formOptions = useMemo(() => {
    const blokOptions = Object.keys(hierarchyTree).sort();
    const asramaOptions = watchBlok && hierarchyTree[watchBlok]
      ? Object.keys(hierarchyTree[watchBlok]).sort()
      : [];
    const kodeOptions = watchBlok && watchAsrama && hierarchyTree[watchBlok]?.[watchAsrama]
      ? Object.keys(hierarchyTree[watchBlok][watchAsrama]).sort()
      : [];
    const kamarOptions = watchBlok && watchAsrama && watchKodeKamar && hierarchyTree[watchBlok]?.[watchAsrama]?.[watchKodeKamar]
      ? hierarchyTree[watchBlok][watchAsrama][watchKodeKamar]
      : [];

    return {
      bloks: blokOptions,
      asramas: asramaOptions,
      kodes: kodeOptions,
      kamars: kamarOptions,
    };
  }, [hierarchyTree, watchBlok, watchAsrama, watchKodeKamar]);

  // Hitung jumlah filter yang sedang aktif
  const activeFilterCount = [
    asramaFilter,
    blokFilter,
    kodeFilter,
    kamarFilter,
    kelasFilter !== "" ? kelasFilter : "",
    bagianFilter,
  ].filter(Boolean).length;

  const resetAllFilters = () => {
    setAsramaFilter("");
    setBlokFilter("");
    setKodeFilter("");
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
      no_wa: "",
      blok: formOptions.bloks[0] || "Blok 1",
      asrama: "",
      kode_kamar: "",
      kamar: "",
      halaqoh_kelas: halaqohOptions.kelasList[0] || 1,
      halaqoh_bagian: halaqohOptions.bagianList[0] || "A",
    });
    setModalOpen(true);
  };

  const openEditModal = (s: Santri) => {
    setEditingSantri(s);
    reset({
      kode: s.kode,
      nama_lengkap: s.nama_lengkap,
      no_wa: s.no_wa || "",
      blok: s.blok,
      asrama: s.asrama,
      kode_kamar: s.kode_kamar || "",
      kamar: s.kamar,
      halaqoh_kelas: s.halaqoh_kelas,
      halaqoh_bagian: s.halaqoh_bagian,
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: SantriFormValues) => {
    try {
      // Kode unik dibuat otomatis di balik layar jika santri baru (tidak perlu diinput manual oleh user)
      const autoKode = editingSantri?.kode || values.kode || `S-${Date.now().toString().slice(-6)}`;

      await saveSantri(
        {
          kode: autoKode,
          nama_lengkap: values.nama_lengkap,
          no_wa: values.no_wa || null,
          blok: values.blok,
          asrama: values.asrama,
          kode_kamar: values.kode_kamar || null,
          kamar: values.kamar,
          halaqoh_kelas: values.halaqoh_kelas,
          halaqoh_bagian: values.halaqoh_bagian as HalaqohBagian,
        },
        editingSantri?.id
      );
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
    if (!window.confirm(`Hapus data santri "${s.nama_lengkap}"?`)) return;
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

  // Hapus santri terpilih (dari select checkbox)
  const handleDeleteBatch = async (selectedIds: string[]) => {
    try {
      await deleteSantriBatch(selectedIds);
      showToast("success", `Berhasil menghapus ${selectedIds.length} data santri terpilih.`);
      loadData();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Gagal menghapus santri terpilih.");
    }
  };

  // Hapus seluruh data santri (setelah konfirmasi 2 kali)
  const handleDeleteAll = async () => {
    try {
      await deleteAllSantri();
      showToast("success", "Seluruh data santri berhasil dihapus.");
      loadData();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Gagal mengosongkan data santri.");
    }
  };

  // Simpan aturan hierarki dari modal pengaturan
  const handleSaveHierarchyRules = async (newRules: HierarchyRule[]) => {
    try {
      await saveHierarchyRules(newRules);
      setHierarchyRules(newRules);
      showToast("success", "Pengaturan Hierarki Dropdown berhasil disimpan.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Gagal menyimpan hierarki.");
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
        kode_kamar: kodeFilter,
        kamar: kamarFilter,
        halaqoh_kelas: kelasFilter,
        halaqoh_bagian: bagianFilter,
      });
      const formatted = allFiltered.map((s, idx) => ({
        No: idx + 1,
        "Nama Lengkap": s.nama_lengkap,
        "Nomor WhatsApp": s.no_wa || "-",
        Blok: s.blok,
        Asrama: s.asrama,
        Kode: s.kode_kamar || "-",
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
      // Hanya Nama dan Halaqoh yang wajib; Nomor WhatsApp, Blok, Asrama, Kode, Kamar boleh kosong
      const requiredHeaders = [
        "Nama Lengkap",
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

  // Kolom Tabel (Tanpa kolom Kode Unik Santri, posisi: Asrama -> Kode -> Kamar)
  const columns: ColumnDef<Santri>[] = [
    {
      id: "no",
      header: "NO",
      cell: ({ row }) => <span className="font-mono text-xs">{(page - 1) * pageSize + row.index + 1}</span>,
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
      accessorKey: "kamar",
      header: "KAMAR",
      cell: ({ row }) => (
        <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
          {formatKamarDisplay(row.original.kode_kamar, row.original.kamar)}
        </span>
      ),
    },
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
        <div className="no-print flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
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
          Kelola biodata asrama, kamar, dan pengelompokan Halaqoh Kelas (1-10) serta Bagian.
        </p>
      </div>

      {/* Bilah Toolbar:
          [ Mode Switch (Kartu / Tabel) ] -> [ Pencarian ] -> [ Filter (Pop-up) ] -> [ Menu Excel ] -> [ Cetak PDF ] -> [ Pengaturan Hierarki ] -> [ Tambah Santri ] */}
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

        {/* 1. Pencarian */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari santri, asrama, kamar, WhatsApp..."
            aria-label="Cari nama santri"
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

        {/* 2. Tombol Filter (Pop-up Ketik dan Pilih) */}
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

        {/* 3. Tombol Excel */}
        <button
          type="button"
          onClick={() => setExcelModalOpen(true)}
          title="Menu Excel (Template, Impor, Ekspor)"
          aria-label="Menu Excel"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <FileSpreadsheet className="h-5 w-5" />
        </button>

        {/* 4. Tombol Cetak PDF */}
        <button
          type="button"
          onClick={handlePrint}
          title="Cetak / Unduh PDF"
          aria-label="Cetak / Unduh PDF"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Printer className="h-5 w-5" />
        </button>

        {/* 5. Tombol Pengaturan Hierarki (Gambar 3: Blok > Asrama > Kode > Kamar) */}
        <button
          type="button"
          onClick={() => setHierarchyModalOpen(true)}
          title="Pengaturan Hierarki Dropdown (Blok > Asrama > Kode > Kamar)"
          aria-label="Pengaturan Hierarki Dropdown"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Settings className="h-5 w-5 text-slate-700 dark:text-slate-300 hover:rotate-45 transition-transform" />
        </button>

        {/* 6. Tombol Tambah Santri */}
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

      {/* Indikator Filter Aktif */}
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
          {kodeFilter && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
              Kode: {kodeFilter}
              <button type="button" onClick={() => { setKodeFilter(""); setPage(1); }} aria-label="Hapus filter kode">
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

      {/* Area Tampilan (Kartu Halaqoh / Tabel Utama) */}
      <div ref={printAreaRef} className="space-y-4">
        <div className="hidden print:block mb-4">
          <h2 className="text-lg font-bold">LPTQ Pondok Pesantren Darussalam Blokagung</h2>
          <p className="text-xs">Daftar Santri Tahfidz</p>
        </div>

        {viewMode === "kartu" ? (
          <div className="space-y-5">
            {loading ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
                <Loader2 className="h-7 w-7 animate-spin text-emerald-700" />
                <p className="text-xs text-slate-500">Memuat kartu halaqoh santri...</p>
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
                Tidak ada data santri yang sesuai kriteria pencarian atau filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5">
                {paginatedHalaqohGroups.map((grp) => (
                  <div
                    key={`${grp.kelas}_${grp.bagian}`}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow dark:border-slate-800 dark:bg-slate-900"
                  >
                    {/* Header Kartu Halaqoh */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                      <div className="flex items-center gap-2.5">
                        <HalaqohBadge kelas={grp.kelas} bagian={grp.bagian} />
                        <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                          Target: {PEMETAAN_HALAQOH_KELAS[grp.kelas] || "-"}
                        </span>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {grp.santri.length} Santri
                      </span>
                    </div>

                    {/* Tabel Santri di dalam Kartu Halaqoh */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/20 text-slate-600 dark:text-slate-400">
                            <th className="px-4 py-2.5 font-semibold">No</th>
                            <th className="px-4 py-2.5 font-semibold">Nama Lengkap</th>
                            <th className="px-4 py-2.5 font-semibold">Nomor WhatsApp</th>
                            <th className="px-4 py-2.5 font-semibold">Asrama</th>
                            <th className="px-4 py-2.5 font-semibold">Kamar</th>
                            <th className="no-print px-4 py-2.5 font-semibold text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {grp.santri.map((s, idx) => (
                            <tr
                              key={s.id}
                              onClick={() => {
                                setSelectedSantri(s);
                                setDetailModalOpen(true);
                              }}
                              className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            >
                              <td className="px-4 py-2.5 font-mono text-slate-400">{idx + 1}</td>
                              <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                {s.nama_lengkap}
                              </td>
                              <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                                {s.no_wa ? (
                                  (() => {
                                    let clean = s.no_wa.replace(/\D/g, "");
                                    if (clean.startsWith("0")) clean = "62" + clean.slice(1);
                                    else if (!clean.startsWith("62")) clean = "62" + clean;
                                    return (
                                      <a
                                        href={`https://wa.me/${clean}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 font-mono text-xs text-emerald-700 hover:text-emerald-900 hover:underline dark:text-emerald-400"
                                        title="Kirim pesan WhatsApp"
                                      >
                                        <Phone className="h-3 w-3 shrink-0 text-emerald-600" />
                                        <span>{s.no_wa}</span>
                                      </a>
                                    );
                                  })()
                                ) : (
                                  <span className="text-slate-400 font-mono">-</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{s.asrama}</td>
                              <td className="px-4 py-2.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                                {formatKamarDisplay(s.kode_kamar, s.kamar)}
                              </td>
                              <td className="no-print px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(s)}
                                    className="inline-flex min-h-[30px] items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                                  >
                                    <Pencil className="h-3 w-3" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(s)}
                                    className="inline-flex min-h-[30px] items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    <span>Hapus</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
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
            page={page}
            pageSize={pageSize}
            pageSizeOptions={[10, 15, 25, 50]}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            totalCount={totalCount}
            onPageChange={setPage}
            onRowClick={(santri) => {
              setSelectedSantri(santri);
              setDetailModalOpen(true);
            }}
            enableSelection={true}
            onDeleteSelected={handleDeleteBatch}
            onDeleteAll={handleDeleteAll}
          />
        )}
      </div>

      {/* ========================================================================= */}
      {/* POP-UP 1: MODAL FILTER TERPADU (KETIK DAN PILIH)                          */}
      {/* ========================================================================= */}
      {filterModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-filter-title"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="modal-filter-title" className="text-base font-bold text-slate-900 dark:text-white">
                    Filter Data Santri
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ketik langsung atau klik tombol panah untuk memilih kriteria
                  </p>
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
              {/* Asrama (Ketik dan Pilih) */}
              <KetikDanPilih
                label="Asrama"
                value={asramaFilter}
                onChange={(val) => {
                  setAsramaFilter(val);
                  setPage(1);
                }}
                options={uniqueFilterOptions.asramas}
                placeholder="Ketik atau pilih Asrama (misal: Al-Falah)"
              />

              {/* Blok, Kode, dan Kamar (Ketik dan Pilih) */}
              <div className="grid grid-cols-3 gap-2.5">
                <KetikDanPilih
                  label="Blok"
                  value={blokFilter}
                  onChange={(val) => {
                    setBlokFilter(val);
                    setPage(1);
                  }}
                  options={uniqueFilterOptions.bloks}
                  placeholder="Pilih Blok"
                />

                <KetikDanPilih
                  label="Kode"
                  value={kodeFilter}
                  onChange={(val) => {
                    setKodeFilter(val);
                    setPage(1);
                  }}
                  options={uniqueFilterOptions.kodes}
                  placeholder="Pilih Kode"
                />

                <KetikDanPilih
                  label="Kamar"
                  value={kamarFilter}
                  onChange={(val) => {
                    setKamarFilter(val);
                    setPage(1);
                  }}
                  options={uniqueFilterOptions.kamars}
                  placeholder="Pilih Kamar"
                />
              </div>

              {/* Halaqoh Kelas dan Bagian (Dinamis dari Formasi) */}
              <div className="grid grid-cols-2 gap-3">
                <KetikDanPilih
                  label="Halaqoh Kelas"
                  value={kelasFilter !== "" ? `Kelas ${kelasFilter}` : ""}
                  onChange={(val) => {
                    const match = val.match(/\d+/);
                    setKelasFilter(match ? Number(match[0]) : "");
                    setPage(1);
                  }}
                  options={halaqohOptions.kelasList.map((k) => `Kelas ${k}`)}
                  placeholder="Semua Kelas (1-10)"
                />

                <KetikDanPilih
                  label="Halaqoh Bagian"
                  value={bagianFilter ? `Bagian ${bagianFilter}` : ""}
                  onChange={(val) => {
                    const match = val.replace("Bagian", "").trim();
                    setBagianFilter(match);
                    setPage(1);
                  }}
                  options={halaqohOptions.bagianList.map((b) => `Bagian ${b}`)}
                  placeholder="Semua Bagian"
                />
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in duration-200"
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

            {importing ? (
              <div className="py-8 text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-700 mx-auto" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{importProgress}</p>
                <p className="text-xs text-slate-400">Mohon jangan menutup jendela ini hingga selesai...</p>
              </div>
            ) : (
              <div className="space-y-3 py-4">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await downloadSantriTemplateExcel(hierarchyRules);
                      showToast("success", "Template Excel berhasil diunduh.");
                      setExcelModalOpen(false);
                    } catch (err: any) {
                      showToast("error", err?.message || "Gagal mengunduh template Excel.");
                    }
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
                      Unduh template .xlsx berfitur ketik & pilih (Blok, Asrama, Kode, Kamar, Halaqoh)
                    </p>
                  </div>
                </button>

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
      {/* POP-UP 3: MODAL TAMBAH / EDIT SANTRI DENGAN HIERARKI & WA                 */}
      {/* ========================================================================= */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-santri-title"
        >
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div>
                <h2 id="modal-santri-title" className="text-base font-bold text-slate-900 dark:text-white">
                  {editingSantri ? "Edit Data Santri" : "Tambah Santri Baru"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Lengkapi data biodata santri dan penempatan asrama
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setHierarchyModalOpen(true)}
                  title="Buka Pengaturan Hierarki Dropdown"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-emerald-700 transition dark:hover:bg-slate-800"
                >
                  <Settings className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  aria-label="Tutup dialog"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Bagian 1: Identitas Pokok & WhatsApp (Tanpa Input Kode Unik Santri) */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                  Identitas Pokok & Kontak
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nama Lengkap Santri
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

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nomor WhatsApp
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
                      <input
                        {...register("no_wa")}
                        type="tel"
                        placeholder="Contoh: 081234567890"
                        className="w-full h-10 rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-800 font-mono focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bagian 2: Penempatan Kamar (Hierarki: Blok > Asrama > Kode > Kamar) */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5" />
                    <span>Penempatan Kamar (Hierarki)</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Blok &gt; Asrama &gt; Kode &gt; Kamar
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* 1. Blok */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Blok
                    </label>
                    <input
                      list="blok_options_list"
                      {...register("blok")}
                      placeholder="Pilih/Ketik Blok"
                      onChange={(e) => {
                        setValue("blok", e.target.value);
                      }}
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <datalist id="blok_options_list">
                      {formOptions.bloks.map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                    {errors.blok && (
                      <p className="mt-1 text-[10px] text-rose-600 dark:text-rose-400">
                        {errors.blok.message}
                      </p>
                    )}
                  </div>

                  {/* 2. Asrama */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Asrama
                    </label>
                    <input
                      list="asrama_options_list"
                      {...register("asrama")}
                      placeholder="Pilih/Ketik Asrama"
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <datalist id="asrama_options_list">
                      {formOptions.asramas.map((a) => (
                        <option key={a} value={a} />
                      ))}
                    </datalist>
                    {errors.asrama && (
                      <p className="mt-1 text-[10px] text-rose-600 dark:text-rose-400">
                        {errors.asrama.message}
                      </p>
                    )}
                  </div>

                  {/* 3. Kode (Antara Asrama dan Kamar) */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Kode
                    </label>
                    <input
                      list="kode_options_list"
                      {...register("kode_kamar")}
                      placeholder="Kode (misal: E)"
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <datalist id="kode_options_list">
                      {formOptions.kodes.map((k) => (
                        <option key={k} value={k} />
                      ))}
                    </datalist>
                  </div>

                  {/* 4. Kamar */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Kamar
                    </label>
                    <input
                      list="kamar_options_list"
                      {...register("kamar")}
                      placeholder="Kamar (misal: 01)"
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <datalist id="kamar_options_list">
                      {formOptions.kamars.map((km) => (
                        <option key={km} value={km} />
                      ))}
                    </datalist>
                    {errors.kamar && (
                      <p className="mt-1 text-[10px] text-rose-600 dark:text-rose-400">
                        {errors.kamar.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bagian 3: Halaqoh & Pembinaan Tahfidz (Dinamis dari Formasi Halaqoh Gambar 5) */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                  Pengelompokan Halaqoh
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Halaqoh Kelas (1-10)
                    </label>
                    <select
                      {...register("halaqoh_kelas")}
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      {halaqohOptions.kelasList.map((k) => (
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
                      {...register("halaqoh_bagian")}
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      {halaqohOptions.bagianList.map((b) => (
                        <option key={b} value={b}>
                          Bagian {b}
                        </option>
                      ))}
                    </select>
                  </div>
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

      {/* ========================================================================= */}
      {/* POP-UP 4: MODAL DETAIL DATA SANTRI (KLIK BARIS)                           */}
      {/* ========================================================================= */}
      <DetailSantriModal
        santri={selectedSantri}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedSantri(null);
        }}
        onEdit={(s) => {
          setDetailModalOpen(false);
          openEditModal(s);
        }}
        onDelete={(s) => handleDelete(s)}
      />

      {/* ========================================================================= */}
      {/* POP-UP 5: MODAL PENGATURAN HIERARKI DROPDOWN (GAMBAR 3)                   */}
      {/* ========================================================================= */}
      <HierarchySettingsModal
        isOpen={hierarchyModalOpen}
        onClose={() => setHierarchyModalOpen(false)}
        rules={hierarchyRules}
        onSave={handleSaveHierarchyRules}
      />
    </div>
  );
}
