"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  Printer,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  RotateCcw,
  Loader2,
  X,
  ChevronDown,
  AlertCircle,
  ClipboardList,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import {
  fetchAllSantriFiltered,
  fetchAbsensiBulan,
  fetchSetoranBulananMerged,
  fetchCurrentUserProfile,
} from "@/lib/services/tahfidz-service";
import { loadHalaqohFormasi, type FormasiHalaqohItem } from "@/lib/services/halaqoh-service";
import { formatKamarDisplay } from "@/lib/services/hierarchy-service";
import {
  fetchCustomHolidays,
  checkIsHoliday,
  type HariLiburItem,
} from "@/lib/services/holiday-service";
import {
  HALAQOH_KELAS_LIST,
  HALAQOH_BAGIAN_LIST,
  PEMETAAN_HALAQOH_KELAS,
  type Santri,
  type SesiAbsen,
  type StatusAbsen,
  type SetoranBulananRow,
} from "@/types/database";
import { HalaqohBadge } from "@/components/ui/Badges";
import { useToast } from "@/components/ui/Toast";
import {
  exportRekapKeseluruhanExcel,
  exportRekapKeseluruhanPdf,
  exportElementToJpg,
  buildRekapFileBaseName,
  type RekapHalaqohGroup,
  type RekapSantriRow,
} from "@/lib/utils/rekap-export";

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

type ExportFormat = "jpg" | "pdf" | "excel" | null;

export function RekapKeseluruhanModule() {
  const router = useRouter();
  const { showToast } = useToast();
  const printAreaRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const jpgMenuRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const [tahun, setTahun] = useState<number>(now.getFullYear());
  const [bulan, setBulan] = useState<number>(now.getMonth() + 1);
  const [sesi, setSesi] = useState<SesiAbsen | "semua">("semua");

  // Filter tampilan
  const [search, setSearch] = useState("");
  const [halaqohFilter, setHalaqohFilter] = useState("");
  const [kelasFilter, setKelasFilter] = useState<number | "">("");
  const [bagianFilter, setBagianFilter] = useState("");
  const [asramaFilter, setAsramaFilter] = useState("");
  const [blokFilter, setBlokFilter] = useState("");
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // Hak akses & status muat
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<ExportFormat>(null);
  const [jpgMenuOpen, setJpgMenuOpen] = useState(false);

  // Data mentah dari 3 sumber
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [formasiList, setFormasiList] = useState<FormasiHalaqohItem[]>([]);
  const [absenMap, setAbsenMap] = useState<Record<string, StatusAbsen | "">>({});
  const [holidays, setHolidays] = useState<HariLiburItem[]>([]);
  const [juzBaruRows, setJuzBaruRows] = useState<SetoranBulananRow[]>([]);
  const [evaluasiRows, setEvaluasiRows] = useState<SetoranBulananRow[]>([]);

  const yearOptions = useMemo(() => {
    const curr = new Date().getFullYear();
    const list: number[] = [];
    for (let y = curr - 3; y <= curr + 2; y += 1) {
      list.push(y);
    }
    return list;
  }, []);

  // Pastikan hanya Admin yang dapat mengakses Rekap Keseluruhan
  useEffect(() => {
    let active = true;
    fetchCurrentUserProfile()
      .then((prof) => {
        if (!active) return;
        if (!prof || prof.role !== "admin") {
          showToast("error", "Menu Rekap Keseluruhan hanya dapat diakses oleh Admin.");
          router.replace("/");
          return;
        }
        setIsAuthorized(true);
      })
      .catch(() => {
        if (!active) return;
        router.replace("/");
      })
      .finally(() => {
        if (active) setCheckingAuth(false);
      });
    return () => {
      active = false;
    };
  }, [router, showToast]);

  // Tutup popover pilihan JPG saat klik di luar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (jpgMenuRef.current && !jpgMenuRef.current.contains(e.target as Node)) {
        setJpgMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Tutup modal filter dengan Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFilterModalOpen(false);
        setJpgMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const loadData = useCallback(async () => {
    if (!isAuthorized) return;
    setLoading(true);
    setError(null);
    try {
      const [santriData, formasiData, absensiData, holidayData, juzBaruData, evaluasiData] =
        await Promise.all([
          fetchAllSantriFiltered({}),
          loadHalaqohFormasi(),
          fetchAbsensiBulan(tahun, bulan, sesi),
          fetchCustomHolidays(),
          fetchSetoranBulananMerged(tahun, "juz_baru", {}),
          fetchSetoranBulananMerged(tahun, "evaluasi", {}),
        ]);

      const nextAbsenMap: Record<string, StatusAbsen | ""> = {};
      absensiData.forEach((row) => {
        const dayNum = parseInt(row.tanggal.split("-")[2], 10);
        if (!Number.isNaN(dayNum)) {
          nextAbsenMap[`${row.santri_id}_${dayNum}_${row.sesi}`] = row.status;
        }
      });

      setSantriList(santriData);
      setFormasiList(formasiData);
      setAbsenMap(nextAbsenMap);
      setHolidays(holidayData);
      setJuzBaruRows(juzBaruData);
      setEvaluasiRows(evaluasiData);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memuat data rekap keseluruhan.";
      setError(msg);
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  }, [isAuthorized, tahun, bulan, sesi, showToast]);

  useEffect(() => {
    if (isAuthorized) {
      loadData();
    }
  }, [isAuthorized, loadData]);

  // Opsi dropdown filter dinamis dari data santri & formasi
  const { asramaOptions, blokOptions, halaqohOptions } = useMemo(() => {
    const asramaSet = new Set<string>();
    const blokSet = new Set<string>();
    const halMap = new Map<string, { id: string; label: string; kelas: number; bagian: string }>();

    formasiList.forEach((f) => {
      const bagian = (f.bagian || "A").toUpperCase();
      const id = `${f.kelas}_${bagian}`;
      halMap.set(id, { id, label: `${f.kelas}${bagian}`, kelas: f.kelas, bagian });
    });

    santriList.forEach((s) => {
      if (s.asrama) asramaSet.add(s.asrama);
      if (s.blok) blokSet.add(s.blok);
      const k = s.halaqoh_kelas || 1;
      const b = (s.halaqoh_bagian || "A").toUpperCase();
      const id = `${k}_${b}`;
      if (!halMap.has(id)) {
        halMap.set(id, { id, label: `${k}${b}`, kelas: k, bagian: b });
      }
    });

    const sortedHalaqoh = Array.from(halMap.values()).sort((a, b) =>
      a.kelas !== b.kelas ? a.kelas - b.kelas : a.bagian.localeCompare(b.bagian)
    );

    return {
      asramaOptions: Array.from(asramaSet).sort(),
      blokOptions: Array.from(blokSet).sort(),
      halaqohOptions: sortedHalaqoh,
    };
  }, [santriList, formasiList]);

  // Index cepat Juz Baru & Evaluasi berdasarkan santri_id
  const { juzBaruMap, evaluasiMap } = useMemo(() => {
    const jb = new Map<string, number>();
    juzBaruRows.forEach((r) => {
      const totalHlm =
        r.total_halaman !== undefined ? r.total_halaman : Math.round(r.total_setoran * 20);
      jb.set(r.santri_id, Math.max(0, Math.round(totalHlm)));
    });

    const ev = new Map<string, number>();
    evaluasiRows.forEach((r) => {
      ev.set(r.santri_id, Math.max(0, Math.round(Number(r.total_setoran || 0))));
    });

    return { juzBaruMap: jb, evaluasiMap: ev };
  }, [juzBaruRows, evaluasiRows]);

  const totalDays = useMemo(() => new Date(tahun, bulan, 0).getDate(), [tahun, bulan]);

  const computeAbsenSummary = useCallback(
    (santriId: string) => {
      let hadir = 0;
      let alfa = 0;
      let izin = 0;
      let sakit = 0;

      const countOneSession = (day: number, s: SesiAbsen) => {
        const hol = checkIsHoliday(tahun, bulan, day, holidays, s);
        if (hol.isLibur) return;
        const status = absenMap[`${santriId}_${day}_${s}`];
        if (status === "hadir") hadir += 1;
        else if (status === "alfa") alfa += 1;
        else if (status === "izin") izin += 1;
        else if (status === "sakit") sakit += 1;
      };

      for (let d = 1; d <= totalDays; d += 1) {
        if (sesi === "semua") {
          countOneSession(d, "pagi");
          countOneSession(d, "malam");
        } else {
          countOneSession(d, sesi);
        }
      }

      return { hadir, alfa, izin, sakit };
    },
    [absenMap, totalDays, sesi, tahun, bulan, holidays]
  );

  // Bangun kelompok halaqoh terfilter + baris santri tergabung
  const halaqohGroups: RekapHalaqohGroup[] = useMemo(() => {
    const term = search.trim().toLowerCase();
    const formasiByKey = new Map<string, FormasiHalaqohItem>();
    formasiList.forEach((f) => {
      formasiByKey.set(`${f.kelas}_${(f.bagian || "A").toUpperCase()}`, f);
    });

    const filteredSantri = santriList.filter((s) => {
      const k = s.halaqoh_kelas || 1;
      const b = (s.halaqoh_bagian || "A").toUpperCase();
      const groupKey = `${k}_${b}`;

      if (halaqohFilter && groupKey !== halaqohFilter) return false;
      if (kelasFilter !== "" && k !== Number(kelasFilter)) return false;
      if (bagianFilter && b !== bagianFilter.toUpperCase()) return false;
      if (asramaFilter && s.asrama !== asramaFilter) return false;
      if (blokFilter && s.blok !== blokFilter) return false;

      if (term) {
        const kamarText = formatKamarDisplay(s.kode_kamar, s.kamar).toLowerCase();
        const halaqohCode = `${k}${b}`.toLowerCase();
        const matchNama = s.nama_lengkap.toLowerCase().includes(term);
        const matchKamar = kamarText.includes(term);
        const matchHalaqoh = halaqohCode.includes(term);
        if (!matchNama && !matchKamar && !matchHalaqoh) return false;
      }

      return true;
    });

    const groupMap = new Map<string, RekapHalaqohGroup>();

    filteredSantri.forEach((s) => {
      const kelas = s.halaqoh_kelas || 1;
      const bagian = (s.halaqoh_bagian || "A").toUpperCase();
      const key = `${kelas}_${bagian}`;
      const formasi = formasiByKey.get(key);

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          id: key,
          kelas,
          bagian,
          kodeLabel: `${kelas}${bagian}`,
          targetJuz: formasi?.target_juz || PEMETAAN_HALAQOH_KELAS[kelas] || "-",
          pembimbing: formasi?.pembimbing || "",
          rows: [],
        });
      }

      const absen = computeAbsenSummary(s.id);
      const totalHlm = juzBaruMap.get(s.id) ?? 0;
      const juzBaru = Math.floor(totalHlm / 20);
      const halamanBaru = totalHlm % 20;
      const evaluasiJuz = evaluasiMap.get(s.id) ?? 0;

      const statusLabel = absen.alfa === 0 ? "Tertib" : `${absen.alfa} Alfa`;
      const statusLevel: RekapSantriRow["statusLevel"] =
        absen.alfa === 0 ? "tertib" : absen.alfa <= 3 ? "peringatan" : "kritis";

      groupMap.get(key)!.rows.push({
        santri_id: s.id,
        nama_lengkap: s.nama_lengkap,
        kamar: formatKamarDisplay(s.kode_kamar, s.kamar),
        hadir: absen.hadir,
        alfa: absen.alfa,
        izin: absen.izin,
        sakit: absen.sakit,
        statusLabel,
        statusLevel,
        juzBaru,
        halamanBaru,
        evaluasiJuz,
      });
    });

    // Urutkan kelompok berdasarkan kelas & bagian, dan santri berdasarkan nama
    return Array.from(groupMap.values())
      .map((grp) => ({
        ...grp,
        rows: [...grp.rows].sort((a, b) => a.nama_lengkap.localeCompare(b.nama_lengkap)),
      }))
      .sort((a, b) =>
        a.kelas !== b.kelas ? a.kelas - b.kelas : a.bagian.localeCompare(b.bagian)
      );
  }, [
    santriList,
    formasiList,
    search,
    halaqohFilter,
    kelasFilter,
    bagianFilter,
    asramaFilter,
    blokFilter,
    computeAbsenSummary,
    juzBaruMap,
    evaluasiMap,
  ]);

  const totalDisplayedSantri = useMemo(
    () => halaqohGroups.reduce((acc, g) => acc + g.rows.length, 0),
    [halaqohGroups]
  );

  const activeAdvancedFilterCount = [
    kelasFilter !== "" ? kelasFilter : "",
    bagianFilter,
    asramaFilter,
    blokFilter,
  ].filter(Boolean).length;

  const hasAnyFilter =
    Boolean(search.trim()) || Boolean(halaqohFilter) || activeAdvancedFilterCount > 0;

  const resetAllFilters = () => {
    setSearch("");
    setHalaqohFilter("");
    setKelasFilter("");
    setBagianFilter("");
    setAsramaFilter("");
    setBlokFilter("");
  };

  const exportMeta = useMemo(
    () => ({
      bulanNama: BULAN_NAMES[bulan - 1] || "Bulan",
      tahun,
      sesi,
    }),
    [bulan, tahun, sesi]
  );

  const sesiLabel = useMemo(() => {
    if (sesi === "pagi") return "Pagi";
    if (sesi === "malam") return "Malam";
    return "Semua (Pagi & Malam)";
  }, [sesi]);

  // 1. Cetak langsung via react-to-print
  const handlePrint = useReactToPrint({
    content: () => printAreaRef.current,
    documentTitle: buildRekapFileBaseName(exportMeta),
  });

  // 2. Ekspor Excel (.xlsx) via ExcelJS
  const handleExportExcel = async () => {
    if (halaqohGroups.length === 0) {
      showToast("error", "Tidak ada data santri untuk diekspor ke Excel.");
      return;
    }
    setExporting("excel");
    try {
      await exportRekapKeseluruhanExcel(halaqohGroups, exportMeta);
      showToast("success", "Rekap keseluruhan berhasil diekspor ke Excel (.xlsx).");
    } catch (err) {
      console.error("Export Excel error:", err);
      showToast("error", "Gagal mengekspor data ke Excel.");
    } finally {
      setExporting(null);
    }
  };

  // 3. Ekspor PDF vektor (.pdf) via jsPDF + autoTable
  const handleExportPdf = () => {
    if (halaqohGroups.length === 0) {
      showToast("error", "Tidak ada data santri untuk diekspor ke PDF.");
      return;
    }
    setExporting("pdf");
    try {
      exportRekapKeseluruhanPdf(halaqohGroups, exportMeta);
      showToast("success", "Rekap keseluruhan berhasil diunduh sebagai PDF.");
    } catch (err) {
      console.error("Export PDF error:", err);
      showToast("error", "Gagal membuat file PDF.");
    } finally {
      setExporting(null);
    }
  };

  // 4. Ekspor Gambar (.jpg) via html-to-image
  const handleExportJpgAll = async () => {
    setJpgMenuOpen(false);
    if (!printAreaRef.current || halaqohGroups.length === 0) {
      showToast("error", "Tidak ada tabel yang dapat diekspor menjadi gambar.");
      return;
    }
    setExporting("jpg");
    try {
      const suffix =
        halaqohGroups.length === 1 ? `Halaqoh_${halaqohGroups[0].kodeLabel}` : undefined;
      await exportElementToJpg(
        printAreaRef.current,
        buildRekapFileBaseName(exportMeta, suffix)
      );
      showToast("success", "Gambar rekap (.jpg) berhasil diunduh.");
    } catch (err) {
      console.error("Export JPG error:", err);
      showToast(
        "error",
        "Gagal mengekspor semua kelompok dalam 1 gambar. Coba filter per halaqoh atau unduh per kelompok."
      );
    } finally {
      setExporting(null);
    }
  };

  const handleExportJpgPerGroup = async () => {
    setJpgMenuOpen(false);
    if (halaqohGroups.length === 0) {
      showToast("error", "Tidak ada data halaqoh untuk diekspor.");
      return;
    }
    setExporting("jpg");
    try {
      let count = 0;
      for (const grp of halaqohGroups) {
        const el = cardRefs.current.get(grp.id);
        if (!el) continue;
        await exportElementToJpg(
          el,
          buildRekapFileBaseName(exportMeta, `Halaqoh_${grp.kodeLabel}`)
        );
        count += 1;
        await new Promise((r) => setTimeout(r, 150));
      }
      showToast("success", `${count} berkas gambar .jpg per halaqoh berhasil diunduh.`);
    } catch (err) {
      console.error("Export JPG per group error:", err);
      showToast("error", "Terjadi kendala saat mengunduh gambar per halaqoh.");
    } finally {
      setExporting(null);
    }
  };

  const handleJpgButtonClick = () => {
    if (halaqohGroups.length === 0) {
      showToast("error", "Tidak ada data santri untuk diekspor.");
      return;
    }
    if (halaqohGroups.length <= 1) {
      void handleExportJpgAll();
      return;
    }
    setJpgMenuOpen((prev) => !prev);
  };

  if (checkingAuth || !isAuthorized) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
        <span>Memverifikasi hak akses Admin untuk Rekap Keseluruhan...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header Halaman */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-brand dark:text-emerald-400 shrink-0" />
            <span>Rekap Keseluruhan Santri Tahfidz</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Rekap terpadu Absensi Harian, Setoran Juz Baru, dan Capaian Evaluasi Pengurus per
            kelompok halaqoh.
          </p>
        </div>
        {!loading && !error && (
          <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Menampilkan <strong className="text-slate-900 dark:text-white">{totalDisplayedSantri}</strong>{" "}
            santri dalam <strong className="text-slate-900 dark:text-white">{halaqohGroups.length}</strong>{" "}
            halaqoh
          </div>
        )}
      </div>

      {/* Bilah Kontrol Periode, Filter & Tombol Cetak/Ekspor */}
      <div className="no-print rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Pemilih Bulan Absensi */}
          <select
            value={bulan}
            onChange={(e) => setBulan(Number(e.target.value))}
            aria-label="Pilih bulan rekap absensi"
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {BULAN_NAMES.map((nama, idx) => (
              <option key={nama} value={idx + 1}>
                {nama}
              </option>
            ))}
          </select>

          {/* Pemilih Tahun */}
          <select
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
            aria-label="Pilih tahun rekap"
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {/* Pemilih Sesi Absensi */}
          <div
            className="inline-flex h-10 items-center rounded-xl border border-slate-300 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800"
            role="group"
            aria-label="Pilih sesi absensi"
          >
            {(["semua", "pagi", "malam"] as const).map((sOpt) => (
              <button
                key={sOpt}
                type="button"
                onClick={() => setSesi(sOpt)}
                className={`h-full rounded-lg px-2.5 text-xs font-bold uppercase transition ${
                  sesi === sOpt
                    ? "bg-brand text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                }`}
              >
                {sOpt}
              </button>
            ))}
          </div>

          {/* Filter Kelompok Halaqoh */}
          <select
            value={halaqohFilter}
            onChange={(e) => setHalaqohFilter(e.target.value)}
            aria-label="Filter kelompok halaqoh"
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">Semua Halaqoh</option>
            {halaqohOptions.map((h) => (
              <option key={h.id} value={h.id}>
                Halaqoh {h.label}
              </option>
            ))}
          </select>

          {/* Pencarian Nama / Kamar */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama lengkap, kamar, atau halaqoh..."
              aria-label="Cari santri atau kamar"
              className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-8 text-xs text-slate-800 placeholder-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Hapus pencarian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Tombol Filter Lanjutan */}
          <button
            type="button"
            onClick={() => setFilterModalOpen(true)}
            className={`relative inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition ${
              activeAdvancedFilterCount > 0
                ? "border-brand bg-emerald-50 text-brand-dark dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filter</span>
            {activeAdvancedFilterCount > 0 && (
              <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                {activeAdvancedFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Baris Tombol Cetak & Ekspor */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Periode aktif:{" "}
            <strong className="text-slate-700 dark:text-slate-200">
              {BULAN_NAMES[bulan - 1]} {tahun}
            </strong>{" "}
            • Sesi Absensi:{" "}
            <strong className="text-slate-700 dark:text-slate-200">{sesiLabel}</strong>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tombol Cetak .JPG */}
            <div className="relative" ref={jpgMenuRef}>
              <button
                type="button"
                onClick={handleJpgButtonClick}
                disabled={loading || exporting !== null || halaqohGroups.length === 0}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 transition"
                title="Unduh rekap sebagai gambar .jpg"
              >
                {exporting === "jpg" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />
                ) : (
                  <ImageIcon className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                )}
                <span>.jpg</span>
                {halaqohGroups.length > 1 && <ChevronDown className="h-3 w-3 opacity-70" />}
              </button>

              {jpgMenuOpen && halaqohGroups.length > 1 && (
                <div className="absolute right-0 z-30 mt-1.5 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => void handleExportJpgAll()}
                    className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      Unduh 1 Gambar Utuh
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Gabungkan {halaqohGroups.length} halaqoh dalam 1 file .jpg
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleExportJpgPerGroup()}
                    className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      Unduh Per Halaqoh ({halaqohGroups.length} file)
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Lebih tajam & mudah dibaca di WhatsApp
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Tombol Cetak .PDF */}
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={loading || exporting !== null || halaqohGroups.length === 0}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 transition"
              title="Unduh dokumen PDF vektor siap cetak"
            >
              {exporting === "pdf" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" />
              ) : (
                <FileText className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
              )}
              <span>.pdf</span>
            </button>

            {/* Tombol Excel (.xlsx) */}
            <button
              type="button"
              onClick={() => void handleExportExcel()}
              disabled={loading || exporting !== null || halaqohGroups.length === 0}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 transition"
              title="Ekspor ke Excel (.xlsx)"
            >
              {exporting === "excel" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-700" />
              ) : (
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
              )}
              <span>Excel</span>
            </button>

            {/* Tombol Print Langsung */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || halaqohGroups.length === 0}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand px-3.5 text-xs font-bold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50 transition shadow-sm"
              title="Cetak langsung ke printer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* Konten Utama & Area Cetak/Ekspor */}
      {loading ? (
        <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
          <Loader2 className="h-7 w-7 animate-spin text-brand" />
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Memuat data santri, absensi {BULAN_NAMES[bulan - 1]} {tahun}, setoran juz baru, dan
            evaluasi...
          </p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
          <AlertCircle className="mx-auto mb-2 h-6 w-6 text-rose-600" />
          <p className="text-sm font-bold">{error}</p>
          <p className="mt-1 text-xs opacity-80">
            Periksa koneksi jaringan atau coba muat ulang data dari server.
          </p>
          <button
            type="button"
            onClick={() => void loadData()}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-700"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Coba Lagi</span>
          </button>
        </div>
      ) : halaqohGroups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {santriList.length === 0
              ? "Belum ada data santri yang terdaftar."
              : "Tidak ada data santri yang sesuai dengan filter atau pencarian."}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {santriList.length === 0
              ? "Tambahkan data santri terlebih dahulu melalui menu Data Santri Tahfidz."
              : "Ubah kata kunci pencarian atau reset filter untuk menampilkan seluruh kelompok halaqoh."}
          </p>
          {hasAnyFilter && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      ) : (
        <div
          ref={printAreaRef}
          className="space-y-5 print:space-y-4 print:p-4 print:bg-white bg-transparent"
        >
          {/* Kop Resmi Dokumen Rekap (selalu tampil rapi di Print & JPG) */}
          <div className="rounded-2xl border border-emerald-200/80 bg-white px-4 py-3 shadow-xs dark:border-slate-800 dark:bg-slate-900 print:border-0 print:border-b-2 print:border-emerald-800 print:rounded-none print:shadow-none print:px-0 print:pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <div>
                <h2 className="text-sm font-extrabold tracking-tight text-emerald-900 dark:text-emerald-300 uppercase">
                  LPTQ Pondok Pesantren Darussalam Blokagung
                </h2>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Rekap Keseluruhan Santri — Bulan {BULAN_NAMES[bulan - 1]} {tahun} (Sesi Absensi:{" "}
                  {sesiLabel})
                </p>
              </div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Tahun Setoran & Evaluasi: <strong>{tahun}</strong> • Total:{" "}
                <strong>{totalDisplayedSantri} Santri</strong>
              </div>
            </div>
          </div>

          {/* Daftar Kartu Tabel per Kelompok Halaqoh */}
          {halaqohGroups.map((grp) => (
            <section
              key={grp.id}
              ref={(el) => {
                if (el) cardRefs.current.set(grp.id, el as HTMLDivElement);
                else cardRefs.current.delete(grp.id);
              }}
              className="break-inside-avoid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 print:rounded-lg print:border-slate-300 print:shadow-none"
            >
              {/* Header Kelompok Halaqoh */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/90 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/60 print:bg-emerald-50">
                <div className="flex flex-wrap items-center gap-2">
                  <HalaqohBadge kelas={grp.kelas} bagian={grp.bagian} />
                  <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300">
                    Target: {grp.targetJuz}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {grp.pembimbing && (
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      {grp.pembimbing}
                    </span>
                  )}
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {grp.rows.length} Santri
                  </span>
                </div>
              </div>

              {/* Tabel Santri 2-Tier Header */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/80 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
                      <th
                        rowSpan={2}
                        className="w-10 border-r border-slate-200 px-2 py-2 text-center font-bold dark:border-slate-700"
                      >
                        No
                      </th>
                      <th
                        rowSpan={2}
                        className="min-w-[190px] border-r border-slate-200 px-3 py-2 text-left font-bold dark:border-slate-700"
                      >
                        Nama
                      </th>
                      <th
                        rowSpan={2}
                        className="w-20 border-r border-slate-200 px-2 py-2 text-center font-bold dark:border-slate-700"
                      >
                        Kamar
                      </th>
                      <th
                        colSpan={5}
                        className="border-b border-r border-slate-200 bg-emerald-50/70 px-2 py-1.5 text-center font-bold text-emerald-900 dark:border-slate-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                      >
                        Absensi
                      </th>
                      <th
                        colSpan={2}
                        className="border-b border-r border-slate-200 bg-sky-50/70 px-2 py-1.5 text-center font-bold text-sky-900 dark:border-slate-700 dark:bg-sky-950/30 dark:text-sky-300"
                      >
                        Juz Baru
                      </th>
                      <th
                        rowSpan={2}
                        className="w-20 px-2 py-2 text-center font-bold text-emerald-900 dark:text-emerald-300"
                      >
                        Evaluasi
                      </th>
                    </tr>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] dark:border-slate-700 dark:bg-slate-800/40">
                      <th
                        className="w-10 border-r border-slate-200 px-1.5 py-1.5 text-center font-bold text-emerald-700 dark:border-slate-700 dark:text-emerald-400"
                        title="Total Hadir"
                      >
                        H
                      </th>
                      <th
                        className="w-10 border-r border-slate-200 px-1.5 py-1.5 text-center font-bold text-rose-700 dark:border-slate-700 dark:text-rose-400"
                        title="Total Alfa"
                      >
                        A
                      </th>
                      <th
                        className="w-10 border-r border-slate-200 px-1.5 py-1.5 text-center font-bold text-blue-700 dark:border-slate-700 dark:text-blue-400"
                        title="Total Izin"
                      >
                        I
                      </th>
                      <th
                        className="w-10 border-r border-slate-200 px-1.5 py-1.5 text-center font-bold text-amber-700 dark:border-slate-700 dark:text-amber-400"
                        title="Total Sakit"
                      >
                        S
                      </th>
                      <th className="w-24 border-r border-slate-200 px-2 py-1.5 text-center font-bold text-slate-700 dark:border-slate-700 dark:text-slate-300">
                        Status
                      </th>
                      <th className="w-14 border-r border-slate-200 px-2 py-1.5 text-center font-bold text-slate-700 dark:border-slate-700 dark:text-slate-300">
                        Juz
                      </th>
                      <th className="w-20 border-r border-slate-200 px-2 py-1.5 text-center font-bold text-slate-700 dark:border-slate-700 dark:text-slate-300">
                        Halaman
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {grp.rows.map((s, idx) => (
                      <tr
                        key={s.santri_id}
                        className="transition-colors hover:bg-slate-50/90 dark:hover:bg-slate-800/40"
                      >
                        <td className="border-r border-slate-100 px-2 py-2 text-center font-mono text-[11px] tabular-nums text-slate-500 dark:border-slate-800 dark:text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="border-r border-slate-100 px-3 py-2 font-semibold text-slate-800 dark:border-slate-800 dark:text-slate-100">
                          {s.nama_lengkap}
                        </td>
                        <td className="border-r border-slate-100 px-2 py-2 text-center font-mono text-[11px] font-bold text-slate-700 dark:border-slate-800 dark:text-slate-300">
                          {s.kamar}
                        </td>
                        <td className="border-r border-slate-100 px-1.5 py-2 text-center font-mono text-[11px] font-bold tabular-nums text-emerald-700 dark:border-slate-800 dark:text-emerald-400">
                          {s.hadir}
                        </td>
                        <td className="border-r border-slate-100 px-1.5 py-2 text-center font-mono text-[11px] font-bold tabular-nums text-rose-700 dark:border-slate-800 dark:text-rose-400">
                          {s.alfa}
                        </td>
                        <td className="border-r border-slate-100 px-1.5 py-2 text-center font-mono text-[11px] font-bold tabular-nums text-blue-700 dark:border-slate-800 dark:text-blue-400">
                          {s.izin}
                        </td>
                        <td className="border-r border-slate-100 px-1.5 py-2 text-center font-mono text-[11px] font-bold tabular-nums text-amber-700 dark:border-slate-800 dark:text-amber-400">
                          {s.sakit}
                        </td>
                        <td className="border-r border-slate-100 px-2 py-2 text-center whitespace-nowrap dark:border-slate-800">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              s.statusLevel === "tertib"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : s.statusLevel === "peringatan"
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            }`}
                          >
                            {s.statusLabel}
                          </span>
                        </td>
                        <td className="border-r border-slate-100 px-2 py-2 text-center font-mono text-xs font-bold tabular-nums text-slate-800 dark:border-slate-800 dark:text-slate-100">
                          {s.juzBaru}
                        </td>
                        <td className="border-r border-slate-100 px-2 py-2 text-center font-mono text-xs tabular-nums text-slate-700 dark:border-slate-800 dark:text-slate-300">
                          {s.halamanBaru}
                        </td>
                        <td className="px-2 py-2 text-center font-mono text-xs font-bold tabular-nums text-emerald-800 dark:text-emerald-300">
                          {s.evaluasiJuz}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Modal Filter Lanjutan */}
      {filterModalOpen && (
        <div
          className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Filter Lanjutan Rekap Keseluruhan"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Filter Lanjutan Rekap
              </h3>
              <button
                type="button"
                onClick={() => setFilterModalOpen(false)}
                aria-label="Tutup modal filter"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Kelas Halaqoh
                </label>
                <select
                  value={kelasFilter}
                  onChange={(e) =>
                    setKelasFilter(e.target.value ? Number(e.target.value) : "")
                  }
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">Semua Kelas</option>
                  {HALAQOH_KELAS_LIST.map((k) => (
                    <option key={k} value={k}>
                      Kelas {k} ({PEMETAAN_HALAQOH_KELAS[k]})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Bagian Halaqoh
                </label>
                <select
                  value={bagianFilter}
                  onChange={(e) => setBagianFilter(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">Semua Bagian</option>
                  {HALAQOH_BAGIAN_LIST.map((b) => (
                    <option key={b} value={b}>
                      Bagian {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Blok
                </label>
                <select
                  value={blokFilter}
                  onChange={(e) => setBlokFilter(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">Semua Blok</option>
                  {blokOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Asrama
                </label>
                <select
                  value={asramaFilter}
                  onChange={(e) => setAsramaFilter(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">Semua Asrama</option>
                  {asramaOptions.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setKelasFilter("");
                  setBagianFilter("");
                  setBlokFilter("");
                  setAsramaFilter("");
                }}
                className="text-xs font-semibold text-rose-600 hover:underline dark:text-rose-400"
              >
                Reset Filter Lanjutan
              </button>
              <button
                type="button"
                onClick={() => setFilterModalOpen(false)}
                className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-hover"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
