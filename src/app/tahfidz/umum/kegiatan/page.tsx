"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  FileSpreadsheet,
  Printer,
  SlidersHorizontal,
  X,
  RotateCcw,
  Check,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Users,
  CalendarRange,
  Info,
  LayoutGrid,
  Table as TableIcon,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import {
  fetchAllSantriFiltered,
  fetchAbsensiBulan,
  upsertAbsensiCell,
  upsertAbsensiBatch,
} from "@/lib/services/tahfidz-service";
import { formatKamarDisplay } from "@/lib/services/hierarchy-service";
import {
  HALAQOH_BAGIAN_LIST,
  HALAQOH_KELAS_LIST,
  PEMETAAN_HALAQOH_KELAS,
  type Santri,
  type SesiAbsen,
  type StatusAbsen,
} from "@/types/database";
import { HalaqohBadge } from "@/components/ui/Badges";
import { HalaqohDetailModal } from "@/components/halaqoh/HalaqohDetailModal";
import { loadHalaqohFormasi, type FormasiHalaqohItem } from "@/lib/services/halaqoh-service";
import { exportJsonToExcel } from "@/lib/utils/excel";
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

// Mengecek apakah tanggal tertentu adalah hari Jumat (getDay() === 5)
function isFridayDate(year: number, month1Based: number, day: number): boolean {
  const d = new Date(year, month1Based - 1, day);
  return d.getDay() === 5;
}

function getDayNameShort(year: number, month1Based: number, day: number): string {
  const d = new Date(year, month1Based - 1, day);
  return NAMA_HARI_SINGKAT[d.getDay()];
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

export default function KegiatanAbsensiPage() {
  const { showToast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const [tahun, setTahun] = useState(now.getFullYear());
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [sesi, setSesi] = useState<SesiAbsen | "semua">("pagi");

  const [search, setSearch] = useState("");
  const [asramaFilter, setAsramaFilter] = useState("");
  const [blokFilter, setBlokFilter] = useState("");
  const [kamarFilter, setKamarFilter] = useState("");
  const [kelasFilter, setKelasFilter] = useState<number | "">("");
  const [bagianFilter, setBagianFilter] = useState("");

  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // Mode Tampilan: Kartu (Default) atau Tabel
  const [viewMode, setViewMode] = useState<"kartu" | "tabel">("kartu");
  const [cardPage, setCardPage] = useState(1);
  const [cardPageSize, setCardPageSize] = useState(15);
  const [formasiList, setFormasiList] = useState<FormasiHalaqohItem[]>([]);
  const [selectedHalaqohForDetail, setSelectedHalaqohForDetail] = useState<FormasiHalaqohItem | null>(null);
  const [halaqohDetailModalOpen, setHalaqohDetailModalOpen] = useState(false);

  // Pagination State: default 15 baris
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [santriList, setSantriList] = useState<Santri[]>([]);
  // Key format: `${santri_id}_${day}_${sesi}` => "hadir" | "alfa" | "izin" | "sakit" | ""
  const [absenMap, setAbsenMap] = useState<Record<string, StatusAbsen | "">>({});
  const [loading, setLoading] = useState(true);

  // Modal Penetapan Status Massal
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkTargetStatus, setBulkTargetStatus] = useState<StatusAbsen>("hadir");
  const [bulkSelectedDay, setBulkSelectedDay] = useState<number>(Math.min(now.getDate(), 28));
  const [bulkSelectedSesi, setBulkSelectedSesi] = useState<SesiAbsen>("pagi");
  const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([]);
  const [bulkSearch, setBulkSearch] = useState("");
  const [isSavingBulk, setIsSavingBulk] = useState(false);

  // Modal Rentang "Pilih Hadir"
  const [rangeModalOpen, setRangeModalOpen] = useState(false);
  const [rangeStartDay, setRangeStartDay] = useState<number>(1);
  const [rangeEndDay, setRangeEndDay] = useState<number>(Math.min(now.getDate(), 28));
  const [rangeSesi, setRangeSesi] = useState<SesiAbsen | "semua">("semua");
  const [isSavingRange, setIsSavingRange] = useState(false);

  // Jumlah hari dalam bulan terpilih (28 - 31)
  const totalDays = new Date(tahun, bulan, 0).getDate();
  const dayNumbers = Array.from({ length: totalDays }, (_, i) => i + 1);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allSantri, absensiRows, formasiData] = await Promise.all([
        fetchAllSantriFiltered({
          search,
          asrama: asramaFilter,
          blok: blokFilter,
          kamar: kamarFilter,
          halaqoh_kelas: kelasFilter,
          halaqoh_bagian: bagianFilter,
        }),
        fetchAbsensiBulan(tahun, bulan, sesi),
        loadHalaqohFormasi(),
      ]);

      setSantriList(allSantri);
      setFormasiList(formasiData);

      const map: Record<string, StatusAbsen | ""> = {};
      for (const row of absensiRows) {
        const parts = row.tanggal.split("-");
        const d = parts.length === 3 ? parseInt(parts[2], 10) : new Date(row.tanggal).getDate();
        if (!isNaN(d)) {
          map[`${row.santri_id}_${d}_${row.sesi}`] = row.status;
        }
      }
      setAbsenMap(map);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Gagal memuat data absensi.");
    } finally {
      setLoading(false);
    }
  }, [
    tahun,
    bulan,
    sesi,
    search,
    asramaFilter,
    blokFilter,
    kamarFilter,
    kelasFilter,
    bagianFilter,
    showToast,
  ]);

  // Rekap kehadiran seorang santri pada bulan terpilih
  const computeSantriAbsenSummary = useCallback(
    (santriId: string) => {
      let hadir = 0;
      let alfa = 0;
      let izin = 0;
      let sakit = 0;

      for (let d = 1; d <= totalDays; d++) {
        if (sesi === "semua") {
          const sp = absenMap[`${santriId}_${d}_pagi`];
          const sm = absenMap[`${santriId}_${d}_malam`];
          [sp, sm].forEach((st) => {
            if (st === "hadir") hadir++;
            else if (st === "alfa") alfa++;
            else if (st === "izin") izin++;
            else if (st === "sakit") sakit++;
          });
        } else {
          const st = absenMap[`${santriId}_${d}_${sesi}`];
          if (st === "hadir") hadir++;
          else if (st === "alfa") alfa++;
          else if (st === "izin") izin++;
          else if (st === "sakit") sakit++;
        }
      }

      return { hadir, alfa, izin, sakit };
    },
    [absenMap, totalDays, sesi]
  );

  // Pengelompokan santri per halaqoh untuk mode kartu
  const halaqohGroups = useMemo(() => {
    const map = new Map<string, { kelas: number; bagian: string; rows: Santri[]; formasi?: FormasiHalaqohItem }>();

    formasiList.forEach((f) => {
      const key = `${f.kelas}_${f.bagian.toUpperCase()}`;
      map.set(key, { kelas: f.kelas, bagian: f.bagian.toUpperCase(), rows: [], formasi: f });
    });

    santriList.forEach((s) => {
      const k = s.halaqoh_kelas || 1;
      const b = (s.halaqoh_bagian || "A").toUpperCase();
      const key = `${k}_${b}`;
      if (!map.has(key)) {
        map.set(key, { kelas: k, bagian: b, rows: [] });
      }
      map.get(key)!.rows.push(s);
    });

    return Array.from(map.values())
      .filter((grp) => grp.rows.length > 0)
      .sort((a, b) => {
        if (a.kelas !== b.kelas) return a.kelas - b.kelas;
        return a.bagian.localeCompare(b.bagian);
      });
  }, [santriList, formasiList]);

  const totalHalaqohPages = Math.max(1, Math.ceil(halaqohGroups.length / cardPageSize));
  const paginatedHalaqohGroups = useMemo(() => {
    const start = (cardPage - 1) * cardPageSize;
    return halaqohGroups.slice(start, start + cardPageSize);
  }, [halaqohGroups, cardPage, cardPageSize]);

  useEffect(() => {
    loadData();
    setPage(1);
  }, [loadData]);

  // Handle tombol escape untuk modal filter & bulk modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (bulkModalOpen) setBulkModalOpen(false);
        if (filterModalOpen) setFilterModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filterModalOpen, bulkModalOpen]);

  // Hook cetak PDF via react-to-print
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Absensi_${BULAN_NAMES[bulan - 1]}_${tahun}_${sesi.toUpperCase()}`,
  });

  // Hitung filter aktif
  const activeFilterCount = [
    asramaFilter,
    blokFilter,
    kamarFilter,
    kelasFilter !== "" ? kelasFilter : "",
    bagianFilter,
  ].filter(Boolean).length;

  const resetAllFilters = () => {
    setAsramaFilter("");
    setBlokFilter("");
    setKamarFilter("");
    setKelasFilter("");
    setBagianFilter("");
    setPage(1);
    showToast("success", "Semua filter telah direset.");
  };

  // Status absensi efektif santri:
  // 1. Jika ada status tercatat (hadir, alfa, izin, sakit), tampilkan status tersebut.
  // 2. Default jika belum diisi: kosong / "-" ("").
  const getEffectiveStatus = useCallback(
    (santriId: string, day: number, sesiType: SesiAbsen): StatusAbsen | "" => {
      const key = `${santriId}_${day}_${sesiType}`;
      if (key in absenMap) {
        return absenMap[key];
      }
      return "";
    },
    [absenMap]
  );

  // Simpan nilai absensi per sel secara cepat (in-cell editing)
  const handleCellChange = async (
    santriId: string,
    day: number,
    targetSesi: SesiAbsen,
    newStatus: string
  ) => {
    const key = `${santriId}_${day}_${targetSesi}`;
    const prevStatus = getEffectiveStatus(santriId, day, targetSesi);
    if (prevStatus === newStatus) return;

    // Optimistic update
    setAbsenMap((prev) => {
      const updated = { ...prev };
      if (!newStatus) updated[key] = "";
      else updated[key] = newStatus as StatusAbsen;
      return updated;
    });

    const dateStr = `${tahun}-${String(bulan).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    try {
      await upsertAbsensiCell({
        santri_id: santriId,
        tanggal: dateStr,
        sesi: targetSesi,
        status: (newStatus || "") as StatusAbsen | "",
      });
    } catch (err) {
      setAbsenMap((prev) => {
        const rollback = { ...prev };
        rollback[key] = prevStatus;
        return rollback;
      });
      showToast("error", "Gagal menyimpan absensi tanggal " + day);
    }
  };

  // Hitung rekap status per santri (otomatis Hadir sebagai default)
  const countStatus = (santriId: string, st: StatusAbsen): number => {
    let c = 0;
    for (const d of dayNumbers) {
      if (isFridayDate(tahun, bulan, d)) continue;
      if (sesi === "semua") {
        if (getEffectiveStatus(santriId, d, "pagi") === st) c++;
        if (getEffectiveStatus(santriId, d, "malam") === st) c++;
      } else {
        if (getEffectiveStatus(santriId, d, sesi as SesiAbsen) === st) c++;
      }
    }
    return c;
  };

  // Pagination perhitungan
  const totalSantri = santriList.length;
  const totalPages = Math.max(1, Math.ceil(totalSantri / pageSize));
  const displayedSantri = useMemo(() => {
    const start = (page - 1) * pageSize;
    return santriList.slice(start, start + pageSize);
  }, [santriList, page, pageSize]);

  // Buka modal penetapan status massal
  const handleOpenBulkModal = (status: StatusAbsen) => {
    setBulkTargetStatus(status);
    setBulkSelectedDay(Math.min(now.getDate(), totalDays));
    setBulkSelectedSesi(sesi === "malam" ? "malam" : "pagi");
    setBulkSelectedIds([]);
    setBulkSearch("");
    setBulkModalOpen(true);
  };

  // Simpan status massal untuk santri yang dipilih
  const handleApplyBulkStatus = async () => {
    if (bulkSelectedIds.length === 0) {
      showToast("error", "Pilih minimal 1 santri untuk diterapkan statusnya.");
      return;
    }

    setIsSavingBulk(true);
    const dateStr = `${tahun}-${String(bulan).padStart(2, "0")}-${String(bulkSelectedDay).padStart(2, "0")}`;

    try {
      // Optimistic update
      setAbsenMap((prev) => {
        const updated = { ...prev };
        bulkSelectedIds.forEach((id) => {
          updated[`${id}_${bulkSelectedDay}_${bulkSelectedSesi}`] = bulkTargetStatus;
        });
        return updated;
      });

      await Promise.all(
        bulkSelectedIds.map((santriId) =>
          upsertAbsensiCell({
            santri_id: santriId,
            tanggal: dateStr,
            sesi: bulkSelectedSesi,
            status: bulkTargetStatus,
          })
        )
      );

      showToast(
        "success",
        `Status ${bulkTargetStatus.toUpperCase()} berhasil diterapkan ke ${bulkSelectedIds.length} santri.`
      );
      setBulkModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast("error", "Gagal menyimpan presensi massal.");
      loadData();
    } finally {
      setIsSavingBulk(false);
    }
  };

  // Ubah status 1 santri langsung dari dalam bulk modal
  const handleQuickChangeInModal = async (santriId: string, newSt: StatusAbsen | "") => {
    const dateStr = `${tahun}-${String(bulan).padStart(2, "0")}-${String(bulkSelectedDay).padStart(2, "0")}`;
    const key = `${santriId}_${bulkSelectedDay}_${bulkSelectedSesi}`;
    const prev = getEffectiveStatus(santriId, bulkSelectedDay, bulkSelectedSesi);
    if (prev === newSt) return;

    setAbsenMap((p) => {
      const updated = { ...p };
      if (!newSt) updated[key] = "";
      else updated[key] = newSt;
      return updated;
    });

    try {
      await upsertAbsensiCell({
        santri_id: santriId,
        tanggal: dateStr,
        sesi: bulkSelectedSesi,
        status: newSt,
      });
      showToast("success", `Status diperbarui menjadi ${newSt ? newSt.toUpperCase() : "-"}.`);
    } catch (err) {
      setAbsenMap((p) => {
        const rollback = { ...p };
        rollback[key] = prev;
        return rollback;
      });
      showToast("error", "Gagal memperbarui status santri.");
    }
  };

  // Filter santri di dalam bulk modal
  const filteredBulkSantri = useMemo(() => {
    const q = bulkSearch.trim().toLowerCase();
    if (!q) return santriList;
    return santriList.filter(
      (s) =>
        s.nama_lengkap.toLowerCase().includes(q) ||
        (s.halaqoh && s.halaqoh.toLowerCase().includes(q)) ||
        (s.kamar && s.kamar.toLowerCase().includes(q))
    );
  }, [santriList, bulkSearch]);

  // Menetapkan status Hadir untuk rentang tanggal tertentu pada santri yang belum diabsen (status "-")
  // Aturan user:
  // "untuk merentangkan hadir semua sesuai dengan tanggal yang dikehendaki tanpa membuat hadir secara paksa bila sudah diisi status lainnya kecuali '-'"
  const handleApplyRangeHadir = async () => {
    const start = Math.min(rangeStartDay, rangeEndDay);
    const end = Math.max(rangeStartDay, rangeEndDay);

    const targetSessions: SesiAbsen[] =
      rangeSesi === "semua" ? ["pagi", "malam"] : [rangeSesi as SesiAbsen];

    const recordsToUpsert: {
      santri_id: string;
      tanggal: string;
      sesi: SesiAbsen;
      status: StatusAbsen;
    }[] = [];

    const updatedAbsenMap = { ...absenMap };
    let filledCount = 0;

    santriList.forEach((s) => {
      for (let d = start; d <= end; d++) {
        // Hari Jumat selalu libur, jangan diisi
        if (isFridayDate(tahun, bulan, d)) continue;

        targetSessions.forEach((sesType) => {
          const currentStatus = getEffectiveStatus(s.id, d, sesType);
          // HANYA jika status masih kosong / "-"
          // Jangan menimpa jika sudah terisi alfa, izin, sakit, atau sudah hadir
          if (currentStatus === "") {
            const key = `${s.id}_${d}_${sesType}`;
            updatedAbsenMap[key] = "hadir";
            const dateStr = `${tahun}-${String(bulan).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            recordsToUpsert.push({
              santri_id: s.id,
              tanggal: dateStr,
              sesi: sesType,
              status: "hadir",
            });
            filledCount++;
          }
        });
      }
    });

    if (recordsToUpsert.length === 0) {
      showToast(
        "success",
        "Tidak ada sel status kosong (-) pada rentang tanggal tersebut. Status santri yang sudah ada tetap aman."
      );
      setRangeModalOpen(false);
      return;
    }

    setIsSavingRange(true);
    // Optimistic update
    setAbsenMap(updatedAbsenMap);

    try {
      await upsertAbsensiBatch(recordsToUpsert);
      showToast(
        "success",
        `Berhasil menetapkan status Hadir pada ${filledCount} sesi (Tgl ${start} s/d ${end}).`
      );
      setRangeModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast("error", "Gagal menyimpan status hadir rentang tanggal.");
      loadData();
    } finally {
      setIsSavingRange(false);
    }
  };

  const handleExportExcel = () => {
    const rows = santriList.map((s, idx) => {
      const rowObj: Record<string, unknown> = {
        No: idx + 1,
        Kode: s.kode,
        "Nama Santri": s.nama_lengkap,
        Kamar: formatKamarDisplay(s.kode_kamar, s.kamar),
        Halaqoh: s.halaqoh,
      };
      for (const d of dayNumbers) {
        const fri = isFridayDate(tahun, bulan, d);
        if (sesi === "semua") {
          const valP = getEffectiveStatus(s.id, d, "pagi");
          const valM = getEffectiveStatus(s.id, d, "malam");
          rowObj[`Tgl_${d}_Pagi`] = fri ? "JUMAT" : valP ? valP[0].toUpperCase() : "-";
          rowObj[`Tgl_${d}_Malam`] = fri ? "JUMAT" : valM ? valM[0].toUpperCase() : "-";
        } else {
          const val = getEffectiveStatus(s.id, d, sesi as SesiAbsen);
          rowObj[`Tgl_${d}`] = fri ? "JUMAT" : val ? val[0].toUpperCase() : "-";
        }
      }
      rowObj["Total Hadir"] = countStatus(s.id, "hadir");
      rowObj["Total Alfa"] = countStatus(s.id, "alfa");
      rowObj["Total Izin"] = countStatus(s.id, "izin");
      rowObj["Total Sakit"] = countStatus(s.id, "sakit");
      return rowObj;
    });

    exportJsonToExcel(
      rows,
      `Absensi_${BULAN_NAMES[bulan - 1]}_${tahun}_Sesi_${sesi.toUpperCase()}`,
      "RekapAbsensi"
    );
    showToast("success", "Rekap absensi bulanan berhasil diekspor ke Excel.");
  };

  return (
    <div className="space-y-5">
      {/* Header Halaman */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Kegiatan Tahfidz Umum (Absensi Harian Pagi & Malam)
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Pilih status di dalam sel tanggal (H: Hadir, A: Alfa, I: Izin, S: Sakit), atau gunakan tombol &quot;Pilih Hadir&quot; untuk merentangkan status Hadir sesuai tanggal yang dikehendaki. Kolom hari Jumat libur.
        </p>
      </div>

      {/* Bilah Toolbar yang Disederhanakan 1 Baris */}
      <div className="no-print flex flex-wrap items-center gap-2">
        {/* Switch Mode: Kartu (Default) / Tabel */}
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

        {/* Pemilih Bulan */}
        <select
          value={bulan}
          onChange={(e) => {
            setBulan(Number(e.target.value));
            setPage(1);
          }}
          aria-label="Pilih Bulan"
          className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm transition focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          {BULAN_NAMES.map((bName, idx) => (
            <option key={bName} value={idx + 1}>
              {bName}
            </option>
          ))}
        </select>

        {/* Pemilih Tahun */}
        <input
          type="number"
          value={tahun}
          onChange={(e) => {
            setTahun(Number(e.target.value) || now.getFullYear());
            setPage(1);
          }}
          aria-label="Pilih Tahun"
          className="h-11 w-24 rounded-xl border border-slate-300 bg-white px-3 text-center text-sm font-mono font-bold text-slate-800 shadow-sm transition focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />

        {/* Toggle Sesi Semua / Pagi / Malam */}
        <div className="flex h-11 items-center rounded-xl border border-slate-300 bg-slate-100 p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setSesi("semua")}
            className={`h-full px-3 rounded-lg text-xs font-bold uppercase transition ${
              sesi === "semua"
                ? "bg-emerald-800 text-white shadow"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setSesi("pagi")}
            className={`h-full px-3 rounded-lg text-xs font-bold uppercase transition ${
              sesi === "pagi"
                ? "bg-emerald-800 text-white shadow"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            }`}
          >
            Pagi
          </button>
          <button
            type="button"
            onClick={() => setSesi("malam")}
            className={`h-full px-3 rounded-lg text-xs font-bold uppercase transition ${
              sesi === "malam"
                ? "bg-emerald-800 text-white shadow"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            }`}
          >
            Malam
          </button>
        </div>

        {/* Kolom Pencarian Santri */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari nama santri..."
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

        {/* Tombol Filter (Pop-up Pilihan Filter) */}
        <button
          type="button"
          onClick={() => setFilterModalOpen(true)}
          title={activeFilterCount > 0 ? `Filter aktif (${activeFilterCount})` : "Filter Asrama, Blok, Kamar, Kelas, Bagian"}
          aria-label="Filter Asrama, Blok, Kamar, Kelas, Bagian"
          className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm transition focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
            activeFilterCount > 0
              ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-emerald-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          }`}
        >
          <SlidersHorizontal className="h-5 w-5" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-800 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Tombol Ekspor Excel */}
        <button
          type="button"
          onClick={handleExportExcel}
          title="Ekspor ke Excel"
          aria-label="Ekspor ke Excel"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <FileSpreadsheet className="h-5 w-5" />
        </button>

        {/* Tombol Cetak / Unduh PDF */}
        <button
          type="button"
          onClick={handlePrint}
          title="Cetak / Unduh PDF"
          aria-label="Cetak / Unduh PDF"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Printer className="h-5 w-5" />
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
          {blokFilter && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
              Blok: {blokFilter}
              <button type="button" onClick={() => setBlokFilter("")} aria-label="Hapus filter blok">
                <X className="h-3 w-3 hover:text-rose-600" />
              </button>
            </span>
          )}
          {kamarFilter && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
              Kamar: {kamarFilter}
              <button type="button" onClick={() => setKamarFilter("")} aria-label="Hapus filter kamar">
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

      {/* Grid Tabel Absensi */}
      <div ref={printRef} className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-3 mb-3 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800 dark:text-slate-100">
              Bulan: {BULAN_NAMES[bulan - 1]} {tahun} | Sesi: {sesi.toUpperCase()}
            </h2>
            <p className="text-xs text-slate-500">
              Total {santriList.length} santri terdaftar
            </p>
          </div>

          {/* Keterangan Status: Dapat Diklik untuk Penetapan Massal */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Keterangan:</span>
            {/* Tombol Pilih Hadir: diletakkan disamping kiri tombol Hadir */}
            <button
              type="button"
              onClick={() => {
                setRangeStartDay(1);
                setRangeEndDay(Math.min(now.getDate(), totalDays));
                setRangeSesi(sesi === "malam" ? "malam" : sesi === "pagi" ? "pagi" : "semua");
                setRangeModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-emerald-600 bg-emerald-700 text-white font-bold hover:bg-emerald-800 active:scale-95 transition shadow-xs cursor-pointer mr-1"
              title="Rentangkan status Hadir untuk tanggal tertentu tanpa menimpa status yang sudah diisi"
            >
              <CalendarRange className="h-3.5 w-3.5" />
              <span>Pilih Hadir</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenBulkModal("hadir")}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 font-bold hover:bg-emerald-100 transition shadow-xs dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 cursor-pointer"
              title="Klik untuk menetapkan status Hadir ke beberapa santri sekaligus"
            >
              H = Hadir
            </button>
            <button
              type="button"
              onClick={() => handleOpenBulkModal("alfa")}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-300 bg-rose-50 text-rose-800 font-bold hover:bg-rose-100 transition shadow-xs dark:border-rose-700 dark:bg-rose-950/60 dark:text-rose-300 cursor-pointer"
              title="Klik untuk menetapkan status Alfa ke beberapa santri sekaligus"
            >
              A = Alfa
            </button>
            <button
              type="button"
              onClick={() => handleOpenBulkModal("izin")}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-blue-300 bg-blue-50 text-blue-800 font-bold hover:bg-blue-100 transition shadow-xs dark:border-blue-700 dark:bg-blue-950/60 dark:text-blue-300 cursor-pointer"
              title="Klik untuk menetapkan status Izin ke beberapa santri sekaligus"
            >
              I = Izin
            </button>
            <button
              type="button"
              onClick={() => handleOpenBulkModal("sakit")}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 font-bold hover:bg-amber-100 transition shadow-xs dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-300 cursor-pointer"
              title="Klik untuk menetapkan status Sakit ke beberapa santri sekaligus"
            >
              S = Sakit
            </button>
            <span className="font-semibold text-slate-700 dark:text-slate-300 ml-1">JUM = Libur</span>
            {sesi === "semua" && (
              <span className="text-emerald-700 font-semibold">(P = Pagi, M = Malam)</span>
            )}
          </div>
        </div>

        {viewMode === "kartu" ? (
          <div>
            {loading ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
                <Loader2 className="h-7 w-7 animate-spin text-emerald-700" />
                <p className="text-xs text-slate-500">Memuat kartu halaqoh kegiatan...</p>
              </div>
            ) : halaqohGroups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                Tidak ada data kegiatan santri yang sesuai kriteria pencarian atau filter.
              </div>
            ) : (
              (() => {
                const renderHalaqohCard = (grp: typeof halaqohGroups[number]) => {
                  const formasiObj: FormasiHalaqohItem = grp.formasi || {
                    id: `${grp.kelas}-${grp.bagian}`,
                    kelas: grp.kelas,
                    bagian: grp.bagian,
                    target_juz: PEMETAAN_HALAQOH_KELAS[grp.kelas] || "-",
                  };

                  return (
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
                          {formasiObj.pembimbing && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                              {formasiObj.pembimbing}
                            </span>
                          )}
                          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700 shadow-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {grp.rows.length} Santri
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedHalaqohForDetail(formasiObj);
                              setHalaqohDetailModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 text-[11px] font-bold hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 transition"
                            title={`Buka presensi tanggal lengkap Halaqoh ${grp.kelas}${grp.bagian}`}
                          >
                            <span>Presensi</span>
                            <ExternalLink className="h-3 w-3" />
                          </button>
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
                              <th className="px-1 py-1.5 font-semibold text-center w-8 text-emerald-700 text-[11px]" title="Total Hadir">H</th>
                              <th className="px-1 py-1.5 font-semibold text-center w-8 text-rose-700 text-[11px]" title="Total Alfa">A</th>
                              <th className="px-1 py-1.5 font-semibold text-center w-8 text-blue-700 text-[11px]" title="Total Izin">I</th>
                              <th className="px-1 py-1.5 font-semibold text-center w-8 text-amber-700 text-[11px]" title="Total Sakit">S</th>
                              <th className="px-1.5 py-1.5 font-semibold text-center w-16 text-[11px]">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {grp.rows.map((s, idx) => {
                              const summary = computeSantriAbsenSummary(s.id);
                              return (
                                <tr key={s.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                  <td className="px-1.5 py-1 font-mono text-slate-400 text-center text-[11px]">{idx + 1}</td>
                                  <td className="px-1.5 py-1 font-semibold min-w-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedHalaqohForDetail(formasiObj);
                                        setHalaqohDetailModalOpen(true);
                                      }}
                                      className="text-left font-semibold text-slate-800 hover:text-emerald-800 hover:underline dark:text-slate-100 dark:hover:text-emerald-400 truncate max-w-[110px] sm:max-w-[130px] block text-xs"
                                      title={`Klik untuk presensi: ${s.nama_lengkap}`}
                                    >
                                      {s.nama_lengkap}
                                    </button>
                                  </td>
                                  <td className="px-1 py-1 text-center font-mono font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                                    {formatKamarDisplay(s.kode_kamar, s.kamar)}
                                  </td>
                                  <td className="px-1 py-1 text-center font-mono font-bold text-emerald-700 text-[11px]">{summary.hadir}</td>
                                  <td className="px-1 py-1 text-center font-mono font-bold text-rose-700 text-[11px]">{summary.alfa}</td>
                                  <td className="px-1 py-1 text-center font-mono font-bold text-blue-700 text-[11px]">{summary.izin}</td>
                                  <td className="px-1 py-1 text-center font-mono font-bold text-amber-700 text-[11px]">{summary.sakit}</td>
                                  <td className="px-1.5 py-1 text-center whitespace-nowrap">
                                    {summary.alfa === 0 ? (
                                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                        Tertib
                                      </span>
                                    ) : summary.alfa <= 3 ? (
                                      <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                        {summary.alfa} Alfa
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                        {summary.alfa} Alfa
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                };

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

                    {/* Pagination Kartu Halaqoh Kegiatan */}
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

                        <div className="flex items-center gap-1 font-semibold">
                          <button
                            type="button"
                            disabled={cardPage <= 1}
                            onClick={() => setCardPage((p) => Math.max(1, p - 1))}
                            title="Halaman Sebelumnya"
                            className="inline-flex h-8 px-2.5 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          {getPageNumbers(cardPage, totalHalaqohPages).map((p, idx) =>
                            p === "..." ? (
                              <span key={`ell-card-${idx}`} className="px-1 text-slate-400 select-none">
                                ...
                              </span>
                            ) : (
                              <button
                                key={`p-card-${p}`}
                                type="button"
                                onClick={() => setCardPage(Number(p))}
                                className={`h-8 min-w-[32px] px-2 rounded-xl font-mono text-xs transition ${
                                  cardPage === p
                                    ? "bg-emerald-800 text-white font-bold shadow-xs"
                                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                }`}
                              >
                                {p}
                              </button>
                            )
                          )}
                          <button
                            type="button"
                            disabled={cardPage >= totalHalaqohPages}
                            onClick={() => setCardPage((p) => Math.min(totalHalaqohPages, p + 1))}
                            title="Halaman Berikutnya"
                            className="inline-flex h-8 px-2.5 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {loading ? (
              <div className="py-12 text-center text-sm text-slate-500">Memuat data absensi...</div>
            ) : (
              <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                  <th
                    rowSpan={sesi === "semua" ? 2 : 1}
                    className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-800 px-2.5 py-2 font-semibold"
                  >
                    No
                  </th>
                  <th
                    rowSpan={sesi === "semua" ? 2 : 1}
                    className="sticky left-8 z-10 bg-slate-50 dark:bg-slate-800 min-w-[160px] px-2.5 py-2 font-semibold"
                  >
                    Nama Santri
                  </th>
                  <th
                    rowSpan={sesi === "semua" ? 2 : 1}
                    className="px-2 py-2 font-semibold text-center w-16"
                  >
                    Kamar
                  </th>
                  <th
                    rowSpan={sesi === "semua" ? 2 : 1}
                    className="px-2 py-2 font-semibold text-center"
                  >
                    Halaqoh
                  </th>
                  {dayNumbers.map((d) => {
                    const fri = isFridayDate(tahun, bulan, d);
                    const dayName = getDayNameShort(tahun, bulan, d);
                    return (
                      <th
                        key={d}
                        colSpan={sesi === "semua" ? 2 : 1}
                        className={`px-1 py-2 text-center font-mono text-[11px] ${
                          sesi === "semua" ? "min-w-[56px]" : "min-w-[34px]"
                        } ${
                          fri ? "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 font-bold" : ""
                        }`}
                      >
                        <div className="font-bold">{d}</div>
                        <div
                          className={`text-[9px] font-semibold uppercase ${
                            fri
                              ? "text-rose-600 dark:text-rose-400 font-bold"
                              : "text-slate-400 dark:text-slate-500"
                          }`}
                        >
                          {dayName}
                        </div>
                      </th>
                    );
                  })}
                  <th
                    rowSpan={sesi === "semua" ? 2 : 1}
                    className="px-2 py-2 text-center font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300"
                  >
                    H
                  </th>
                  <th
                    rowSpan={sesi === "semua" ? 2 : 1}
                    className="px-2 py-2 text-center font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-300"
                  >
                    A
                  </th>
                  <th
                    rowSpan={sesi === "semua" ? 2 : 1}
                    className="px-2 py-2 text-center font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300"
                  >
                    I
                  </th>
                  <th
                    rowSpan={sesi === "semua" ? 2 : 1}
                    className="px-2 py-2 text-center font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300"
                  >
                    S
                  </th>
                </tr>

                {/* Sub-header P & M jika Sesi SEMUA */}
                {sesi === "semua" && (
                  <tr className="bg-slate-100/80 text-[10px] text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
                    {dayNumbers.map((d) => {
                      const fri = isFridayDate(tahun, bulan, d);
                      return (
                        <React.Fragment key={`sub_hdr_${d}`}>
                          <th
                            className={`py-0.5 px-0.5 text-center border-b border-r border-slate-200 dark:border-slate-700 font-bold ${
                              fri ? "bg-rose-100/50 text-rose-800" : ""
                            }`}
                          >
                            P
                          </th>
                          <th
                            className={`py-0.5 px-0.5 text-center border-b border-r border-slate-200 dark:border-slate-700 font-bold ${
                              fri ? "bg-rose-100/50 text-rose-800" : ""
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
                {displayedSantri.map((s, idx) => {
                  const realIndex = (page - 1) * pageSize + idx + 1;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 px-2.5 py-1.5 font-mono text-[11px] text-slate-500">
                        {realIndex}
                      </td>
                      <td className="sticky left-8 z-10 bg-white dark:bg-slate-900 px-2.5 py-1.5 font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                        {s.nama_lengkap}
                        {((s.asrama && s.asrama !== "-") || (s.blok && s.blok !== "-")) && (
                          <span className="block text-[10px] font-normal text-slate-400">
                            {[
                              s.asrama && s.asrama !== "-" ? s.asrama : "",
                              s.blok && s.blok !== "-" ? `Blok ${s.blok}` : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          </span>
                        )}
                      </td>
                      {/* Kolom Kamar (Format E03) */}
                      <td className="px-2 py-1.5 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                        {formatKamarDisplay(s.kode_kamar, s.kamar)}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <HalaqohBadge kelas={s.halaqoh_kelas} bagian={s.halaqoh_bagian} />
                      </td>

                      {/* Sel Absensi */}
                      {dayNumbers.map((d) => {
                        const fri = isFridayDate(tahun, bulan, d);
                        if (fri) {
                          if (sesi === "semua") {
                            return (
                              <React.Fragment key={d}>
                                <td
                                  className="bg-slate-100 dark:bg-slate-800 text-center text-[10px] text-slate-400 select-none"
                                  title="Hari Jumat Libur"
                                >
                                  -
                                </td>
                                <td
                                  className="bg-slate-100 dark:bg-slate-800 text-center text-[10px] text-slate-400 select-none"
                                  title="Hari Jumat Libur"
                                >
                                  -
                                </td>
                              </React.Fragment>
                            );
                          }
                          return (
                            <td
                              key={d}
                              className="bg-slate-100 dark:bg-slate-800 text-center text-[10px] text-slate-400 select-none"
                              title="Hari Jumat Libur"
                            >
                              -
                            </td>
                          );
                        }

                        if (sesi === "semua") {
                          const curPagi = getEffectiveStatus(s.id, d, "pagi");
                          const curMalam = getEffectiveStatus(s.id, d, "malam");
                          return (
                            <React.Fragment key={d}>
                              {/* Sesi Pagi */}
                              <td className="p-0.5 text-center">
                                <select
                                  value={curPagi}
                                  onChange={(e) => handleCellChange(s.id, d, "pagi", e.target.value)}
                                  aria-label={`Pagi santri ${s.nama_lengkap} tanggal ${d}`}
                                  className={`h-7 w-7 rounded text-center font-bold text-[11px] border focus:outline-none appearance-none [&::-ms-expand]:hidden ${
                                    curPagi === "hadir"
                                      ? "bg-emerald-100 text-emerald-900 border-emerald-400 dark:bg-emerald-950 dark:text-emerald-200"
                                      : curPagi === "alfa"
                                      ? "bg-rose-100 text-rose-900 border-rose-400 dark:bg-rose-950 dark:text-rose-200"
                                      : curPagi === "izin"
                                      ? "bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-950 dark:text-amber-200"
                                      : curPagi === "sakit"
                                      ? "bg-blue-100 text-blue-900 border-blue-400 dark:bg-blue-950 dark:text-blue-200"
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
                              <td className="p-0.5 text-center">
                                <select
                                  value={curMalam}
                                  onChange={(e) => handleCellChange(s.id, d, "malam", e.target.value)}
                                  aria-label={`Malam santri ${s.nama_lengkap} tanggal ${d}`}
                                  className={`h-7 w-7 rounded text-center font-bold text-[11px] border focus:outline-none appearance-none [&::-ms-expand]:hidden ${
                                    curMalam === "hadir"
                                      ? "bg-emerald-100 text-emerald-900 border-emerald-400 dark:bg-emerald-950 dark:text-emerald-200"
                                      : curMalam === "alfa"
                                      ? "bg-rose-100 text-rose-900 border-rose-400 dark:bg-rose-950 dark:text-rose-200"
                                      : curMalam === "izin"
                                      ? "bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-950 dark:text-amber-200"
                                      : curMalam === "sakit"
                                      ? "bg-blue-100 text-blue-900 border-blue-400 dark:bg-blue-950 dark:text-blue-200"
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

                        // Sesi Tunggal
                        const cur = getEffectiveStatus(s.id, d, sesi as SesiAbsen);
                        return (
                          <td key={d} className="p-0.5 text-center">
                            <select
                              value={cur}
                              onChange={(e) => handleCellChange(s.id, d, sesi as SesiAbsen, e.target.value)}
                              aria-label={`Absen santri ${s.nama_lengkap} tanggal ${d}`}
                              className={`h-7 w-8 rounded text-center font-bold text-[11px] border focus:outline-none appearance-none [&::-ms-expand]:hidden ${
                                cur === "hadir"
                                  ? "bg-emerald-100 text-emerald-900 border-emerald-400 dark:bg-emerald-950 dark:text-emerald-200"
                                : cur === "alfa"
                                ? "bg-rose-100 text-rose-900 border-rose-400 dark:bg-rose-950 dark:text-rose-200"
                                : cur === "izin"
                                ? "bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-950 dark:text-amber-200"
                                : cur === "sakit"
                                ? "bg-blue-100 text-blue-900 border-blue-400 dark:bg-blue-950 dark:text-blue-200"
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
                      <td className="px-2 py-1.5 text-center font-mono font-bold bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800">
                        {countStatus(s.id, "hadir")}
                      </td>
                      <td className="px-2 py-1.5 text-center font-mono font-bold bg-rose-50/50 dark:bg-rose-950/20 text-rose-800">
                        {countStatus(s.id, "alfa")}
                      </td>
                      <td className="px-2 py-1.5 text-center font-mono font-bold bg-amber-50/50 dark:bg-amber-950/20 text-amber-800">
                        {countStatus(s.id, "izin")}
                      </td>
                      <td className="px-2 py-1.5 text-center font-mono font-bold bg-blue-50/50 dark:bg-blue-950/20 text-blue-800">
                        {countStatus(s.id, "sakit")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar Terpadu (10, 15, 25, 50 & Tombol Halaman 1, 2, 3...) */}
        {totalSantri > 0 && (
          <div className="no-print flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-2">
              <span>Tampilkan</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                aria-label="Pilih jumlah baris per halaman"
                className="h-8 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-800 shadow-xs focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {[10, 15, 25, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span>baris per halaman</span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span>
                Menampilkan{" "}
                <strong className="text-slate-900 dark:text-white">
                  {(page - 1) * pageSize + 1}
                </strong>{" "}
                -{" "}
                <strong className="text-slate-900 dark:text-white">
                  {Math.min(page * pageSize, totalSantri)}
                </strong>{" "}
                dari <strong className="text-slate-900 dark:text-white">{totalSantri}</strong> santri
              </span>
            </div>

            <div className="flex items-center gap-1 font-semibold">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                title="Halaman Sebelumnya"
                className="inline-flex h-8 px-2.5 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {getPageNumbers(page, totalPages).map((p, idx) =>
                p === "..." ? (
                  <span key={`ell-${idx}`} className="px-1 text-slate-400 select-none">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(Number(p))}
                    className={`h-8 min-w-[32px] px-2 rounded-xl font-mono text-xs transition ${
                      page === p
                        ? "bg-emerald-800 text-white font-bold shadow-xs"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                title="Halaman Berikutnya"
                className="inline-flex h-8 px-2.5 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
          </div>
        )}
      </div>

      {/* POP-UP 1: PENETAPAN STATUS MASSAL (Gambar 1 - Klik H, A, I, S) */}
      {bulkModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-3xl max-h-[92vh] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl flex flex-col dark:border-slate-800 dark:bg-slate-900">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-800 text-white shadow">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Penetapan Presensi Massal
                  </h2>
                  <p className="text-xs text-slate-500">
                    Pilih santri untuk menetapkan atau mengubah status presensi sekaligus
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Kontrol Tanggal, Sesi, dan Status Target */}
            <div className="space-y-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                {/* Pemilih Tanggal & Sesi */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tanggal:
                  </span>
                  <select
                    value={bulkSelectedDay}
                    onChange={(e) => setBulkSelectedDay(Number(e.target.value))}
                    className="h-8 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-800 shadow-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {dayNumbers.map((d) => (
                      <option key={d} value={d}>
                        Tgl {d} ({getDayNameShort(tahun, bulan, d)})
                      </option>
                    ))}
                  </select>

                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 ml-1">
                    Sesi:
                  </span>
                  <div className="flex items-center rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setBulkSelectedSesi("pagi")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        bulkSelectedSesi === "pagi"
                          ? "bg-emerald-800 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                      }`}
                    >
                      Pagi
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkSelectedSesi("malam")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        bulkSelectedSesi === "malam"
                          ? "bg-emerald-800 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                      }`}
                    >
                      Malam
                    </button>
                  </div>
                </div>

                {/* Switch Status Target Massal */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500">Status Target:</span>
                  <button
                    type="button"
                    onClick={() => setBulkTargetStatus("hadir")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                      bulkTargetStatus === "hadir"
                        ? "bg-emerald-800 text-white border-emerald-800 shadow-xs"
                        : "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                    }`}
                  >
                    H = Hadir
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkTargetStatus("alfa")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                      bulkTargetStatus === "alfa"
                        ? "bg-rose-700 text-white border-rose-700 shadow-xs"
                        : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                    }`}
                  >
                    A = Alfa
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkTargetStatus("izin")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                      bulkTargetStatus === "izin"
                        ? "bg-blue-700 text-white border-blue-700 shadow-xs"
                        : "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                    }`}
                  >
                    I = Izin
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkTargetStatus("sakit")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                      bulkTargetStatus === "sakit"
                        ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                        : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                    }`}
                  >
                    S = Sakit
                  </button>
                </div>
              </div>

              {/* Baris Pencarian & Select All */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={bulkSearch}
                    onChange={(e) => setBulkSearch(e.target.value)}
                    placeholder="Cari santri..."
                    className="w-full h-8 pl-8 pr-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 placeholder-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      if (bulkSelectedIds.length === filteredBulkSantri.length) {
                        setBulkSelectedIds([]);
                      } else {
                        setBulkSelectedIds(filteredBulkSantri.map((s) => s.id));
                      }
                    }}
                    className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-900 dark:text-emerald-400"
                  >
                    {bulkSelectedIds.length === filteredBulkSantri.length && filteredBulkSantri.length > 0 ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    <span>Pilih Semua ({filteredBulkSantri.length})</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Daftar Santri */}
            <div className="flex-1 overflow-auto my-2 border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300 sticky top-0 z-10 shadow-xs">
                  <tr>
                    <th className="py-2 px-3 w-10 text-center">Pilih</th>
                    <th className="py-2 px-3">Nama Santri</th>
                    <th className="py-2 px-2 text-center w-16">Kamar</th>
                    <th className="py-2 px-2 text-center w-20">Halaqoh</th>
                    <th className="py-2 px-2 text-center w-28">Status Saat Ini</th>
                    <th className="py-2 px-2 text-center w-24">Ubah Langsung</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredBulkSantri.map((s) => {
                    const isSelected = bulkSelectedIds.includes(s.id);
                    const curStatus = getEffectiveStatus(s.id, bulkSelectedDay, bulkSelectedSesi);

                    return (
                      <tr
                        key={s.id}
                        onClick={() => {
                          if (isSelected) {
                            setBulkSelectedIds(bulkSelectedIds.filter((id) => id !== s.id));
                          } else {
                            setBulkSelectedIds([...bulkSelectedIds, s.id]);
                          }
                        }}
                        className={`cursor-pointer transition ${
                          isSelected
                            ? "bg-emerald-50/70 dark:bg-emerald-950/40"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setBulkSelectedIds([...bulkSelectedIds, s.id]);
                              } else {
                                setBulkSelectedIds(bulkSelectedIds.filter((id) => id !== s.id));
                              }
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">
                          {s.nama_lengkap}
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                          {formatKamarDisplay(s.kode_kamar, s.kamar)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <HalaqohBadge kelas={s.halaqoh_kelas} bagian={s.halaqoh_bagian} />
                        </td>
                        <td className="py-2 px-2 text-center">
                          {curStatus === "hadir" ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Hadir
                            </span>
                          ) : curStatus === "alfa" ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              Alfa
                            </span>
                          ) : curStatus === "izin" ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                              Izin
                            </span>
                          ) : curStatus === "sakit" ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              Sakit
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400">
                              - Belum
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={curStatus}
                            onChange={(e) =>
                              handleQuickChangeInModal(s.id, e.target.value as StatusAbsen | "")
                            }
                            className="h-7 w-20 text-center rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          >
                            <option value="">- (Belum)</option>
                            <option value="hadir">Hadir</option>
                            <option value="alfa">Alfa</option>
                            <option value="izin">Izin</option>
                            <option value="sakit">Sakit</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer Modal Bulk */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Terpilih:{" "}
                <strong className="text-emerald-800 dark:text-emerald-300 font-bold">
                  {bulkSelectedIds.length}
                </strong>{" "}
                dari {filteredBulkSantri.length} santri
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={bulkSelectedIds.length === 0 || isSavingBulk}
                  onClick={handleApplyBulkStatus}
                  className="px-4 py-1.5 text-xs font-bold rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 transition shadow disabled:opacity-40 inline-flex items-center gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  <span>
                    {isSavingBulk
                      ? "Menerapkan..."
                      : `Terapkan ${bulkTargetStatus.toUpperCase()} (${bulkSelectedIds.length})`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP: MODAL PILIH HADIR (RENTANG TANGGAL) */}
      {rangeModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-range-hadir-title"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <CalendarRange className="h-5 w-5" />
                </div>
                <div>
                  <h2
                    id="modal-range-hadir-title"
                    className="text-base font-bold text-slate-900 dark:text-white"
                  >
                    Pilih Hadir (Rentang Tanggal)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Bulan {BULAN_NAMES[bulan - 1]} {tahun} • {santriList.length} Santri Terdaftar
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRangeModalOpen(false)}
                aria-label="Tutup modal rentang hadir"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Isi Form Rentang Tanggal */}
            <div className="py-4 space-y-4">
              {/* Pilihan Dari Tanggal & Sampai Tanggal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Dari Tanggal
                  </label>
                  <select
                    value={rangeStartDay}
                    onChange={(e) => setRangeStartDay(Number(e.target.value))}
                    className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-xs focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {dayNumbers.map((d) => (
                      <option key={d} value={d}>
                        Tanggal {d} {isFridayDate(tahun, bulan, d) ? "(Jumat - Libur)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Sampai Tanggal
                  </label>
                  <select
                    value={rangeEndDay}
                    onChange={(e) => setRangeEndDay(Number(e.target.value))}
                    className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-xs focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {dayNumbers.map((d) => (
                      <option key={d} value={d}>
                        Tanggal {d} {isFridayDate(tahun, bulan, d) ? "(Jumat - Libur)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pilihan Sesi Target */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Terapkan Pada Sesi
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRangeSesi("semua")}
                    className={`h-9 rounded-xl text-xs font-bold border transition ${
                      rangeSesi === "semua"
                        ? "bg-emerald-800 text-white border-emerald-800 shadow-xs"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    Semua (P & M)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRangeSesi("pagi")}
                    className={`h-9 rounded-xl text-xs font-bold border transition ${
                      rangeSesi === "pagi"
                        ? "bg-emerald-800 text-white border-emerald-800 shadow-xs"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    Sesi Pagi
                  </button>
                  <button
                    type="button"
                    onClick={() => setRangeSesi("malam")}
                    className={`h-9 rounded-xl text-xs font-bold border transition ${
                      rangeSesi === "malam"
                        ? "bg-emerald-800 text-white border-emerald-800 shadow-xs"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    Sesi Malam
                  </button>
                </div>
              </div>

              {/* Kotak Info Ketentuan */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                <div className="flex items-start gap-2.5">
                  <Info className="h-4 w-4 shrink-0 mt-0.5 text-emerald-700 dark:text-emerald-400" />
                  <div className="space-y-1">
                    <p className="font-bold">Ketentuan Pengisian Hadir:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-emerald-800 dark:text-emerald-300">
                      <li>Hanya sel yang masih berstatus <strong>kosong (-)</strong> yang akan diubah menjadi Hadir.</li>
                      <li>Status <strong>Alfa (A)</strong>, <strong>Izin (I)</strong>, atau <strong>Sakit (S)</strong> yang sudah terisi <strong>tidak akan ditimpa</strong>.</li>
                      <li>Hari <strong>Jumat (Libur)</strong> dilewati otomatis.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRangeModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSavingRange}
                onClick={handleApplyRangeHadir}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 active:scale-95 transition shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="h-4 w-4" />
                <span>{isSavingRange ? "Menyimpan Status Hadir..." : "Simpan Status Hadir"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP 2: MODAL FILTER TERPADU */}
      {filterModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-filter-kegiatan-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="modal-filter-kegiatan-title" className="text-base font-bold text-slate-900 dark:text-white">
                    Filter Absensi Santri
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Saring daftar santri berdasarkan Asrama, Blok, Kamar, Kelas, dan Bagian
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

            <div className="space-y-3 py-4">
              {/* Filter Asrama */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Filter Asrama
                </label>
                <input
                  type="text"
                  value={asramaFilter}
                  onChange={(e) => setAsramaFilter(e.target.value)}
                  placeholder="Filter Asrama (misal: Al-Falah)"
                  className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Filter Blok & Kamar */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Filter Blok
                  </label>
                  <input
                    type="text"
                    value={blokFilter}
                    onChange={(e) => setBlokFilter(e.target.value)}
                    placeholder="Filter Blok (misal: A)"
                    className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Filter Kamar
                  </label>
                  <input
                    type="text"
                    value={kamarFilter}
                    onChange={(e) => setKamarFilter(e.target.value)}
                    placeholder="Filter Kamar (misal: 01)"
                    className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Filter Kelas & Bagian */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Semua Kelas
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
                    Semua Bagian
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
      {/* MODAL DETAIL PRESENSI DAN SETORAN HALAQOH */}
      <HalaqohDetailModal
        isOpen={halaqohDetailModalOpen}
        onClose={() => setHalaqohDetailModalOpen(false)}
        formasi={selectedHalaqohForDetail}
        santriList={santriList}
        onDataChanged={loadData}
      />
    </div>
  );
}
