"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { FileSpreadsheet, Pencil, X } from "lucide-react";
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
import { HalaqohBadge, KkmBadge } from "@/components/ui/Badges";
import { PrintButton } from "@/components/ui/PrintButton";
import { ExcelUploader } from "@/components/ui/ExcelUploader";
import { downloadKhotmilTemplateExcel, exportJsonToExcel } from "@/lib/utils/excel";
import { useToast } from "@/components/ui/Toast";

interface KhotmilModuleProps {
  jenis: JenisKhotmil;
  judul: string;
  tahapList: TahapConfig[];
}

export function KhotmilModule({ jenis, judul, tahapList }: KhotmilModuleProps) {
  const { showToast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const [activeTahap, setActiveTahap] = useState<number>(tahapList[0].tahap);
  const [search, setSearch] = useState("");
  const [asramaFilter, setAsramaFilter] = useState("");

  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [nilaiMap, setNilaiMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && editingSantri) setEditingSantri(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editingSantri]);

  // Menghitung rata-rata dan kelengkapan nilai per santri pada tahap aktif (KKM >= 85)
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

  let jumlahLulus = 0;
  let jumlahBelum = 0;
  santriList.forEach((s) => {
    const sum = computeRowSummary(s.id);
    if (sum.lulus) jumlahLulus += 1;
    else jumlahBelum += 1;
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
    const rows = santriList.map((s, idx) => {
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
      rows,
      `${jenis.toUpperCase()}_Tahap_${activeTahap}`,
      `Tahap_${activeTahap}`
    );
    showToast("success", "Tabel nilai Khotmil berhasil diekspor ke Excel.");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{judul}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Standar KKM: 85. Santri dinyatakan Tuntas/Lulus apabila seluruh juz dalam tahap telah
            dinilai dan rata-rata minimal 85.
          </p>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2">
          <ExcelUploader
            requiredHeaders={["Kode", "Jenis", "Tahap", "Juz", "Nilai"]}
            endpoint="/api/import/khotmil"
            onSuccess={loadData}
            onDownloadTemplate={downloadKhotmilTemplateExcel}
            buttonLabel="Impor Nilai Excel"
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
            contentRef={printRef}
            documentTitle={`${jenis}_Tahap_${activeTahap}`}
          />
        </div>
      </div>

      {/* Tab Pilihan Tahap */}
      <div
        className="no-print flex flex-wrap gap-2 border-b border-slate-300 pb-3 dark:border-slate-800"
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
              onClick={() => setActiveTahap(t.tahap)}
              className={`min-h-[44px] rounded-md px-3.5 py-2 text-xs font-bold transition-colors ${
                active
                  ? "bg-emerald-800 text-white"
                  : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              }`}
            >
              {t.label} ({t.rentangLabel})
            </button>
          );
        })}
      </div>

      {/* Filter & Indikator Ringkas Lulus / Belum Tuntas */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md border border-slate-300 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau kode santri..."
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
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="rounded border border-emerald-700 bg-emerald-100 px-3 py-1.5 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950 dark:text-emerald-200">
            Tuntas / Lulus: {jumlahLulus} Santri
          </span>
          <span className="rounded border border-red-700 bg-red-100 px-3 py-1.5 text-red-900 dark:border-red-500 dark:bg-red-950 dark:text-red-200">
            Belum Tuntas: {jumlahBelum} Santri
          </span>
        </div>
      </div>

      {/* Tabel Nilai Per Juz */}
      <div
        ref={printRef}
        className="overflow-x-auto rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold uppercase">
            {judul} - {currentTahapCfg.label} ({currentTahapCfg.rentangLabel})
          </span>
          <span className="text-xs text-slate-600 dark:text-slate-400">KKM Lulus: 85</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm">Memuat daftar nilai Khotmil...</div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-800 dark:text-red-300">{error}</div>
        ) : santriList.length === 0 ? (
          <div className="p-8 text-center text-sm">Tidak ada data santri yang cocok.</div>
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200">
                <th className="px-2.5 py-3 text-left">No</th>
                <th className="sticky left-0 z-10 bg-slate-100 dark:bg-slate-800 px-3 py-3 text-left min-w-[180px]">
                  Nama Santri
                </th>
                <th className="px-2.5 py-3 text-left">Asrama</th>
                <th className="px-2.5 py-3 text-left">Halaqoh</th>
                {currentTahapCfg.juzList.map((j) => (
                  <th key={j} className="px-2.5 py-3 text-center font-mono">
                    Juz {j}
                  </th>
                ))}
                <th className="px-3 py-3 text-center">Rata-rata</th>
                <th className="px-3 py-3 text-left">Status KKM</th>
                <th className="no-print px-3 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {santriList.map((s, idx) => {
                const summary = computeRowSummary(s.id);
                return (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-2.5 py-2.5 font-mono">{idx + 1}</td>
                    <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 px-3 py-2.5 font-medium whitespace-nowrap border-r border-slate-200 dark:border-slate-800">
                      {s.nama_lengkap}
                    </td>
                    <td className="px-2.5 py-2.5">{s.asrama}</td>
                    <td className="px-2.5 py-2.5">
                      <HalaqohBadge kelas={s.halaqoh_kelas} bagian={s.halaqoh_bagian} />
                    </td>
                    {currentTahapCfg.juzList.map((j) => {
                      const val = nilaiMap[`${s.id}_${j}`];
                      return (
                        <td key={j} className="px-2.5 py-2.5 text-center font-mono">
                          {typeof val === "number" ? (
                            <span
                              className={
                                val >= KKM_DEFAULT
                                  ? "font-bold text-emerald-800 dark:text-emerald-300"
                                  : "font-bold text-red-800 dark:text-red-300"
                              }
                            >
                              {val}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-center font-mono font-bold">
                      {summary.rataRata ?? "-"}
                    </td>
                    <td className="px-3 py-2.5">
                      <KkmBadge rataRata={summary.rataRata} lengkap={summary.lengkap} />
                    </td>
                    <td className="no-print px-3 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => openScoreModal(s)}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded border border-slate-300 px-3 py-1 text-xs font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
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
        )}
      </div>

      {/* Modal Input / Edit Nilai Per Juz */}
      {editingSantri && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-khotmil-title"
        >
          <div className="w-full max-w-lg rounded-md border border-slate-300 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 id="modal-khotmil-title" className="text-base font-bold">
                  Input Nilai {currentTahapCfg.label} ({currentTahapCfg.rentangLabel})
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Santri: {editingSantri.nama_lengkap} ({editingSantri.kode})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSantri(null)}
                aria-label="Tutup dialog"
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded border border-slate-300 dark:border-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveScores} className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {currentTahapCfg.juzList.map((j) => (
                  <div key={j}>
                    <label className="block text-xs font-semibold mb-1">Nilai Juz {j}</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={formScores[j] ?? ""}
                      onChange={(e) =>
                        setFormScores((prev) => ({ ...prev, [j]: e.target.value }))
                      }
                      placeholder="0 - 100"
                      className="w-full min-h-[44px] rounded border border-slate-300 bg-white px-3 py-2 text-sm font-mono dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingSantri(null)}
                  className="min-h-[44px] rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold dark:border-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-[44px] rounded-md bg-emerald-800 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-900 disabled:opacity-60"
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
