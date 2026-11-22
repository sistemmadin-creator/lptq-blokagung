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
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Users,
} from "lucide-react";
import { KhotmilLjkPrintModal } from "@/components/tahfidz/KhotmilLjkPrintModal";
import { KhotmilCameraScannerModal } from "@/components/tahfidz/KhotmilCameraScannerModal";
import { KhotmilTransferModal } from "@/components/tahfidz/KhotmilTransferModal";
import { loadHalaqohFormasi, type FormasiHalaqohItem } from "@/lib/services/halaqoh-service";
import { useReactToPrint } from "react-to-print";
import {
  fetchAllSantriFiltered,
  fetchKhotmilTahapNilai,
  upsertKhotmilNilaiBatch,
  fetchSantriAbsensiDetail,
  fetchPembimbingMap,
  fetchKhotmilRegisteredSantriIds,
  registerKhotmilSantriBatch,
  deleteKhotmilSantriRegistration,
  fetchSantriSetoranDetailTahun,
  fetchCurrentUserProfile,
} from "@/lib/services/tahfidz-service";
import { canUserEdit } from "@/lib/services/user-permission-service";
import type { Profile, ModuleKey } from "@/types/database";
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
  parseExcelBufferToJson,
  parseExcelFileWithValidation,
} from "@/lib/utils/excel";
import { useToast } from "@/components/ui/Toast";
import {
  getWahaConfig,
  sendWahaImage,
  compileMessage,
  saveDeliveryLog,
  formatPhoneNumber,
} from "@/lib/services/waha-service";

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

  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    fetchCurrentUserProfile().then(setProfile);
  }, []);

  const currentModuleKey: ModuleKey = jenis === "khotmil15" ? "khotmil_15" : "khotmil_30";
  const canEdit = profile ? (profile.role === "admin" || canUserEdit(profile.permissions, currentModuleKey)) : true;
  const canTransferTo30 =
    jenis === "khotmil15" &&
    canEdit &&
    (profile ? (profile.role === "admin" || canUserEdit(profile.permissions, "khotmil_30")) : true);

  // State Modal Perpindahan Khotmil 15 Juz -> 30 Juz
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferInitialIds, setTransferInitialIds] = useState<string[]>([]);
  const [transferSantriPool, setTransferSantriPool] = useState<Santri[]>([]);
  const [transferPembimbingMap, setTransferPembimbingMap] = useState<Record<string, string>>({});

  // State Modal Pendaftaran Khotmil
  const [daftarModalOpen, setDaftarModalOpen] = useState(false);
  const [inputPerHalaqoh, setInputPerHalaqoh] = useState(false);
  const [expandedHalaqohKeys, setExpandedHalaqohKeys] = useState<Set<string>>(new Set());
  const [allSantriData, setAllSantriData] = useState<Santri[]>([]);
  const [pembimbingMap, setPembimbingMap] = useState<Record<string, string>>({});
  const [formasiMap, setFormasiMap] = useState<Record<string, FormasiHalaqohItem>>({});
  const [registeredCurrentSet, setRegisteredCurrentSet] = useState<Set<string>>(new Set());
  const [registeredOtherSet, setRegisteredOtherSet] = useState<Set<string>>(new Set());
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

      const registeredSet = new Set(scoredSantriIds);

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
    setInputPerHalaqoh(false);
    setExpandedHalaqohKeys(new Set());
    const otherJenis: JenisKhotmil = jenis === "khotmil15" ? "khotmil30" : "khotmil15";
    try {
      const [santriData, pMap, formasiList, currentRegIds, otherRegIds] = await Promise.all([
        fetchAllSantriFiltered({}),
        fetchPembimbingMap(),
        loadHalaqohFormasi(),
        fetchKhotmilRegisteredSantriIds(jenis),
        fetchKhotmilRegisteredSantriIds(otherJenis),
      ]);
      const fMap: Record<string, FormasiHalaqohItem> = {};
      formasiList.forEach((f) => {
        fMap[`${f.kelas}_${String(f.bagian || "").trim().toUpperCase()}`] = f;
      });
      setAllSantriData(santriData);
      setPembimbingMap(pMap);
      setFormasiMap(fMap);
      setRegisteredCurrentSet(new Set(currentRegIds));
      setRegisteredOtherSet(new Set(otherRegIds));
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

  // Buka modal pindah Khotmil 15 Juz -> 30 Juz (tunggal dari baris tabel, atau massal dari toolbar)
  const handleOpenTransferModal = async (initialIds: string[] = []) => {
    setTransferInitialIds(initialIds);
    if (!search && !asramaFilter && Object.keys(pembimbingMap).length > 0) {
      setTransferSantriPool(santriList);
      setTransferPembimbingMap(pembimbingMap);
      setTransferModalOpen(true);
      return;
    }

    try {
      const [allSantri, reg15Ids, pMap] = await Promise.all([
        fetchAllSantriFiltered({}),
        fetchKhotmilRegisteredSantriIds("khotmil15"),
        fetchPembimbingMap(),
      ]);
      const reg15Set = new Set(reg15Ids);
      setTransferSantriPool(allSantri.filter((s) => reg15Set.has(s.id)));
      setTransferPembimbingMap(pMap);
      setTransferModalOpen(true);
    } catch {
      setTransferSantriPool(santriList);
      setTransferPembimbingMap(pembimbingMap);
      setTransferModalOpen(true);
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

  // Kelompok Halaqoh untuk switch Input Per Halaqoh
  const halaqohGroupsForDaftar = useMemo(() => {
    const groupsMap = new Map<
      string,
      {
        key: string;
        kelas: number;
        bagian: string;
        label: string;
        pembimbing: string;
        targetJuz: string;
        members: Santri[];
      }
    >();

    allSantriData.forEach((s) => {
      const kelas = Number(s.halaqoh_kelas || 0);
      const bagian = String(s.halaqoh_bagian || "").trim().toUpperCase();
      const key = `${kelas}_${bagian}`;
      if (!groupsMap.has(key)) {
        const label =
          s.halaqoh?.trim() ||
          (kelas > 0 ? `${kelas}${bagian}` : "Tanpa Halaqoh");
        const formasi = formasiMap[key];
        const pembimbing =
          pembimbingMap[key] || formasi?.pembimbing || "Ust. Pembimbing";
        groupsMap.set(key, {
          key,
          kelas,
          bagian,
          label,
          pembimbing,
          targetJuz: formasi?.target_juz || "",
          members: [],
        });
      }
      groupsMap.get(key)!.members.push(s);
    });

    const sorted = Array.from(groupsMap.values()).sort((a, b) => {
      if (a.kelas !== b.kelas) return a.kelas - b.kelas;
      return a.bagian.localeCompare(b.bagian);
    });

    const q = daftarSearch.trim().toLowerCase();

    return sorted
      .map((grp) => {
        const groupHeaderMatch =
          !q ||
          grp.label.toLowerCase().includes(q) ||
          `kelas ${grp.kelas} bagian ${grp.bagian}`.toLowerCase().includes(q) ||
          grp.pembimbing.toLowerCase().includes(q) ||
          grp.targetJuz.toLowerCase().includes(q);

        const matchingMembers = groupHeaderMatch
          ? grp.members
          : grp.members.filter((m) => {
              const kDisplay = formatKamarDisplay(m.kode_kamar, m.kamar).toLowerCase();
              return (
                m.nama_lengkap.toLowerCase().includes(q) ||
                (m.kode && m.kode.toLowerCase().includes(q)) ||
                kDisplay.includes(q)
              );
            });

        // Otomatis lewati santri yang sudah terdaftar di program ini maupun di program sebelah
        const autoSelectableIds = grp.members
          .filter((m) => !registeredCurrentSet.has(m.id) && !registeredOtherSet.has(m.id))
          .map((m) => m.id);
        const alreadyCurrentCount = grp.members.filter((m) =>
          registeredCurrentSet.has(m.id)
        ).length;
        const alreadyOtherCount = grp.members.filter(
          (m) => !registeredCurrentSet.has(m.id) && registeredOtherSet.has(m.id)
        ).length;

        return {
          ...grp,
          matchingMembers,
          autoSelectableIds,
          alreadyCurrentCount,
          alreadyOtherCount,
        };
      })
      .filter((grp) => grp.matchingMembers.length > 0);
  }, [allSantriData, daftarSearch, formasiMap, pembimbingMap, registeredCurrentSet, registeredOtherSet]);

  const flatAutoSelectableIds = useMemo(
    () =>
      filteredSantriForDaftar
        .filter((s) => !registeredCurrentSet.has(s.id) && !registeredOtherSet.has(s.id))
        .map((s) => s.id),
    [filteredSantriForDaftar, registeredCurrentSet, registeredOtherSet]
  );

  const halaqohAutoSelectableIds = useMemo(() => {
    const ids: string[] = [];
    halaqohGroupsForDaftar.forEach((grp) => {
      ids.push(...grp.autoSelectableIds);
    });
    return ids;
  }, [halaqohGroupsForDaftar]);

  const activeAutoSelectableIds = inputPerHalaqoh
    ? halaqohAutoSelectableIds
    : flatAutoSelectableIds;

  const isAllAutoSelected =
    activeAutoSelectableIds.length > 0 &&
    activeAutoSelectableIds.every((id) => selectedSantriIds.has(id));

  // Toggle pilihan 1 santri
  const toggleSantriSelection = (id: string) => {
    if (registeredCurrentSet.has(id)) return;
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

  // Toggle seluruh santri eligible dalam 1 grup halaqoh (otomatis melewati yg sudah di program lain)
  const toggleHalaqohGroupSelection = (
    autoIds: string[],
    allGroupMemberIds: string[]
  ) => {
    if (autoIds.length === 0) return;
    setSelectedSantriIds((prev) => {
      const next = new Set(prev);
      const allSelected = autoIds.every((id) => next.has(id));
      if (allSelected) {
        allGroupMemberIds.forEach((id) => next.delete(id));
      } else {
        autoIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleExpandHalaqoh = (key: string) => {
    setExpandedHalaqohKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Toggle pilih semua santri / semua halaqoh yang tampil (melewati santri yg sudah terdaftar)
  const toggleSelectAllDaftar = () => {
    if (activeAutoSelectableIds.length === 0) return;
    setSelectedSantriIds((prev) => {
      const next = new Set(prev);
      if (isAllAutoSelected) {
        activeAutoSelectableIds.forEach((id) => next.delete(id));
      } else {
        activeAutoSelectableIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  // Simpan pendaftaran santri ke Khotmil
  const handleConfirmDaftar = async () => {
    if (selectedSantriIds.size === 0) {
      showToast("error", "Pilih minimal 1 santri untuk didaftarkan.");
      return;
    }

    try {
      const ids = Array.from(selectedSantriIds);
      await registerKhotmilSantriBatch(ids, jenis);

      showToast("success", `Alhamdulillah! ${ids.length} santri berhasil didaftarkan ke ${judul}.`);
      setDaftarModalOpen(false);
      setSelectedSantriIds(new Set());
      await loadData();
    } catch (e: any) {
      showToast("error", "Gagal menyimpan pendaftaran santri: " + e.message);
    }
  };

  // Keluarkan santri dari daftar Khotmil (Hapus nilai & registrasi di Supabase)
  const handleUnregisterSantri = async (santriId: string, namaSantri: string) => {
    if (
      !confirm(
        `Apakah Anda yakin ingin mengeluarkan ${namaSantri} dan menghapus seluruh nilai ujiannya dari ${judul}?`
      )
    ) {
      return;
    }

    try {
      // 1. Hapus catatan registrasi & nilai santri dari Supabase
      await deleteKhotmilSantriRegistration(santriId, jenis);

      // 2. Bersihkan nilaiMap lokal untuk santri ini
      setNilaiMap((prev) => {
        const next = { ...prev };
        for (const j of currentTahapCfg.juzList) {
          delete next[`${santriId}_${j}`];
        }
        return next;
      });

      showToast("success", `${namaSantri} telah dihapus dari daftar ${judul}.`);
      await loadData();
    } catch (e: any) {
      showToast("error", "Gagal menghapus santri dari daftar: " + (e.message || "Kesalahan"));
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

      // Otomasi Pengiriman Kartu Rapor ke WhatsApp Wali Santri (jika diaktifkan di Pengaturan WAHA)
      try {
        const wahaCfg = getWahaConfig();
        if (wahaCfg.autoSendOnScore && editingSantri.no_wa) {
          const totalVal = payload.reduce((sum, p) => sum + p.nilai, 0);
          const avgVal = Number((totalVal / payload.length).toFixed(1));
          const isTuntas =
            avgVal >= KKM_DEFAULT && payload.length >= currentTahapCfg.juzList.length;
          const scoresStr = payload.map((p) => `Juz ${p.juz}:${p.nilai}`).join(",");
          const origin = typeof window !== "undefined" ? window.location.origin : "";
          const params = new URLSearchParams({
            nama: editingSantri.nama_lengkap,
            asrama: editingSantri.asrama || "-",
            kamar: editingSantri.kamar || "-",
            program: jenis === "khotmil30" ? "Khotmil 30 Juz" : "Khotmil 15 Juz",
            tahap: `${currentTahapCfg.label} (${currentTahapCfg.rentangLabel})`,
            rataRata: String(avgVal),
            kkm: isTuntas ? "TUNTAS" : "BELUM TUNTAS",
            scores: scoresStr,
            tanggal: new Date().toLocaleDateString("id-ID"),
            catatan: isTuntas
              ? "Lulus dengan baik, pertahankan kelancaran hafalan."
              : "Perlu bimbingan dan pengulangan muraja'ah.",
          });
          const imgUrl = `${origin}/api/og/rapor-evaluasi?${params.toString()}`;
          const textMsg = compileMessage(wahaCfg.messageTemplate, {
            nama: editingSantri.nama_lengkap,
            asrama: editingSantri.asrama || "-",
            kamar: editingSantri.kamar || "-",
            program: jenis === "khotmil30" ? "Khotmil 30 Juz" : "Khotmil 15 Juz",
            tahap: `${currentTahapCfg.label} (${currentTahapCfg.rentangLabel})`,
            rata_rata: String(avgVal),
            status: isTuntas ? "TUNTAS (LULUS TAHAP)" : "BELUM TUNTAS (REMIDI)",
            catatan: isTuntas
              ? "Lulus dengan baik, pertahankan kelancaran hafalan."
              : "Perlu bimbingan dan pengulangan muraja'ah.",
          });

          sendWahaImage(wahaCfg, editingSantri.no_wa, imgUrl, textMsg)
            .then((res) => {
              if (res.success) {
                saveDeliveryLog({
                  santriId: editingSantri.id,
                  namaSantri: editingSantri.nama_lengkap,
                  noWa: formatPhoneNumber(editingSantri.no_wa || ""),
                  jenis,
                  tahap: activeTahap,
                  status: "success",
                });
                showToast("success", `Rapor otomatis terkirim via WhatsApp ke nomor wali!`);
              }
            })
            .catch((err) => console.error("Auto WA send failed", err));
        }
      } catch (autoErr) {
        console.error("Gagal menjalankan auto-send WA", autoErr);
      }

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
        "Nama Santri": s.nama_lengkap,
        Asrama: s.asrama || "-",
        Halaqoh: s.halaqoh || "-",
      };
      currentTahapCfg.juzList.forEach((j) => {
        const v = nilaiMap[`${s.id}_${j}`];
        obj[`Juz ${j}`] = typeof v === "number" ? v : "-";
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

  // Impor Nilai Khotmil Excel (Mendukung format kolom tabel baru & format normalisasi lama)
  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportProgress("Membaca dan memvalidasi berkas nilai...");

    try {
      const buffer = await file.arrayBuffer();
      const rawRows = await parseExcelBufferToJson(buffer, file.name);

      if (rawRows.length === 0) {
        throw new Error("Berkas Excel kosong atau tidak memiliki baris data.");
      }

      const firstRowKeys = Object.keys(rawRows[0]);
      const isLegacy = ["Kode", "Jenis", "Tahap", "Juz", "Nilai"].every((h) =>
        firstRowKeys.some((k) => k.trim().toLowerCase() === h.toLowerCase())
      );

      interface ImportPayloadRow {
        santri: string;
        jenis: string;
        tahap: number;
        juz: number;
        nilai: number;
      }

      const payloadRows: ImportPayloadRow[] = [];

      if (isLegacy) {
        // Format normalisasi lama (Kode, Jenis, Tahap, Juz, Nilai)
        rawRows.forEach((r) => {
          const santriVal = String(r.Kode || r.kode || "").trim();
          const jVal = String(r.Jenis || r.jenis || jenis).trim();
          const tVal = Number(r.Tahap || r.tahap || activeTahap);
          const juzVal = Number(r.Juz || r.juz);
          const nVal = Number(r.Nilai || r.nilai);

          if (santriVal && !Number.isNaN(juzVal) && !Number.isNaN(nVal)) {
            payloadRows.push({
              santri: santriVal,
              jenis: jVal,
              tahap: tVal,
              juz: juzVal,
              nilai: Math.round(nVal),
            });
          }
        });
      } else {
        // Format kolom tabel baru (No, Nama Santri, Asrama, Halaqoh, Juz 1, Juz 2, ...)
        const santriKey = firstRowKeys.find((k) =>
          /^(nama\s*santri|nama\s*lengkap|nama|santri|kode\s*santri|kode)$/i.test(k.trim())
        );

        if (!santriKey) {
          throw new Error(
            "Kolom nama santri (misal: 'Nama Santri' atau 'Kode') tidak ditemukan pada berkas Excel. Silakan gunakan format template yang disediakan."
          );
        }

        // Temukan seluruh kolom Juz (misal: 'Juz 1', 'Juz 2', 'Juz_1', dsb.)
        const juzColumns: { key: string; juz: number }[] = [];
        firstRowKeys.forEach((k) => {
          const m = k.trim().match(/^juz[\s_]*(\d+)$/i);
          if (m) {
            juzColumns.push({ key: k, juz: parseInt(m[1], 10) });
          }
        });

        if (juzColumns.length === 0) {
          throw new Error(
            "Kolom Juz (misal: 'Juz 1', 'Juz 2', dst.) tidak ditemukan. Unduh Template Excel Nilai terlebih dahulu."
          );
        }

        rawRows.forEach((r) => {
          const santriVal = String(r[santriKey] ?? "").trim();
          if (!santriVal) return;

          juzColumns.forEach(({ key, juz }) => {
            const rawVal = r[key];
            if (rawVal === "" || rawVal === null || rawVal === undefined || rawVal === "-") {
              return;
            }
            const num = Number(rawVal);
            if (!Number.isNaN(num) && num >= 0 && num <= 100) {
              payloadRows.push({
                santri: santriVal,
                jenis,
                tahap: activeTahap,
                juz,
                nilai: Math.round(num),
              });
            }
          });
        });
      }

      if (payloadRows.length === 0) {
        throw new Error(
          "Tidak ditemukan data nilai angka (0 - 100) yang valid untuk diimpor. Pastikan nilai telah diisi di kolom Juz."
        );
      }

      const chunks = chunkArray(payloadRows, 100);
      let importedCount = 0;
      const allRegisteredSantriIds: string[] = [];

      for (let idx = 0; idx < chunks.length; idx++) {
        setImportProgress(
          `Mengunggah nilai baris ${idx * 100 + 1} s.d ${Math.min(
            (idx + 1) * 100,
            payloadRows.length
          )}...`
        );
        const res = await fetch("/api/import/khotmil", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rows: chunks[idx],
            jenis,
            tahap: activeTahap,
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Gagal mengimpor nilai ke server.");
        }
        importedCount += json.count ?? chunks[idx].length;
        if (Array.isArray(json.registeredSantriIds)) {
          allRegisteredSantriIds.push(...json.registeredSantriIds);
        }
      }

      // Daftarkan santri yang nilainya berhasil diimpor ke database
      if (allRegisteredSantriIds.length > 0) {
        try {
          await registerKhotmilSantriBatch(allRegisteredSantriIds, jenis);
        } catch (e) {
          console.error("Gagal mendaftarkan peserta khotmil ke database:", e);
        }
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

  const otherProgramLabel = jenis === "khotmil15" ? "30 Juz" : "15 Juz";

  // Helper tampilan 1 baris santri di modal pendaftaran (dipakai bersama oleh mode satuan & per-halaqoh)
  const renderDaftarSantriRow = (s: Santri, indented = false) => {
    const isAlreadyCurrent = registeredCurrentSet.has(s.id);
    const isInOtherProgram = !isAlreadyCurrent && registeredOtherSet.has(s.id);
    const isSelected = selectedSantriIds.has(s.id);
    const isPreviewActive = previewSantri?.id === s.id;
    const pembimbingNama =
      pembimbingMap[`${s.halaqoh_kelas}_${s.halaqoh_bagian}`] || "Ust. Pembimbing";
    const kamarStr = formatKamarDisplay(s.kode_kamar, s.kamar);

    return (
      <div
        key={s.id}
        onClick={() => setPreviewSantri(s)}
        className={`flex items-center gap-3 ${indented ? "pl-9 pr-4 py-2" : "px-4 py-2.5"} cursor-pointer transition ${
          isPreviewActive
            ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-l-4 border-l-emerald-600"
            : isAlreadyCurrent
            ? "bg-slate-50/60 dark:bg-slate-900/40 opacity-75 hover:bg-slate-50 dark:hover:bg-slate-800/30"
            : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
        }`}
      >
        <input
          type="checkbox"
          checked={isAlreadyCurrent ? true : isSelected}
          disabled={isAlreadyCurrent}
          onChange={(e) => {
            e.stopPropagation();
            toggleSantriSelection(s.id);
          }}
          aria-label={`Pilih santri ${s.nama_lengkap}`}
          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate">
              {s.nama_lengkap}
            </span>
            <span className="text-[10px] font-mono text-slate-400 shrink-0">
              ({s.kode})
            </span>
            {isAlreadyCurrent && (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Sudah Terdaftar
              </span>
            )}
            {isInOtherProgram && (
              <span
                className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                title={`Santri ini sudah terdaftar di Khotmil ${otherProgramLabel} (dilewati otomatis saat pilih halaqoh, tetap bisa dicentang manual)`}
              >
                Aktif di {otherProgramLabel}
              </span>
            )}
          </div>
          {!indented && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-600 dark:text-slate-300">
                {s.halaqoh || `Kelas ${s.halaqoh_kelas || 1}`}
              </span>
              <span>•</span>
              <span className="text-emerald-700 dark:text-emerald-400">
                {pembimbingNama}
              </span>
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-mono font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {kamarStr}
          </span>
        </div>
      </div>
    );
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
        {canEdit && (
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
        )}

        {/* Tombol Daftar Khotmil (Issue #4) */}
        {canEdit && (
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
        )}

        {/* Tombol Pindah Banyak Santri ke Khotmil 30 Juz (Khusus halaman Khotmil 15 Juz) */}
        {canTransferTo30 && (
          <button
            type="button"
            onClick={() => handleOpenTransferModal([])}
            title="Pindahkan satu atau banyak santri dari Khotmil 15 Juz ke Khotmil 30 Juz"
            aria-label="Pindah ke Khotmil 30 Juz"
            className="flex h-11 items-center gap-1.5 rounded-xl border border-emerald-700/30 bg-emerald-50 px-3.5 text-xs font-bold text-emerald-900 shadow-sm transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shrink-0 dark:border-emerald-700/60 dark:bg-emerald-950/60 dark:text-emerald-200 dark:hover:bg-emerald-900/60"
          >
            <ArrowUpRight className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            <span className="hidden sm:inline">Pindah 30 Juz</span>
            <span className="sm:hidden">Pindah</span>
          </button>
        )}

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
                  {canEdit && <th className="no-print px-3 py-2.5 font-semibold text-center w-28">Aksi</th>}
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
                              disabled={!canEdit}
                              key={`${s.id}_${j}_${typeof n === "number" ? n : ""}`}
                              defaultValue={typeof n === "number" ? n : ""}
                              placeholder="-"
                              onBlur={(e) => {
                                if (!canEdit) return;
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
                              className="h-8 w-12 text-center font-mono text-xs font-bold bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded border border-transparent hover:border-slate-300 focus:border-emerald-500 dark:hover:bg-slate-800 dark:focus:bg-slate-900 transition disabled:opacity-80 disabled:cursor-not-allowed"
                              title={canEdit ? `Ubah nilai Juz ${j} ${s.nama_lengkap} (0-100)` : `Nilai Juz ${j}: ${typeof n === "number" ? n : "-"}`}
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
                      {canEdit && (
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
                            {canTransferTo30 && (
                              <button
                                type="button"
                                onClick={() => handleOpenTransferModal([s.id])}
                                className="inline-flex min-h-[30px] items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50/80 px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                                title={`Pindahkan ${s.nama_lengkap} ke Khotmil 30 Juz`}
                              >
                                <ArrowUpRight className="h-3.5 w-3.5" />
                                <span>30 Juz</span>
                              </button>
                            )}
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
                      )}
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
                {/* Pilihan 1: Template Excel Nilai Kolom Tabel */}
                <button
                  type="button"
                  onClick={() => {
                    downloadKhotmilTemplateExcel({
                      jenis,
                      tahap: activeTahap,
                      tahapLabel: currentTahapCfg.label,
                      rentangLabel: currentTahapCfg.rentangLabel,
                      juzList: currentTahapCfg.juzList,
                      santriList,
                    });
                    showToast(
                      "success",
                      `Template nilai ${currentTahapCfg.label} (${currentTahapCfg.rentangLabel}) berhasil diunduh.`
                    );
                    setExcelModalOpen(false);
                  }}
                  className="w-full flex items-center gap-3.5 p-3 rounded-xl border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/50 transition text-left group dark:border-slate-800 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/20"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-emerald-100 group-hover:text-emerald-800 transition dark:bg-slate-800 dark:text-slate-300">
                    <Download className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800 group-hover:text-emerald-900 dark:text-slate-200 dark:group-hover:text-emerald-300">
                      Template Excel Nilai ({currentTahapCfg.label})
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Format kolom tabel: No, Nama Santri, Asrama, Halaqoh, {currentTahapCfg.rentangLabel}
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

            {/* Pencarian Santri & Switch Input Per Halaqoh */}
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 shrink-0 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                <div className="relative flex-1">
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
                      aria-label="Bersihkan pencarian pendaftaran"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Switch Input Per Halaqoh */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={inputPerHalaqoh}
                  onClick={() => setInputPerHalaqoh((prev) => !prev)}
                  className={`inline-flex h-10 items-center gap-2.5 rounded-xl border px-3.5 text-xs font-semibold transition shrink-0 ${
                    inputPerHalaqoh
                      ? "border-emerald-600 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-200"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  <Users className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                  <span>Input Per Halaqoh</span>
                  <span
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      inputPerHalaqoh ? "bg-emerald-700 dark:bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                        inputPerHalaqoh ? "translate-x-[18px]" : "translate-x-[3px]"
                      }`}
                    />
                  </span>
                </button>
              </div>

              {inputPerHalaqoh && (
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                  Mode Per Halaqoh aktif: centang 1 halaqoh untuk memilih seluruh anggotanya sekaligus. Santri yang sudah aktif di Khotmil {otherProgramLabel} otomatis dilewati, dan tetap dapat dicentang manual di rincian anggota.
                </p>
              )}
            </div>

            {/* Konten 2 Sisi: Tabel Santri (Kiri) & Riwayat Kegiatan + Juz Baru (Kanan) */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
              {/* Kolom Kiri: Daftar Santri atau Grup Halaqoh */}
              <div className="lg:col-span-7 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 min-h-0 overflow-y-auto">
                <div className="p-3 bg-slate-100/60 dark:bg-slate-800/50 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 backdrop-blur-xs">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="select-all-santri"
                      disabled={activeAutoSelectableIds.length === 0}
                      checked={isAllAutoSelected}
                      onChange={toggleSelectAllDaftar}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-40"
                    />
                    <label htmlFor="select-all-santri" className="cursor-pointer select-none">
                      {inputPerHalaqoh
                        ? `Pilih Semua Halaqoh (${halaqohGroupsForDaftar.length})`
                        : `Pilih Semua (${filteredSantriForDaftar.length})`}
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
                ) : inputPerHalaqoh ? (
                  halaqohGroupsForDaftar.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-500">
                      Tidak ada halaqoh yang cocok dengan pencarian &quot;{daftarSearch}&quot;.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200 dark:divide-slate-800">
                      {halaqohGroupsForDaftar.map((grp) => {
                        const isExpanded =
                          expandedHalaqohKeys.has(grp.key) || Boolean(daftarSearch.trim());
                        const allMemberIds = grp.members.map((m) => m.id);
                        const selectedAutoCount = grp.autoSelectableIds.filter((id) =>
                          selectedSantriIds.has(id)
                        ).length;
                        const selectedManualCount = grp.members.filter(
                          (m) => !registeredCurrentSet.has(m.id) && selectedSantriIds.has(m.id)
                        ).length;
                        const isGroupChecked =
                          grp.autoSelectableIds.length > 0 &&
                          selectedAutoCount === grp.autoSelectableIds.length;
                        const isGroupIndeterminate =
                          selectedAutoCount > 0 && selectedAutoCount < grp.autoSelectableIds.length;

                        return (
                          <div key={grp.key} className="bg-white dark:bg-slate-900">
                            <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                              <input
                                type="checkbox"
                                disabled={grp.autoSelectableIds.length === 0}
                                checked={isGroupChecked}
                                ref={(el) => {
                                  if (el) el.indeterminate = isGroupIndeterminate;
                                }}
                                onChange={() =>
                                  toggleHalaqohGroupSelection(grp.autoSelectableIds, allMemberIds)
                                }
                                aria-label={`Pilih Halaqoh ${grp.label}`}
                                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-40 shrink-0"
                              />
                              <button
                                type="button"
                                onClick={() => toggleExpandHalaqoh(grp.key)}
                                className="flex-1 min-w-0 text-left flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <HalaqohBadge kelas={grp.kelas} bagian={grp.bagian} />
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                      {grp.pembimbing}
                                    </span>
                                    {grp.targetJuz && (
                                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                        {grp.targetJuz}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                    <span>{grp.members.length} santri</span>
                                    {grp.autoSelectableIds.length > 0 ? (
                                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                                        • {grp.autoSelectableIds.length} siap dipilih
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">
                                        • 0 siap otomatis
                                      </span>
                                    )}
                                    {grp.alreadyCurrentCount > 0 && (
                                      <span>• {grp.alreadyCurrentCount} sudah terdaftar</span>
                                    )}
                                    {grp.alreadyOtherCount > 0 && (
                                      <span className="text-amber-700 dark:text-amber-400 font-medium">
                                        • {grp.alreadyOtherCount} aktif di {otherProgramLabel} (dilewati)
                                      </span>
                                    )}
                                    {selectedManualCount > 0 && (
                                      <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                        {selectedManualCount} dipilih
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0">
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </span>
                              </button>
                            </div>

                            {isExpanded && (
                              <div className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30">
                                {grp.matchingMembers.map((m) => renderDaftarSantriRow(m, true))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : filteredSantriForDaftar.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    Tidak ada santri yang cocok dengan pencarian &quot;{daftarSearch}&quot;.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredSantriForDaftar.map((s) => renderDaftarSantriRow(s, false))}
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

      {/* POP-UP 7: MODAL PERPINDAHAN SANTRI KHOTMIL 15 -> 30 JUZ */}
      {canTransferTo30 && (
        <KhotmilTransferModal
          isOpen={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          santriList={transferSantriPool}
          pembimbingMap={transferPembimbingMap}
          initialSelectedIds={transferInitialIds}
          onSuccessTransfer={loadData}
        />
      )}
    </div>
  );
}
