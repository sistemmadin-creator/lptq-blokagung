"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import {
  Archive,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  FolderPlus,
  Loader2,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
  AlertTriangle,
} from "lucide-react";
import {
  JenisKhotmil,
  KhotmilAngkatanPesertaRecord,
  KhotmilAngkatanRecord,
  ModuleKey,
  Profile,
  Santri,
  TahapConfig,
} from "@/types/database";
import {
  EligibleGraduateCandidate,
  addManualAlumniToAngkatan,
  archiveGraduatesToAngkatan,
  createAngkatan,
  deleteAngkatan,
  deleteAngkatanPeserta,
  fetchAllAngkatanPesertaByJenis,
  fetchAngkatanList,
  fetchAngkatanPeserta,
  fetchEligibleKhotmilGraduates,
  updateAngkatan,
} from "@/lib/services/angkatan-service";
import {
  fetchAllSantriFiltered,
  fetchCurrentUserProfile,
  fetchPembimbingMap,
} from "@/lib/services/tahfidz-service";
import { canUserEdit } from "@/lib/services/user-permission-service";
import { HalaqohBadge } from "@/components/ui/Badges";
import { useToast } from "@/components/ui/Toast";
import { exportJsonToExcel } from "@/lib/utils/excel";

interface DatabaseAngkatanModuleProps {
  jenis: JenisKhotmil;
  judul: string;
  tahapList: TahapConfig[];
}

function formatDateId(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAvgScore(val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return "-";
  return Number(val).toFixed(2).replace(/\.00$/, "");
}

export default function DatabaseAngkatanModule({
  jenis,
  judul,
  tahapList,
}: DatabaseAngkatanModuleProps) {
  const { showToast } = useToast();
  const printRef = useRef<HTMLDivElement | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [angkatanList, setAngkatanList] = useState<KhotmilAngkatanRecord[]>([]);
  const [selectedAngkatanId, setSelectedAngkatanId] = useState<string>("SEMUA");
  const [pesertaList, setPesertaList] = useState<KhotmilAngkatanPesertaRecord[]>([]);

  const [loadingAngkatan, setLoadingAngkatan] = useState(true);
  const [loadingPeserta, setLoadingPeserta] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"semua" | "lulus" | "belum_tuntas">("semua");

  // Modal: Buat / Edit Angkatan
  const [angkatanModalOpen, setAngkatanModalOpen] = useState(false);
  const [editingAngkatan, setEditingAngkatan] = useState<KhotmilAngkatanRecord | null>(null);
  const [formNamaAngkatan, setFormNamaAngkatan] = useState("");
  const [formTanggalKhataman, setFormTanggalKhataman] = useState("");
  const [formKeterangan, setFormKeterangan] = useState("");
  const [savingAngkatan, setSavingAngkatan] = useState(false);

  // Modal: Konfirmasi Hapus Angkatan
  const [deleteAngkatanTarget, setDeleteAngkatanTarget] = useState<KhotmilAngkatanRecord | null>(
    null
  );
  const [deletingAngkatan, setDeletingAngkatan] = useState(false);

  // Modal: Tarik Lulusan Khotmil Aktif
  const [pullModalOpen, setPullModalOpen] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidates, setCandidates] = useState<EligibleGraduateCandidate[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [candidateSearch, setCandidateSearch] = useState("");
  const [removeFromActiveKhotmil, setRemoveFromActiveKhotmil] = useState(false);
  const [archivingCandidates, setArchivingCandidates] = useState(false);

  // Modal: Tambah Manual
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualMode, setManualMode] = useState<"master" | "bebas">("master");
  const [masterSantriList, setMasterSantriList] = useState<Santri[]>([]);
  const [pembimbingMap, setPembimbingMap] = useState<Record<string, string>>({});
  const [loadingMasterSantri, setLoadingMasterSantri] = useState(false);
  const [masterSearch, setMasterSearch] = useState("");
  const [selectedMasterSantriId, setSelectedMasterSantriId] = useState<string>("");
  const [manualBiodata, setManualBiodata] = useState({
    kode_santri: "",
    nama_lengkap: "",
    asrama: "",
    kamar: "",
    halaqoh: "",
    pembimbing: "",
  });
  const [manualRataRata, setManualRataRata] = useState("");
  const [manualStatus, setManualStatus] = useState<"lulus" | "belum_tuntas">("lulus");
  const [manualCatatan, setManualCatatan] = useState("");
  const [savingManual, setSavingManual] = useState(false);

  // Modal: Detail Nilai Tahap
  const [detailPeserta, setDetailPeserta] = useState<KhotmilAngkatanPesertaRecord | null>(null);

  // Konfirmasi hapus 1 peserta arsip
  const [deletePesertaTarget, setDeletePesertaTarget] =
    useState<KhotmilAngkatanPesertaRecord | null>(null);
  const [deletingPeserta, setDeletingPeserta] = useState(false);

  const moduleKey: ModuleKey = jenis === "khotmil15" ? "angkatan_15" : "angkatan_30";
  const canEdit = profile
    ? profile.role === "admin" || canUserEdit(profile.permissions, moduleKey)
    : false;

  const finalTahapConfig = tahapList[tahapList.length - 1];
  const labelTahapAkhir = finalTahapConfig
    ? `${finalTahapConfig.label} (${finalTahapConfig.rentangLabel})`
    : `Tahap ${tahapList.length}`;

  useEffect(() => {
    fetchCurrentUserProfile()
      .then(setProfile)
      .catch(() => setProfile(null));
  }, []);

  const loadAngkatan = useCallback(
    async (preferredId?: string) => {
      setLoadingAngkatan(true);
      setLoadError(null);
      try {
        const list = await fetchAngkatanList(jenis);
        setAngkatanList(list);
        setSelectedAngkatanId((prev) => {
          if (preferredId && (preferredId === "SEMUA" || list.some((a) => a.id === preferredId))) {
            return preferredId;
          }
          if (prev !== "SEMUA" && list.some((a) => a.id === prev)) {
            return prev;
          }
          return list.length > 0 ? list[0].id : "SEMUA";
        });
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : "Gagal memuat daftar angkatan dari server."
        );
      } finally {
        setLoadingAngkatan(false);
      }
    },
    [jenis]
  );

  const loadPeserta = useCallback(
    async (targetId: string) => {
      setLoadingPeserta(true);
      setLoadError(null);
      try {
        if (targetId === "SEMUA") {
          const all = await fetchAllAngkatanPesertaByJenis(jenis);
          setPesertaList(all);
        } else {
          const rows = await fetchAngkatanPeserta(targetId);
          setPesertaList(rows);
        }
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : "Gagal memuat daftar peserta angkatan."
        );
      } finally {
        setLoadingPeserta(false);
      }
    },
    [jenis]
  );

  useEffect(() => {
    loadAngkatan();
  }, [loadAngkatan]);

  useEffect(() => {
    if (!loadingAngkatan) {
      if (angkatanList.length === 0) {
        setPesertaList([]);
      } else {
        loadPeserta(selectedAngkatanId);
      }
    }
  }, [loadingAngkatan, angkatanList.length, selectedAngkatanId, loadPeserta]);

  const activeAngkatan = useMemo(
    () => angkatanList.find((a) => a.id === selectedAngkatanId) ?? null,
    [angkatanList, selectedAngkatanId]
  );

  const totalAllParticipants = useMemo(
    () => angkatanList.reduce((acc, item) => acc + (item.jumlah_peserta ?? 0), 0),
    [angkatanList]
  );

  const filteredPeserta = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return pesertaList.filter((item) => {
      if (filterStatus !== "semua" && item.status_kelulusan !== filterStatus) {
        return false;
      }
      if (!q) return true;
      return (
        item.nama_lengkap.toLowerCase().includes(q) ||
        item.kode_santri.toLowerCase().includes(q) ||
        item.halaqoh.toLowerCase().includes(q) ||
        item.pembimbing.toLowerCase().includes(q) ||
        item.asrama.toLowerCase().includes(q) ||
        item.kamar.toLowerCase().includes(q) ||
        (item.nama_angkatan ?? "").toLowerCase().includes(q)
      );
    });
  }, [pesertaList, filterStatus, searchQuery]);

  const kpiStats = useMemo(() => {
    const total = filteredPeserta.length;
    const lulusCount = filteredPeserta.filter((p) => p.status_kelulusan === "lulus").length;
    const belumCount = total - lulusCount;
    const scored = filteredPeserta.filter(
      (p) => p.rata_rata_akhir !== null && p.rata_rata_akhir !== undefined
    );
    const avgOverall =
      scored.length > 0
        ? scored.reduce((sum, p) => sum + Number(p.rata_rata_akhir ?? 0), 0) / scored.length
        : null;

    return { total, lulusCount, belumCount, avgOverall };
  }, [filteredPeserta]);

  // Set santri_id yang sudah ada di angkatan aktif (untuk mencegah duplikasi di modal)
  const existingSantriIdsInActiveAngkatan = useMemo(() => {
    if (selectedAngkatanId === "SEMUA") return new Set<string>();
    return new Set(
      pesertaList.map((p) => p.santri_id).filter((id): id is string => Boolean(id))
    );
  }, [pesertaList, selectedAngkatanId]);

  const printDocTitle = activeAngkatan
    ? `Database_Angkatan_${jenis === "khotmil15" ? "15_Juz" : "30_Juz"}_${activeAngkatan.nama_angkatan.replace(/\s+/g, "_")}`
    : `Database_Angkatan_${jenis === "khotmil15" ? "15_Juz" : "30_Juz"}_Semua`;

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: printDocTitle,
  });

  const handleExportExcel = () => {
    if (filteredPeserta.length === 0) {
      showToast("error", "Tidak ada data peserta untuk diekspor ke Excel.");
      return;
    }

    const rows = filteredPeserta.map((item, idx) => {
      const base: Record<string, unknown> = {
        No: idx + 1,
      };
      if (selectedAngkatanId === "SEMUA") {
        base["Angkatan"] = item.nama_angkatan ?? "-";
      }
      base["Kode Santri"] = item.kode_santri;
      base["Nama Lengkap"] = item.nama_lengkap;
      base["Asrama"] = item.asrama;
      base["Kamar"] = item.kamar;
      base["Halaqoh"] = item.halaqoh;
      base["Pembimbing"] = item.pembimbing;
      base["Tahap Tuntas"] = `${item.jumlah_tahap_tuntas}/${item.total_tahap}`;
      base["Rata-rata Akhir"] =
        item.rata_rata_akhir !== null && item.rata_rata_akhir !== undefined
          ? Number(item.rata_rata_akhir)
          : "-";
      base["Status Kelulusan"] =
        item.status_kelulusan === "lulus" ? "Lulus Penuh" : "Belum Tuntas";
      base["Sumber Data"] =
        item.sumber === "tarik_khotmil"
          ? "Tarik Khotmil Aktif"
          : item.sumber === "import_excel"
          ? "Impor Excel"
          : "Input Manual";
      base["Catatan"] = item.catatan ?? "";
      return base;
    });

    exportJsonToExcel(rows, printDocTitle, "Database Angkatan");
    showToast("success", `Berhasil mengekspor ${rows.length} data angkatan ke Excel.`);
  };

  // --- Handlers: Buat / Edit Angkatan ---
  const openCreateAngkatanModal = () => {
    setEditingAngkatan(null);
    setFormNamaAngkatan("");
    setFormTanggalKhataman("");
    setFormKeterangan("");
    setAngkatanModalOpen(true);
  };

  const openEditAngkatanModal = (item: KhotmilAngkatanRecord) => {
    setEditingAngkatan(item);
    setFormNamaAngkatan(item.nama_angkatan);
    setFormTanggalKhataman(item.tanggal_khataman ?? "");
    setFormKeterangan(item.keterangan ?? "");
    setAngkatanModalOpen(true);
  };

  const handleSaveAngkatan = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = formNamaAngkatan.trim();
    if (!trimmed) {
      showToast("error", "Nama angkatan / tahun wajib diisi.");
      return;
    }

    setSavingAngkatan(true);
    try {
      if (editingAngkatan) {
        const updated = await updateAngkatan(editingAngkatan.id, {
          nama_angkatan: trimmed,
          tanggal_khataman: formTanggalKhataman || null,
          keterangan: formKeterangan.trim() || null,
        });
        showToast("success", `Angkatan "${updated.nama_angkatan}" berhasil diperbarui.`);
        setAngkatanModalOpen(false);
        await loadAngkatan(updated.id);
      } else {
        const created = await createAngkatan({
          jenis,
          nama_angkatan: trimmed,
          tanggal_khataman: formTanggalKhataman || null,
          keterangan: formKeterangan.trim() || null,
        });
        showToast("success", `Angkatan "${created.nama_angkatan}" berhasil dibuat.`);
        setAngkatanModalOpen(false);
        await loadAngkatan(created.id);
      }
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Gagal menyimpan data angkatan."
      );
    } finally {
      setSavingAngkatan(false);
    }
  };

  const handleConfirmDeleteAngkatan = async () => {
    if (!deleteAngkatanTarget) return;
    setDeletingAngkatan(true);
    try {
      await deleteAngkatan(deleteAngkatanTarget.id);
      showToast(
        "success",
        `Angkatan "${deleteAngkatanTarget.nama_angkatan}" berhasil dihapus.`
      );
      setDeleteAngkatanTarget(null);
      await loadAngkatan("SEMUA");
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Gagal menghapus angkatan."
      );
    } finally {
      setDeletingAngkatan(false);
    }
  };

  // --- Handlers: Tarik Lulusan Khotmil ---
  const openPullGraduatesModal = async () => {
    if (!activeAngkatan) return;
    setPullModalOpen(true);
    setCandidateSearch("");
    setRemoveFromActiveKhotmil(false);
    setSelectedCandidateIds(new Set());
    setLoadingCandidates(true);
    try {
      const list = await fetchEligibleKhotmilGraduates(jenis);
      setCandidates(list);
      // Otomatis centang kandidat yang belum ada di angkatan ini
      const preselect = new Set<string>();
      for (const c of list) {
        if (!existingSantriIdsInActiveAngkatan.has(c.santri.id)) {
          preselect.add(c.santri.id);
        }
      }
      setSelectedCandidateIds(preselect);
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Gagal memeriksa lulusan Khotmil aktif."
      );
      setCandidates([]);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const filteredCandidates = useMemo(() => {
    const q = candidateSearch.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((c) => {
      const h = `${c.santri.halaqoh_kelas}${c.santri.halaqoh_bagian}`.toLowerCase();
      return (
        c.santri.nama_lengkap.toLowerCase().includes(q) ||
        c.santri.kode.toLowerCase().includes(q) ||
        h.includes(q) ||
        c.pembimbing.toLowerCase().includes(q)
      );
    });
  }, [candidates, candidateSearch]);

  const selectableFilteredCandidates = useMemo(
    () =>
      filteredCandidates.filter(
        (c) => !existingSantriIdsInActiveAngkatan.has(c.santri.id)
      ),
    [filteredCandidates, existingSantriIdsInActiveAngkatan]
  );

  const toggleCandidate = (santriId: string) => {
    if (existingSantriIdsInActiveAngkatan.has(santriId)) return;
    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      if (next.has(santriId)) next.delete(santriId);
      else next.add(santriId);
      return next;
    });
  };

  const toggleAllCandidates = () => {
    const allSelected =
      selectableFilteredCandidates.length > 0 &&
      selectableFilteredCandidates.every((c) => selectedCandidateIds.has(c.santri.id));

    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        selectableFilteredCandidates.forEach((c) => next.delete(c.santri.id));
      } else {
        selectableFilteredCandidates.forEach((c) => next.add(c.santri.id));
      }
      return next;
    });
  };

  const handleArchiveGraduates = async () => {
    if (!activeAngkatan) return;
    const chosen = candidates.filter((c) => selectedCandidateIds.has(c.santri.id));
    if (chosen.length === 0) {
      showToast("error", "Pilih minimal 1 santri lulusan untuk diarsipkan.");
      return;
    }

    setArchivingCandidates(true);
    try {
      const res = await archiveGraduatesToAngkatan({
        angkatanId: activeAngkatan.id,
        angkatanName: activeAngkatan.nama_angkatan,
        jenis,
        candidates: chosen,
        removeFromActiveKhotmil,
      });

      const msg = res.removedActiveCount > 0
        ? `${res.archivedCount} lulusan berhasil diarsipkan ke "${activeAngkatan.nama_angkatan}" dan ${res.removedActiveCount} peserta dibersihkan dari Khotmil aktif.`
        : `${res.archivedCount} lulusan berhasil diarsipkan ke "${activeAngkatan.nama_angkatan}".`;

      showToast("success", msg);
      setPullModalOpen(false);
      await loadAngkatan(activeAngkatan.id);
      await loadPeserta(activeAngkatan.id);
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Gagal mengarsipkan lulusan ke angkatan."
      );
    } finally {
      setArchivingCandidates(false);
    }
  };

  // --- Handlers: Tambah Manual ---
  const openManualModal = async () => {
    if (!activeAngkatan) return;
    setManualModalOpen(true);
    setManualMode("master");
    setMasterSearch("");
    setSelectedMasterSantriId("");
    setManualBiodata({
      kode_santri: "",
      nama_lengkap: "",
      asrama: "",
      kamar: "",
      halaqoh: "",
      pembimbing: "",
    });
    setManualRataRata("");
    setManualStatus("lulus");
    setManualCatatan("");

    if (masterSantriList.length === 0) {
      setLoadingMasterSantri(true);
      try {
        const [santriRows, pMap] = await Promise.all([
          fetchAllSantriFiltered({}),
          fetchPembimbingMap(),
        ]);
        setMasterSantriList(santriRows);
        setPembimbingMap(pMap);
      } catch (err) {
        showToast(
          "error",
          err instanceof Error ? err.message : "Gagal memuat daftar master santri."
        );
      } finally {
        setLoadingMasterSantri(false);
      }
    }
  };

  const filteredMasterSantri = useMemo(() => {
    const q = masterSearch.trim().toLowerCase();
    return masterSantriList.filter((s) => {
      if (existingSantriIdsInActiveAngkatan.has(s.id)) return false;
      if (!q) return true;
      const h = `${s.halaqoh_kelas}${s.halaqoh_bagian}`.toLowerCase();
      return (
        s.nama_lengkap.toLowerCase().includes(q) ||
        s.kode.toLowerCase().includes(q) ||
        h.includes(q) ||
        (s.kamar ?? "").toLowerCase().includes(q)
      );
    });
  }, [masterSantriList, existingSantriIdsInActiveAngkatan, masterSearch]);

  const handleSaveManualAlumni = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAngkatan) return;

    const parsedAvg =
      manualRataRata.trim() === "" ? null : Number(manualRataRata.replace(",", "."));
    if (parsedAvg !== null && (Number.isNaN(parsedAvg) || parsedAvg < 0 || parsedAvg > 100)) {
      showToast("error", "Rata-rata nilai harus berada di antara 0 sampai 100.");
      return;
    }

    setSavingManual(true);
    try {
      if (manualMode === "master") {
        const selectedSantri = masterSantriList.find((s) => s.id === selectedMasterSantriId);
        if (!selectedSantri) {
          showToast("error", "Pilih santri terlebih dahulu.");
          setSavingManual(false);
          return;
        }
        const halaqohKey = `${selectedSantri.halaqoh_kelas}${selectedSantri.halaqoh_bagian}`;
        await addManualAlumniToAngkatan({
          angkatanId: activeAngkatan.id,
          jenis,
          santri: selectedSantri,
          pembimbing: pembimbingMap[halaqohKey] ?? "-",
          rata_rata_akhir: parsedAvg,
          status_kelulusan: manualStatus,
          catatan: manualCatatan.trim() || null,
        });
      } else {
        if (!manualBiodata.nama_lengkap.trim()) {
          showToast("error", "Nama lengkap alumni wajib diisi.");
          setSavingManual(false);
          return;
        }
        await addManualAlumniToAngkatan({
          angkatanId: activeAngkatan.id,
          jenis,
          manualBiodata,
          rata_rata_akhir: parsedAvg,
          status_kelulusan: manualStatus,
          catatan: manualCatatan.trim() || null,
        });
      }

      showToast("success", "Data peserta berhasil ditambahkan ke arsip angkatan.");
      setManualModalOpen(false);
      await loadAngkatan(activeAngkatan.id);
      await loadPeserta(activeAngkatan.id);
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Gagal menambahkan peserta angkatan."
      );
    } finally {
      setSavingManual(false);
    }
  };

  // --- Handler: Hapus 1 Peserta ---
  const handleConfirmDeletePeserta = async () => {
    if (!deletePesertaTarget) return;
    setDeletingPeserta(true);
    try {
      await deleteAngkatanPeserta(deletePesertaTarget.id);
      showToast("success", `Data "${deletePesertaTarget.nama_lengkap}" dihapus dari arsip.`);
      setDeletePesertaTarget(null);
      await loadAngkatan(selectedAngkatanId);
      await loadPeserta(selectedAngkatanId);
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Gagal menghapus peserta dari arsip."
      );
    } finally {
      setDeletingPeserta(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Halaman */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-800 text-white shadow-sm">
              <Archive className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{judul}</h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Arsip permanen alumni &amp; lulusan berdasarkan tahun / nama angkatan kustom
                (Syarat penarikan: Lulus penuh {labelTahapAkhir}).
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          {canEdit && (
            <button
              type="button"
              onClick={openCreateAngkatanModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-800 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-900 transition-colors"
            >
              <FolderPlus className="h-4 w-4" />
              <span>Buat Angkatan</span>
            </button>
          )}

          {canEdit && activeAngkatan && (
            <>
              <button
                type="button"
                onClick={openPullGraduatesModal}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Tarik Lulusan Khotmil</span>
              </button>
              <button
                type="button"
                onClick={openManualModal}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <UserPlus className="h-4 w-4 text-emerald-700" />
                <span>Tambah Manual</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={filteredPeserta.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700/30 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Excel</span>
          </button>

          <button
            type="button"
            onClick={() => handlePrint()}
            disabled={filteredPeserta.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Printer className="h-4 w-4" />
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      {loadError && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => loadAngkatan(selectedAngkatanId)}
            className="inline-flex items-center gap-1.5 rounded-md bg-red-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Muat Ulang
          </button>
        </div>
      )}

      {/* Selector Tab Angkatan */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 no-print">
        {loadingAngkatan ? (
          <div className="flex items-center gap-2 py-2 text-xs text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
            <span>Memuat daftar angkatan...</span>
          </div>
        ) : angkatanList.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2.5 py-8 text-center">
            <Archive className="h-10 w-10 text-slate-300 dark:text-slate-700" />
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Belum ada Angkatan yang tersimpan
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Buat angkatan pertama dengan nama tahun/gelombang pilihan Anda (contoh: &ldquo;2025&rdquo;
                atau &ldquo;Angkatan XII - 2026&rdquo;).
              </p>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={openCreateAngkatanModal}
                className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-emerald-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-900"
              >
                <Plus className="h-4 w-4" />
                Buat Angkatan Pertama
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedAngkatanId("SEMUA")}
                className={`shrink-0 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                  selectedAngkatanId === "SEMUA"
                    ? "border-emerald-800 bg-emerald-800 text-white shadow-sm"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                }`}
              >
                <span>Semua Angkatan</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
                    selectedAngkatanId === "SEMUA"
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                  }`}
                >
                  {totalAllParticipants}
                </span>
              </button>

              {angkatanList.map((ang) => {
                const isActive = selectedAngkatanId === ang.id;
                return (
                  <button
                    key={ang.id}
                    type="button"
                    onClick={() => setSelectedAngkatanId(ang.id)}
                    className={`shrink-0 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                      isActive
                        ? "border-emerald-800 bg-emerald-800 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    }`}
                  >
                    <Calendar className="h-3.5 w-3.5 opacity-80" />
                    <span>{ang.nama_angkatan}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                      }`}
                    >
                      {ang.jumlah_peserta ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>

            {activeAngkatan && (
              <div className="flex flex-col gap-2 border-t border-slate-100 pt-2.5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <span>
                    <strong className="text-slate-900 dark:text-slate-100">
                      {activeAngkatan.nama_angkatan}
                    </strong>
                  </span>
                  <span>Tanggal Khataman: {formatDateId(activeAngkatan.tanggal_khataman)}</span>
                  {activeAngkatan.keterangan && (
                    <span className="text-slate-500 dark:text-slate-400">
                      Catatan: {activeAngkatan.keterangan}
                    </span>
                  )}
                </div>

                {canEdit && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditAngkatanModal(activeAngkatan)}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Ubah Nama / Info
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteAngkatanTarget(activeAngkatan)}
                      className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Hapus Angkatan
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ringkasan & Tabel Peserta */}
      {angkatanList.length > 0 && (
        <>
          {/* KPI Strip */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 no-print">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Total Terarsip</span>
                <Users className="h-4 w-4 text-emerald-700" />
              </div>
              <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {kpiStats.total}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
              <div className="flex items-center justify-between text-xs font-medium text-emerald-800 dark:text-emerald-300">
                <span>Lulus Penuh</span>
                <Award className="h-4 w-4 text-emerald-700" />
              </div>
              <p className="mt-1 text-2xl font-extrabold text-emerald-900 dark:text-emerald-100">
                {kpiStats.lulusCount}
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/30">
              <div className="flex items-center justify-between text-xs font-medium text-amber-800 dark:text-amber-300">
                <span>Belum Tuntas</span>
                <BookOpen className="h-4 w-4 text-amber-700" />
              </div>
              <p className="mt-1 text-2xl font-extrabold text-amber-900 dark:text-amber-100">
                {kpiStats.belumCount}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Rata-rata Nilai</span>
                <UserCheck className="h-4 w-4 text-emerald-700" />
              </div>
              <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {formatAvgScore(kpiStats.avgOverall)}
              </p>
            </div>
          </div>

          {/* Search & Status Filter */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between no-print">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama santri, kode, halaqoh, kamar, pembimbing..."
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: "semua", label: "Semua" },
                  { id: "lulus", label: "Lulus Penuh" },
                  { id: "belum_tuntas", label: "Belum Tuntas" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterStatus(tab.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                    filterStatus === tab.id
                      ? "border-emerald-800 bg-emerald-800 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Area Printable & Tabel Utama */}
          <div
            ref={printRef}
            className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900"
          >
            {/* Header khusus tampilan cetak */}
            <div className="hidden print:block border-b border-slate-300 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">
                LPTQ Blokagung — {judul}
              </h2>
              <p className="text-xs text-slate-700">
                Angkatan:{" "}
                {activeAngkatan ? activeAngkatan.nama_angkatan : "Semua Angkatan"}{" "}
                {activeAngkatan?.tanggal_khataman
                  ? `• Tanggal Khataman: ${formatDateId(activeAngkatan.tanggal_khataman)}`
                  : ""}{" "}
                • Total Peserta: {filteredPeserta.length}
              </p>
            </div>

            {loadingPeserta ? (
              <div className="flex items-center justify-center gap-2 py-12 text-xs text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
                <span>Memuat daftar peserta angkatan...</span>
              </div>
            ) : filteredPeserta.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2.5 px-4 py-12 text-center">
                <Users className="h-10 w-10 text-slate-300 dark:text-slate-700" />
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {pesertaList.length === 0
                    ? "Belum ada peserta pada angkatan ini"
                    : "Tidak ada peserta yang sesuai dengan filter"}
                </p>
                <p className="max-w-md text-xs text-slate-500 dark:text-slate-400">
                  {pesertaList.length === 0 && activeAngkatan && canEdit
                    ? `Gunakan tombol "Tarik Lulusan Khotmil" untuk mengarsipkan santri yang telah lulus ${labelTahapAkhir}, atau "Tambah Manual".`
                    : "Coba ubah kata kunci pencarian atau pilih tab angkatan lain."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                    <tr>
                      <th className="px-3.5 py-3 w-10 text-center">No</th>
                      {selectedAngkatanId === "SEMUA" && <th className="px-3.5 py-3">Angkatan</th>}
                      <th className="px-3.5 py-3">Santri</th>
                      <th className="px-3.5 py-3">Asrama &amp; Kamar</th>
                      <th className="px-3.5 py-3">Halaqoh &amp; Pembimbing</th>
                      <th className="px-3.5 py-3 text-center">Tahap Tuntas</th>
                      <th className="px-3.5 py-3 text-center">Rata-rata</th>
                      <th className="px-3.5 py-3 text-center">Status</th>
                      <th className="px-3.5 py-3 text-right no-print">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredPeserta.map((item, idx) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-3.5 py-2.5 text-center font-semibold text-slate-500">
                          {idx + 1}
                        </td>
                        {selectedAngkatanId === "SEMUA" && (
                          <td className="px-3.5 py-2.5 font-semibold text-emerald-900 dark:text-emerald-300">
                            {item.nama_angkatan ?? "-"}
                          </td>
                        )}
                        <td className="px-3.5 py-2.5">
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {item.nama_lengkap}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {item.kode_santri}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {item.asrama}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Kamar: {item.kamar}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center gap-1.5">
                            {item.halaqoh_kelas && item.halaqoh_bagian ? (
                              <HalaqohBadge
                                kelas={item.halaqoh_kelas}
                                bagian={item.halaqoh_bagian}
                              />
                            ) : (
                              <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                {item.halaqoh}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            {item.pembimbing}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 text-center font-bold text-slate-800 dark:text-slate-200">
                          {item.jumlah_tahap_tuntas}/{item.total_tahap}
                        </td>
                        <td className="px-3.5 py-2.5 text-center font-extrabold text-emerald-900 dark:text-emerald-300">
                          {formatAvgScore(item.rata_rata_akhir)}
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          {item.status_kelulusan === "lulus" ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-700/30 bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
                              <CheckCircle2 className="h-3 w-3" />
                              Lulus Penuh
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-amber-700/30 bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
                              Belum Tuntas
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-right no-print">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setDetailPeserta(item)}
                              title="Lihat detail nilai tahap"
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Detail</span>
                            </button>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => setDeletePesertaTarget(item)}
                                title="Hapus dari arsip angkatan"
                                className="inline-flex items-center rounded-md border border-red-200 p-1.5 text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* MODAL: Buat / Edit Angkatan */}
      {angkatanModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-angkatan-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
              <h2 id="modal-angkatan-title" className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {editingAngkatan ? "Ubah Informasi Angkatan" : "Buat Angkatan Baru"}
              </h2>
              <button
                type="button"
                onClick={() => setAngkatanModalOpen(false)}
                aria-label="Tutup"
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAngkatan} className="space-y-3.5 p-5 text-xs">
              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-200">
                  Nama Angkatan / Tahun <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formNamaAngkatan}
                  onChange={(e) => setFormNamaAngkatan(e.target.value)}
                  placeholder="Contoh: 2025 atau Angkatan XII (2026)"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Anda bebas menuliskan format tahun atau nama angkatan sesuai kebutuhan pondok.
                </p>
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-200">
                  Tanggal Khataman (Opsional)
                </label>
                <input
                  type="date"
                  value={formTanggalKhataman}
                  onChange={(e) => setFormTanggalKhataman(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-200">
                  Keterangan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  placeholder="Catatan tambahan periode khataman..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAngkatanModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingAngkatan}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-900 disabled:opacity-50"
                >
                  {savingAngkatan && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingAngkatan ? "Simpan Perubahan" : "Buat Angkatan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Konfirmasi Hapus Angkatan */}
      {deleteAngkatanTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-5 shadow-xl dark:border-red-900 dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Hapus Angkatan &ldquo;{deleteAngkatanTarget.nama_angkatan}&rdquo;?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Semua{" "}
                  <strong>{deleteAngkatanTarget.jumlah_peserta ?? 0} data peserta</strong>{" "}
                  di dalam arsip angkatan ini akan ikut terhapus secara permanen. Data di Khotmil
                  aktif tidak ikut terhapus.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteAngkatanTarget(null)}
                className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deletingAngkatan}
                onClick={handleConfirmDeleteAngkatan}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-700 px-4 py-2 text-xs font-bold text-white hover:bg-red-800 disabled:opacity-50"
              >
                {deletingAngkatan && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Ya, Hapus Angkatan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Tarik Lulusan Khotmil Aktif */}
      {pullModalOpen && activeAngkatan && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-pull-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
              <div>
                <h2 id="modal-pull-title" className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Tarik Lulusan Khotmil Aktif ke &ldquo;{activeAngkatan.nama_angkatan}&rdquo;
                </h2>
                <p className="text-[11px] text-slate-500">
                  Hanya menampilkan santri aktif yang telah <strong>Lulus Penuh</strong> hingga{" "}
                  {labelTahapAkhir} tanpa nilai remidi.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPullModalOpen(false)}
                aria-label="Tutup"
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-slate-100 px-5 py-2.5 dark:border-slate-800">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={candidateSearch}
                    onChange={(e) => setCandidateSearch(e.target.value)}
                    placeholder="Cari nama santri lulusan atau halaqoh..."
                    className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-800 focus:border-emerald-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
                <button
                  type="button"
                  onClick={toggleAllCandidates}
                  disabled={selectableFilteredCandidates.length === 0}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
                >
                  {selectableFilteredCandidates.length > 0 &&
                  selectableFilteredCandidates.every((c) => selectedCandidateIds.has(c.santri.id))
                    ? "Batal Pilih Semua"
                    : `Pilih Semua (${selectableFilteredCandidates.length})`}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3">
              {loadingCandidates ? (
                <div className="flex items-center justify-center gap-2 py-12 text-xs text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
                  <span>Memeriksa kelulusan peserta dari tabel Khotmil aktif...</span>
                </div>
              ) : filteredCandidates.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  Tidak ada santri yang memenuhi kriteria Lulus Penuh ({labelTahapAkhir}) di
                  Khotmil aktif saat ini.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                  {filteredCandidates.map((cand) => {
                    const alreadyArchived = existingSantriIdsInActiveAngkatan.has(cand.santri.id);
                    const checked = selectedCandidateIds.has(cand.santri.id);
                    return (
                      <label
                        key={cand.santri.id}
                        className={`flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs ${
                          alreadyArchived
                            ? "cursor-not-allowed bg-slate-50/70 opacity-60 dark:bg-slate-950/40"
                            : "cursor-pointer hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            disabled={alreadyArchived}
                            checked={checked}
                            onChange={() => toggleCandidate(cand.santri.id)}
                            className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                {cand.santri.nama_lengkap}
                              </span>
                              <HalaqohBadge
                                kelas={cand.santri.halaqoh_kelas}
                                bagian={cand.santri.halaqoh_bagian}
                              />
                              {alreadyArchived && (
                                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                  Sudah Diarsipkan
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-500">
                              {cand.santri.kode} • Kamar {cand.santri.kamar || "-"} • Pemb:{" "}
                              {cand.pembimbing}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-extrabold text-emerald-800 dark:text-emerald-300">
                            Rata-rata: {formatAvgScore(cand.rata_rata_akhir)}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {cand.jumlah_tahap_tuntas}/{cand.total_tahap} Tahap Tuntas
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 bg-slate-50/80 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-950/60">
              <label className="mb-3 flex cursor-pointer items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-950 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-200">
                <input
                  type="checkbox"
                  checked={removeFromActiveKhotmil}
                  onChange={(e) => setRemoveFromActiveKhotmil(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-amber-400 text-amber-700 focus:ring-amber-600"
                />
                <span>
                  <strong>
                    Keluarkan santri terpilih dari tabel Khotmil aktif setelah berhasil diarsipkan
                  </strong>
                  <span className="block text-[11px] opacity-85">
                    Centang jika periode angkatan ini sudah selesai dan Anda ingin membersihkan
                    peserta beserta nilai ujian aktifnya untuk membuka angkatan baru.
                  </span>
                </span>
              </label>

              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {selectedCandidateIds.size} lulusan dipilih
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPullModalOpen(false)}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={archivingCandidates || selectedCandidateIds.size === 0}
                    onClick={handleArchiveGraduates}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-900 disabled:opacity-50"
                  >
                    {archivingCandidates && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>Arsipkan ({selectedCandidateIds.size}) Santri</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Tambah Manual */}
      {manualModalOpen && activeAngkatan && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-manual-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
              <h2 id="modal-manual-title" className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Tambah Peserta ke &ldquo;{activeAngkatan.nama_angkatan}&rdquo;
              </h2>
              <button
                type="button"
                onClick={() => setManualModalOpen(false)}
                aria-label="Tutup"
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveManualAlumni} className="space-y-3.5 p-5 text-xs">
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setManualMode("master")}
                  className={`rounded-md py-1.5 text-xs font-bold transition-colors ${
                    manualMode === "master"
                      ? "bg-white text-emerald-900 shadow-sm dark:bg-slate-900 dark:text-emerald-300"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  Pilih Master Santri
                </button>
                <button
                  type="button"
                  onClick={() => setManualMode("bebas")}
                  className={`rounded-md py-1.5 text-xs font-bold transition-colors ${
                    manualMode === "bebas"
                      ? "bg-white text-emerald-900 shadow-sm dark:bg-slate-900 dark:text-emerald-300"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  Input Alumni Bebas
                </button>
              </div>

              {manualMode === "master" ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={masterSearch}
                    onChange={(e) => setMasterSearch(e.target.value)}
                    placeholder="Cari nama, kode santri, atau halaqoh..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                  {loadingMasterSantri ? (
                    <div className="flex items-center gap-2 py-4 text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Memuat master santri...
                    </div>
                  ) : (
                    <select
                      size={5}
                      value={selectedMasterSantriId}
                      onChange={(e) => setSelectedMasterSantriId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white p-1.5 text-xs text-slate-900 focus:border-emerald-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    >
                      {filteredMasterSantri.map((s) => (
                        <option key={s.id} value={s.id} className="py-1">
                          {s.nama_lengkap} ({s.halaqoh_kelas}
                          {s.halaqoh_bagian} • {s.kamar || "-"})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block font-bold">
                      Nama Lengkap <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={manualBiodata.nama_lengkap}
                      onChange={(e) =>
                        setManualBiodata((b) => ({ ...b, nama_lengkap: e.target.value }))
                      }
                      placeholder="Nama lengkap alumni..."
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold">Kode Santri</label>
                    <input
                      type="text"
                      value={manualBiodata.kode_santri}
                      onChange={(e) =>
                        setManualBiodata((b) => ({ ...b, kode_santri: e.target.value }))
                      }
                      placeholder="Opsional"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold">Halaqoh Terakhir</label>
                    <input
                      type="text"
                      value={manualBiodata.halaqoh}
                      onChange={(e) =>
                        setManualBiodata((b) => ({ ...b, halaqoh: e.target.value }))
                      }
                      placeholder="Contoh: 5A"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold">Asrama</label>
                    <input
                      type="text"
                      value={manualBiodata.asrama}
                      onChange={(e) =>
                        setManualBiodata((b) => ({ ...b, asrama: e.target.value }))
                      }
                      placeholder="Opsional"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold">Kamar</label>
                    <input
                      type="text"
                      value={manualBiodata.kamar}
                      onChange={(e) =>
                        setManualBiodata((b) => ({ ...b, kamar: e.target.value }))
                      }
                      placeholder="Opsional"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block font-semibold">Pembimbing</label>
                    <input
                      type="text"
                      value={manualBiodata.pembimbing}
                      onChange={(e) =>
                        setManualBiodata((b) => ({ ...b, pembimbing: e.target.value }))
                      }
                      placeholder="Nama pembimbing..."
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block font-semibold">Rata-rata Nilai (Opsional)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={manualRataRata}
                    onChange={(e) => setManualRataRata(e.target.value)}
                    placeholder="0 - 100"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold">Status Kelulusan</label>
                  <select
                    value={manualStatus}
                    onChange={(e) =>
                      setManualStatus(e.target.value as "lulus" | "belum_tuntas")
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="lulus">Lulus Penuh</option>
                    <option value="belum_tuntas">Belum Tuntas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block font-semibold">Catatan (Opsional)</label>
                <input
                  type="text"
                  value={manualCatatan}
                  onChange={(e) => setManualCatatan(e.target.value)}
                  placeholder="Keterangan arsip..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setManualModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingManual}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-900 disabled:opacity-50"
                >
                  {savingManual && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Simpan ke Arsip</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Detail Nilai Tahap (Snapshot) */}
      {detailPeserta && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-detail-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
              <div>
                <h2 id="modal-detail-title" className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Arsip Nilai — {detailPeserta.nama_lengkap}
                </h2>
                <p className="text-[11px] text-slate-500">
                  {detailPeserta.kode_santri} • Halaqoh {detailPeserta.halaqoh} • Pembimbing:{" "}
                  {detailPeserta.pembimbing} • Rata-rata Akhir:{" "}
                  <strong>{formatAvgScore(detailPeserta.rata_rata_akhir)}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailPeserta(null)}
                aria-label="Tutup"
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {Array.isArray(detailPeserta.nilai_tahap_json) &&
              detailPeserta.nilai_tahap_json.length > 0 ? (
                detailPeserta.nilai_tahap_json.map((snap) => (
                  <div
                    key={snap.tahap}
                    className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {snap.label}
                        </span>
                        <span className="ml-2 text-[11px] text-slate-500">{snap.rentangLabel}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-extrabold text-emerald-800 dark:text-emerald-300">
                          Rata-rata: {formatAvgScore(snap.average)}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            snap.isLulus
                              ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                              : "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200"
                          }`}
                        >
                          {snap.isLulus ? "Tuntas" : "Belum Tuntas"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {snap.scores.map((s) => (
                        <span
                          key={s.juz}
                          className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] dark:border-slate-700 dark:bg-slate-800"
                        >
                          <span className="text-slate-500">Juz {s.juz}:</span>
                          <strong className="text-slate-900 dark:text-slate-100">{s.nilai}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
                  Peserta ini ditambahkan secara manual tanpa rincian nilai per-tahap.
                  {detailPeserta.catatan && (
                    <p className="mt-2 font-medium">Catatan: {detailPeserta.catatan}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-100 px-5 py-3 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDetailPeserta(null)}
                className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-900"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Konfirmasi Hapus 1 Peserta Arsip */}
      {deletePesertaTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-sm rounded-xl border border-red-200 bg-white p-5 shadow-xl dark:border-red-900 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Hapus Peserta dari Arsip?
            </h3>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
              Data arsip atas nama <strong>{deletePesertaTarget.nama_lengkap}</strong> akan
              dihapus dari angkatan ini.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletePesertaTarget(null)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deletingPeserta}
                onClick={handleConfirmDeletePeserta}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-red-800 disabled:opacity-50"
              >
                {deletingPeserta && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
