"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  X,
  Search,
  Check,
  Loader2,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import {
  fetchSetoranBulananMerged,
  batchSetCapaianJuzBaru,
} from "@/lib/services/tahfidz-service";
import { formatKamarDisplay } from "@/lib/services/hierarchy-service";
import {
  PEMETAAN_HALAQOH_KELAS,
  formatHalamanToJuzStatus,
  type HalaqohBagian,
  type SetoranBulananRow,
} from "@/types/database";
import { HalaqohBadge } from "@/components/ui/Badges";
import { useToast } from "@/components/ui/Toast";

interface BulkSetCapaianModalProps {
  isOpen: boolean;
  onClose: () => void;
  tahun: number;
  onSaved: () => Promise<void> | void;
}

interface DraftValue {
  juz: string;
  halaman: string;
}

interface ParsedRowState {
  isValid: boolean;
  errorMsg: string | null;
  juzNum: number;
  halamanNum: number;
  targetTotal: number;
  isDirty: boolean;
}

function getLocalIsoDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getRowTotalHalaman(row: SetoranBulananRow): number {
  return row.total_halaman !== undefined
    ? Math.max(0, Math.round(row.total_halaman))
    : Math.max(0, Math.round(row.total_setoran * 20));
}

function parseDraftState(draft: DraftValue | undefined, initialTotal: number): ParsedRowState {
  const rawJuz = (draft?.juz ?? "").trim();
  const rawHalaman = (draft?.halaman ?? "").trim();

  const juzNum = rawJuz === "" ? 0 : Number(rawJuz);
  const halamanNum = rawHalaman === "" ? 0 : Number(rawHalaman);

  if (!Number.isInteger(juzNum) || juzNum < 0 || juzNum > 30) {
    return {
      isValid: false,
      errorMsg: "Juz harus 0 sampai 30",
      juzNum: 0,
      halamanNum: 0,
      targetTotal: initialTotal,
      isDirty: true,
    };
  }

  const effectiveHalaman = juzNum === 30 ? 0 : halamanNum;

  if (!Number.isInteger(effectiveHalaman) || effectiveHalaman < 0 || effectiveHalaman > 19) {
    return {
      isValid: false,
      errorMsg: "Halaman harus 0 sampai 19",
      juzNum,
      halamanNum: 0,
      targetTotal: initialTotal,
      isDirty: true,
    };
  }

  const targetTotal = juzNum * 20 + effectiveHalaman;
  if (targetTotal > 600) {
    return {
      isValid: false,
      errorMsg: "Maksimal 30 Juz (600 halaman)",
      juzNum,
      halamanNum: effectiveHalaman,
      targetTotal: initialTotal,
      isDirty: true,
    };
  }

  return {
    isValid: true,
    errorMsg: null,
    juzNum,
    halamanNum: effectiveHalaman,
    targetTotal,
    isDirty: targetTotal !== initialTotal,
  };
}

export function BulkSetCapaianModal({
  isOpen,
  onClose,
  tahun,
  onSaved,
}: BulkSetCapaianModalProps) {
  const { showToast } = useToast();

  const [allRows, setAllRows] = useState<SetoranBulananRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [initialTotals, setInitialTotals] = useState<Record<string, number>>({});
  const [drafts, setDrafts] = useState<Record<string, DraftValue>>({});

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHalaqohKey, setSelectedHalaqohKey] = useState<string>("semua");
  const [tanggalInput, setTanggalInput] = useState<string>(() => getLocalIsoDate());
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  const loadAllSantri = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setSaveError(null);
    try {
      const merged = await fetchSetoranBulananMerged(tahun, "juz_baru", {});
      const totalsMap: Record<string, number> = {};
      const draftMap: Record<string, DraftValue> = {};

      merged.forEach((row) => {
        const total = getRowTotalHalaman(row);
        totalsMap[row.santri_id] = total;
        draftMap[row.santri_id] = {
          juz: String(Math.floor(total / 20)),
          halaman: String(total % 20),
        };
      });

      setAllRows(merged);
      setInitialTotals(totalsMap);
      setDrafts(draftMap);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Gagal memuat daftar seluruh santri."
      );
    } finally {
      setLoading(false);
    }
  }, [tahun]);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setSelectedHalaqohKey("semua");
      setTanggalInput(getLocalIsoDate());
      setCollapsedGroups({});
      setConfirmDiscardOpen(false);
      setSaveError(null);
      loadAllSantri();
    }
  }, [isOpen, loadAllSantri]);

  const parsedMap = useMemo(() => {
    const map: Record<string, ParsedRowState> = {};
    allRows.forEach((row) => {
      const initial = initialTotals[row.santri_id] ?? 0;
      map[row.santri_id] = parseDraftState(drafts[row.santri_id], initial);
    });
    return map;
  }, [allRows, drafts, initialTotals]);

  const { dirtyRows, invalidRows } = useMemo(() => {
    const dirty: { row: SetoranBulananRow; parsed: ParsedRowState }[] = [];
    const invalid: { row: SetoranBulananRow; parsed: ParsedRowState }[] = [];

    allRows.forEach((row) => {
      const parsed = parsedMap[row.santri_id];
      if (!parsed) return;
      if (!parsed.isValid) {
        invalid.push({ row, parsed });
      } else if (parsed.isDirty) {
        dirty.push({ row, parsed });
      }
    });

    return { dirtyRows: dirty, invalidRows: invalid };
  }, [allRows, parsedMap]);

  const dirtyCount = dirtyRows.length;
  const invalidCount = invalidRows.length;

  const requestClose = useCallback(() => {
    if (saving) return;
    if (dirtyCount > 0) {
      setConfirmDiscardOpen(true);
      return;
    }
    onClose();
  }, [saving, dirtyCount, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (confirmDiscardOpen) {
          setConfirmDiscardOpen(false);
        } else {
          requestClose();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [isOpen, confirmDiscardOpen, requestClose]);

  const halaqohKeys = useMemo(() => {
    const set = new Map<string, { key: string; kelas: number; bagian: HalaqohBagian }>();
    allRows.forEach((r) => {
      const k = Number(r.halaqoh_kelas) || 1;
      const b = (r.halaqoh_bagian || "A") as HalaqohBagian;
      const key = `${k}_${b}`;
      if (!set.has(key)) {
        set.set(key, { key, kelas: k, bagian: b });
      }
    });
    return Array.from(set.values()).sort((a, b) => {
      if (a.kelas !== b.kelas) return a.kelas - b.kelas;
      return a.bagian.localeCompare(b.bagian);
    });
  }, [allRows]);

  const groupedFiltered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const map = new Map<
      string,
      { key: string; kelas: number; bagian: HalaqohBagian; rows: SetoranBulananRow[] }
    >();

    allRows.forEach((r) => {
      const k = Number(r.halaqoh_kelas) || 1;
      const b = (r.halaqoh_bagian || "A") as HalaqohBagian;
      const key = `${k}_${b}`;

      if (selectedHalaqohKey !== "semua" && key !== selectedHalaqohKey) return;

      if (q) {
        const namaMatch = r.nama_lengkap.toLowerCase().includes(q);
        const kodeMatch = (r.kode || "").toLowerCase().includes(q);
        if (!namaMatch && !kodeMatch) return;
      }

      if (!map.has(key)) {
        map.set(key, { key, kelas: k, bagian: b, rows: [] });
      }
      map.get(key)!.rows.push(r);
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.kelas !== b.kelas) return a.kelas - b.kelas;
      return a.bagian.localeCompare(b.bagian);
    });
  }, [allRows, searchTerm, selectedHalaqohKey]);

  const allCollapsed = useMemo(() => {
    if (groupedFiltered.length === 0) return false;
    return groupedFiltered.every((g) => Boolean(collapsedGroups[g.key]));
  }, [groupedFiltered, collapsedGroups]);

  const handleToggleAllCollapse = () => {
    const nextState: Record<string, boolean> = {};
    const target = !allCollapsed;
    groupedFiltered.forEach((g) => {
      nextState[g.key] = target;
    });
    setCollapsedGroups(nextState);
  };

  const handleFieldChange = (santriId: string, field: "juz" | "halaman", value: string) => {
    setConfirmDiscardOpen(false);
    setSaveError(null);

    setDrafts((prev) => {
      const current = prev[santriId] ?? { juz: "0", halaman: "0" };
      if (field === "juz") {
        const nextJuzNum = Number(value);
        return {
          ...prev,
          [santriId]: {
            juz: value,
            halaman: nextJuzNum === 30 ? "0" : current.halaman,
          },
        };
      }
      return {
        ...prev,
        [santriId]: {
          ...current,
          halaman: value,
        },
      };
    });
  };

  const handleResetChanges = () => {
    const resetMap: Record<string, DraftValue> = {};
    allRows.forEach((row) => {
      const total = initialTotals[row.santri_id] ?? 0;
      resetMap[row.santri_id] = {
        juz: String(Math.floor(total / 20)),
        halaman: String(total % 20),
      };
    });
    setDrafts(resetMap);
    setSaveError(null);
    setConfirmDiscardOpen(false);
  };

  const handleSaveAll = async () => {
    if (saving || dirtyCount === 0 || invalidCount > 0) return;

    const chosenDate = tanggalInput || getLocalIsoDate();
    const dateYear = Number(chosenDate.slice(0, 4));
    if (dateYear !== tahun) {
      setSaveError(
        `Tanggal pencatatan (${chosenDate}) harus berada pada tahun ${tahun} agar tercatat di rekap tahun ini.`
      );
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const items = dirtyRows.map(({ row, parsed }) => ({
        santri_id: row.santri_id,
        targetTotalHalaman: parsed.targetTotal,
      }));

      const { succeededIds, failedItems } = await batchSetCapaianJuzBaru({
        tahun,
        tanggal: chosenDate,
        items,
      });

      if (succeededIds.length > 0) {
        const succeededSet = new Set(succeededIds);
        setInitialTotals((prev) => {
          const next = { ...prev };
          dirtyRows.forEach(({ row, parsed }) => {
            if (succeededSet.has(row.santri_id)) {
              next[row.santri_id] = parsed.targetTotal;
            }
          });
          return next;
        });
        await onSaved();
      }

      if (failedItems.length > 0) {
        setSaveError(
          `${succeededIds.length} santri tersimpan, ${failedItems.length} gagal: ${failedItems[0].error}`
        );
        return;
      }

      showToast(
        "success",
        `Alhamdulillah, capaian Juz & Halaman untuk ${succeededIds.length} santri berhasil diperbarui.`
      );
      onClose();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan perubahan."
      );
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isDateYearMismatch =
    Boolean(tanggalInput) && Number(tanggalInput.slice(0, 4)) !== tahun;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-bulk-capaian-title"
      onClick={requestClose}
    >
      <div
        className="flex w-full max-w-5xl max-h-[92vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3.5 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-600 bg-emerald-50 font-mono text-sm font-extrabold text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              ++
            </div>
            <div>
              <h2
                id="modal-bulk-capaian-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                Atur Capaian Juz &amp; Halaman Santri ({tahun})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Isi total capaian hafalan langsung (1 Juz = 20 Halaman). Perubahan mengganti total setoran tahun {tahun} menjadi 1 capaian awal baru.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={saving}
            aria-label="Tutup pengaturan capaian massal"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-200/70 hover:text-slate-700 disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Bilah Filter & Kontrol Cepat */}
        <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
            {/* Cari Santri */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama atau kode santri..."
                aria-label="Cari santri dalam daftar"
                className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-8 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  aria-label="Hapus pencarian"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filter Halaqoh */}
              <select
                value={selectedHalaqohKey}
                onChange={(e) => setSelectedHalaqohKey(e.target.value)}
                aria-label="Filter kelompok halaqoh"
                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="semua">Semua Halaqoh ({halaqohKeys.length})</option>
                {halaqohKeys.map((h) => (
                  <option key={h.key} value={h.key}>
                    Halaqoh {h.kelas}{h.bagian}
                  </option>
                ))}
              </select>

              {/* Tanggal Pencatatan */}
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2.5 h-10 dark:border-slate-700 dark:bg-slate-800">
                <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <input
                  type="date"
                  value={tanggalInput}
                  onChange={(e) => {
                    setTanggalInput(e.target.value);
                    setSaveError(null);
                  }}
                  aria-label="Tanggal pencatatan"
                  className="bg-transparent text-xs font-mono font-semibold text-slate-700 focus:outline-none dark:text-slate-200"
                />
              </div>

              {/* Tombol Lipat / Buka Semua */}
              <button
                type="button"
                onClick={handleToggleAllCollapse}
                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {allCollapsed ? "Buka Semua" : "Lipat Semua"}
              </button>
            </div>
          </div>

          {isDateYearMismatch && (
            <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                Tahun pada tanggal pencatatan berbeda dengan tahun rekap aktif ({tahun}). Pilih tanggal di tahun {tahun} agar perubahan muncul pada rekap halaman ini.
              </span>
            </div>
          )}

          {saveError && (
            <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}
        </div>

        {/* Konten Daftar Halaqoh & Santri */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 sm:p-6 space-y-4 dark:bg-slate-950/40">
          {loading ? (
            <div className="flex h-52 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
              <Loader2 className="h-7 w-7 animate-spin text-emerald-700" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Memuat daftar seluruh santri per halaqoh...
              </p>
            </div>
          ) : loadError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
              <p className="text-sm font-semibold">{loadError}</p>
              <button
                type="button"
                onClick={loadAllSantri}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-rose-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-800"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Muat Ulang Data</span>
              </button>
            </div>
          ) : allRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              Belum ada data santri yang terdaftar di sistem. Tambahkan santri terlebih dahulu pada menu Data Santri Tahfidz.
            </div>
          ) : groupedFiltered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tidak ada santri yang sesuai dengan pencarian atau filter halaqoh ini.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedHalaqohKey("semua");
                }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Filter Modal</span>
              </button>
            </div>
          ) : (
            groupedFiltered.map((grp) => {
              const isCollapsed = Boolean(collapsedGroups[grp.key]);
              const dirtyInGroup = grp.rows.filter(
                (r) => parsedMap[r.santri_id]?.isDirty
              ).length;

              return (
                <section
                  key={grp.key}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  {/* Header Kelompok Halaqoh */}
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsedGroups((prev) => ({
                        ...prev,
                        [grp.key]: !prev[grp.key],
                      }))
                    }
                    className="flex w-full flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 text-left transition hover:bg-slate-100/80 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800/70"
                  >
                    <div className="flex items-center gap-2">
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      )}
                      <HalaqohBadge kelas={grp.kelas} bagian={grp.bagian} />
                      <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                        Target: {PEMETAAN_HALAQOH_KELAS[grp.kelas] || "-"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {dirtyInGroup > 0 && (
                        <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] font-bold text-white">
                          {dirtyInGroup} diubah
                        </span>
                      )}
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {grp.rows.length} Santri
                      </span>
                    </div>
                  </button>

                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/40 text-[11px] font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/20 dark:text-slate-400">
                            <th className="w-10 px-3 py-2 text-center">No</th>
                            <th className="px-3 py-2">Nama Santri</th>
                            <th className="hidden sm:table-cell px-3 py-2 text-center">
                              Status Saat Ini
                            </th>
                            <th className="w-24 px-2 py-2 text-center">Juz (0-30)</th>
                            <th className="w-24 px-2 py-2 text-center">Halaman (0-19)</th>
                            <th className="hidden md:table-cell px-3 py-2 text-center">
                              Pratinjau Capaian
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {grp.rows.map((r, idx) => {
                            const draft = drafts[r.santri_id] ?? { juz: "0", halaman: "0" };
                            const initial = initialTotals[r.santri_id] ?? 0;
                            const parsed = parsedMap[r.santri_id];
                            const hasError = Boolean(parsed && !parsed.isValid);
                            const isDirty = Boolean(parsed?.isDirty && parsed.isValid);
                            const isMaxJuz = Number(draft.juz) === 30;

                            return (
                              <tr
                                key={r.santri_id}
                                className={`transition ${
                                  hasError
                                    ? "bg-rose-50/70 dark:bg-rose-950/25"
                                    : isDirty
                                    ? "bg-emerald-50/70 dark:bg-emerald-950/25"
                                    : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                                }`}
                              >
                                <td className="px-3 py-2 text-center font-mono text-[11px] text-slate-400">
                                  {idx + 1}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="font-semibold text-slate-800 dark:text-slate-100">
                                    {r.nama_lengkap}
                                  </div>
                                  <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                                    {r.kode || "-"} • Kamar {formatKamarDisplay(r.kode_kamar, r.kamar)}
                                  </div>
                                  {/* Ringkasan kompak khusus layar mobile */}
                                  <div className="mt-1 flex flex-wrap items-center gap-1.5 sm:hidden font-mono text-[10px]">
                                    <span className="text-slate-500">
                                      Awal: {formatHalamanToJuzStatus(initial)}
                                    </span>
                                    {isDirty && parsed && (
                                      <span className="font-bold text-emerald-700 dark:text-emerald-300">
                                        -&gt; {formatHalamanToJuzStatus(parsed.targetTotal)}
                                      </span>
                                    )}
                                  </div>
                                  {hasError && parsed?.errorMsg && (
                                    <p className="mt-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                                      {parsed.errorMsg}
                                    </p>
                                  )}
                                </td>

                                <td className="hidden sm:table-cell px-3 py-2 text-center font-mono text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                  {formatHalamanToJuzStatus(initial)}
                                </td>

                                <td className="px-2 py-2 text-center">
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    max={30}
                                    step={1}
                                    value={draft.juz}
                                    disabled={saving}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) =>
                                      handleFieldChange(r.santri_id, "juz", e.target.value)
                                    }
                                    aria-label={`Juz untuk ${r.nama_lengkap}`}
                                    className={`h-10 w-16 rounded-lg border text-center font-mono text-sm font-bold transition focus:outline-none focus:ring-2 ${
                                      hasError
                                        ? "border-rose-500 bg-white text-rose-700 focus:ring-rose-500/20 dark:bg-slate-900 dark:text-rose-300"
                                        : isDirty
                                        ? "border-emerald-600 bg-white text-emerald-900 focus:ring-emerald-500/20 dark:border-emerald-500 dark:bg-slate-900 dark:text-emerald-200"
                                        : "border-slate-300 bg-white text-slate-800 focus:border-emerald-600 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                    }`}
                                  />
                                </td>

                                <td className="px-2 py-2 text-center">
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    max={19}
                                    step={1}
                                    value={isMaxJuz ? "0" : draft.halaman}
                                    disabled={saving || isMaxJuz}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) =>
                                      handleFieldChange(r.santri_id, "halaman", e.target.value)
                                    }
                                    aria-label={`Halaman untuk ${r.nama_lengkap}`}
                                    className={`h-10 w-16 rounded-lg border text-center font-mono text-sm font-bold transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-800/60 ${
                                      hasError
                                        ? "border-rose-500 bg-white text-rose-700 focus:ring-rose-500/20 dark:bg-slate-900 dark:text-rose-300"
                                        : isDirty
                                        ? "border-emerald-600 bg-white text-emerald-900 focus:ring-emerald-500/20 dark:border-emerald-500 dark:bg-slate-900 dark:text-emerald-200"
                                        : "border-slate-300 bg-white text-slate-800 focus:border-emerald-600 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                    }`}
                                  />
                                </td>

                                <td className="hidden md:table-cell px-3 py-2 text-center whitespace-nowrap">
                                  {parsed && parsed.isValid ? (
                                    <div className="inline-flex flex-col items-center">
                                      <span
                                        className={`rounded-lg px-2 py-0.5 font-mono text-[11px] font-bold ${
                                          isDirty
                                            ? "bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-700"
                                            : "text-slate-600 dark:text-slate-300"
                                        }`}
                                      >
                                        {formatHalamanToJuzStatus(parsed.targetTotal)}
                                      </span>
                                      <span className="font-mono text-[10px] text-slate-400 mt-0.5">
                                        {parsed.targetTotal}/60 Hlm
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                                      Periksa angka
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              );
            })
          )}
        </div>

        {/* Konfirmasi Buang Perubahan */}
        {confirmDiscardOpen && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 sm:px-6 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <span className="font-semibold">
              Ada {dirtyCount} perubahan yang belum disimpan. Tutup tanpa menyimpan?
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmDiscardOpen(false)}
                className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-slate-800 dark:text-amber-200"
              >
                Lanjut Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmDiscardOpen(false);
                  onClose();
                }}
                className="rounded-lg bg-rose-600 px-3 py-1.5 font-semibold text-white hover:bg-rose-700"
              >
                Buang &amp; Tutup
              </button>
            </div>
          </div>
        )}

        {/* Footer Sticky */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs">
            {invalidCount > 0 ? (
              <span className="font-semibold text-rose-600 dark:text-rose-400">
                {invalidCount} baris memiliki angka tidak valid (Juz 0-30, Halaman 0-19).
              </span>
            ) : dirtyCount > 0 ? (
              <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                {dirtyCount} santri siap disimpan perubahannya.
              </span>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">
                Belum ada perubahan nilai Juz atau Halaman.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {dirtyCount > 0 && (
              <button
                type="button"
                onClick={handleResetChanges}
                disabled={saving}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}
            <button
              type="button"
              onClick={requestClose}
              disabled={saving}
              className="h-10 rounded-xl border border-slate-300 px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving || dirtyCount === 0 || invalidCount > 0 || loading}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-800 px-4 text-xs font-bold text-white shadow transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-emerald-700 dark:hover:bg-emerald-800"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Simpan Perubahan {dirtyCount > 0 ? `(${dirtyCount})` : ""}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
