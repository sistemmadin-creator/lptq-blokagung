"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import {
  Lock,
  Unlock,
  Upload,
  Download,
  Copy,
  RotateCcw,
  Sparkles,
  Check,
  Search,
  Calendar,
  User,
  MapPin,
  GraduationCap,
  ZoomIn,
  ZoomOut,
  Camera,
  Trash2,
  FileImage,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Award,
} from "lucide-react";
import { fetchAllSantriFiltered, fetchSetoranBulananMerged } from "@/lib/services/tahfidz-service";
import { formatTanggalLengkapKhatam } from "@/lib/utils/hijri";
import type { Santri, SetoranBulananRow } from "@/types/database";

interface PhotoSettings {
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
  borderWidth: number;
  borderColor: string;
}

interface TextSettings {
  x: number;
  y: number;
  fontSize: number;
  color: string;
  align: "center" | "left";
  lineHeight?: number;
}

interface BiodataSettings {
  labelX: number;
  colonX: number;
  valueX: number;
  startY: number;
  lineGap: number;
  fontSize: number;
  color: string;
}

interface FlyerLayoutPreset {
  photo: PhotoSettings;
  nama: TextSettings;
  binti: TextSettings;
  biodata: BiodataSettings;
  tanggal: TextSettings;
  useDomeOverlay: boolean;
}

const DEFAULT_PRESET: FlyerLayoutPreset = {
  photo: {
    x: 423,
    y: 337,
    width: 360,
    height: 518,
    borderRadius: 24,
    zoom: 100,
    offsetX: 0,
    offsetY: 0,
    borderWidth: 5,
    borderColor: "#0f4d38",
  },
  nama: {
    x: 215,
    y: 435,
    fontSize: 42,
    color: "#0f4d38",
    align: "center",
    lineHeight: 48,
  },
  binti: {
    x: 215,
    y: 555,
    fontSize: 22,
    color: "#0f4d38",
    align: "center",
  },
  biodata: {
    labelX: 42,
    colonX: 150,
    valueX: 168,
    startY: 590,
    lineGap: 40,
    fontSize: 21,
    color: "#0f4d38",
  },
  tanggal: {
    x: 215,
    y: 742,
    fontSize: 18,
    color: "#0f4d38",
    align: "center",
  },
  useDomeOverlay: true,
};

const STORAGE_KEY = "lptq_flyer_preset_v1";
const DEFAULT_TEMPLATE_URL = "/templates/flyer-khatam-blank.png";
const DOME_OVERLAY_URL = "/templates/flyer-dome-overlay.png";

export function FlyerKhatamanModule() {
  // State Data Santri
  const [allSantri, setAllSantri] = useState<Santri[]>([]);
  const [khatamSantriIds, setKhatamSantriIds] = useState<Set<string>>(new Set());
  const [loadingSantri, setLoadingSantri] = useState(true);
  const [searchSantri, setSearchSantri] = useState("");
  const [filterKhatamOnly, setFilterKhatamOnly] = useState(false);
  const [dropdownSantriOpen, setDropdownSantriOpen] = useState(false);
  const [selectedSantri, setSelectedSantri] = useState<Santri | null>(null);

  // Form State Flyer
  const [namaSantri, setNamaSantri] = useState("DIYAH AYU NINGRUM");
  const [binBinti, setBinBinti] = useState<"Binti" | "Bin">("Binti");
  const [namaBapak, setNamaBapak] = useState("Syuhadi");
  const [alamat, setAlamat] = useState("Muncar, Banyuwangi");
  const [diniyyah, setDiniyyah] = useState("Mutakhorijat");
  const [kurikulum1, setKurikulum1] = useState("Mahasiswi UIMSYA");
  const [kurikulum2, setKurikulum2] = useState("Prodi TBIN 6A");

  // Tanggal State
  const [tanggalMode, setTanggalMode] = useState<"otomatis" | "manual">("otomatis");
  const [tanggalManual, setTanggalManual] = useState("13 Juli 2026 M / 28 Muharram 1448 H");
  const [tanggalOtomatisTeks, setTanggalOtomatisTeks] = useState("");

  // Foto Santri & Template State
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [customTemplateUrl, setCustomTemplateUrl] = useState<string | null>(null);

  // Layout Configuration
  const [preset, setPreset] = useState<FlyerLayoutPreset>(DEFAULT_PRESET);
  const [isLocked, setIsLocked] = useState(true);
  const [activeTabSetting, setActiveTabSetting] = useState<"nama" | "binti" | "biodata" | "tanggal" | "foto">("nama");
  const [previewZoom, setPreviewZoom] = useState(75); // skala persen preview

  // Status & Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const templateImgRef = useRef<HTMLImageElement | null>(null);
  const domeImgRef = useRef<HTMLImageElement | null>(null);
  const photoImgRef = useRef<HTMLImageElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Muat data awal tanggal otomatis
  useEffect(() => {
    setTanggalOtomatisTeks(formatTanggalLengkapKhatam(new Date()));
  }, []);

  // Muat preset dari LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPreset((prev) => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Gagal membaca preset flyer dari localStorage", e);
      }
    }
  }, []);

  // Simpan preset saat di-lock
  const toggleLock = () => {
    const nextLocked = !isLocked;
    setIsLocked(nextLocked);
    if (nextLocked) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preset));
      showToast("Tata letak berhasil dikunci dan disimpan!");
    } else {
      showToast("Mode penyesuaian posisi aktif. Anda dapat menggeser layer teks & foto.");
    }
  };

  const resetToDefaultPreset = () => {
    if (confirm("Kembalikan tata letak ke posisi standar bawaan Darussalam?")) {
      setPreset(DEFAULT_PRESET);
      localStorage.removeItem(STORAGE_KEY);
      showToast("Tata letak dikembalikan ke pengaturan default.");
    }
  };

  // Muat daftar santri & evaluasi khatam
  useEffect(() => {
    async function loadData() {
      setLoadingSantri(true);
      try {
        const [santriData, evaluasiData] = await Promise.all([
          fetchAllSantriFiltered({}),
          fetchSetoranBulananMerged(new Date().getFullYear(), "evaluasi", {}).catch(() => [] as SetoranBulananRow[]),
        ]);

        setAllSantri(santriData);

        // Cari santri yang telah menyelesaikan juz 30 pada evaluasi
        const khatamIds = new Set<string>();
        evaluasiData.forEach((row) => {
          if (row.total_setoran >= 30) {
            khatamIds.add(row.santri_id);
          }
        });
        setKhatamSantriIds(khatamIds);
      } catch (err) {
        console.error("Gagal memuat daftar santri", err);
      } finally {
        setLoadingSantri(false);
      }
    }
    loadData();
  }, []);

  // Handle klik di luar dropdown santri
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownSantriOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Saat santri dipilih dari database
  const handleSelectSantri = (santri: Santri) => {
    setSelectedSantri(santri);
    setNamaSantri(santri.nama_lengkap.toUpperCase());
    setDropdownSantriOpen(false);
    setSearchSantri("");

    // Isi alamat dari asrama / blok santri jika ada
    if (santri.asrama) {
      setAlamat(`Asrama ${santri.asrama}, Kamar ${santri.kamar}`);
    }

    showToast(`Data santri "${santri.nama_lengkap}" berhasil dipilih.`);
  };

  // Filter daftar santri
  const filteredSantri = allSantri.filter((s) => {
    const matchesSearch =
      s.nama_lengkap.toLowerCase().includes(searchSantri.toLowerCase()) ||
      (s.kamar && s.kamar.toLowerCase().includes(searchSantri.toLowerCase())) ||
      (s.asrama && s.asrama.toLowerCase().includes(searchSantri.toLowerCase()));

    if (filterKhatamOnly) {
      return matchesSearch && khatamSantriIds.has(s.id);
    }
    return matchesSearch;
  });

  // Handle Upload Foto Santri
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Harap pilih file gambar (JPG, PNG, atau WEBP)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPhotoDataUrl(result);
      showToast("Foto santri berhasil diunggah.");
    };
    reader.readAsDataURL(file);
  };

  // Handle Upload Custom Template Flyer
  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Harap pilih file gambar template (PNG atau JPG)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCustomTemplateUrl(result);
      showToast("Template twibbon kustom berhasil dipasang.");
    };
    reader.readAsDataURL(file);
  };

  // Tanggal yang aktif ditampilkan di flyer
  const tanggalTampil = tanggalMode === "otomatis" ? tanggalOtomatisTeks : tanggalManual;
  const teksBinti = `${binBinti} Bapak ${namaBapak}`;

  // Helper untuk menggambar rounded rect path
  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  // Render Canvas Utama
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fungsi menggambar semua layer teks
    const drawFlyerTexts = (c: CanvasRenderingContext2D) => {
      c.textBaseline = "middle";

      // Layer 1: Nama Santri
      c.save();
      c.font = `bold ${preset.nama.fontSize}px 'Arial Black', Impact, sans-serif`;
      c.fillStyle = preset.nama.color;
      c.textAlign = preset.nama.align;

      // Multiline jika nama santri panjang (2 baris)
      const words = namaSantri.trim().split(" ");
      let line1 = "";
      let line2 = "";
      if (words.length >= 3 && namaSantri.length > 15) {
        const mid = Math.ceil(words.length / 2);
        line1 = words.slice(0, mid).join(" ");
        line2 = words.slice(mid).join(" ");
      } else {
        line1 = namaSantri;
      }

      const lineHeight = preset.nama.lineHeight || preset.nama.fontSize * 1.15;
      if (line2) {
        c.fillText(line1, preset.nama.x, preset.nama.y - lineHeight / 2);
        c.fillText(line2, preset.nama.x, preset.nama.y + lineHeight / 2);
      } else {
        c.fillText(line1, preset.nama.x, preset.nama.y);
      }
      c.restore();

      // Layer 2: Binti / Bin Bapak
      c.save();
      c.font = `italic bold ${preset.binti.fontSize}px Georgia, serif, sans-serif`;
      c.fillStyle = preset.binti.color;
      c.textAlign = preset.binti.align;
      c.fillText(teksBinti, preset.binti.x, preset.binti.y);
      c.restore();

      // Layer 3: Biodata Block (Alamat, Diniyyah, Kurikulum)
      const bio = preset.biodata;
      c.save();
      c.font = `bold ${bio.fontSize}px Arial, Helvetica, sans-serif`;
      c.fillStyle = bio.color;
      c.textAlign = "left";

      const drawBioRow = (label: string, value: string, currentY: number) => {
        c.fillText(label, bio.labelX, currentY);
        c.fillText(":", bio.colonX, currentY);
        c.fillText(value, bio.valueX, currentY);
      };

      let curY = bio.startY;
      drawBioRow("Alamat", alamat, curY);

      curY += bio.lineGap;
      drawBioRow("Diniyyah", diniyyah, curY);

      curY += bio.lineGap;
      drawBioRow("Kurikulum", kurikulum1, curY);

      if (kurikulum2) {
        curY += bio.lineGap * 0.85;
        c.fillText(kurikulum2, bio.valueX, curY);
      }
      c.restore();

      // Layer 4: Tanggal Khataman
      c.save();
      c.font = `bold ${preset.tanggal.fontSize}px Arial, Helvetica, sans-serif`;
      c.fillStyle = preset.tanggal.color;
      c.textAlign = preset.tanggal.align;
      c.fillText(tanggalTampil, preset.tanggal.x, preset.tanggal.y);
      c.restore();
    };

    const currentTemplateSrc = customTemplateUrl || DEFAULT_TEMPLATE_URL;

    // Load template image
    const templateImg = new window.Image();
    templateImg.crossOrigin = "anonymous";
    templateImg.src = currentTemplateSrc;

    templateImg.onload = () => {
      canvas.width = templateImg.width || 814;
      canvas.height = templateImg.height || 1024;

      // 1. Gambar Template Background
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);

      // 2. Gambar Foto Santri (jika diunggah)
      if (photoDataUrl) {
        const photoImg = new window.Image();
        photoImg.crossOrigin = "anonymous";
        photoImg.src = photoDataUrl;
        photoImg.onload = () => {
          ctx.save();
          const { x, y, width, height, borderRadius, zoom, offsetX, offsetY, borderWidth, borderColor } =
            preset.photo;

          // Buat clip rounded rectangle
          drawRoundedRect(ctx, x, y, width, height, borderRadius);
          ctx.clip();

          // Hitung posisi scaling & offset foto
          const scale = zoom / 100;
          const imgAspect = photoImg.width / photoImg.height;
          const frameAspect = width / height;

          let drawW = width;
          let drawH = height;

          if (imgAspect > frameAspect) {
            drawW = height * imgAspect;
          } else {
            drawH = width / imgAspect;
          }

          drawW *= scale;
          drawH *= scale;

          const drawX = x + (width - drawW) / 2 + offsetX;
          const drawY = y + (height - drawH) / 2 + offsetY;

          ctx.drawImage(photoImg, drawX, drawY, drawW, drawH);
          ctx.restore();

          // Gambar border frame foto
          if (borderWidth > 0) {
            ctx.save();
            drawRoundedRect(ctx, x, y, width, height, borderRadius);
            ctx.lineWidth = borderWidth;
            ctx.strokeStyle = borderColor;
            ctx.stroke();
            ctx.restore();
          }

          // 3. Gambar Kubah Dome Overlay di atas foto (jika aktif & pakai template bawaan)
          if (!customTemplateUrl && preset.useDomeOverlay) {
            const domeImg = new window.Image();
            domeImg.crossOrigin = "anonymous";
            domeImg.src = DOME_OVERLAY_URL;
            domeImg.onload = () => {
              ctx.drawImage(domeImg, 0, 0, canvas.width, canvas.height);
              drawFlyerTexts(ctx);
            };
            domeImg.onerror = () => {
              drawFlyerTexts(ctx);
            };
          } else {
            drawFlyerTexts(ctx);
          }
        };
      } else {
        // Jika belum ada foto yang diunggah, tetap render teks
        drawFlyerTexts(ctx);
      }
    };
  }, [
    customTemplateUrl,
    photoDataUrl,
    preset,
    namaSantri,
    teksBinti,
    alamat,
    diniyyah,
    kurikulum1,
    kurikulum2,
    tanggalTampil,
  ]);

  // Re-render saat ada perubahan data atau posisi
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Download Gambar High Resolution
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsExporting(true);

    try {
      const sanitizedName = (namaSantri || "Santri")
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_]/g, "");
      const fileName = `Flyer_Khatam_${sanitizedName}_${new Date().getFullYear()}.png`;

      const link = document.createElement("a");
      link.download = fileName;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();

      showToast(`Flyer berhasil diunduh sebagai ${fileName}!`);
    } catch (e) {
      console.error("Gagal mendownload gambar", e);
      alert("Terjadi kendala saat mengekspor gambar.");
    } finally {
      setIsExporting(false);
    }
  };

  // Salin Gambar ke Clipboard
  const handleCopyClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": blob,
          }),
        ]);
        showToast("Gambar berhasil disalin ke clipboard! Siap dipaste ke WhatsApp atau media sosial.");
      }, "image/png");
    } catch (err) {
      console.error("Gagal menyalin gambar", err);
      alert("Browser Anda tidak mendukung salin gambar langsung ke clipboard. Silakan gunakan tombol Unduh.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notifikasi */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-darker text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500/30 animate-in fade-in slide-in-from-bottom-4">
          <Check className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Halaman */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-brand-dark dark:text-emerald-300">
              <Award className="w-6 h-6" />
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-100">
              Flyer Khataman Al-Qur&apos;an
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Buat poster apresiasi khataman 30 juz (bil hifdzi) santri secara otomatis. Hubungkan data
            nama dari database, atur posisi elemen twibbon, dan unduh flyer resolusi tinggi.
          </p>
        </div>

        {/* Tombol Kunci Posisi & Download di Atas */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={toggleLock}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition shadow-sm ${
              isLocked
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-amber-500 hover:bg-amber-600 text-white animate-pulse"
            }`}
            title={isLocked ? "Buka kunci untuk menggeser posisi data" : "Kunci posisi elemen flyer"}
          >
            {isLocked ? (
              <>
                <Lock className="w-4 h-4" />
                <span>Posisi Terkunci</span>
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>Kunci Posisi</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-white text-xs sm:text-sm font-bold hover:bg-brand-dark transition shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Unduh PNG</span>
          </button>
        </div>
      </div>

      {/* Grid 2 Kolom: Kiri Panel Form & Pengaturan, Kanan Live Preview Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ==================== PANEL KIRI (5 Kolom) ==================== */}
        <div className="lg:col-span-5 space-y-5">
          {/* 1. KOTAK PILIH DATA SANTRI OTOMATIS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <User className="w-4 h-4 text-brand-dark dark:text-emerald-400" />
                <span>Pilih Santri (Otomatis dari Database)</span>
              </label>

              {/* Toggle Filter Khatam Saja */}
              <button
                type="button"
                onClick={() => setFilterKhatamOnly(!filterKhatamOnly)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition ${
                  filterKhatamOnly
                    ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200"
                }`}
              >
                {filterKhatamOnly ? "✓ Hanya Khatam 30 Juz" : "Semua Santri"}
              </button>
            </div>

            {/* Pencarian & Dropdown Pemilihan */}
            <div className="relative" ref={dropdownRef}>
              <div
                onClick={() => setDropdownSantriOpen(!dropdownSantriOpen)}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-800 dark:text-slate-100 cursor-pointer hover:border-brand transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate font-semibold">
                    {selectedSantri ? (
                      <>
                        {selectedSantri.nama_lengkap}{" "}
                        <span className="text-slate-400 font-normal">
                          (Kamar {selectedSantri.kamar || "-"}, Asrama {selectedSantri.asrama || "-"})
                        </span>
                      </>
                    ) : (
                      "Klik untuk cari nama santri dari database..."
                    )}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              </div>

              {/* Menu Pilihan Santri Dropdown */}
              {dropdownSantriOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                    <input
                      type="text"
                      value={searchSantri}
                      onChange={(e) => setSearchSantri(e.target.value)}
                      placeholder="Ketik nama santri atau kamar..."
                      autoFocus
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {loadingSantri ? (
                      <div className="p-4 text-center text-xs text-slate-500">Memuat data santri...</div>
                    ) : filteredSantri.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">
                        Tidak ada santri yang cocok dengan pencarian.
                      </div>
                    ) : (
                      filteredSantri.map((s) => {
                        const isKhatam = khatamSantriIds.has(s.id);
                        return (
                          <div
                            key={s.id}
                            onClick={() => handleSelectSantri(s)}
                            className="p-3 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer transition flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-xs text-slate-800 dark:text-slate-100">
                                {s.nama_lengkap}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                Asrama {s.asrama || "-"} • Kamar {s.kamar || "-"} • Halaqoh {s.halaqoh || "-"}
                              </div>
                            </div>
                            {isKhatam && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-brand-dark dark:text-emerald-300">
                                Khatam 30 Juz
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Input Nama Santri (Bisa diedit jika ingin penyesuaian huruf) */}
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Nama Santri di Flyer:
              </label>
              <input
                type="text"
                value={namaSantri}
                onChange={(e) => setNamaSantri(e.target.value.toUpperCase())}
                placeholder="Contoh: DIYAH AYU NINGRUM"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand uppercase"
              />
            </div>
          </div>

          {/* 2. KOTAK INPUT MANUAL (Nama Bapak, Alamat, Diniyyah, Kurikulum) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-brand-dark dark:text-emerald-400" />
              <span>Data Manual Flyer (Diinput Petugas)</span>
            </h2>

            {/* Bin / Binti & Nama Bapak */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Afiliasi:
                </label>
                <select
                  value={binBinti}
                  onChange={(e) => setBinBinti(e.target.value as "Binti" | "Bin")}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100"
                >
                  <option value="Binti">Binti (Putri)</option>
                  <option value="Bin">Bin (Putra)</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Nama Bapak:
                </label>
                <input
                  type="text"
                  value={namaBapak}
                  onChange={(e) => setNamaBapak(e.target.value)}
                  placeholder="Contoh: Syuhadi"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            {/* Alamat */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Alamat Asal:
              </label>
              <input
                type="text"
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                placeholder="Contoh: Muncar, Banyuwangi"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            {/* Diniyyah */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Jenjang Diniyyah:
              </label>
              <input
                type="text"
                value={diniyyah}
                onChange={(e) => setDiniyyah(e.target.value)}
                placeholder="Contoh: Mutakhorijat / Ulya / Wustho"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            {/* Kurikulum / Pendidikan Formal */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                Kurikulum (Pendidikan Formal / Kampus):
              </label>
              <input
                type="text"
                value={kurikulum1}
                onChange={(e) => setKurikulum1(e.target.value)}
                placeholder="Baris 1: Mahasiswi UIMSYA / SMA Darussalam"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <input
                type="text"
                value={kurikulum2}
                onChange={(e) => setKurikulum2(e.target.value)}
                placeholder="Baris 2 (Opsional): Prodi TBIN 6A / Kelas XII"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            {/* Pengaturan Tanggal */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-brand-dark dark:text-emerald-400" />
                  <span>Tanggal Khataman:</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTanggalMode("otomatis")}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      tanggalMode === "otomatis"
                        ? "bg-brand text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                    }`}
                  >
                    Otomatis Hari Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => setTanggalMode("manual")}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      tanggalMode === "manual"
                        ? "bg-brand text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                    }`}
                  >
                    Manual
                  </button>
                </div>
              </div>

              {tanggalMode === "otomatis" ? (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 font-medium">
                  {tanggalOtomatisTeks}
                </div>
              ) : (
                <input
                  type="text"
                  value={tanggalManual}
                  onChange={(e) => setTanggalManual(e.target.value)}
                  placeholder="Contoh: 13 Juli 2026 M / 28 Muharram 1448 H"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand"
                />
              )}
            </div>
          </div>

          {/* 3. KOTAK UPLOAD FOTO SANTRI & TEMPLATE */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Camera className="w-4 h-4 text-brand-dark dark:text-emerald-400" />
              <span>Foto Santri & Template Flyer</span>
            </h2>

            {/* Upload Foto Santri */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                Foto Santri (Dokumentasi Setoran / Profil):
              </label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-200 transition">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{photoDataUrl ? "Ganti Foto" : "Unggah Foto Santri"}</span>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>

                {photoDataUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoDataUrl(null)}
                    className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                    title="Hapus foto santri"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Slider Penyesuaian Foto Santri jika ada */}
              {photoDataUrl && (
                <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    <span>Skala Foto (Zoom):</span>
                    <span>{preset.photo.zoom}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    value={preset.photo.zoom}
                    onChange={(e) =>
                      setPreset((p) => ({
                        ...p,
                        photo: { ...p.photo, zoom: Number(e.target.value) },
                      }))
                    }
                    className="w-full accent-brand"
                  />

                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Geser X:</span>
                      <input
                        type="range"
                        min="-200"
                        max="200"
                        value={preset.photo.offsetX}
                        onChange={(e) =>
                          setPreset((p) => ({
                            ...p,
                            photo: { ...p.photo, offsetX: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-brand"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 block">Geser Y:</span>
                      <input
                        type="range"
                        min="-200"
                        max="200"
                        value={preset.photo.offsetY}
                        onChange={(e) =>
                          setPreset((p) => ({
                            ...p,
                            photo: { ...p.photo, offsetY: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-brand"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Template Flyer (Twibbon) */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                Template Desain (Twibbon Kosongan):
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-200 transition">
                  <FileImage className="w-3.5 h-3.5" />
                  <span>Unggah Twibbon Baru</span>
                  <input type="file" accept="image/*" onChange={handleTemplateUpload} className="hidden" />
                </label>

                {customTemplateUrl && (
                  <button
                    type="button"
                    onClick={() => setCustomTemplateUrl(null)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Pakai Template Bawaan</span>
                  </button>
                )}
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                {customTemplateUrl
                  ? "Menggunakan twibbon kustom yang baru diunggah."
                  : "Menggunakan template default resmi Pesantren Darussalam Putri Blokagung."}
              </p>
            </div>
          </div>

          {/* 4. PANEL PENGATURAN KOORDINAT & UKURAN (Hanya saat UNLOCKED) */}
          {!isLocked && (
            <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800/50 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs">
                  <Unlock className="w-4 h-4 text-amber-600" />
                  <span>Pengaturan Posisi & Ukuran Huruf</span>
                </div>
                <button
                  type="button"
                  onClick={resetToDefaultPreset}
                  className="text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
                >
                  Reset Standar
                </button>
              </div>

              {/* Tab Elemen yang Ingin Diatur */}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {(["nama", "binti", "biodata", "tanggal", "foto"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTabSetting(tab)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition shrink-0 ${
                      activeTabSetting === tab
                        ? "bg-amber-600 text-white"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Kontrol Detail Tab Aktif */}
              <div className="space-y-3 text-xs">
                {activeTabSetting === "nama" && (
                  <div className="space-y-2.5">
                    <div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Ukuran Huruf Nama:</span>
                        <span className="font-bold">{preset.nama.fontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="24"
                        max="60"
                        value={preset.nama.fontSize}
                        onChange={(e) =>
                          setPreset((p) => ({
                            ...p,
                            nama: { ...p.nama, fontSize: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-amber-600"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Posisi Y (Vertikal):</span>
                        <span className="font-bold">{preset.nama.y}px</span>
                      </div>
                      <input
                        type="range"
                        min="350"
                        max="520"
                        value={preset.nama.y}
                        onChange={(e) =>
                          setPreset((p) => ({
                            ...p,
                            nama: { ...p.nama, y: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-amber-600"
                      />
                    </div>
                  </div>
                )}

                {activeTabSetting === "binti" && (
                  <div className="space-y-2.5">
                    <div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Ukuran Huruf Binti:</span>
                        <span className="font-bold">{preset.binti.fontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="16"
                        max="32"
                        value={preset.binti.fontSize}
                        onChange={(e) =>
                          setPreset((p) => ({
                            ...p,
                            binti: { ...p.binti, fontSize: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-amber-600"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Posisi Y:</span>
                        <span className="font-bold">{preset.binti.y}px</span>
                      </div>
                      <input
                        type="range"
                        min="500"
                        max="600"
                        value={preset.binti.y}
                        onChange={(e) =>
                          setPreset((p) => ({
                            ...p,
                            binti: { ...p.binti, y: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-amber-600"
                      />
                    </div>
                  </div>
                )}

                {activeTabSetting === "biodata" && (
                  <div className="space-y-2.5">
                    <div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Ukuran Huruf Biodata:</span>
                        <span className="font-bold">{preset.biodata.fontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="14"
                        max="28"
                        value={preset.biodata.fontSize}
                        onChange={(e) =>
                          setPreset((p) => ({
                            ...p,
                            biodata: { ...p.biodata, fontSize: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-amber-600"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Posisi Y Awal:</span>
                        <span className="font-bold">{preset.biodata.startY}px</span>
                      </div>
                      <input
                        type="range"
                        min="550"
                        max="650"
                        value={preset.biodata.startY}
                        onChange={(e) =>
                          setPreset((p) => ({
                            ...p,
                            biodata: { ...p.biodata, startY: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-amber-600"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Jarak Antar Baris:</span>
                        <span className="font-bold">{preset.biodata.lineGap}px</span>
                      </div>
                      <input
                        type="range"
                        min="25"
                        max="55"
                        value={preset.biodata.lineGap}
                        onChange={(e) =>
                          setPreset((p) => ({
                            ...p,
                            biodata: { ...p.biodata, lineGap: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-amber-600"
                      />
                    </div>
                  </div>
                )}

                {activeTabSetting === "tanggal" && (
                  <div className="space-y-2.5">
                    <div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Ukuran Huruf Tanggal:</span>
                        <span className="font-bold">{preset.tanggal.fontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="14"
                        max="26"
                        value={preset.tanggal.fontSize}
                        onChange={(e) =>
                          setPreset((p) => ({
                            ...p,
                            tanggal: { ...p.tanggal, fontSize: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-amber-600"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Posisi Y:</span>
                        <span className="font-bold">{preset.tanggal.y}px</span>
                      </div>
                      <input
                        type="range"
                        min="700"
                        max="780"
                        value={preset.tanggal.y}
                        onChange={(e) =>
                          setPreset((p) => ({
                            ...p,
                            tanggal: { ...p.tanggal, y: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-amber-600"
                      />
                    </div>
                  </div>
                )}

                {activeTabSetting === "foto" && (
                  <div className="space-y-2.5">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={preset.useDomeOverlay}
                        onChange={(e) =>
                          setPreset((p) => ({ ...p, useDomeOverlay: e.target.checked }))
                        }
                        className="rounded accent-amber-600"
                      />
                      <span>Tampilkan Efek Kubah Depan (Foreground Dome)</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ==================== PANEL KANAN: LIVE PREVIEW KANVAS (7 Kolom) ==================== */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          {/* Top Bar Preview */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Pratinjau Flyer HD (814 × 1024 px)
              </span>
              {isLocked ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-brand-dark dark:text-emerald-300 text-[10px] font-bold">
                  <Lock className="w-3 h-3" /> Terkunci
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                  <Unlock className="w-3 h-3" /> Mode Atur
                </span>
              )}
            </div>

            {/* Kontrol Zoom Pratinjau & Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewZoom((z) => Math.max(50, z - 10))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                title="Perkecil pratinjau"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-semibold text-slate-500 w-10 text-center">{previewZoom}%</span>
              <button
                type="button"
                onClick={() => setPreviewZoom((z) => Math.min(100, z + 10))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                title="Perbesar pratinjau"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleCopyClipboard}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition ml-2"
                title="Salin gambar ke clipboard"
              >
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Salin</span>
              </button>
            </div>
          </div>

          {/* Area Kanvas Terpusat */}
          <div className="flex justify-center items-center bg-slate-100/70 dark:bg-slate-950/50 p-4 rounded-xl overflow-auto min-h-[460px] border border-dashed border-slate-300 dark:border-slate-800">
            <div
              style={{
                width: `${(814 * previewZoom) / 100}px`,
                maxWidth: "100%",
                transition: "width 0.2s ease-in-out",
              }}
              className="relative shadow-2xl rounded-xl overflow-hidden bg-white"
            >
              <canvas
                ref={canvasRef}
                className="w-full h-auto block select-none pointer-events-none"
              />
            </div>
          </div>

          {/* Footer Preview / Petunjuk Cepat */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-[11px] text-slate-500 dark:text-slate-400">
            <div>
              💡 <span className="font-semibold">Tips:</span> Hasil unduhan akan beresolusi penuh tajam (asli
              desain poster). Tidak ada logo atau teks yang buram saat dicetak atau diunggah ke status WhatsApp.
            </div>
            <button
              type="button"
              onClick={handleDownload}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold transition shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Flyer PNG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
