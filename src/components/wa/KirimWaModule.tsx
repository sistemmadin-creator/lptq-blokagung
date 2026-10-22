"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Send,
  MessageSquare,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Settings,
  RefreshCw,
  Search,
  Filter,
  Eye,
  ExternalLink,
  Pause,
  Play,
  Square,
  Check,
  Clock,
  User,
  Phone,
  Layers,
  Award,
  Sparkles,
  FileText,
  ShieldCheck,
  ChevronDown,
  Info,
} from "lucide-react";
import {
  fetchAllSantriFiltered,
  fetchKhotmilTahapNilai,
  fetchKhotmilRegisteredSantriIds,
} from "@/lib/services/tahfidz-service";
import {
  getWahaConfig,
  saveWahaConfig,
  checkWahaSession,
  sendWahaImage,
  compileMessage,
  generateDirectWaLink,
  formatPhoneNumber,
  getDeliveryLogs,
  saveDeliveryLog,
  isAlreadyDelivered,
  DEFAULT_WAHA_CONFIG,
  type WahaConfig,
  type WahaSessionStatus,
  type DeliveryLog,
} from "@/lib/services/waha-service";
import {
  KHOTMIL_30_TAHAP,
  KHOTMIL_15_TAHAP,
  KKM_DEFAULT,
  type JenisKhotmil,
  type Santri,
  type TahapConfig,
} from "@/types/database";

interface SantriEvaluasiRow {
  santri: Santri;
  scores: { juz: number; nilai: number }[];
  rataRata: number;
  isTuntas: boolean;
  phone: string;
  hasPhone: boolean;
  isDelivered: boolean;
}

export function KirimWaModule() {
  // Konfigurasi WAHA & Gateway Status
  const [config, setConfig] = useState<WahaConfig>(DEFAULT_WAHA_CONFIG);
  const [gatewayStatus, setGatewayStatus] = useState<WahaSessionStatus>({
    online: false,
    status: "OFFLINE",
    message: "Belum diperiksa",
  });
  const [checkingGateway, setCheckingGateway] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Filter Program & Tahap
  const [jenisProgram, setJenisProgram] = useState<JenisKhotmil>("khotmil30");
  const [activeTahap, setActiveTahap] = useState<number>(1);
  const [search, setSearch] = useState("");
  const [filterAsrama, setFilterAsrama] = useState("");
  const [filterStatusKirim, setFilterStatusKirim] = useState<"semua" | "belum" | "sudah">("semua");

  // Data Santri & Nilai
  const [loading, setLoading] = useState(true);
  const [allSantri, setAllSantri] = useState<Santri[]>([]);
  const [evaluasiRows, setEvaluasiRows] = useState<SantriEvaluasiRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pratinjau (Active Preview)
  const [previewRow, setPreviewRow] = useState<SantriEvaluasiRow | null>(null);

  // Broadcast Runner State
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState({ current: 0, total: 0 });
  const [currentDelay, setCurrentDelay] = useState<number>(0);
  const [broadcastLogs, setBroadcastLogs] = useState<string[]>([]);
  const cancelBroadcastRef = useRef(false);
  const pauseBroadcastRef = useRef(false);

  // Delivery History
  const [deliveryLogs, setDeliveryLogs] = useState<DeliveryLog[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const tahapList: TahapConfig[] =
    jenisProgram === "khotmil30" ? KHOTMIL_30_TAHAP : KHOTMIL_15_TAHAP;
  const currentTahapCfg = tahapList.find((t) => t.tahap === activeTahap) || tahapList[0];

  // Muat Config & Cek Gateway pada mount
  useEffect(() => {
    const loadedConfig = getWahaConfig();
    setConfig(loadedConfig);
    setDeliveryLogs(getDeliveryLogs());
    checkGateway(loadedConfig);
  }, []);

  const checkGateway = async (cfg: WahaConfig) => {
    setCheckingGateway(true);
    try {
      const status = await checkWahaSession(cfg);
      setGatewayStatus(status);
    } catch {
      setGatewayStatus({
        online: false,
        status: "OFFLINE",
        message: "Server WAHA offline atau tidak dapat dihubungi.",
      });
    } finally {
      setCheckingGateway(false);
    }
  };

  // Muat Data Nilai Khotmil Santri
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [santriData, nilaiData, scoredIds] = await Promise.all([
        fetchAllSantriFiltered({}),
        fetchKhotmilTahapNilai(jenisProgram, activeTahap),
        fetchKhotmilRegisteredSantriIds(jenisProgram),
      ]);

      setAllSantri(santriData);

      // Map nilai per santri
      const nilaiMap: Record<string, { juz: number; nilai: number }[]> = {};
      nilaiData.forEach((n) => {
        if (!nilaiMap[n.santri_id]) nilaiMap[n.santri_id] = [];
        nilaiMap[n.santri_id].push({ juz: n.juz, nilai: n.nilai });
      });

      // Filter santri yang terdaftar atau memiliki nilai di tahap ini
      const relevantSantri = santriData.filter(
        (s) => scoredIds.includes(s.id) || Boolean(nilaiMap[s.id]?.length)
      );

      const rows: SantriEvaluasiRow[] = relevantSantri.map((s) => {
        const scores = nilaiMap[s.id] || [];
        const total = scores.reduce((sum, item) => sum + Number(item.nilai || 0), 0);
        const avg = scores.length > 0 ? Number((total / scores.length).toFixed(1)) : 0;
        const phone = s.no_wa ? formatPhoneNumber(s.no_wa) : "";
        const delivered = isAlreadyDelivered(s.id, activeTahap, jenisProgram);

        return {
          santri: s,
          scores,
          rataRata: avg,
          isTuntas: avg >= KKM_DEFAULT && scores.length >= currentTahapCfg.juzList.length,
          phone,
          hasPhone: Boolean(phone && phone.length >= 8),
          isDelivered: delivered,
        };
      });

      setEvaluasiRows(rows);
      setPreviewRow((prev) => prev || (rows.length > 0 ? rows[0] : null));
    } catch (err) {
      console.error("Gagal memuat data evaluasi santri", err);
      showToast("Gagal memuat data evaluasi.");
    } finally {
      setLoading(false);
    }
  }, [jenisProgram, activeTahap, currentTahapCfg.juzList.length]);

  useEffect(() => {
    loadData();
    setSelectedIds(new Set());
  }, [loadData]);

  // Daftar asrama unik untuk filter dropdown
  const asramaOptions = useMemo(() => {
    const set = new Set<string>();
    evaluasiRows.forEach((r) => {
      if (r.santri.asrama) set.add(r.santri.asrama);
    });
    return Array.from(set).sort();
  }, [evaluasiRows]);

  // Filter baris yang tampil di tabel
  const filteredRows = useMemo(() => {
    return evaluasiRows.filter((r) => {
      const q = search.toLowerCase();
      const matchesSearch =
        r.santri.nama_lengkap.toLowerCase().includes(q) ||
        (r.santri.kamar && r.santri.kamar.toLowerCase().includes(q)) ||
        (r.santri.asrama && r.santri.asrama.toLowerCase().includes(q)) ||
        r.phone.includes(q);

      const matchesAsrama = !filterAsrama || r.santri.asrama === filterAsrama;

      let matchesStatus = true;
      if (filterStatusKirim === "belum") matchesStatus = !r.isDelivered;
      if (filterStatusKirim === "sudah") matchesStatus = r.isDelivered;

      return matchesSearch && matchesAsrama && matchesStatus;
    });
  }, [evaluasiRows, search, filterAsrama, filterStatusKirim]);

  // Checkbox handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    if (selectedIds.size === filteredRows.length && filteredRows.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRows.map((r) => r.santri.id)));
    }
  };

  const handleSelectOnlyUnsent = () => {
    const unsent = filteredRows.filter((r) => !r.isDelivered && r.hasPhone);
    setSelectedIds(new Set(unsent.map((r) => r.santri.id)));
    showToast(`${unsent.length} santri yang belum dikirim berhasil dipilih.`);
  };

  // Helper membuat URL Kartu Rapor dinamis via Edge API
  const buildRaporImageUrl = (row: SantriEvaluasiRow): string => {
    if (typeof window === "undefined") return "";
    const origin = window.location.origin;
    const scoresStr = row.scores.map((s) => `Juz ${s.juz}:${s.nilai}`).join(",");
    const params = new URLSearchParams({
      nama: row.santri.nama_lengkap,
      asrama: row.santri.asrama || "-",
      kamar: row.santri.kamar || "-",
      program: jenisProgram === "khotmil30" ? "Khotmil 30 Juz" : "Khotmil 15 Juz",
      tahap: `${currentTahapCfg.label} (${currentTahapCfg.rentangLabel})`,
      rataRata: String(row.rataRata),
      kkm: row.isTuntas ? "TUNTAS" : "BELUM TUNTAS",
      scores: scoresStr,
      tanggal: new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      catatan: row.isTuntas
        ? "Selamat atas kelulusan pada tahap ini. Terus istiqomah menjaga hafalan."
        : "Perlu penguatan dan pengulangan kembali pada ayat mutasyabihat sebelum lanjut.",
    });

    return `${origin}/api/og/rapor-evaluasi?${params.toString()}`;
  };

  // Helper membuat draf pesan teks
  const buildMessageText = (row: SantriEvaluasiRow): string => {
    return compileMessage(config.messageTemplate, {
      nama: row.santri.nama_lengkap,
      asrama: row.santri.asrama || "-",
      kamar: row.santri.kamar || "-",
      program: jenisProgram === "khotmil30" ? "Khotmil 30 Juz" : "Khotmil 15 Juz",
      tahap: `${currentTahapCfg.label} (${currentTahapCfg.rentangLabel})`,
      rata_rata: String(row.rataRata),
      status: row.isTuntas ? "TUNTAS (LULUS TAHAP)" : "BELUM TUNTAS (REMIDI)",
      catatan: row.isTuntas
        ? "Lulus dengan baik, pertahankan kelancaran hafalan."
        : "Perlu bimbingan tambahan dan pengulangan muraja'ah.",
    });
  };

  // Kirim satu nomor santri via WAHA
  const handleSendSingleWaha = async (row: SantriEvaluasiRow) => {
    if (!row.hasPhone) {
      alert(`Santri ${row.santri.nama_lengkap} belum memiliki nomor WhatsApp wali.`);
      return;
    }
    if (!gatewayStatus.online) {
      alert("Server WAHA belum terhubung. Silakan buka 'Pengaturan WAHA' atau gunakan 'Kirim via WA Web'.");
      return;
    }

    const imageUrl = buildRaporImageUrl(row);
    const text = buildMessageText(row);

    showToast(`Mengirim ke ${row.santri.nama_lengkap}...`);
    const res = await sendWahaImage(config, row.phone, imageUrl, text);

    if (res.success) {
      saveDeliveryLog({
        santriId: row.santri.id,
        namaSantri: row.santri.nama_lengkap,
        noWa: row.phone,
        jenis: jenisProgram,
        tahap: activeTahap,
        status: "success",
      });
      showToast(`Pesan berhasil dikirim ke nomor wali ${row.santri.nama_lengkap}!`);
      loadData();
    } else {
      saveDeliveryLog({
        santriId: row.santri.id,
        namaSantri: row.santri.nama_lengkap,
        noWa: row.phone,
        jenis: jenisProgram,
        tahap: activeTahap,
        status: "failed",
        error: res.error,
      });
      alert(`Gagal mengirim: ${res.error}`);
    }
  };

  // Kirim satu nomor via tautan langsung WhatsApp Web (Fallback wa.me)
  const handleOpenDirectWa = (row: SantriEvaluasiRow) => {
    if (!row.hasPhone) {
      alert(`Santri ${row.santri.nama_lengkap} belum memiliki nomor WhatsApp wali.`);
      return;
    }
    const text = buildMessageText(row);
    const link = generateDirectWaLink(row.phone, text);

    saveDeliveryLog({
      santriId: row.santri.id,
      namaSantri: row.santri.nama_lengkap,
      noWa: row.phone,
      jenis: jenisProgram,
      tahap: activeTahap,
      status: "manual",
    });

    window.open(link, "_blank");
    showToast(`Membuka WhatsApp Web untuk ${row.santri.nama_lengkap}...`);
    loadData();
  };

  // ==================== ENGINE BROADCAST MASSAL ====================
  const handleStartBroadcast = async () => {
    const targetRows = evaluasiRows.filter((r) => selectedIds.has(r.santri.id));

    if (targetRows.length === 0) {
      alert("Pilih minimal satu santri yang ingin dikirimi broadcast.");
      return;
    }

    const withoutPhone = targetRows.filter((r) => !r.hasPhone);
    if (withoutPhone.length > 0) {
      const confirmContinue = confirm(
        `Perhatian: Ada ${withoutPhone.length} santri yang belum memiliki nomor WA wali dan akan dilewati. Lanjutkan mengirim ke ${
          targetRows.length - withoutPhone.length
        } nomor valid?`
      );
      if (!confirmContinue) return;
    }

    const validRows = targetRows.filter((r) => r.hasPhone);
    if (validRows.length === 0) {
      alert("Tidak ada nomor WhatsApp yang valid untuk dikirim.");
      return;
    }

    if (!gatewayStatus.online) {
      const useFallback = confirm(
        "Server WAHA belum terhubung secara online.\n\nApakah Anda ingin membatalkan, atau ingin tetap memeriksa pengaturan server WAHA?"
      );
      if (!useFallback) return;
      setSettingsModalOpen(true);
      return;
    }

    // Mulai eksekusi broadcast
    setIsBroadcasting(true);
    setIsPaused(false);
    cancelBroadcastRef.current = false;
    pauseBroadcastRef.current = false;
    setBroadcastProgress({ current: 0, total: validRows.length });
    setBroadcastLogs([
      `[${new Date().toLocaleTimeString()}] Memulai broadcast evaluasi ke ${validRows.length} nomor...`,
    ]);

    for (let i = 0; i < validRows.length; i++) {
      if (cancelBroadcastRef.current) {
        setBroadcastLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ⏹️ Broadcast dihentikan oleh pengguna.`,
        ]);
        break;
      }

      // Handle Jeda
      while (pauseBroadcastRef.current) {
        await new Promise((r) => setTimeout(r, 500));
        if (cancelBroadcastRef.current) break;
      }

      const row = validRows[i];
      setBroadcastProgress({ current: i + 1, total: validRows.length });

      try {
        const imageUrl = buildRaporImageUrl(row);
        const text = buildMessageText(row);

        setBroadcastLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] (${i + 1}/${validRows.length}) Mengirim ke ${
            row.santri.nama_lengkap
          } (${row.phone})...`,
        ]);

        const res = await sendWahaImage(config, row.phone, imageUrl, text);

        if (res.success) {
          saveDeliveryLog({
            santriId: row.santri.id,
            namaSantri: row.santri.nama_lengkap,
            noWa: row.phone,
            jenis: jenisProgram,
            tahap: activeTahap,
            status: "success",
          });
          setBroadcastLogs((prev) => [
            ...prev,
            `  ✓ Berhasil terkirim ke ${row.santri.nama_lengkap}.`,
          ]);
        } else {
          saveDeliveryLog({
            santriId: row.santri.id,
            namaSantri: row.santri.nama_lengkap,
            noWa: row.phone,
            jenis: jenisProgram,
            tahap: activeTahap,
            status: "failed",
            error: res.error,
          });
          setBroadcastLogs((prev) => [
            ...prev,
            `  ✕ GAGAL ke ${row.santri.nama_lengkap}: ${res.error}`,
          ]);
        }
      } catch (e: any) {
        setBroadcastLogs((prev) => [
          ...prev,
          `  ✕ Error sistem saat memproses ${row.santri.nama_lengkap}: ${e.message}`,
        ]);
      }

      // Jeda Acak (Random Delay) sebelum pesan berikutnya (kecuali pesan terakhir)
      if (i < validRows.length - 1 && !cancelBroadcastRef.current) {
        const delaySeconds =
          Math.floor(Math.random() * (config.delayMax - config.delayMin + 1)) + config.delayMin;
        setBroadcastLogs((prev) => [
          ...prev,
          `  ⏳ Jeda aman anti-banned: ${delaySeconds} detik...`,
        ]);

        for (let s = delaySeconds; s > 0; s--) {
          if (cancelBroadcastRef.current) break;
          setCurrentDelay(s);
          await new Promise((r) => setTimeout(r, 1000));
        }
        setCurrentDelay(0);
      }
    }

    setBroadcastLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Selesai memproses seluruh antrean broadcast.`,
    ]);
    setIsBroadcasting(false);
    loadData();
  };

  const handlePauseResume = () => {
    const next = !isPaused;
    setIsPaused(next);
    pauseBroadcastRef.current = next;
  };

  const handleCancelBroadcast = () => {
    cancelBroadcastRef.current = true;
    setIsBroadcasting(false);
    setIsPaused(false);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-darker text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500/30 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Utama & Status Gateway */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-brand-dark dark:text-emerald-300">
              <MessageSquare className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                Kirim WhatsApp Evaluasi & Khotmil
              </h1>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Otomasi pengiriman kartu rapor bergambar dan laporan nilai santri langsung ke nomor WhatsApp wali santri.
              </p>
            </div>
          </div>
        </div>

        {/* Status Sinyal WAHA & Aksi Pengaturan */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => checkGateway(config)}
            disabled={checkingGateway}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition shadow-sm ${
              gatewayStatus.online
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300"
            }`}
            title="Klik untuk menyegarkan status koneksi WAHA"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                gatewayStatus.online ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
              }`}
            />
            <span>
              {checkingGateway
                ? "Memeriksa..."
                : gatewayStatus.online
                ? `WAHA Aktif (${gatewayStatus.phone || "Connected"})`
                : "WAHA Belum Terhubung"}
            </span>
            <RefreshCw className={`w-3.5 h-3.5 ${checkingGateway ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setTemplateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition shadow-sm"
          >
            <FileText className="w-4 h-4 text-brand-dark dark:text-emerald-400" />
            <span>Draf Pesan</span>
          </button>

          <button
            type="button"
            onClick={() => setSettingsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition shadow-sm"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span>Pengaturan Gateway</span>
          </button>
        </div>
      </div>

      {/* Banner Notifikasi jika Gateway Offline */}
      {!gatewayStatus.online && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Mode Server WAHA Sedang Offline:</span>
            <p className="mt-0.5 text-amber-800 dark:text-amber-300">
              Jika server Docker WAHA belum dinyalakan di komputer/VPS, Anda tetap dapat melakukan pengiriman secara langsung menggunakan tombol{" "}
              <span className="font-semibold underline">&quot;Kirim via WA Web&quot;</span> pada masing-masing baris santri di tabel bawah ini.
            </p>
          </div>
        </div>
      )}

      {/* Progress Box saat Sedang Melakukan Broadcast Massal */}
      {isBroadcasting && (
        <div className="bg-emerald-950 text-white rounded-2xl p-5 shadow-xl border border-emerald-500/40 space-y-4 animate-in fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                <h3 className="font-bold text-sm sm:text-base">
                  Sedang Mengirim Pesan Broadcast Massal...
                </h3>
              </div>
              <p className="text-xs text-emerald-200 mt-1">
                Memproses {broadcastProgress.current} dari {broadcastProgress.total} santri
                {currentDelay > 0 && ` • Jeda aman anti-banned: ${currentDelay} detik lagi...`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePauseResume}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition"
              >
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                <span>{isPaused ? "Lanjutkan" : "Jeda"}</span>
              </button>

              <button
                type="button"
                onClick={handleCancelBroadcast}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Hentikan</span>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-emerald-900 rounded-full h-3 overflow-hidden">
            <div
              className="bg-emerald-400 h-full transition-all duration-300"
              style={{
                width: `${
                  broadcastProgress.total > 0
                    ? (broadcastProgress.current / broadcastProgress.total) * 100
                    : 0
                }%`,
              }}
            />
          </div>

          {/* Log Window Terminal */}
          <div className="bg-black/40 rounded-xl p-3 font-mono text-[11px] text-emerald-300 max-h-36 overflow-y-auto space-y-1">
            {broadcastLogs.slice(-6).map((log, idx) => (
              <div key={idx} className="truncate">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Pemilihan Program & Tahap Evaluasi */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Pilihan Jenis Program */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setJenisProgram("khotmil30");
                setActiveTahap(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                jenisProgram === "khotmil30"
                  ? "bg-brand text-white shadow"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              Khotmil 30 Juz (9 Tahap)
            </button>
            <button
              type="button"
              onClick={() => {
                setJenisProgram("khotmil15");
                setActiveTahap(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                jenisProgram === "khotmil15"
                  ? "bg-brand text-white shadow"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              Khotmil 15 Juz (5 Tahap)
            </button>
          </div>

          {/* Tombol Eksekusi Broadcast Terpilih */}
          <button
            type="button"
            onClick={handleStartBroadcast}
            disabled={isBroadcasting || selectedIds.size === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold transition shadow-md disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>Mulai Kirim Broadcast ({selectedIds.size} Santri)</span>
          </button>
        </div>

        {/* Pilihan Tab Tahap */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {tahapList.map((t) => (
            <button
              key={t.tahap}
              type="button"
              onClick={() => setActiveTahap(t.tahap)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                activeTahap === t.tahap
                  ? "bg-emerald-100 dark:bg-emerald-950 text-brand-dark dark:text-emerald-300 border border-emerald-400"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
              }`}
            >
              {t.label} ({t.rentangLabel})
            </button>
          ))}
        </div>

        {/* Filter & Bar Pencarian */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
          {/* Kolom Cari */}
          <div className="sm:col-span-5 relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama santri, asrama, atau nomor WA..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          {/* Filter Asrama */}
          <div className="sm:col-span-3">
            <select
              value={filterAsrama}
              onChange={(e) => setFilterAsrama(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="">Semua Asrama</option>
              {asramaOptions.map((a) => (
                <option key={a} value={a}>
                  Asrama {a}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status Pengiriman */}
          <div className="sm:col-span-4">
            <select
              value={filterStatusKirim}
              onChange={(e) => setFilterStatusKirim(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="semua">Semua Status Pengiriman</option>
              <option value="belum">Belum Pernah Dikirim</option>
              <option value="sudah">Sudah Pernah Dikirim</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid Utama: Tabel Santri (Kiri 7 Kolom) & Live Preview (Kanan 5 Kolom) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ==================== TABEL SANTRI & CHECKLIST (7 Kolom) ==================== */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          {/* Header Tabel & Quick Selection */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={
                    filteredRows.length > 0 && selectedIds.size === filteredRows.length
                  }
                  onChange={handleSelectAllFiltered}
                  className="rounded text-brand focus:ring-brand accent-brand w-4 h-4 cursor-pointer"
                />
                <span>Pilih Semua ({filteredRows.length})</span>
              </label>

              <button
                type="button"
                onClick={handleSelectOnlyUnsent}
                className="text-[11px] text-brand-dark dark:text-emerald-400 hover:underline font-semibold"
              >
                Pilih yang Belum Dikirim
              </button>
            </div>

            <span className="text-[11px] text-slate-500">
              Terpilih: <strong className="text-slate-800 dark:text-slate-200">{selectedIds.size}</strong> santri
            </span>
          </div>

          {/* Isi Tabel */}
          <div className="overflow-x-auto max-h-[580px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Memuat data evaluasi santri...
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Tidak ada data santri yang cocok dengan filter atau tahap ini.
              </div>
            ) : (
              filteredRows.map((row) => {
                const isSelected = selectedIds.has(row.santri.id);
                const isCurrentPreview = previewRow?.santri.id === row.santri.id;

                return (
                  <div
                    key={row.santri.id}
                    onClick={() => setPreviewRow(row)}
                    className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition ${
                      isCurrentPreview
                        ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-l-4 border-l-brand"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    {/* Checkbox & Nama */}
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToggleSelect(row.santri.id);
                        }}
                        className="rounded text-brand focus:ring-brand accent-brand w-4 h-4 cursor-pointer shrink-0"
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                            {row.santri.nama_lengkap}
                          </span>
                          {row.isDelivered && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 shrink-0">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Terkirim
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          Asrama {row.santri.asrama || "-"} • Kamar {row.santri.kamar || "-"} • No. WA:{" "}
                          <span className={row.hasPhone ? "font-semibold text-slate-700 dark:text-slate-300" : "text-rose-500 font-semibold"}>
                            {row.hasPhone ? row.phone : "Belum Ada"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Nilai, KKM, & Aksi Cepat */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="font-black text-xs text-slate-800 dark:text-slate-100">
                          {row.rataRata > 0 ? row.rataRata : "-"}
                        </div>
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                            row.isTuntas
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {row.isTuntas ? "TUNTAS" : "REMIDI"}
                        </span>
                      </div>

                      {/* Tombol Kirim Instan */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendSingleWaha(row);
                          }}
                          disabled={!row.hasPhone}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-brand-dark dark:text-emerald-400 transition disabled:opacity-30"
                          title="Kirim instan via WAHA"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDirectWa(row);
                          }}
                          disabled={!row.hasPhone}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition disabled:opacity-30"
                          title="Buka langsung di WhatsApp Web"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ==================== LIVE PRATINJAU KARTU RAPOR & PESAN (5 Kolom) ==================== */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Eye className="w-4 h-4 text-brand-dark dark:text-emerald-400" />
                <span>Pratinjau Kartu Rapor Digital</span>
              </span>

              {previewRow && (
                <span className="text-[11px] font-bold text-brand-dark dark:text-emerald-400 truncate max-w-[180px]">
                  {previewRow.santri.nama_lengkap}
                </span>
              )}
            </div>

            {previewRow ? (
              <div className="space-y-4">
                {/* Tampilan Gambar Kartu Rapor via next/og */}
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md bg-slate-100 dark:bg-slate-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={buildRaporImageUrl(previewRow)}
                    alt="Kartu Rapor Evaluasi"
                    className="w-full h-auto block select-none"
                    loading="lazy"
                  />
                </div>

                {/* Tampilan Draf Pesan Teks WhatsApp */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                    Pratinjau Teks Pesan WhatsApp:
                  </span>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 font-mono whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                    {buildMessageText(previewRow)}
                  </div>
                </div>

                {/* Tombol Aksi Pratinjau */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSendSingleWaha(previewRow)}
                    disabled={!previewRow.hasPhone}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-bold transition shadow-sm disabled:opacity-40"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim ke Wali ({previewRow.phone || "No HP Kosong"})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenDirectWa(previewRow)}
                    disabled={!previewRow.hasPhone}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title="Buka di WhatsApp Web"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>WA Web</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                Pilih salah satu baris santri di tabel sebelah kiri untuk melihat pratinjau kartu rapor.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== MODAL PENGATURAN GATEWAY WAHA ==================== */}
      {settingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-brand-dark dark:text-emerald-400" />
                <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                  Pengaturan WhatsApp Gateway (WAHA)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* URL Base WAHA */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  URL Server WAHA (HTTP API):
                </label>
                <input
                  type="text"
                  value={config.baseUrl}
                  onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                  placeholder="Contoh: http://localhost:3000 atau https://waha.pesantren.id"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Alamat IP atau domain tempat Docker WAHA dijalankan (di VPS atau laptop kantor).
                </span>
              </div>

              {/* API Key */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  API Key WAHA (Opsional):
                </label>
                <input
                  type="password"
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  placeholder="Kosongkan jika WAHA tidak dipasangi API Key"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono"
                />
              </div>

              {/* Jeda Acak (Random Delay) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Jeda Minimal (Detik):
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="15"
                    value={config.delayMin}
                    onChange={(e) =>
                      setConfig({ ...config, delayMin: Math.max(1, Number(e.target.value)) })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Jeda Maksimal (Detik):
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="30"
                    value={config.delayMax}
                    onChange={(e) =>
                      setConfig({ ...config, delayMax: Math.max(2, Number(e.target.value)) })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              {/* Auto Send Toggle */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.autoSendOnScore}
                    onChange={(e) => setConfig({ ...config, autoSendOnScore: e.target.checked })}
                    className="rounded text-brand focus:ring-brand accent-brand w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      Kirim WA Otomatis Setelah Input Evaluasi
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Begitu penguji menyimpan nilai santri di modal, sistem langsung otomatis mengirim ke nomor wali.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  saveWahaConfig(config);
                  setSettingsModalOpen(false);
                  showToast("Pengaturan WAHA berhasil disimpan.");
                  checkGateway(config);
                }}
                className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-bold shadow-sm"
              >
                Simpan Pengaturan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL DRAF TEMPLATE PESAN ==================== */}
      {templateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-dark dark:text-emerald-400" />
                <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                  Sesuaikan Draf Pesan WhatsApp
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTemplateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-500 text-[11px]">
                Gunakan tag variabel dinamis berikut untuk mempersonalisasi pesan: <br />
                <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-brand-dark dark:text-emerald-400 font-bold">
                  &#123;nama&#125;
                </code>
                ,{" "}
                <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-brand-dark dark:text-emerald-400 font-bold">
                  &#123;asrama&#125;
                </code>
                ,{" "}
                <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-brand-dark dark:text-emerald-400 font-bold">
                  &#123;kamar&#125;
                </code>
                ,{" "}
                <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-brand-dark dark:text-emerald-400 font-bold">
                  &#123;program&#125;
                </code>
                ,{" "}
                <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-brand-dark dark:text-emerald-400 font-bold">
                  &#123;tahap&#125;
                </code>
                ,{" "}
                <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-brand-dark dark:text-emerald-400 font-bold">
                  &#123;rata_rata&#125;
                </code>
                ,{" "}
                <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-brand-dark dark:text-emerald-400 font-bold">
                  &#123;status&#125;
                </code>
                ,{" "}
                <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-brand-dark dark:text-emerald-400 font-bold">
                  &#123;catatan&#125;
                </code>
              </p>

              <textarea
                rows={10}
                value={config.messageTemplate}
                onChange={(e) => setConfig({ ...config, messageTemplate: e.target.value })}
                className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono text-xs focus:ring-1 focus:ring-brand"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() =>
                  setConfig({ ...config, messageTemplate: DEFAULT_WAHA_CONFIG.messageTemplate })
                }
                className="text-[11px] text-slate-500 hover:underline"
              >
                Reset ke Teks Bawaan
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTemplateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    saveWahaConfig(config);
                    setTemplateModalOpen(false);
                    showToast("Draf pesan berhasil diperbarui.");
                  }}
                  className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-bold shadow-sm"
                >
                  Simpan Draf
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
