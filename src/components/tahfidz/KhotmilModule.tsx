"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  Printer,
  SlidersHorizontal,
  X,
  Search,
  RotateCcw,
  Check,
  Download,
  Upload,
  FileDown,
  Loader2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Trash2,
  Calendar,
  BookOpen,
  Clock,
  CheckSquare,
  Square,
  Eye,
  Info,
  Award,
  Camera,
  FileText,
} from "lucide-react";
import { KhotmilLjkPrintModal } from "@/components/tahfidz/KhotmilLjkPrintModal";
import { KhotmilCameraScannerModal } from "@/components/tahfidz/KhotmilCameraScannerModal";
import { useReactToPrint } from "react-to-print";
import {
  fetchAllSantriFiltered,
  fetchKhotmilTahapNilai,
  upsertKhotmilNilaiBatch,
  fetchSantriAbsensiDetail,
  fetchPembimbingMap,
  fetchKhotmilRegisteredSantriIds,
  fetchSantriSetoranDetailTahun,
} from "@/lib/services/tahfidz-service";
import {
  KKM_DEFAULT,
  type JenisKhotmil,
  type Santri,
  type TahapConfig,
} from "@/types/database";
import { HalaqohBadge } from "@/components/ui/Badges";
import {
  downloadKhotmilTemplateExcel,
  exportJsonToExcel,
  parseExcelFileWithValidation,
} from "@/lib/utils/excel";
import { useToast } from "@/components/ui/Toast";

export interface KhotmilModuleProps {
  jenis: JenisKhotmil;
  judul: string;
  tahapList: TahapConfig[];
}

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

// Memotong array menjadi batch @100 baris agar aman dari batas 10s serverless Vercel
function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
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

export function KhotmilModule({ jenis, judul, tahapList }: KhotmilModuleProps) {
  const { showToast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const excelFileInputRef = useRef<HTMLInputElement>(null);

  const [activeTahap, setActiveTahap] = useState<number>(tahapList[0]?.tahap ?? 1);
  const [search, setSearch] = useState("");
  const [asramaFilter, setAsramaFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const pageSizeOptions = [10, 15, 25, 50];

  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [ljkPrintModalOpen, setLjkPrintModalOpen] = useState(false);
  const [cameraScannerModalOpen, setCameraScannerModalOpen] = useState(false);

  // Status Impor Excel
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState("");

  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [nilaiMap, setNilaiMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State Modal Pendaftaran Khotmil
  const [daftarModalOpen, setDaftarModalOpen] = useState(false);
  const [allSantriData, setAllSantriData] = useState<Santri[]>([]);
  const [pembimbingMap, setPembimbingMap] = useState<Record<string, string>>({});
  const [loadingDaftarList, setLoadingDaftarList] = useState(false);
  const [daftarSearch, setDaftarSearch] = useState("");
  const [selectedSantriIds, setSelectedSantriIds] = useState<Set<string>>(new Set());
  const [previewSantri, setPreviewSantri] = useState<Santri | null>(null);
  const [previewTab, setPreviewTab] = useState<"kegiatan" | "juz_baru">("kegiatan");
  const [previewAbsensi, setPreviewAbsensi] = useState<any[]>([]);
  const [previewSetoran, setPreviewSetoran] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const totalRows = santriList.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const paginatedSantri = useMemo(() => {
    const start = (page - 1) * pageSize;
    return santriList.slice(start, start + pageSize);
  }, [santriList, page, pageSize]);

  // Santri yang sedang dinilai di modal
  const [editingSantri, setEditingSantri] = useState<Santri | null>(null);
  const [formScores, setFormScores] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  const currentTahapCfg =
    tahapList.find((t) => t.tahap === activeTahap) ?? tahapList[0];

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [allSantri, nilaiData, scoredSantriIds] = await Promise.all([
        fetchAllSantriFiltered({ search, asrama: asramaFilter }),
        fetchKhotmilTahapNilai(jenis, activeTahap),
        fetchKhotmilRegisteredSantriIds(jenis),
      ]);

      // Ambil daftar santri terdaftar dari localStorage
      let localRegistered: string[] = [];
      try {
        const stored = localStorage.getItem(`lptq_registered_khotmil_${jenis}`);
        if (stored) {
          localRegistered = JSON.parse(stored);
        }
      } catch (e) {
        console.error("Gagal membaca local storage khotmil:", e);
      }

      const registeredSet = new Set([...localRegistered, ...scoredSantriIds]);

      // Filter santri: HANYA yang sudah terdaftar yang tampil di tabel
      const filteredRegisteredSantri = allSantri.filter((s) => registeredSet.has(s.id));

      const map: Record<string, number> = {};
      nilaiData.forEach((n) => {
        map[`${n.santri_id}_${n.juz}`] = n.nilai;
      });

      setSantriList(filteredRegisteredSantri);
      setNilaiMap(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat nilai khotmil.");
    } finally {
      setLoading(false);
    }
  }, [jenis, activeTahap, search, asramaFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Buka modal pendaftaran santri khotmil
  const handleOpenDaftarModal = async () => {
    setDaftarModalOpen(true);
    setLoadingDaftarList(true);
    setDaftarSearch("");
    try {
      const [santriData, pMap] = await Promise.all([
        fetchAllSantriFiltered({}),
        fetchPembimbingMap(),
      ]);
      setAllSantriData(santriData);
      setPembimbingMap(pMap);
      setSelectedSantriIds(new Set());
      if (santriData.length > 0) {
        setPreviewSantri(santriData[0]);
      }
    } catch (err) {
      showToast("error", "Gagal memuat daftar santri untuk pendaftaran.");
    } finally {
      setLoadingDaftarList(false);
    }
  };

  // Muat riwayat santri (Kegiatan & Juz Baru) saat previewSantri berubah
  useEffect(() => {
    if (!previewSantri) {
      setPreviewAbsensi([]);
      setPreviewSetoran([]);
      return;
    }
    let active = true;
    setPreviewLoading(true);
    const yr = new Date().getFullYear();
    Promise.all([
      fetchSantriAbsensiDetail(previewSantri.id, yr),
      fetchSantriSetoranDetailTahun(previewSantri.id, yr, "juz_baru"),
    ])
      .then(([abs, seto]) => {
        if (active) {
          setPreviewAbsensi(abs);
          setPreviewSetoran(seto);
        }
      })
      .catch((err) => {
        console.error("Gagal memuat riwayat preview santri:", err);
      })
      .finally(() => {
        if (active) setPreviewLoading(false);
      });

    return () => {
      active = false;
    };
  }, [previewSantri]);

  // Filter santri di modal pendaftaran
  const filteredSantriForDaftar = useMemo(() => {
    if (!daftarSearch.trim()) return allSantriData;
    const q = daftarSearch.toLowerCase();
    return allSantriData.filter((s) => {
      const pNama = pembimbingMap[`${s.halaqoh_kelas}_${s.halaqoh_bagian}`]?.toLowerCase() || "";
      const kDisplay = formatKamarDisplay(s.kode_kamar, s.kamar).toLowerCase();
      const hDisplay = `kelas ${s.halaqoh_kelas} bagian ${s.halaqoh_bagian} ${s.halaqoh}`.toLowerCase();
      return (
        s.nama_lengkap.toLowerCase().includes(q) ||
        (s.kode && s.kode.toLowerCase().includes(q)) ||
        hDisplay.includes(q) ||
        pNama.includes(q) ||
        kDisplay.includes(q)
      );
    });
  }, [allSantriData, daftarSearch, pembimbingMap]);

  // Toggle pilihan 1 santri
  const toggleSantriSelection = (id: string) => {
    setSelectedSantriIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle pilih semua santri yang tampil
  const toggleSelectAllDaftar = () => {
    if (selectedSantriIds.size === filteredSantriForDaftar.length && filteredSantriForDaftar.length > 0) {
      setSelectedSantriIds(new Set());
    } else {
      setSelectedSantriIds(new Set(filteredSantriForDaftar.map((s) => s.id)));
    }
  };

  // Simpan pendaftaran santri ke Khotmil
  const handleConfirmDaftar = () => {
    if (selectedSantriIds.size === 0) {
      showToast("error", "Pilih minimal 1 santri untuk didaftarkan.");
      return;
    }

    try {
      let currentReg: string[] = [];
      const stored = localStorage.getItem(`lptq_registered_khotmil_${jenis}`);
      if (stored) currentReg = JSON.parse(stored);

      const merged = Array.from(new Set([...currentReg, ...Array.from(selectedSantriIds)]));
      localStorage.setItem(`lptq_registered_khotmil_${jenis}`, JSON.stringify(merged));

      showToast("success", `Alhamdulillah! ${selectedSantriIds.size} santri berhasil didaftarkan ke ${judul}.`);
      setDaftarModalOpen(false);
      setSelectedSantriIds(new Set());
      loadData();
    } catch (e: any) {
      showToast("error", "Gagal menyimpan pendaftaran santri: " + e.message);
    }
  };

  // Keluarkan santri dari daftar Khotmil
  const handleUnregisterSantri = (santriId: string, namaSantri: string) => {
    if (!confirm(`Apakah Anda yakin ingin mengeluarkan ${namaSantri} dari daftar ${judul}?`)) {
      return;
    }

    try {
      let currentReg: string[] = [];
      const stored = localStorage.getItem(`lptq_registered_khotmil_${jenis}`);
      if (stored) currentReg = JSON.parse(stored);

      const filtered = currentReg.filter((id) => id !== santriId);
      localStorage.setItem(`lptq_registered_khotmil_${jenis}`, JSON.stringify(filtered));

      showToast("success", `${namaSantri} telah dihapus dari daftar ${judul}.`);
      loadData();
    } catch (e: any) {
      showToast("error", "Gagal memperbarui pendaftaran: " + e.message);
    }
  };

  // Langsung simpan nilai juz dari input tabel (Issue #5)
  const handleDirectScoreChange = async (
    santriId: string,
    juz: number,
    nilai: number,
    namaSantri: string
  ) => {
    // Update state nilaiMap secara optimis agar rata-rata & status KKM langsung terhitung
    setNilaiMap((prev) => ({
      ...prev,
      [`${santriId}_${juz}`]: nilai,
    }));

    try {
      await upsertKhotmilNilaiBatch(santriId, jenis, activeTahap, [{ juz, nilai }]);
      showToast("success", `Nilai Juz ${juz} (${namaSantri}): ${nilai} berhasil disimpan.`);
    } catch (err: any) {
      showToast("error", "Gagal menyimpan nilai: " + (err.message || "Terjadi kesalahan"));
      loadData();
    }
  };

  // Handle tombol escape untuk modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingSantri) setEditingSantri(null);
        if (filterModalOpen) setFilterModalOpen(false);
        if (excelModalOpen) setExcelModalOpen(false);
        if (daftarModalOpen) setDaftarModalOpen(false);
        if (ljkPrintModalOpen) setLjkPrintModalOpen(false);
        if (cameraScannerModalOpen) setCameraScannerModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editingSantri, filterModalOpen, excelModalOpen, daftarModalOpen, ljkPrintModalOpen, cameraScannerModalOpen]);

  // Hook cetak PDF via react-to-print
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `${jenis}_Tahap_${activeTahap}`,
  });

  const activeFilterCount = asramaFilter ? 1 : 0;

  const resetAllFilters = () => {
    setAsramaFilter("");
    setPage(1);
    showToast("success", "Filter asrama telah direset.");
  };

  // Menghitung rata-rata dan kelulusan KKM per santri
  const computeRowSummary = (santriId: string) => {
    const scores: number[] = [];
    for (const j of currentTahapCfg.juzList) {
      const val = nilaiMap[`${santriId}_${j}`];
      if (typeof val === "number") scores.push(val);
    }
    const lengkap = scores.length === currentTahapCfg.juzList.length;
    const rataRata =
      scores.length > 0
        ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
        : null;
    const lulus = lengkap && rataRata !== null && rataRata >= KKM_DEFAULT;
    return { rataRata, lengkap, lulus };
  };

  let totalTuntas = 0;
  let totalBelum = 0;
  santriList.forEach((s) => {
    const sum = computeRowSummary(s.id);
    if (sum.lulus) totalTuntas += 1;
    else totalBelum += 1;
  });

  const openScoreModal = (santri: Santri) => {
    const initial: Record<number, string> = {};
    currentTahapCfg.juzList.forEach((j) => {
      const existing = nilaiMap[`${santri.id}_${j}`];
      initial[j] = typeof existing === "number" ? String(existing) : "";
    });
    setFormScores(initial);
    setEditingSantri(santri);
  };

  const handleSaveScores = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSantri) return;

    const payload: { juz: number; nilai: number }[] = [];
    for (const j of currentTahapCfg.juzList) {
      const raw = formScores[j];
      if (raw !== undefined && raw.trim() !== "") {
        const num = Number(raw);
        if (Number.isNaN(num) || num < 0 || num > 100) {
          showToast("error", `Nilai Juz ${j} harus berupa angka antara 0 hingga 100.`);
          return;
        }
        payload.push({ juz: j, nilai: Math.round(num) });
      }
    }

    if (payload.length === 0) {
      showToast("error", "Isi minimal satu nilai juz sebelum menyimpan.");
      return;
    }

    setSaving(true);
    try {
      await upsertKhotmilNilaiBatch(editingSantri.id, jenis, activeTahap, payload);
      showToast(
        "success",
        `Nilai ${editingSantri.nama_lengkap} (${currentTahapCfg.label}) berhasil disimpan.`
      );
      setEditingSantri(null);
      loadData();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Gagal menyimpan nilai.");
    } finally {
      setSaving(false);
    }
  };

  const handleExportExcel = () => {
    setExcelModalOpen(false);
    const exportRows = santriList.map((s, idx) => {
      const summary = computeRowSummary(s.id);
      const obj: Record<string, string | number> = {
        No: idx + 1,
        Kode: s.kode,
        "Nama Lengkap": s.nama_lengkap,
        Asrama: s.asrama,
        Halaqoh: s.halaqoh,
      };
      currentTahapCfg.juzList.forEach((j) => {
        const v = nilaiMap[`${s.id}_${j}`];
        obj[`Juz_${j}`] = typeof v === "number" ? v : "-";
      });
      obj["Rata-rata"] = summary.rataRata ?? "-";
      obj["Status KKM (85)"] = summary.lulus ? "Tuntas / Lulus" : "Belum Tuntas";
      return obj;
    });

    exportJsonToExcel(
      exportRows,
      `${jenis.toUpperCase()}_Tahap_${activeTahap}`,
      `Tahap_${activeTahap}`
    );
    showToast("success", "Tabel nilai Khotmil berhasil diekspor ke Excel.");
  };

  // Impor Nilai Khotmil Excel
  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportProgress("Memvalidasi berkas nilai...");

    try {
      const requiredHeaders = ["Kode", "Jenis", "Tahap", "Juz", "Nilai"];
      const parsedRows = await parseExcelFileWithValidation(file, requiredHeaders);
      const chunks = chunkArray(parsedRows, 100);
      let importedCount = 0;

      for (let idx = 0; idx < chunks.length; idx++) {
        setImportProgress(`Mengunggah baris ${idx * 100 + 1} s.d ${Math.min((idx + 1) * 100, parsedRows.length)}...`);
        const res = await fetch("/api/import/khotmil", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: chunks[idx] }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Gagal mengimpor nilai ke server.");
        }
        importedCount += json.count ?? chunks[idx].length;
      }

      showToast("success", `Berhasil mengimpor ${importedCount} data nilai Khotmil.`);
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

  return (
    <div className="space-y-5">
      {/* Input File Tersembunyi untuk Impor Nilai Excel */}
      <input
        ref={excelFileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleImportFileChange}
        className="hidden"
      />

      {/* Header Halaman */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{judul}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Standar KKM: 85. Santri dinyatakan Tuntas/Lulus apabila seluruh juz dalam tahap telah
          dinilai dan rata-rata minimal 85.
        </p>
      </div>

      {/* Tab Pilihan Tahap */}
      <div
        className="no-print flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800"
        role="tablist"
        aria-label="Daftar Tahap Khotmil"
      >
        {tahapList.map((t) => {
          const active = t.tahap === activeTahap;
          return (
            <button
              key={t.tahap}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setActiveTahap(t.tahap);
                setPage(1);
              }}
              className={`h-10 rounded-xl px-4 text-xs font-bold transition shadow-sm ${
                active
                  ? "bg-emerald-800 text-white shadow"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {t.label} ({t.rentangLabel})
            </button>
          );
        })}
      </div>

      {/* Bilah Toolbar yang Disederhanakan 1 Baris */}
      <div className="no-print flex flex-wrap sm:flex-nowrap items-center gap-2">
        {/* Tombol Scan LJK Kamera (Client-Side OMR) */}
        <button
          type="button"
          onClick={() => setCameraScannerModalOpen(true)}
          title="Scan Lembar LJK via Kamera Browser (Client-Side OMR)"
          aria-label="Scan Lembar LJK via Kamera Browser"
          className="flex h-11 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shrink-0"
        >
          <Camera className="h-4 w-4" />
          <span className="hidden sm:inline">Scan LJK</span>
          <span className="sm:hidden">Scan</span>
        </button>

        {/* Tombol Daftar Khotmil (Issue #4) */}
        <button
          type="button"
          onClick={handleOpenDaftarModal}
          title="Daftar Santri Khotmil"
          aria-label="Daftar Santri Khotmil"
          className="flex h-11 items-center gap-1.5 rounded-xl bg-emerald-800 px-3.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shrink-0 dark:bg-emerald-700 dark:hover:bg-emerald-800"
        >
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Daftar Khotmil</span>
          <span className="sm:hidden">Daftar</span>
        </button>

        {/* Tombol Pintasan ke Rekap Khotmil */}
        <Link
          href={`/tahfidz/khotmil/rekap/${jenis === "khotmil15" ? "15" : "30"}`}
          title="Buka Rekapitulasi Khotmil (Semua Tahap, Nilai 100, Nilai Di Bawah KKM)"
          className="flex h-11 items-center gap-1.5 rounded-xl border border-emerald-800/20 bg-emerald-50 px-3.5 text-xs font-bold text-emerald-900 shadow-sm transition hover:bg-emerald-100 hover:border-emerald-800/40 shrink-0 dark:border-emerald-700/50 dark:bg-emerald-950 dark:text-emerald-200"
        >
          <Award className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          <span className="hidden sm:inline">Rekap Khotmil</span>
        </Link>

        {/* Kolom Pencarian Santri */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari nama atau kode santri..."
            aria-label="Cari santri"
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

        {/* Tombol Filter (Pop-up Pilihan Filter) */}
        <button
          type="button"
          onClick={() => setFilterModalOpen(true)}
          title={activeFilterCount > 0 ? "Filter aktif (Asrama)" : "Filter Asrama"}
          aria-label="Filter Asrama"
          className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm transition focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
            activeFilterCount > 0
              ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-emerald-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          }`}
        >
          <SlidersHorizontal className="h-5 w-5" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white shadow">
              1
            </span>
          )}
        </button>

        {/* Tombol Excel (Pop-up Pilihan Template, Impor Nilai, Ekspor) */}
        <button
          type="button"
          onClick={() => setExcelModalOpen(true)}
          title="Menu Excel Nilai Khotmil"
          aria-label="Menu Excel Nilai Khotmil"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <FileSpreadsheet className="h-5 w-5" />
        </button>

        {/* Tombol Cetak / Unduh PDF (Hanya Logo) */}
        <button
          type="button"
          onClick={handlePrint}
          title="Cetak Tabel / Unduh PDF"
          aria-label="Cetak Tabel / Unduh PDF"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Printer className="h-5 w-5" />
        </button>

        {/* Tombol Cetak Lembar LJK OMR Standar */}
        <button
          type="button"
          onClick={() => setLjkPrintModalOpen(true)}
          title="Cetak Lembar LJK OMR Standar (PDF Siap Print)"
          aria-label="Cetak Lembar LJK OMR Standar"
          className="flex h-11 items-center gap-1.5 rounded-xl border border-emerald-700/40 bg-emerald-50 px-3 text-xs font-bold text-emerald-900 shadow-sm transition hover:bg-emerald-100 hover:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shrink-0 dark:border-emerald-600/50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
        >
          <FileText className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          <span className="hidden sm:inline">Cetak LJK</span>
        </button>

        {/* Indikator Ringkas Tuntas & Belum Tuntas */}
        <div className="flex items-center gap-1.5 shrink-0 pl-1">
          <span className="inline-flex items-center rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
            Tuntas: {totalTuntas}
          </span>
          <span className="inline-flex items-center rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900">
            Belum: {totalBelum}
          </span>
        </div>
      </div>

      {/* Indikator Filter Aktif */}
      {activeFilterCount > 0 && (
        <div className="no-print flex items-center gap-2 pt-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Filter Aktif:</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
            Asrama: {asramaFilter}
            <button type="button" onClick={() => setAsramaFilter("")} aria-label="Hapus filter asrama">
              <X className="h-3 w-3 hover:text-rose-600" />
            </button>
          </span>
          <button
            type="button"
            onClick={resetAllFilters}
            className="text-xs font-semibold text-rose-600 hover:underline dark:text-rose-400"
          >
            Reset
          </button>
        </div>
      )}

      {/* Tabel Nilai Khotmil */}
      <div ref={printRef} className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-3 mb-3 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800 dark:text-slate-100">
              {judul} - {currentTahapCfg.label} ({currentTahapCfg.rentangLabel})
            </h2>
            <p className="text-xs text-slate-500">
              Menampilkan {santriList.length} santri
            </p>
          </div>

          <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            KKM Lulus: <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">85</span>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">Memuat data nilai...</div>
        ) : error ? (
          <div className="py-12 text-center text-sm text-rose-600">{error}</div>
        ) : santriList.length === 0 ? (
          <div className="py-14 px-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 mb-3.5 shadow-xs border border-emerald-100 dark:border-emerald-900/50">
              <UserPlus className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Belum Ada Santri Terdaftar di {judul}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-5">
              Tabel ini hanya menampilkan santri yang sudah terdaftar. Silakan klik tombol di bawah untuk memilih dan mendaftarkan santri dari database.
            </p>
            <button
              type="button"
              onClick={handleOpenDaftarModal}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-900 transition dark:bg-emerald-700 dark:hover:bg-emerald-800"
            >
              <UserPlus className="h-4 w-4" />
              <span>Daftar Khotmil Sekarang</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                  <th className="px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-300 w-10">No</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Nama Santri</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Asrama</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-300 text-center">Halaqoh</th>
                  {currentTahapCfg.juzList.map((j) => (
                    <th key={j} className="px-2 py-2.5 font-semibold text-center font-mono w-14">
                      Juz {j}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 font-semibold text-center font-mono">Rata-rata</th>
                  <th className="px-3 py-2.5 font-semibold text-center">Status KKM</th>
                  <th className="no-print px-3 py-2.5 font-semibold text-center w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {paginatedSantri.map((s, idx) => {
                  const summary = computeRowSummary(s.id);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2 font-mono text-slate-500">{(page - 1) * pageSize + idx + 1}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                        {s.nama_lengkap}
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-normal font-mono text-slate-400">{s.kode}</span>
                          <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                            {formatKamarDisplay(s.kode_kamar, s.kamar)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{s.asrama}</td>
                      <td className="px-3 py-2 text-center">
                        <HalaqohBadge kelas={s.halaqoh_kelas} bagian={s.halaqoh_bagian} />
                      </td>
                      {currentTahapCfg.juzList.map((j) => {
                        const n = nilaiMap[`${s.id}_${j}`];
                        return (
                          <td key={j} className="px-1 py-1 text-center font-mono p-0">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              key={`${s.id}_${j}_${typeof n === "number" ? n : ""}`}
                              defaultValue={typeof n === "number" ? n : ""}
                              placeholder="-"
                              onBlur={(e) => {
                                const text = e.target.value.trim();
                                if (text === "") return;
                                const num = Number(text);
                                if (!Number.isNaN(num) && num >= 0 && num <= 100 && num !== n) {
                                  handleDirectScoreChange(s.id, j, Math.round(num), s.nama_lengkap);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              className="h-8 w-12 text-center font-mono text-xs font-bold bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded border border-transparent hover:border-slate-300 focus:border-emerald-500 dark:hover:bg-slate-800 dark:focus:bg-slate-900 transition"
                              title={`Ubah nilai Juz ${j} ${s.nama_lengkap} (0-100)`}
                            />
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-center font-mono font-bold">
                        {summary.rataRata !== null ? summary.rataRata : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        {summary.lulus ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Tuntas / Lulus
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-medium text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            {summary.lengkap ? "Belum Tuntas" : "Nilai Belum Lengkap"}
                          </span>
                        )}
                      </td>
                      <td className="no-print px-3 py-2 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openScoreModal(s)}
                            className="inline-flex min-h-[30px] items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            title="Input / Edit Lengkap"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUnregisterSantri(s.id, s.nama_lengkap)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 transition dark:border-slate-800 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                            title={`Keluarkan ${s.nama_lengkap} dari daftar`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls Khotmil */}
            <div className="no-print mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span>Tampilkan:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 shadow-sm transition focus:border-emerald-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {pageSizeOptions.map((sz) => (
                      <option key={sz} value={sz}>
                        {sz} baris
                      </option>
                    ))}
                  </select>
                </div>

                <span>
                  Menampilkan{" "}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {totalRows > 0 ? (page - 1) * pageSize + 1 : 0}
                  </strong>{" "}
                  -{" "}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {Math.min(page * pageSize, totalRows)}
                  </strong>{" "}
                  dari{" "}
                  <strong className="text-slate-800 dark:text-slate-200">{totalRows}</strong> santri
                </span>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    title="Halaman Sebelumnya"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {getPageNumbers(page, totalPages).map((p, idx) =>
                    p === "..." ? (
                      <span key={`dots-${idx}`} className="px-2 text-xs text-slate-400">
                        ...
                      </span>
                    ) : (
                      <button
                        key={`page-${p}`}
                        type="button"
                        onClick={() => setPage(p as number)}
                        className={`h-8 min-w-[32px] rounded-lg px-2 text-xs font-bold transition ${
                          p === page
                            ? "bg-emerald-800 text-white shadow"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    title="Halaman Berikutnya"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* POP-UP 1: MODAL FILTER ASRAMA */}
      {filterModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-filter-khotmil-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="modal-filter-khotmil-title" className="text-base font-bold text-slate-900 dark:text-white">
                    Filter Asrama
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Saring daftar santri berdasarkan asrama</p>
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

            <div className="space-y-3 py-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nama Asrama
              </label>
              <input
                type="text"
                value={asramaFilter}
                onChange={(e) => setAsramaFilter(e.target.value)}
                placeholder="Contoh: Al-Falah"
                className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition dark:text-rose-400 dark:hover:bg-rose-950/40"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
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

      {/* POP-UP 2: MODAL MENU EXCEL (TEMPLATE, IMPOR NILAI, EKSPOR) */}
      {excelModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-excel-khotmil-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="modal-excel-khotmil-title" className="text-base font-bold text-slate-900 dark:text-white">
                    Menu Excel Khotmil
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Pilih tindakan berkas spreadsheet nilai Khotmil</p>
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
                {/* Pilihan 1: Template Excel */}
                <button
                  type="button"
                  onClick={() => {
                    downloadKhotmilTemplateExcel();
                    showToast("success", "Template nilai Khotmil berhasil diunduh.");
                    setExcelModalOpen(false);
                  }}
                  className="w-full flex items-center gap-3.5 p-3 rounded-xl border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/50 transition text-left group dark:border-slate-800 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/20"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-emerald-100 group-hover:text-emerald-800 transition dark:bg-slate-800 dark:text-slate-300">
                    <Download className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800 group-hover:text-emerald-900 dark:text-slate-200 dark:group-hover:text-emerald-300">
                      Template Excel Nilai
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Unduh format template kosong nilai Khotmil untuk impor massal
                    </p>
                  </div>
                </button>

                {/* Pilihan 2: Impor Nilai Excel */}
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
                      Impor Nilai Excel / CSV
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Unggah berkas nilai untuk memperbarui database secara massal
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
                      Ekspor Tabel Nilai ke Excel
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Unduh tabel nilai tahap ini (lengkap rata-rata dan status) ke .xlsx
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* POP-UP 3: MODAL INPUT / EDIT NILAI KHOTMIL */}
      {editingSantri && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-nilai-khotmil-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div>
                <h2 id="modal-nilai-khotmil-title" className="text-base font-bold text-slate-900 dark:text-white">
                  Input Nilai Khotmil
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {editingSantri.nama_lengkap} ({editingSantri.kode})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSantri(null)}
                aria-label="Tutup dialog"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveScores} className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 text-xs flex justify-between">
                <span>Tahap: <strong>{currentTahapCfg.label}</strong></span>
                <span>Rentang: <strong>{currentTahapCfg.rentangLabel}</strong></span>
              </div>

              <div className="grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto px-1">
                {currentTahapCfg.juzList.map((juz) => (
                  <div key={juz}>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nilai Juz {juz} (0-100)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formScores[juz] !== undefined ? formScores[juz] : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormScores((prev) => ({ ...prev, [juz]: val }));
                      }}
                      placeholder="85"
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-mono font-bold text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingSantri(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 shadow transition dark:bg-emerald-700 dark:hover:bg-emerald-800"
                >
                  {saving ? "Menyimpan..." : "Simpan Nilai"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POP-UP 4: MODAL PENDAFTARAN KHOTMIL DENGAN DRAWER RIWAYAT SANTRI (KEGIATAN & JUZ BARU) */}
      {daftarModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-daftar-khotmil-title"
        >
          <div className="flex flex-col w-full max-w-5xl max-h-[92vh] rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            {/* Header Dialog */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="modal-daftar-khotmil-title" className="text-base font-bold text-slate-900 dark:text-white">
                    Pendaftaran Santri - {judul}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pilih satu atau beberapa santri untuk didaftarkan ke dalam tabel {judul}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDaftarModalOpen(false)}
                aria-label="Tutup dialog pendaftaran"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Pencarian Santri (Nama, Halaqoh+Pembimbing, Kamar) */}
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={daftarSearch}
                  onChange={(e) => setDaftarSearch(e.target.value)}
                  placeholder="Cari berdasarkan Nama, Halaqoh, Pembimbing, atau Kamar (misal: E03)..."
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-9 text-xs text-slate-800 placeholder-slate-400 shadow-xs focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
                {daftarSearch && (
                  <button
                    type="button"
                    onClick={() => setDaftarSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Konten 2 Sisi: Tabel Santri (Kiri) & Riwayat Kegiatan + Juz Baru (Kanan) */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
              {/* Kolom Kiri: Tabel Santri */}
              <div className="lg:col-span-7 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 min-h-0 overflow-y-auto">
                <div className="p-3 bg-slate-100/60 dark:bg-slate-800/50 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="select-all-santri"
                      checked={
                        filteredSantriForDaftar.length > 0 &&
                        selectedSantriIds.size === filteredSantriForDaftar.length
                      }
                      onChange={toggleSelectAllDaftar}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <label htmlFor="select-all-santri" className="cursor-pointer select-none">
                      Pilih Semua ({filteredSantriForDaftar.length})
                    </label>
                  </div>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                    {selectedSantriIds.size} dipilih
                  </span>
                </div>

                {loadingDaftarList ? (
                  <div className="flex h-48 items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
                    <span className="text-xs text-slate-500">Memuat data santri...</span>
                  </div>
                ) : filteredSantriForDaftar.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    Tidak ada santri yang cocok dengan pencarian &quot;{daftarSearch}&quot;.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredSantriForDaftar.map((s) => {
                      const isSelected = selectedSantriIds.has(s.id);
                      const isPreviewActive = previewSantri?.id === s.id;
                      const pembimbingNama =
                        pembimbingMap[`${s.halaqoh_kelas}_${s.halaqoh_bagian}`] || "Ust. Pembimbing";
                      const kamarStr = formatKamarDisplay(s.kode_kamar, s.kamar);

                      return (
                        <div
                          key={s.id}
                          onClick={() => setPreviewSantri(s)}
                          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition ${
                            isPreviewActive
                              ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-l-4 border-l-emerald-600"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleSantriSelection(s.id);
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate">
                                {s.nama_lengkap}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                ({s.kode})
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                              <span className="font-medium text-slate-600 dark:text-slate-300">
                                {s.halaqoh || `Kelas ${s.halaqoh_kelas || 1}`}
                              </span>
                              <span>•</span>
                              <span className="text-emerald-700 dark:text-emerald-400">
                                {pembimbingNama}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-mono font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {kamarStr}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Kolom Kanan: Drawer Riwayat (Kegiatan & Juz Baru) */}
              <div className="lg:col-span-5 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 min-h-0 overflow-y-auto">
                {previewSantri ? (
                  <div className="flex flex-col h-full">
                    {/* Header Preview Santri */}
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400">
                          Riwayat Santri Terpilih
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                          {previewSantri.nama_lengkap}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <HalaqohBadge kelas={previewSantri.halaqoh_kelas} bagian={previewSantri.halaqoh_bagian} />
                          <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">
                            Kamar {formatKamarDisplay(previewSantri.kode_kamar, previewSantri.kamar)}
                          </span>
                        </div>
                      </div>

                      {/* Tab Riwayat: Kegiatan vs Juz Baru */}
                      <div className="flex items-center gap-2 mt-3 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                        <button
                          type="button"
                          onClick={() => setPreviewTab("kegiatan")}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition text-center ${
                            previewTab === "kegiatan"
                              ? "bg-emerald-800 text-white shadow-xs dark:bg-emerald-700"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          Kegiatan (Absen)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewTab("juz_baru")}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition text-center ${
                            previewTab === "juz_baru"
                              ? "bg-emerald-800 text-white shadow-xs dark:bg-emerald-700"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          Juz Baru (Setoran)
                        </button>
                      </div>
                    </div>

                    {/* Isi Preview Sesuai Tab */}
                    <div className="p-4 flex-1 overflow-y-auto">
                      {previewLoading ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-2">
                          <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
                          <span className="text-xs text-slate-400">Memuat riwayat santri...</span>
                        </div>
                      ) : previewTab === "kegiatan" ? (
                        <div className="space-y-3">
                          {/* Rekap Absensi */}
                          {(() => {
                            let hadir = 0, alfa = 0, izin = 0, sakit = 0;
                            previewAbsensi.forEach((a) => {
                              const st = String(a.status || "").toLowerCase();
                              if (st === "hadir" || st === "h") hadir++;
                              else if (st === "alfa" || st === "a") alfa++;
                              else if (st === "izin" || st === "i") izin++;
                              else if (st === "sakit" || st === "s") sakit++;
                            });
                            return (
                              <div className="grid grid-cols-4 gap-2">
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-center dark:border-emerald-900 dark:bg-emerald-950/40">
                                  <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">Hadir</div>
                                  <div className="text-sm font-bold font-mono text-emerald-900 dark:text-emerald-200">{hadir}</div>
                                </div>
                                <div className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-center dark:border-rose-900 dark:bg-rose-950/40">
                                  <div className="text-[10px] font-semibold text-rose-700 dark:text-rose-400">Alfa</div>
                                  <div className="text-sm font-bold font-mono text-rose-900 dark:text-rose-200">{alfa}</div>
                                </div>
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-2 text-center dark:border-amber-900 dark:bg-amber-950/40">
                                  <div className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">Izin</div>
                                  <div className="text-sm font-bold font-mono text-amber-900 dark:text-amber-200">{izin}</div>
                                </div>
                                <div className="rounded-xl border border-sky-200 bg-sky-50 p-2 text-center dark:border-sky-900 dark:bg-sky-950/40">
                                  <div className="text-[10px] font-semibold text-sky-700 dark:text-sky-400">Sakit</div>
                                  <div className="text-sm font-bold font-mono text-sky-900 dark:text-sky-200">{sakit}</div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* List Riwayat Absensi */}
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              Riwayat Absensi Terakhir:
                            </span>
                            {previewAbsensi.length === 0 ? (
                              <p className="text-xs text-slate-400 italic py-2">Belum ada data absensi untuk santri ini.</p>
                            ) : (
                              <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                                {previewAbsensi.slice(0, 15).map((a, idx) => (
                                  <div
                                    key={a.id || idx}
                                    className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 text-xs"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                      <span className="font-mono text-slate-700 dark:text-slate-300">{a.tanggal}</span>
                                      <span className="capitalize text-[10px] text-slate-400">({a.sesi})</span>
                                    </div>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                        a.status === "hadir"
                                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                          : a.status === "alfa"
                                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                          : a.status === "izin"
                                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                          : "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
                                      }`}
                                    >
                                      {a.status}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Rekap Setoran Juz Baru */}
                          {(() => {
                            const totalJuz = previewSetoran.reduce(
                              (sum, s) => sum + Number(s.jumlah_juz_tambahan || 0),
                              0
                            );
                            return (
                              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center justify-between dark:border-emerald-900 dark:bg-emerald-950/40">
                                <div>
                                  <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                                    Total Tambahan Juz Baru
                                  </div>
                                  <div className="text-lg font-bold font-mono text-emerald-900 dark:text-emerald-200">
                                    {Number(totalJuz.toFixed(2))} Juz
                                  </div>
                                </div>
                                <span className="rounded-full bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-xs border border-slate-200 dark:border-slate-700">
                                  {previewSetoran.length} Catatan
                                </span>
                              </div>
                            );
                          })()}

                          {/* List Riwayat Setoran */}
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              Riwayat Setoran Juz Baru:
                            </span>
                            {previewSetoran.length === 0 ? (
                              <p className="text-xs text-slate-400 italic py-2">Belum ada riwayat setoran juz baru untuk santri ini.</p>
                            ) : (
                              <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                                {previewSetoran.map((s, idx) => (
                                  <div
                                    key={s.id || idx}
                                    className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 text-xs space-y-0.5"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono text-slate-600 dark:text-slate-400">{s.tanggal}</span>
                                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                        +{s.jumlah_juz_tambahan} Juz
                                      </span>
                                    </div>
                                    {s.catatan && (
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic truncate">
                                        {s.catatan}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center h-full">
                    <Info className="h-8 w-8 text-slate-300 mb-2" />
                    <p>Klik salah satu santri di tabel untuk melihat riwayat Kegiatan dan Juz Baru di sini.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Modal Pendaftaran */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                <strong className="text-emerald-800 dark:text-emerald-400 font-bold">{selectedSantriIds.size}</strong> santri dipilih untuk didaftarkan
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDaftarModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDaftar}
                  disabled={selectedSantriIds.size === 0}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 disabled:opacity-40 disabled:cursor-not-allowed shadow transition dark:bg-emerald-700 dark:hover:bg-emerald-800"
                >
                  Daftarkan ({selectedSantriIds.size}) Santri
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP 5: MODAL CETAK LEMBAR LJK OMR STANDAR */}
      <KhotmilLjkPrintModal
        isOpen={ljkPrintModalOpen}
        onClose={() => setLjkPrintModalOpen(false)}
        santriList={santriList}
        currentTahapCfg={currentTahapCfg}
        jenis={jenis}
        judul={judul}
      />

      {/* POP-UP 6: MODAL SCANNER KAMERA BROWSER (CLIENT-SIDE OMR) */}
      <KhotmilCameraScannerModal
        isOpen={cameraScannerModalOpen}
        onClose={() => setCameraScannerModalOpen(false)}
        jenis={jenis}
        judul={judul}
        currentTahapCfg={currentTahapCfg}
        onSuccessSave={loadData}
      />
    </div>
  );
}
