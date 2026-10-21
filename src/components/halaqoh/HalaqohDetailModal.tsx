"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  X,
  Calendar,
  BookOpen,
  UserCheck,
  Plus,
  Save,
  Check,
  ChevronRight,
  RotateCcw,
  Sparkles,
  FileText,
} from "lucide-react";
import {
  fetchAbsensiBulan,
  upsertAbsensiCell,
  fetchSetoranBulananMerged,
  insertSetoranLog,
  fetchSantriSetoranDetailTahun,
  saveSetoranBulanDirect,
  isSessionPastOrCurrent,
} from "@/lib/services/tahfidz-service";
import { formatKamarDisplay } from "@/lib/services/hierarchy-service";
import {
  PEMETAAN_HALAQOH_KELAS,
  type Santri,
  type SesiAbsen,
  type StatusAbsen,
  type SetoranBulananRow,
} from "@/types/database";
import { type FormasiHalaqohItem } from "@/lib/services/halaqoh-service";
import { useToast } from "@/components/ui/Toast";

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

const NAMA_HARI_SINGKAT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const MONTH_KEYS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "mei",
  "jun",
  "jul",
  "agu",
  "sep",
  "okt",
  "nov",
  "des",
] as const;

function isFridayDate(year: number, month1Based: number, day: number): boolean {
  const d = new Date(year, month1Based - 1, day);
  return d.getDay() === 5;
}

function getDayNameShort(year: number, month1Based: number, day: number): string {
  const d = new Date(year, month1Based - 1, day);
  return NAMA_HARI_SINGKAT[d.getDay()];
}

function toLocalIsoDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface HalaqohDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  formasi: FormasiHalaqohItem | null;
  santriList: Santri[];
  onDataChanged?: () => void;
  onSantriClick?: (santri: Santri) => void;
}

export function HalaqohDetailModal({
  isOpen,
  onClose,
  formasi,
  santriList,
  onDataChanged,
  onSantriClick,
}: HalaqohDetailModalProps) {
  const { showToast } = useToast();

  // Tab switch: "kegiatan" (Absensi Harian) atau "juz_baru" (Setoran Juz Baru)
  const [activeTab, setActiveTab] = useState<"kegiatan" | "juz_baru">("kegiatan");

  const now = new Date();
  const [tahun, setTahun] = useState(now.getFullYear());
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [sesi, setSesi] = useState<SesiAbsen | "semua">("semua");

  // State untuk Tab Kegiatan (Absensi)
  // Key format: `${santriId}_${day}_${sesi}` => StatusAbsen | ""
  const [absenMap, setAbsenMap] = useState<Record<string, StatusAbsen | "">>({});
  const [loadingKegiatan, setLoadingKegiatan] = useState(false);

  // State untuk Tab Juz Baru (Setoran)
  const [setoranRows, setSetoranRows] = useState<SetoranBulananRow[]>([]);
  const [loadingJuzBaru, setLoadingJuzBaru] = useState(false);

  // Modal Input Setoran Baru (Gambar 5)
  const [inputSetoranOpen, setInputSetoranOpen] = useState(false);
  const [selectedSantriId, setSelectedSantriId] = useState("");
  const [tanggalSetoran, setTanggalSetoran] = useState(toLocalIsoDate(now));
  const [jumlahJuz, setJumlahJuz] = useState<number>(0.5);
  const [catatanSetoran, setCatatanSetoran] = useState("");
  const [isSavingSetoran, setIsSavingSetoran] = useState(false);

  // Modal Detail Santri Seluruh Bulan (Input Tambah Juz & Keterangan per santri)
  const [santriDetailModalOpen, setSantriDetailModalOpen] = useState(false);
  const [selectedSantriDetail, setSelectedSantriDetail] = useState<SetoranBulananRow | null>(null);
  const [santriMonthInputs, setSantriMonthInputs] = useState<
    { bulan: number; namaBulan: string; jumlahJuz: number | ""; catatan: string }[]
  >([]);
  const [loadingSantriDetail, setLoadingSantriDetail] = useState(false);
  const [isSavingSantriDetail, setIsSavingSantriDetail] = useState(false);

  // Santri yang tergabung dalam halaqoh ini
  const halaqohSantri = useMemo(() => {
    if (!formasi) return [];
    return santriList.filter(
      (s) =>
        s.halaqoh_kelas === formasi.kelas &&
        String(s.halaqoh_bagian).toUpperCase() === String(formasi.bagian).toUpperCase()
    );
  }, [formasi, santriList]);

  // Jumlah hari dalam bulan terpilih
  const totalDays = new Date(tahun, bulan, 0).getDate();
  const dayNumbers = Array.from({ length: totalDays }, (_, i) => i + 1);

  // Muat data absensi (Tab Kegiatan)
  const loadAbsensiData = useCallback(async () => {
    if (!isOpen || !formasi) return;
    setLoadingKegiatan(true);
    try {
      const records = await fetchAbsensiBulan(tahun, bulan, sesi);
      const map: Record<string, StatusAbsen | ""> = {};
      for (const row of records) {
        const parts = row.tanggal.split("-");
        const d = parts.length === 3 ? parseInt(parts[2], 10) : new Date(row.tanggal).getDate();
        if (!isNaN(d)) {
          map[`${row.santri_id}_${d}_${row.sesi}`] = row.status;
        }
      }
      setAbsenMap(map);
    } catch (err) {
      console.error(err);
      showToast("error", "Gagal memuat presensi kegiatan halaqoh.");
    } finally {
      setLoadingKegiatan(false);
    }
  }, [isOpen, formasi, tahun, bulan, sesi, showToast]);

  // Muat data setoran bulanan (Tab Juz Baru)
  const loadJuzBaruData = useCallback(async () => {
    if (!isOpen || !formasi) return;
    setLoadingJuzBaru(true);
    try {
      const rows = await fetchSetoranBulananMerged(tahun, "juz_baru", {
        halaqoh_kelas: formasi.kelas,
        halaqoh_bagian: formasi.bagian,
      });
      setSetoranRows(rows);
    } catch (err) {
      console.error(err);
      showToast("error", "Gagal memuat setoran juz baru.");
    } finally {
      setLoadingJuzBaru(false);
    }
  }, [isOpen, formasi, tahun, showToast]);

  useEffect(() => {
    if (activeTab === "kegiatan") {
      loadAbsensiData();
    } else {
      loadJuzBaruData();
    }
  }, [activeTab, loadAbsensiData, loadJuzBaruData]);

  // 1. Jika ada status tersimpan di absenMap (hadir/alfa/izin/sakit/kosong), gunakan itu.
  // 2. Jika sesi telah/sedang berjalan (Pagi >= 04.00 WIB, Malam >= 17.00 WIB): otomatis Hadir.
  // 3. Jika sesi mendatang/belum dimulai: kosong ("").
  const getEffectiveStatus = useCallback(
    (santriId: string, day: number, sesiType: SesiAbsen): StatusAbsen | "" => {
      const key = `${santriId}_${day}_${sesiType}`;
      if (key in absenMap) {
        return absenMap[key];
      }
      if (isSessionPastOrCurrent(tahun, bulan, day, sesiType)) {
        return "hadir";
      }
      return "";
    },
    [absenMap, tahun, bulan]
  );

  // Update status absen santri per tanggal dan sesi
  const handleCellStatusChange = async (
    santriId: string,
    day: number,
    targetSesi: SesiAbsen,
    newStatus: StatusAbsen | ""
  ) => {
    const key = `${santriId}_${day}_${targetSesi}`;
    const oldStatus = getEffectiveStatus(santriId, day, targetSesi);
    if (oldStatus === newStatus) return;

    // Optimistic update
    setAbsenMap((prev) => {
      const copy = { ...prev };
      if (!newStatus) copy[key] = "";
      else copy[key] = newStatus;
      return copy;
    });

    const dateStr = `${tahun}-${String(bulan).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    try {
      await upsertAbsensiCell({
        santri_id: santriId,
        tanggal: dateStr,
        sesi: targetSesi,
        status: newStatus,
      });
      if (onDataChanged) onDataChanged();
    } catch (err) {
      // Rollback
      setAbsenMap((prev) => {
        const copy = { ...prev };
        copy[key] = oldStatus;
        return copy;
      });
      showToast("error", "Gagal menyimpan perubahan presensi.");
    }
  };

  // Simpan setoran juz baru via pop-up tunggal
  const handleSaveSetoran = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSantriId) {
      showToast("error", "Pilih santri terlebih dahulu.");
      return;
    }
    if (jumlahJuz <= 0) {
      showToast("error", "Jumlah juz tambahan harus lebih dari 0.");
      return;
    }

    setIsSavingSetoran(true);
    try {
      await insertSetoranLog({
        santri_id: selectedSantriId,
        tanggal: tanggalSetoran,
        tipe: "juz_baru",
        jumlah_juz_tambahan: Number(jumlahJuz),
        catatan: catatanSetoran.trim() || undefined,
      });
      showToast("success", "Setoran juz baru berhasil disimpan.");
      setInputSetoranOpen(false);
      setCatatanSetoran("");
      setSelectedSantriId("");
      loadJuzBaruData();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Gagal menyimpan setoran.");
    } finally {
      setIsSavingSetoran(false);
    }
  };

  // Handle pengisian langsung nilai setoran per bulan pada tabel (tanpa buka pop-up)
  const handleDirectMonthChange = async (
    santriId: string,
    monthNum: number,
    newVal: number,
    santriName: string
  ) => {
    const monthKey = MONTH_KEYS[monthNum - 1];

    // Optimistic update di local state
    setSetoranRows((prev) =>
      prev.map((row) => {
        if (row.santri_id !== santriId) return row;
        const updatedRow = { ...row, [monthKey]: newVal };
        const newTotal = MONTH_KEYS.reduce((sum, k) => sum + (Number(updatedRow[k]) || 0), 0);
        return { ...updatedRow, total_setoran: Math.round(newTotal * 100) / 100 };
      })
    );

    try {
      await saveSetoranBulanDirect({
        santri_id: santriId,
        tahun,
        bulan: monthNum,
        tipe: "juz_baru",
        jumlah_juz_tambahan: newVal,
      });
      showToast("success", `Setoran ${santriName} bulan ${BULAN_NAMES[monthNum - 1]} tersimpan.`);
      if (onDataChanged) onDataChanged();
    } catch (err) {
      console.error(err);
      showToast("error", "Gagal menyimpan setoran langsung.");
      loadJuzBaruData();
    }
  };

  // Buka modal detail santri seluruh bulan saat nama diklik di tab Juz Baru
  const handleOpenSantriDetail = async (santriRow: SetoranBulananRow) => {
    setSelectedSantriDetail(santriRow);
    setSantriDetailModalOpen(true);
    setLoadingSantriDetail(true);

    try {
      const logs = await fetchSantriSetoranDetailTahun(santriRow.santri_id, tahun, "juz_baru");

      // Kelompokkan catatan logs per bulan
      const notesByMonth: Record<number, string[]> = {};
      logs.forEach((log) => {
        const parts = log.tanggal.split("-");
        const m = parts.length >= 2 ? parseInt(parts[1], 10) : new Date(log.tanggal).getMonth() + 1;
        if (!isNaN(m)) {
          if (!notesByMonth[m]) notesByMonth[m] = [];
          if (log.catatan && log.catatan.trim()) {
            notesByMonth[m].push(log.catatan.trim());
          }
        }
      });

      const initialInputs = BULAN_NAMES.map((namaBulan, idx) => {
        const m = idx + 1;
        const mKey = MONTH_KEYS[idx];
        const currentJuz = santriRow[mKey] || 0;
        const existingNotes = notesByMonth[m]?.join("; ") || "";
        return {
          bulan: m,
          namaBulan,
          jumlahJuz: currentJuz > 0 ? currentJuz : ("" as const),
          catatan: existingNotes,
        };
      });

      setSantriMonthInputs(initialInputs);
    } catch (err) {
      console.error(err);
      showToast("error", "Gagal memuat rincian setoran santri.");
    } finally {
      setLoadingSantriDetail(false);
    }
  };

  // Simpan setoran dan keterangan seluruh bulan untuk santri terpilih
  const handleSaveSantriDetailAllMonths = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSantriDetail) return;

    setIsSavingSantriDetail(true);
    try {
      for (const item of santriMonthInputs) {
        const val = item.jumlahJuz === "" ? 0 : Number(item.jumlahJuz);
        await saveSetoranBulanDirect({
          santri_id: selectedSantriDetail.santri_id,
          tahun,
          bulan: item.bulan,
          tipe: "juz_baru",
          jumlah_juz_tambahan: val,
          catatan: item.catatan,
        });
      }
      showToast(
        "success",
        `Setoran dan keterangan ${selectedSantriDetail.nama_lengkap} berhasil disimpan.`
      );
      setSantriDetailModalOpen(false);
      loadJuzBaruData();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      console.error(err);
      showToast("error", "Gagal menyimpan setoran seluruh bulan.");
    } finally {
      setIsSavingSantriDetail(false);
    }
  };

  if (!isOpen || !formasi) return null;

  const targetJuz = PEMETAAN_HALAQOH_KELAS[formasi.kelas] || "-";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-6xl max-h-[92vh] rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl flex flex-col dark:border-slate-800 dark:bg-slate-900">
        {/* ========================================================================= */}
        {/* HEADER MODAL: IDENTITAS HALAQOH & DUA TOMBOL SWITCH (KEGIATAN & JUZ BARU)   */}
        {/* ========================================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-800 text-white font-extrabold text-sm shadow">
              {formasi.kelas}
              {formasi.bagian}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  Data Santri Halaqoh {formasi.kelas}
                  {formasi.bagian}
                </h2>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                  {targetJuz}
                </span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {halaqohSantri.length} Santri
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Pembimbing:</span>
                <strong className="text-emerald-900 dark:text-emerald-300 font-bold">
                  {formasi.pembimbing || "(Belum diisi)"}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 2 SWITCH TOMBOL: (KEGIATAN & JUZ BARU) */}
            <div className="flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab("kegiatan")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                  activeTab === "kegiatan"
                    ? "bg-white text-emerald-800 shadow-sm dark:bg-slate-900 dark:text-emerald-300"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Kegiatan (Presensi)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("juz_baru")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                  activeTab === "juz_baru"
                    ? "bg-white text-emerald-800 shadow-sm dark:bg-slate-900 dark:text-emerald-300"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Juz Baru (Setoran)</span>
              </button>
            </div>

            {/* Tombol Tutup Modal */}
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-white transition"
              aria-label="Tutup Modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BODY 1: TAB KEGIATAN (PRESENSI HARIAN: SEMUA / PAGI / MALAM)               */}
        {/* ========================================================================= */}
        {activeTab === "kegiatan" && (
          <div className="flex-1 flex flex-col min-h-0 pt-3 space-y-3">
            {/* Filter Sesi (SEMUA / PAGI / MALAM), Bulan, & Tahun */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                {/* Switch 3 Tombol: SEMUA / PAGI / MALAM */}
                <div className="flex items-center rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setSesi("semua")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      sesi === "semua"
                        ? "bg-emerald-800 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                    }`}
                  >
                    SEMUA
                  </button>
                  <button
                    type="button"
                    onClick={() => setSesi("pagi")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      sesi === "pagi"
                        ? "bg-emerald-800 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                    }`}
                  >
                    PAGI
                  </button>
                  <button
                    type="button"
                    onClick={() => setSesi("malam")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      sesi === "malam"
                        ? "bg-emerald-800 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                    }`}
                  >
                    MALAM
                  </button>
                </div>

                {/* Bulan */}
                <select
                  value={bulan}
                  onChange={(e) => setBulan(Number(e.target.value))}
                  className="h-8 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {BULAN_NAMES.map((name, idx) => (
                    <option key={name} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </select>

                {/* Tahun */}
                <input
                  type="number"
                  value={tahun}
                  onChange={(e) => setTahun(Number(e.target.value))}
                  className="h-8 w-20 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>

              {/* Keterangan Status */}
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span>
                  <strong>H</strong>: Hadir
                </span>
                <span>
                  <strong>A</strong>: Alfa
                </span>
                <span>
                  <strong>I</strong>: Izin
                </span>
                <span>
                  <strong>S</strong>: Sakit
                </span>
                <span className="text-slate-400">|</span>
                <span className="text-rose-600 font-semibold">JUM = Libur</span>
                {sesi === "semua" && (
                  <span className="text-emerald-700 font-semibold">
                    (P = Pagi, M = Malam)
                  </span>
                )}
              </div>
            </div>

            {/* Tabel Kalender Presensi */}
            <div className="flex-1 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
              {loadingKegiatan ? (
                <div className="py-20 text-center text-xs font-bold text-slate-500">
                  Memuat data presensi halaqoh...
                </div>
              ) : halaqohSantri.length === 0 ? (
                <div className="py-20 text-center text-xs text-slate-400">
                  Belum ada santri di halaqoh ini.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300 sticky top-0 z-10 shadow-xs">
                    <tr>
                      <th
                        rowSpan={sesi === "semua" ? 2 : 1}
                        className="py-2 px-2.5 border-b border-r border-slate-200 dark:border-slate-700 w-10 text-center"
                      >
                        NO
                      </th>
                      <th
                        rowSpan={sesi === "semua" ? 2 : 1}
                        className="py-2 px-3 border-b border-r border-slate-200 dark:border-slate-700 min-w-[170px]"
                      >
                        NAMA SANTRI
                      </th>
                      <th
                        rowSpan={sesi === "semua" ? 2 : 1}
                        className="py-2 px-2 border-b border-r border-slate-200 dark:border-slate-700 w-16 text-center"
                      >
                        KAMAR
                      </th>

                      {/* Kolom Tanggal 1 s.d. Akhir Bulan dengan Nama Hari Singkat */}
                      {dayNumbers.map((d) => {
                        const isFriday = isFridayDate(tahun, bulan, d);
                        const dayName = getDayNameShort(tahun, bulan, d);
                        return (
                          <th
                            key={d}
                            colSpan={sesi === "semua" ? 2 : 1}
                            className={`py-1.5 px-1 border-b border-r border-slate-200 dark:border-slate-700 text-center ${
                              sesi === "semua" ? "min-w-[56px]" : "w-8"
                            } ${
                              isFriday
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-extrabold"
                                : ""
                            }`}
                          >
                            <div className="font-bold">{d}</div>
                            <div
                              className={`text-[9px] font-semibold uppercase ${
                                isFriday
                                  ? "text-rose-600 dark:text-rose-400 font-bold"
                                  : "text-slate-400 dark:text-slate-500"
                              }`}
                            >
                              {dayName}
                            </div>
                          </th>
                        );
                      })}

                      {/* Rekap H / A / I / S */}
                      <th
                        rowSpan={sesi === "semua" ? 2 : 1}
                        className="py-2 px-1.5 border-b border-r border-slate-200 dark:border-slate-700 text-center w-9 bg-emerald-50 text-emerald-800 font-bold dark:bg-emerald-950/40 dark:text-emerald-300"
                      >
                        H
                      </th>
                      <th
                        rowSpan={sesi === "semua" ? 2 : 1}
                        className="py-2 px-1.5 border-b border-r border-slate-200 dark:border-slate-700 text-center w-9 bg-rose-50 text-rose-800 font-bold dark:bg-rose-950/40 dark:text-rose-300"
                      >
                        A
                      </th>
                      <th
                        rowSpan={sesi === "semua" ? 2 : 1}
                        className="py-2 px-1.5 border-b border-r border-slate-200 dark:border-slate-700 text-center w-9 bg-blue-50 text-blue-800 font-bold dark:bg-blue-950/40 dark:text-blue-300"
                      >
                        I
                      </th>
                      <th
                        rowSpan={sesi === "semua" ? 2 : 1}
                        className="py-2 px-1.5 border-b border-slate-200 dark:border-slate-700 text-center w-9 bg-amber-50 text-amber-800 font-bold dark:bg-amber-950/40 dark:text-amber-300"
                      >
                        S
                      </th>
                    </tr>

                    {/* Jika Sesi "SEMUA", render sub-header Pagi (P) & Malam (M) */}
                    {sesi === "semua" && (
                      <tr className="bg-slate-100/90 text-[10px] text-slate-500 dark:bg-slate-800/90 dark:text-slate-400">
                        {dayNumbers.map((d) => {
                          const isFriday = isFridayDate(tahun, bulan, d);
                          return (
                            <React.Fragment key={`sub_${d}`}>
                              <th
                                className={`py-0.5 px-0.5 text-center border-b border-r border-slate-200 dark:border-slate-700 font-bold ${
                                  isFriday ? "bg-rose-100/50 text-rose-800" : ""
                                }`}
                              >
                                P
                              </th>
                              <th
                                className={`py-0.5 px-0.5 text-center border-b border-r border-slate-200 dark:border-slate-700 font-bold ${
                                  isFriday ? "bg-rose-100/50 text-rose-800" : ""
                                }`}
                              >
                                M
                              </th>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    )}
                  </thead>

                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {halaqohSantri.map((s, idx) => {
                      let countH = 0;
                      let countA = 0;
                      let countI = 0;
                      let countS = 0;

                      const checkAndIncrement = (statusVal?: StatusAbsen | "") => {
                        if (statusVal === "hadir") countH++;
                        else if (statusVal === "alfa") countA++;
                        else if (statusVal === "izin") countI++;
                        else if (statusVal === "sakit") countS++;
                      };

                      dayNumbers.forEach((d) => {
                        if (isFridayDate(tahun, bulan, d)) return;
                        if (sesi === "semua") {
                          checkAndIncrement(getEffectiveStatus(s.id, d, "pagi"));
                          checkAndIncrement(getEffectiveStatus(s.id, d, "malam"));
                        } else {
                          checkAndIncrement(getEffectiveStatus(s.id, d, sesi as SesiAbsen));
                        }
                      });

                      return (
                        <tr
                          key={s.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-1.5 px-2 text-center font-mono text-slate-500 border-r border-slate-200 dark:border-slate-800">
                            {idx + 1}
                          </td>
                          <td
                            onClick={() => onSantriClick && onSantriClick(s)}
                            className="py-1.5 px-3 font-semibold text-slate-900 border-r border-slate-200 dark:border-slate-800 dark:text-slate-100 hover:text-emerald-700 cursor-pointer"
                          >
                            {s.nama_lengkap}
                          </td>
                          <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-700 border-r border-slate-200 dark:border-slate-800 dark:text-slate-300">
                            {formatKamarDisplay(s.kode_kamar, s.kamar)}
                          </td>

                          {/* Sel Kalender Presensi Tiap Hari */}
                          {dayNumbers.map((d) => {
                            const isFriday = isFridayDate(tahun, bulan, d);

                            if (isFriday) {
                              if (sesi === "semua") {
                                return (
                                  <React.Fragment key={d}>
                                    <td className="py-1 px-0.5 text-center border-r border-slate-200 bg-slate-100/70 text-slate-400 font-mono text-[10px] dark:border-slate-800 dark:bg-slate-800/40">
                                      -
                                    </td>
                                    <td className="py-1 px-0.5 text-center border-r border-slate-200 bg-slate-100/70 text-slate-400 font-mono text-[10px] dark:border-slate-800 dark:bg-slate-800/40">
                                      -
                                    </td>
                                  </React.Fragment>
                                );
                              }
                              return (
                                <td
                                  key={d}
                                  className="py-1 px-0.5 text-center border-r border-slate-200 bg-slate-100/70 text-slate-400 font-mono text-[10px] dark:border-slate-800 dark:bg-slate-800/40"
                                >
                                  -
                                </td>
                              );
                            }

                            if (sesi === "semua") {
                              const currentValPagi = getEffectiveStatus(s.id, d, "pagi");
                              const currentValMalam = getEffectiveStatus(s.id, d, "malam");
                              return (
                                <React.Fragment key={d}>
                                  {/* Sesi Pagi */}
                                  <td className="py-1 px-0.5 text-center border-r border-slate-200 dark:border-slate-800 p-0">
                                    <select
                                      value={currentValPagi}
                                      onChange={(e) =>
                                        handleCellStatusChange(
                                          s.id,
                                          d,
                                          "pagi",
                                          e.target.value as StatusAbsen | ""
                                        )
                                      }
                                      title={`Pagi - Tgl ${d}: ${s.nama_lengkap}`}
                                      className={`h-7 w-7 text-center rounded text-[11px] font-bold border cursor-pointer focus:outline-none transition appearance-none [&::-ms-expand]:hidden ${
                                        currentValPagi === "hadir"
                                          ? "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700"
                                          : currentValPagi === "alfa"
                                          ? "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-700"
                                          : currentValPagi === "izin"
                                          ? "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-700"
                                          : currentValPagi === "sakit"
                                          ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700"
                                          : "bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-800"
                                      }`}
                                    >
                                      <option value="">-</option>
                                      <option value="hadir">H</option>
                                      <option value="alfa">A</option>
                                      <option value="izin">I</option>
                                      <option value="sakit">S</option>
                                    </select>
                                  </td>
                                  {/* Sesi Malam */}
                                  <td className="py-1 px-0.5 text-center border-r border-slate-200 dark:border-slate-800 p-0">
                                    <select
                                      value={currentValMalam}
                                      onChange={(e) =>
                                        handleCellStatusChange(
                                          s.id,
                                          d,
                                          "malam",
                                          e.target.value as StatusAbsen | ""
                                        )
                                      }
                                      title={`Malam - Tgl ${d}: ${s.nama_lengkap}`}
                                      className={`h-7 w-7 text-center rounded text-[11px] font-bold border cursor-pointer focus:outline-none transition appearance-none [&::-ms-expand]:hidden ${
                                        currentValMalam === "hadir"
                                          ? "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700"
                                          : currentValMalam === "alfa"
                                          ? "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-700"
                                          : currentValMalam === "izin"
                                          ? "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-700"
                                          : currentValMalam === "sakit"
                                          ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700"
                                          : "bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-800"
                                      }`}
                                    >
                                      <option value="">-</option>
                                      <option value="hadir">H</option>
                                      <option value="alfa">A</option>
                                      <option value="izin">I</option>
                                      <option value="sakit">S</option>
                                    </select>
                                  </td>
                                </React.Fragment>
                              );
                            }

                            // Sesi Tunggal (Pagi atau Malam)
                            const currentVal = getEffectiveStatus(s.id, d, sesi as SesiAbsen);
                            return (
                              <td
                                key={d}
                                className="py-1 px-0.5 text-center border-r border-slate-200 dark:border-slate-800 p-0"
                              >
                                <select
                                  value={currentVal}
                                  onChange={(e) =>
                                    handleCellStatusChange(
                                      s.id,
                                      d,
                                      sesi as SesiAbsen,
                                      e.target.value as StatusAbsen | ""
                                    )
                                  }
                                  title={`${sesi.toUpperCase()} - Tgl ${d}: ${s.nama_lengkap}`}
                                  className={`h-7 w-7 text-center rounded text-[11px] font-bold border cursor-pointer focus:outline-none transition appearance-none [&::-ms-expand]:hidden ${
                                    currentVal === "hadir"
                                      ? "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700"
                                      : currentVal === "alfa"
                                      ? "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-700"
                                      : currentVal === "izin"
                                      ? "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-700"
                                      : currentVal === "sakit"
                                      ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700"
                                      : "bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-800"
                                  }`}
                                >
                                  <option value="">-</option>
                                  <option value="hadir">H</option>
                                  <option value="alfa">A</option>
                                  <option value="izin">I</option>
                                  <option value="sakit">S</option>
                                </select>
                              </td>
                            );
                          })}

                          {/* Rekap Total H / A / I / S */}
                          <td className="py-1.5 px-1 text-center font-bold font-mono text-emerald-800 border-r border-slate-200 bg-emerald-50/50 dark:border-slate-800 dark:bg-emerald-950/20 dark:text-emerald-300">
                            {countH}
                          </td>
                          <td className="py-1.5 px-1 text-center font-bold font-mono text-rose-800 border-r border-slate-200 bg-rose-50/50 dark:border-slate-800 dark:bg-rose-950/20 dark:text-rose-300">
                            {countA}
                          </td>
                          <td className="py-1.5 px-1 text-center font-bold font-mono text-blue-800 border-r border-slate-200 bg-blue-50/50 dark:border-slate-800 dark:bg-blue-950/20 dark:text-blue-300">
                            {countI}
                          </td>
                          <td className="py-1.5 px-1 text-center font-bold font-mono text-amber-800 bg-amber-50/50 dark:bg-amber-950/20 dark:text-amber-300">
                            {countS}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BODY 2: TAB JUZ BARU (SETORAN BULANAN SANTRI)                              */}
        {/* ========================================================================= */}
        {activeTab === "juz_baru" && (
          <div className="flex-1 flex flex-col min-h-0 pt-3 space-y-3">
            {/* Filter Tahun, Petunjuk, & Tombol Tambah Setoran */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-semibold">Tahun:</span>
                  <input
                    type="number"
                    value={tahun}
                    onChange={(e) => setTahun(Number(e.target.value))}
                    className="h-8 w-20 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />
                </div>
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  Tip: Sel bulan dapat diketik langsung. Klik <strong>Nama Santri</strong> untuk input seluruh bulan + catatan.
                </span>
              </div>

              {/* Tombol Tambah Setoran Baru */}
              <button
                type="button"
                onClick={() => {
                  setSelectedSantriId(halaqohSantri[0]?.id || "");
                  setTanggalSetoran(toLocalIsoDate(now));
                  setJumlahJuz(0.5);
                  setInputSetoranOpen(true);
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-emerald-800 px-3 text-xs font-bold text-white hover:bg-emerald-900 transition shadow"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Input Setoran Santri</span>
              </button>
            </div>

            {/* Tabel Rekap Setoran Jan s.d. Des */}
            <div className="flex-1 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
              {loadingJuzBaru ? (
                <div className="py-20 text-center text-xs font-bold text-slate-500">
                  Memuat data setoran juz baru...
                </div>
              ) : setoranRows.length === 0 ? (
                <div className="py-20 text-center text-xs text-slate-400">
                  Belum ada catatan setoran juz baru untuk halaqoh ini.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300 sticky top-0 z-10 shadow-xs">
                    <tr>
                      <th className="py-2 px-2.5 border-b border-r border-slate-200 dark:border-slate-700 w-10 text-center">
                        NO
                      </th>
                      <th className="py-2 px-3 border-b border-r border-slate-200 dark:border-slate-700 min-w-[180px]">
                        NAMA SANTRI
                      </th>
                      <th className="py-2 px-2 border-b border-r border-slate-200 dark:border-slate-700 w-16 text-center">
                        KAMAR
                      </th>
                      <th className="py-2 px-2 border-b border-r border-slate-200 dark:border-slate-700 text-center w-14">
                        JAN
                      </th>
                      <th className="py-2 px-2 border-b border-r border-slate-200 dark:border-slate-700 text-center w-14">
                        FEB
                      </th>
                      <th className="py-2 px-2 border-b border-r border-slate-200 dark:border-slate-700 text-center w-14">
                        MAR
                      </th>
                      <th className="py-2 px-2 border-b border-r border-slate-200 dark:border-slate-700 text-center w-14">
                        APR
                      </th>
                      <th className="py-2 px-2 border-b border-r border-slate-200 dark:border-slate-700 text-center w-14">
                        MEI
                      </th>
                      <th className="py-2 px-2 border-b border-r border-slate-200 dark:border-slate-700 text-center w-14">
                        JUN
                      </th>
                      <th className="py-2 px-2 border-b border-r border-slate-200 dark:border-slate-700 text-center w-14">
                        JUL
                      </th>
                      <th className="py-2 px-2 border-b border-r border-slate-200 dark:border-slate-700 text-center w-14">
                        AGU
                      </th>
                      <th className="py-2 px-2 border-b border-r border-slate-200 dark:border-slate-700 text-center w-14">
                        SEP
                      </th>
                      <th className="py-2 px-2 border-b border-r border-slate-200 dark:border-slate-700 text-center w-14">
                        OKT
                      </th>
                      <th className="py-2 px-2 border-b border-r border-slate-200 dark:border-slate-700 text-center w-14">
                        NOV
                      </th>
                      <th className="py-2 px-2 border-b border-r border-slate-200 dark:border-slate-700 text-center w-14">
                        DES
                      </th>
                      <th className="py-2 px-3 border-b border-slate-200 dark:border-slate-700 text-center w-24 bg-emerald-50 text-emerald-900 font-extrabold dark:bg-emerald-950/60 dark:text-emerald-300">
                        TOTAL JUZ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {setoranRows.map((r, idx) => (
                      <tr
                        key={r.santri_id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-2 px-2 text-center font-mono text-slate-500 border-r border-slate-200 dark:border-slate-800">
                          {idx + 1}
                        </td>
                        {/* Nama Santri dapat diklik untuk membuka modal input seluruh bulan */}
                        <td
                          onClick={() => handleOpenSantriDetail(r)}
                          className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-200 dark:border-slate-800 dark:text-slate-100 hover:text-emerald-700 hover:underline cursor-pointer group"
                          title="Klik untuk input tambah juz dan keterangan santri untuk seluruh bulan"
                        >
                          <div className="flex items-center justify-between">
                            <span>{r.nama_lengkap}</span>
                            <FileText className="h-3 w-3 text-slate-400 group-hover:text-emerald-600 transition shrink-0 opacity-0 group-hover:opacity-100 ml-1" />
                          </div>
                        </td>
                        {/* Kolom Kamar (Format E03) */}
                        <td className="py-2 px-2 text-center font-mono font-bold text-slate-700 border-r border-slate-200 dark:border-slate-800 dark:text-slate-300">
                          {formatKamarDisplay(r.kode_kamar, r.kamar)}
                        </td>

                        {/* 12 Kolom Bulan (JAN - DES): Dapat diinput langsung tanpa buka popup */}
                        {MONTH_KEYS.map((mKey, mIdx) => {
                          const val = Number(r[mKey]) || 0;
                          return (
                            <td
                              key={mKey}
                              className="py-1 px-1 text-center font-mono border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 p-0"
                            >
                              <input
                                type="number"
                                step="0.05"
                                min="0"
                                max="30"
                                key={`${r.santri_id}_${mKey}_${val}`}
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
                                className="h-8 w-12 text-center font-mono text-xs font-bold bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded border border-transparent hover:border-slate-300 focus:border-emerald-500 dark:hover:bg-slate-800 dark:focus:bg-slate-900 transition"
                                title={`Isi/ubah setoran ${r.nama_lengkap} bulan ${BULAN_NAMES[mIdx]}`}
                              />
                            </td>
                          );
                        })}

                        <td className="py-2 px-3 text-center font-extrabold font-mono text-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                          {r.total_setoran > 0 ? `${r.total_setoran} Juz` : "0"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUB-MODAL 1: INPUT SETORAN JUZ BARU TUNGGAL (Gambar 5 - FIXED Z-INDEX)    */}
        {/* ========================================================================= */}
        {inputSetoranOpen && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-emerald-700" />
                  <span>Input Setoran Juz Baru</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setInputSetoranOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                  aria-label="Tutup"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveSetoran} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Pilih Santri
                  </label>
                  <select
                    value={selectedSantriId}
                    onChange={(e) => setSelectedSantriId(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    required
                  >
                    <option value="">-- Pilih Santri --</option>
                    {halaqohSantri.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama_lengkap} (Kamar {formatKamarDisplay(s.kode_kamar, s.kamar)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tanggal
                    </label>
                    <input
                      type="date"
                      value={tanggalSetoran}
                      onChange={(e) => setTanggalSetoran(e.target.value)}
                      className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tambahan (Juz)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.05"
                      max="30"
                      value={jumlahJuz}
                      onChange={(e) => setJumlahJuz(Number(e.target.value))}
                      className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Catatan <span className="text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={catatanSetoran}
                    onChange={(e) => setCatatanSetoran(e.target.value)}
                    placeholder="Contoh: Juz 3 ayat 1 - 50 lancar"
                    className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
                  <button
                    type="button"
                    onClick={() => setInputSetoranOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingSetoran}
                    className="px-4 py-1.5 text-xs font-bold rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 transition shadow disabled:opacity-50"
                  >
                    {isSavingSetoran ? "Menyimpan..." : "Simpan Setoran"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUB-MODAL 2: DETAIL SETORAN SANTRI SELURUH BULAN (INPUT JUZ & CATATAN)    */}
        {/* ========================================================================= */}
        {santriDetailModalOpen && selectedSantriDetail && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl flex flex-col dark:border-slate-800 dark:bg-slate-900">
              {/* Header Modal Detail Santri */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {selectedSantriDetail.nama_lengkap}
                    </h3>
                    <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-mono font-bold text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                      Kamar {formatKamarDisplay(selectedSantriDetail.kode_kamar, selectedSantriDetail.kamar)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Input Tambah Juz & Keterangan untuk Seluruh Bulan (Tahun {tahun})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSantriDetailModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  aria-label="Tutup"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Input Seluruh Bulan (Januari - Desember) */}
              {loadingSantriDetail ? (
                <div className="py-20 text-center text-xs font-bold text-slate-500">
                  Memuat rincian setoran santri...
                </div>
              ) : (
                <form onSubmit={handleSaveSantriDetailAllMonths} className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 overflow-auto pr-1 space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-[11px] font-bold uppercase text-slate-500 px-2 pb-1 border-b border-slate-200 dark:border-slate-700">
                      <div className="col-span-3">Bulan</div>
                      <div className="col-span-3">Tambah (Juz)</div>
                      <div className="col-span-6">Keterangan / Catatan</div>
                    </div>

                    {santriMonthInputs.map((item, idx) => (
                      <div
                        key={item.bulan}
                        className="grid grid-cols-12 gap-2 items-center rounded-xl bg-slate-50 p-2 border border-slate-200/80 dark:bg-slate-800/40 dark:border-slate-700/60"
                      >
                        <div className="col-span-3 text-xs font-bold text-slate-800 dark:text-slate-200">
                          {item.namaBulan}
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            max="30"
                            placeholder="0"
                            value={item.jumlahJuz}
                            onChange={(e) => {
                              const val = e.target.value === "" ? "" : Number(e.target.value);
                              setSantriMonthInputs((prev) =>
                                prev.map((m, i) => (i === idx ? { ...m, jumlahJuz: val } : m))
                              );
                            }}
                            className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2 text-center text-xs font-mono font-bold text-slate-900 shadow-xs focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          />
                        </div>
                        <div className="col-span-6">
                          <input
                            type="text"
                            placeholder="Contoh: Juz 3 lancar, khatam..."
                            value={item.catatan}
                            onChange={(e) => {
                              const note = e.target.value;
                              setSantriMonthInputs((prev) =>
                                prev.map((m, i) => (i === idx ? { ...m, catatan: note } : m))
                              );
                            }}
                            className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-800 shadow-xs focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer Total & Tombol Aksi */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 mt-3">
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      Total Setoran:{" "}
                      <strong className="text-emerald-800 dark:text-emerald-300 font-extrabold text-sm">
                        {Math.round(
                          santriMonthInputs.reduce(
                            (sum, m) => sum + (Number(m.jumlahJuz) || 0),
                            0
                          ) * 100
                        ) / 100}{" "}
                        Juz
                      </strong>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSantriDetailModalOpen(false)}
                        className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingSantriDetail}
                        className="px-4 py-1.5 text-xs font-bold rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 transition shadow disabled:opacity-50 inline-flex items-center gap-1.5"
                      >
                        <Save className="h-3.5 w-3.5" />
                        <span>{isSavingSantriDetail ? "Menyimpan..." : "Simpan Semua Bulan"}</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
