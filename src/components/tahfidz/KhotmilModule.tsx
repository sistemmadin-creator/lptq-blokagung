"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import {
  fetchAllSantriFiltered,
  fetchKhotmilTahapNilai,
  upsertKhotmilNilaiBatch,
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

  // Status Impor Excel
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState("");

  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [nilaiMap, setNilaiMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const [santriData, nilaiData] = await Promise.all([
        fetchAllSantriFiltered({ search, asrama: asramaFilter }),
        fetchKhotmilTahapNilai(jenis, activeTahap),
      ]);

      const map: Record<string, number> = {};
      nilaiData.forEach((n) => {
        map[`${n.santri_id}_${n.juz}`] = n.nilai;
      });

      setSantriList(santriData);
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

  // Handle tombol escape untuk modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingSantri) setEditingSantri(null);
        if (filterModalOpen) setFilterModalOpen(false);
        if (excelModalOpen) setExcelModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editingSantri, filterModalOpen, excelModalOpen]);

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
          title="Cetak / Unduh PDF"
          aria-label="Cetak / Unduh PDF"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Printer className="h-5 w-5" />
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
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                  <th className="px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-300">No</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Nama Santri</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Asrama</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-300 text-center">Halaqoh</th>
                  {currentTahapCfg.juzList.map((j) => (
                    <th key={j} className="px-3 py-2.5 font-semibold text-center font-mono">
                      Juz {j}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 font-semibold text-center font-mono">Rata-rata</th>
                  <th className="px-3 py-2.5 font-semibold text-center">Status KKM</th>
                  <th className="no-print px-3 py-2.5 font-semibold text-center">Aksi</th>
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
                        <span className="block text-[10px] font-normal font-mono text-slate-400">{s.kode}</span>
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{s.asrama}</td>
                      <td className="px-3 py-2 text-center">
                        <HalaqohBadge kelas={s.halaqoh_kelas} bagian={s.halaqoh_bagian} />
                      </td>
                      {currentTahapCfg.juzList.map((j) => {
                        const n = nilaiMap[`${s.id}_${j}`];
                        return (
                          <td key={j} className="px-3 py-2 text-center font-mono">
                            {typeof n === "number" ? (
                              <span className={n >= 85 ? "font-bold text-emerald-700 dark:text-emerald-300" : "text-slate-700 dark:text-slate-300"}>
                                {n}
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">-</span>
                            )}
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
                      <td className="no-print px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => openScoreModal(s)}
                          className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span>Input / Edit Nilai</span>
                        </button>
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
    </div>
  );
}
