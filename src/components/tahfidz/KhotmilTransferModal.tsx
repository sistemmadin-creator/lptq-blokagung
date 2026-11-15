"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowUpRight,
  AlertTriangle,
  Check,
  Info,
  Loader2,
  Search,
  X,
} from "lucide-react";
import {
  fetchSantriKhotmilTransferPreview,
  transferKhotmil15To30Batch,
  type SantriKhotmilTransferPreview,
  type TransferKhotmilBatchResult,
} from "@/lib/services/tahfidz-service";
import type { Santri } from "@/types/database";
import { HalaqohBadge } from "@/components/ui/Badges";
import { useToast } from "@/components/ui/Toast";

export interface KhotmilTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  santriList: Santri[];
  pembimbingMap?: Record<string, string>;
  initialSelectedIds?: string[];
  onSuccessTransfer: (result: TransferKhotmilBatchResult) => Promise<void> | void;
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

export function KhotmilTransferModal({
  isOpen,
  onClose,
  santriList,
  pembimbingMap = {},
  initialSelectedIds = [],
  onSuccessTransfer,
}: KhotmilTransferModalProps) {
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewMap, setPreviewMap] = useState<Record<string, SantriKhotmilTransferPreview>>({});
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Default: otomatis bawa & salin nilai Tahap 1-4 ke Khotmil 30 Juz
  const [carryOverTahap1To4, setCarryOverTahap1To4] = useState(true);
  const [overwriteExisting30, setOverwriteExisting30] = useState(false);
  const [catatan, setCatatan] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    setSearch("");
    setSelectedIds(new Set(initialSelectedIds));
    setCarryOverTahap1To4(true);
    setOverwriteExisting30(false);
    setCatatan("");

    const allIds = santriList.map((s) => s.id);
    if (allIds.length === 0) {
      setPreviewMap({});
      return;
    }

    let active = true;
    setLoadingPreview(true);
    fetchSantriKhotmilTransferPreview(allIds)
      .then((res) => {
        if (active) setPreviewMap(res);
      })
      .catch((err) => {
        if (active) {
          showToast(
            "error",
            "Gagal memuat rincian nilai santri: " + (err instanceof Error ? err.message : "Kesalahan")
          );
        }
      })
      .finally(() => {
        if (active) setLoadingPreview(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, santriList, initialSelectedIds, showToast]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, submitting, onClose]);

  const filteredSantri = useMemo(() => {
    if (!search.trim()) return santriList;
    const q = search.toLowerCase();
    return santriList.filter((s) => {
      const pNama = pembimbingMap[`${s.halaqoh_kelas}_${s.halaqoh_bagian}`]?.toLowerCase() || "";
      const kDisplay = formatKamarDisplay(s.kode_kamar, s.kamar).toLowerCase();
      const hDisplay = `${s.halaqoh || ""} ${s.halaqoh_kelas || ""}${s.halaqoh_bagian || ""}`.toLowerCase();
      return (
        s.nama_lengkap.toLowerCase().includes(q) ||
        (s.kode && s.kode.toLowerCase().includes(q)) ||
        hDisplay.includes(q) ||
        pNama.includes(q) ||
        kDisplay.includes(q)
      );
    });
  }, [santriList, search, pembimbingMap]);

  const selectedStats = useMemo(() => {
    let totalTahap1To4Scores = 0;
    let countHasTahap5 = 0;
    let countConflict30 = 0;
    let totalConflictScores = 0;

    selectedIds.forEach((id) => {
      const p = previewMap[id];
      if (!p) return;
      totalTahap1To4Scores += p.tahap1To4ScoresCount;
      if (p.hasTahap5Score) countHasTahap5++;
      if (p.alreadyIn30) countConflict30++;
      totalConflictScores += p.conflictTahap1To4Count;
    });

    return {
      totalTahap1To4Scores,
      countHasTahap5,
      countConflict30,
      totalConflictScores,
    };
  }, [selectedIds, previewMap]);

  const allFilteredSelected =
    filteredSantri.length > 0 && filteredSantri.every((s) => selectedIds.has(s.id));

  const toggleSantri = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredSantri.forEach((s) => next.delete(s.id));
      } else {
        filteredSantri.forEach((s) => next.add(s.id));
      }
      return next;
    });
  };

  const handleConfirmTransfer = async () => {
    if (selectedIds.size === 0) {
      showToast("error", "Pilih minimal 1 santri untuk dipindahkan ke Khotmil 30 Juz.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await transferKhotmil15To30Batch({
        santriIds: Array.from(selectedIds),
        carryOverTahap1To4,
        overwriteExisting30,
        catatan,
      });

      const scoreText = carryOverTahap1To4
        ? ` (${result.copiedScoresCount} nilai Tahap 1–4 disalin ke Khotmil 30 Juz)`
        : " (ujian ulang dari nol di Khotmil 30 Juz)";
      showToast(
        "success",
        `${result.transferredCount} santri berhasil dipindahkan ke Khotmil 30 Juz${scoreText}.`
      );
      onClose();
      await onSuccessTransfer(result);
    } catch (err) {
      showToast(
        "error",
        "Gagal memindahkan santri: " + (err instanceof Error ? err.message : "Kesalahan")
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-transfer-khotmil-title"
    >
      <div className="flex flex-col w-full max-w-3xl max-h-[92vh] rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              <ArrowUpRight className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="modal-transfer-khotmil-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                Pindahkan Santri ke Khotmil 30 Juz
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pindahkan satu atau banyak santri berprogres baik dari Khotmil 15 Juz ke Khotmil 30 Juz.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label="Tutup dialog perpindahan program"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Pencarian */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari santri berdasarkan nama, kode, halaqoh, atau kamar..."
              className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-9 text-xs text-slate-800 placeholder-slate-400 shadow-xs focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Bersihkan pencarian"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Pilih Semua Bar */}
        <div className="px-5 py-2.5 bg-slate-100/60 dark:bg-slate-800/50 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={toggleSelectAllFiltered}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>Pilih Semua ({filteredSantri.length})</span>
          </label>
          <span className="text-emerald-700 dark:text-emerald-400 font-bold">
            {selectedIds.size} santri dipilih
          </span>
        </div>

        {/* Daftar Santri */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 min-h-[180px]">
          {loadingPreview ? (
            <div className="flex h-44 items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
              <span className="text-xs text-slate-500">Memeriksa riwayat nilai Khotmil santri...</span>
            </div>
          ) : filteredSantri.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              {santriList.length === 0
                ? "Belum ada santri terdaftar di Khotmil 15 Juz."
                : `Tidak ada santri yang cocok dengan pencarian "${search}".`}
            </div>
          ) : (
            filteredSantri.map((s) => {
              const checked = selectedIds.has(s.id);
              const preview = previewMap[s.id];
              const kamarStr = formatKamarDisplay(s.kode_kamar, s.kamar);
              const pembimbing = pembimbingMap[`${s.halaqoh_kelas}_${s.halaqoh_bagian}`];

              return (
                <label
                  key={s.id}
                  className={`flex items-start sm:items-center gap-3 px-5 py-3 cursor-pointer transition ${
                    checked
                      ? "bg-emerald-50/70 dark:bg-emerald-950/30"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSantri(s.id)}
                    className="mt-0.5 sm:mt-0 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-xs text-slate-800 dark:text-slate-100">
                        {s.nama_lengkap}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">({s.kode})</span>
                      <HalaqohBadge kelas={s.halaqoh_kelas} bagian={s.halaqoh_bagian} />
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {kamarStr}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {pembimbing && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 mr-1">
                          {pembimbing}
                        </span>
                      )}
                      {preview ? (
                        <>
                          {preview.tahap1To4ScoresCount > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <Check className="h-3 w-3" />
                              Tahap {preview.migratedTahapNumbers.join(",")} ({preview.tahap1To4ScoresCount} nilai)
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              Belum ada nilai Tahap 1–4
                            </span>
                          )}
                          {preview.hasTahap5Score && (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              Tahap 5 (Juz 1–15) tidak disalin
                            </span>
                          )}
                          {preview.alreadyIn30 && (
                            <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                              Sudah ada data 30 Juz ({preview.conflictTahap1To4Count} bentrok)
                            </span>
                          )}
                        </>
                      ) : null}
                    </div>
                  </div>
                </label>
              );
            })
          )}
        </div>

        {/* Pengaturan Migrasi Nilai & Peringatan */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/80 space-y-2.5 shrink-0">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={carryOverTahap1To4}
              onChange={(e) => setCarryOverTahap1To4(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 shrink-0"
            />
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Bawa &amp; salin nilai Tahap 1–4 yang sudah ada ke Khotmil 30 Juz
                {selectedIds.size > 0 && (
                  <span className="ml-1.5 font-mono text-emerald-700 dark:text-emerald-400">
                    ({selectedStats.totalTahap1To4Scores} nilai terdeteksi)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Tahap 1–4 (Juz 1–15) pada Khotmil 15 dan 30 Juz identik. Hapus centang bila ingin ujian ulang dari nol.
              </p>
            </div>
          </label>

          {carryOverTahap1To4 && selectedStats.totalConflictScores > 0 && (
            <label className="flex items-start gap-2.5 cursor-pointer select-none pl-6">
              <input
                type="checkbox"
                checked={overwriteExisting30}
                onChange={(e) => setOverwriteExisting30(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 shrink-0"
              />
              <div className="text-[11px] text-slate-700 dark:text-slate-300">
                <strong>Timpa nilai Khotmil 30 Juz</strong> jika ada {selectedStats.totalConflictScores} juz yang bentrok di Tahap 1–4
                <span className="text-slate-500 dark:text-slate-400">
                  {" "}(jika tidak dicentang, nilai 30 Juz yang sudah ada dipertahankan).
                </span>
              </div>
            </label>
          )}

          {selectedStats.countHasTahap5 > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                {selectedStats.countHasTahap5} santri memiliki nilai pada <strong>Tahap 5 Khotmil 15 Juz (Juz 1–15)</strong>.
                Nilai Tahap 5 tersebut tidak disalin ke Tahap 5 Khotmil 30 Juz karena materinya berbeda (Juz 16–20).
              </span>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Kepesertaan dan nilai lama santri terpilih pada <strong>Khotmil 15 Juz</strong> akan langsung dihapus setelah dipindahkan ke Khotmil 30 Juz agar tidak tercatat ganda.
            </span>
          </div>

          <input
            type="text"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Catatan alasan perpindahan (opsional, mis. progres hafalan menembus Juz 16+)..."
            className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            <strong className="text-emerald-800 dark:text-emerald-400 font-bold">
              {selectedIds.size}
            </strong>{" "}
            santri siap dipindahkan
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={submitting || selectedIds.size === 0}
              onClick={handleConfirmTransfer}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 disabled:opacity-40 disabled:cursor-not-allowed shadow transition dark:bg-emerald-700 dark:hover:bg-emerald-800"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Memindahkan...</span>
                </>
              ) : (
                <>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span>Pindahkan ({selectedIds.size}) Santri</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
