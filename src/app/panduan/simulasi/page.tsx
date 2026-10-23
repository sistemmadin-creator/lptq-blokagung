"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  CalendarCheck,
  BookMarked,
  ClipboardCheck,
  Award,
  FileImage,
  MessageSquare,
  Users,
  GraduationCap,
  Settings,
  Camera,
  QrCode,
  Printer,
  Download,
  Share2,
  Eye,
  RotateCcw,
  Sliders,
  Check,
  X,
  Send,
  Building,
  UserCheck,
  Info,
  ShieldCheck,
  HelpCircle,
  Play,
  Pause,
  ArrowDown,
  ArrowRight as LucideArrowRight,
} from "lucide-react";

// =========================================================================
// DEFINISI TIPE & KONFIGURASI SIMULASI
// =========================================================================

interface SimulationStep {
  stepNumber: number;
  badgeLabel: string;
  title: string;
  desc: string;
  targetId: string;
  pointerText: string;
  pointerPlacement?: "top" | "bottom" | "left" | "right";
}

interface SimulationConfig {
  id: string;
  name: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  steps: SimulationStep[];
}

const SIMULATIONS: Record<string, SimulationConfig> = {
  flyer: {
    id: "flyer",
    name: "Generator Flyer Khataman 30 Juz",
    category: "Alat Lanjutan",
    icon: FileImage,
    accentColor: "from-amber-500 to-orange-700",
    steps: [
      {
        stepNumber: 1,
        badgeLabel: "Langkah 1: Pilih Santri",
        title: "Pilih Santri Khatam dari Basis Data",
        desc: "Sistem otomatis mendeteksi santri yang telah menyelesaikan hafalan 30 Juz. Perhatikan kolom pencarian santri yang ditunjuk panah.",
        targetId: "sim-flyer-select-santri",
        pointerText: "Klik di sini untuk memilih santri",
        pointerPlacement: "bottom",
      },
      {
        stepNumber: 2,
        badgeLabel: "Langkah 2: Pasang Foto",
        title: "Unggah dan Posisikan Foto ke Kubah",
        desc: "Klik tombol unggah foto. Foto santri akan otomatis terbingkai rapi di dalam ornamen kubah islami dengan kontrol zoom dan posisi.",
        targetId: "sim-flyer-upload-photo",
        pointerText: "Klik tombol Unggah Foto Santri",
        pointerPlacement: "bottom",
      },
      {
        stepNumber: 3,
        badgeLabel: "Langkah 3: Penanggalan Otomatis",
        title: "Kalkulasi Tanggal Masehi & Hijriah",
        desc: "Sistem otomatis menghitung penanggalan Hijriah pesantren dan mencantumkannya bersama tanggal Masehi di bagian bawah flyer.",
        targetId: "sim-flyer-date-display",
        pointerText: "Penanggalan Masehi & Hijriah otomatis",
        pointerPlacement: "top",
      },
      {
        stepNumber: 4,
        badgeLabel: "Langkah 4: Unduh / Salin",
        title: "Ekspor Berkas Flyer Beresolusi Tinggi",
        desc: "Klik tombol Unduh PNG (resolusi 1080x1350 px) atau Salin ke Clipboard untuk membagikan poster ucapan ke media sosial.",
        targetId: "sim-flyer-download-btn",
        pointerText: "Klik Unduh PNG untuk menyimpan",
        pointerPlacement: "bottom",
      },
    ],
  },
  kegiatan: {
    id: "kegiatan",
    name: "Absensi & Kegiatan Halaqoh Harian",
    category: "Tahfidz Umum",
    icon: CalendarCheck,
    accentColor: "from-emerald-500 to-teal-700",
    steps: [
      {
        stepNumber: 1,
        badgeLabel: "Langkah 1: Sesi Absen",
        title: "Pilih Waktu Halaqoh (Pagi / Malam)",
        desc: "Absensi halaqoh dilakukan 2 kali sehari: Pagi (ba'da Shubuh) dan Malam (ba'da Maghrib). Gunakan tombol sakelar sesi di atas.",
        targetId: "sim-kegiatan-sesi-toggle",
        pointerText: "Pilih Sesi Pagi atau Sesi Malam",
        pointerPlacement: "bottom",
      },
      {
        stepNumber: 2,
        badgeLabel: "Langkah 2: Kalender Pertemuan",
        title: "Periksa Matriks Tanggal Hari Ini",
        desc: "Kolom tanggal hari ini otomatis disorot dengan warna khusus. Hari Jumat ditandai sebagai hari libur mingguan kegiatan pesantren.",
        targetId: "sim-kegiatan-today-col",
        pointerText: "Kolom tanggal hari ini (tersorot)",
        pointerPlacement: "bottom",
      },
      {
        stepNumber: 3,
        badgeLabel: "Langkah 3: Set Hadir Cepat",
        title: "Fitur Cepat 'Set Semua Hadir'",
        desc: "Klik tombol hijau 'Set Semua Hadir' untuk mengisi status Hadir bagi seluruh santri sekaligus agar pencatatan presensi berjalan cepat.",
        targetId: "sim-kegiatan-set-all-btn",
        pointerText: "Klik 'Set Semua Hadir' di sini",
        pointerPlacement: "bottom",
      },
      {
        stepNumber: 4,
        badgeLabel: "Langkah 4: Edit Santri Izin/Sakit",
        title: "Ubah Status Santri yang Berhalangan",
        desc: "Cukup klik sel santri yang tidak masuk untuk mengubah statusnya menjadi Alfa (merah), Izin (kuning), atau Sakit (biru).",
        targetId: "sim-kegiatan-single-cell",
        pointerText: "Klik sel ini untuk mengubah status santri",
        pointerPlacement: "top",
      },
    ],
  },
  khotmil: {
    id: "khotmil",
    name: "Ujian Khotmil & Koreksi LJK Kamera OMR",
    category: "Tahfidz Khotmil",
    icon: Award,
    accentColor: "from-purple-600 to-violet-800",
    steps: [
      {
        stepNumber: 1,
        badgeLabel: "Langkah 1: Pilih Tahap",
        title: "Pilih Tahapan Ujian Munaqosyah",
        desc: "Pilih tab tahapan yang diujikan (Tahap 1 s.d. 5 untuk 15 Juz; Tahap 1 s.d. 9 untuk 30 Juz). Tiap tahap memiliki rentang juz terstandarisasi.",
        targetId: "sim-khotmil-tab-select",
        pointerText: "Pilih nomor tahap ujian di sini",
        pointerPlacement: "bottom",
      },
      {
        stepNumber: 2,
        badgeLabel: "Langkah 2: Cetak LJK",
        title: "Cetak Lembar Jawab Komputer (LJK) Ber-QR",
        desc: "Klik tombol 'Cetak LJK Khotmil' untuk menghasilkan lembar ujian resmi berukuran A4 yang dilengkapi QR Code identitas dan bulatan pensil 2B.",
        targetId: "sim-khotmil-print-ljk-btn",
        pointerText: "Klik tombol Cetak LJK di sini",
        pointerPlacement: "bottom",
      },
      {
        stepNumber: 3,
        badgeLabel: "Langkah 3: Scan Kamera OMR",
        title: "Koreksi Lembar LJK via Kamera Otomatis",
        desc: "Klik tombol kamera OMR. Kamera membaca kode QR santri dan menganalisis bulatan terarsir secara seketika untuk menghitung nilai akhir.",
        targetId: "sim-khotmil-omr-scan-btn",
        pointerText: "Klik tombol Scan Kamera LJK (OMR)",
        pointerPlacement: "bottom",
      },
      {
        stepNumber: 4,
        badgeLabel: "Langkah 4: Hasil & Kelulusan",
        title: "Penyimpanan Nilai Berbasis KKM 85",
        desc: "Nilai dihitung objektif (bobot halaman terbaca 65% dan bobot kesalahan 35%). Nilai tersimpan langsung dan memicu lencana status 'Tuntas'.",
        targetId: "sim-khotmil-score-badge",
        pointerText: "Nilai 92 (TUNTAS KKM 85) tersimpan",
        pointerPlacement: "top",
      },
    ],
  },
  wa: {
    id: "wa",
    name: "Broadcast Laporan WhatsApp (WAHA Gateway)",
    category: "Alat Lanjutan",
    icon: MessageSquare,
    accentColor: "from-green-600 to-emerald-800",
    steps: [
      {
        stepNumber: 1,
        badgeLabel: "Langkah 1: Status Gateway",
        title: "Periksa Sambungan WhatsApp Gateway",
        desc: "Pastikan indikator status di pojok kanan atas bertuliskan 'ONLINE' berwarna hijau sebagai tanda server WAHA siap melakukan pengiriman.",
        targetId: "sim-wa-status-badge",
        pointerText: "Status koneksi server WhatsApp (ONLINE)",
        pointerPlacement: "bottom",
      },
      {
        stepNumber: 2,
        badgeLabel: "Langkah 2: Pilih Santri",
        title: "Pilih Santri yang Hendak Dikirimi Laporan",
        desc: "Gunakan kotak centang di sisi kiri tabel untuk memilih satu atau beberapa santri peserta ujian yang laporannya siap dikirimkan.",
        targetId: "sim-wa-checkbox-select",
        pointerText: "Beri centang pada santri di sini",
        pointerPlacement: "right",
      },
      {
        stepNumber: 3,
        badgeLabel: "Langkah 3: Pratinjau Rapor",
        title: "Lihat Kartu Rapor Digital Bergambar",
        desc: "Klik ikon mata untuk melihat kartu rapor digital otomatis yang memuat kop LPTQ, nilai per juz, status kelulusan, dan teks pesan resmi.",
        targetId: "sim-wa-preview-btn",
        pointerText: "Klik ikon mata untuk pratinjau rapor",
        pointerPlacement: "left",
      },
      {
        stepNumber: 4,
        badgeLabel: "Langkah 4: Kirim Antrean Massal",
        title: "Mulai Siaran Pesan dengan Jeda Aman",
        desc: "Klik tombol hijau 'Mulai Kirim Antrean'. Sistem mengirim pesan satu per satu dengan jeda aman 3-5 detik agar nomor terhindar dari pemblokiran.",
        targetId: "sim-wa-start-broadcast-btn",
        pointerText: "Klik 'Mulai Kirim Antrean' di sini",
        pointerPlacement: "bottom",
      },
    ],
  },
  juz_baru: {
    id: "juz_baru",
    name: "Setoran Ziyadah Juz Baru (Pembimbing)",
    category: "Tahfidz Umum",
    icon: BookMarked,
    accentColor: "from-teal-600 to-emerald-800",
    steps: [
      {
        stepNumber: 1,
        badgeLabel: "Langkah 1: Filter Tahun",
        title: "Pilih Tahun Penanggalan Setoran",
        desc: "Gunakan dropdown tahun di pojok atas untuk melihat atau mengisi rekap hafalan santri pada tahun masehi berjalan.",
        targetId: "sim-juz-year-select",
        pointerText: "Pilih tahun aktif di sini",
        pointerPlacement: "bottom",
      },
      {
        stepNumber: 2,
        badgeLabel: "Langkah 2: Tambah Setoran",
        title: "Buka Formulir Tambah Setoran",
        desc: "Klik tombol '+ Tambah Setoran' untuk membuka jendela pencatatan juz baru santri.",
        targetId: "sim-juz-add-btn",
        pointerText: "Klik tombol '+ Tambah Setoran'",
        pointerPlacement: "bottom",
      },
      {
        stepNumber: 3,
        badgeLabel: "Langkah 3: Input Nilai Juz",
        title: "Catat Pertambahan Hafalan Baru",
        desc: "Masukkan tanggal setoran dan jumlah penambahan juz (misal: 1 juz). Sistem mengakumulasikan perolehan ke bulan yang tepat.",
        targetId: "sim-juz-cell-october",
        pointerText: "Setoran bulan Oktober terisi 1.0 Juz",
        pointerPlacement: "top",
      },
      {
        stepNumber: 4,
        badgeLabel: "Langkah 4: Akumulasi Total",
        title: "Total Perolehan Hafalan Otomatis",
        desc: "Kolom Total Setoran Tahun Ini otomatis bertambah tanpa perlu rumus manual, memudahkan pembimbing memantau kelajuan santri.",
        targetId: "sim-juz-total-col",
        pointerText: "Total setoran otomatis terakumulasi",
        pointerPlacement: "left",
      },
    ],
  },
};

// =========================================================================
// KOMPONEN PENUNJUK PANAH BERGERAK (ANIMATED POINTER TOOLTIP)
// =========================================================================

function AnimatedPointer({
  text,
  placement = "bottom",
}: {
  text: string;
  placement?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <div
      className={`absolute z-40 pointer-events-none flex items-center gap-1.5 transition-all duration-300 ${
        placement === "bottom"
          ? "top-full left-1/2 -translate-x-1/2 pt-2 flex-col"
          : placement === "top"
          ? "bottom-full left-1/2 -translate-x-1/2 pb-2 flex-col-reverse"
          : placement === "left"
          ? "right-full top-1/2 -translate-y-1/2 pr-2 flex-row-reverse"
          : "left-full top-1/2 -translate-y-1/2 pl-2 flex-row"
      }`}
    >
      <div
        className={`w-0 h-0 border-solid ${
          placement === "bottom"
            ? "border-b-[8px] border-b-amber-400 border-x-[6px] border-x-transparent border-t-0"
            : placement === "top"
            ? "border-t-[8px] border-t-amber-400 border-x-[6px] border-x-transparent border-b-0"
            : placement === "left"
            ? "border-l-[8px] border-l-amber-400 border-y-[6px] border-y-transparent border-r-0"
            : "border-r-[8px] border-r-amber-400 border-y-[6px] border-y-transparent border-l-0"
        }`}
      />

      <div className="bg-amber-400 text-slate-950 font-black text-[11px] px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-1.5 border border-amber-300 whitespace-nowrap animate-bounce">
        <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping shrink-0" />
        <span>{text}</span>
      </div>
    </div>
  );
}

// =========================================================================
// KOMPONEN UTAMA HALAMAN SIMULASI INTERAKTIF
// =========================================================================

function SimulationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tourParam = searchParams.get("tour") || "flyer";
  const currentSimKey = SIMULATIONS[tourParam] ? tourParam : "flyer";
  const sim = SIMULATIONS[currentSimKey];

  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Reset step ketika berganti simulasi
  useEffect(() => {
    setCurrentStepIndex(0);
  }, [currentSimKey]);

  const currentStep = sim.steps[currentStepIndex] || sim.steps[0];
  const totalSteps = sim.steps.length;
  const progressPercent = Math.round(((currentStepIndex + 1) / totalSteps) * 100);

  // STATE SIMULASI SPESIFIK
  // 1. Flyer State
  const [flyerSantriSelected, setFlyerSantriSelected] = useState(false);
  const [flyerPhotoLoaded, setFlyerPhotoLoaded] = useState(false);
  const [flyerZoom, setFlyerZoom] = useState(100);
  const [flyerToast, setFlyerToast] = useState<string | null>(null);

  // 2. Kegiatan State
  const [kegiatanSesi, setKegiatanSesi] = useState<"pagi" | "malam">("pagi");
  const [kegiatanAllHadir, setKegiatanAllHadir] = useState(false);
  const [kegiatanSantri3Status, setKegiatanSantri3Status] = useState<"H" | "I" | "A" | "S">("H");

  // 3. Khotmil State
  const [khotmilTahap, setKhotmilTahap] = useState<number>(1);
  const [khotmilModalLjk, setKhotmilModalLjk] = useState(false);
  const [khotmilScanningOmr, setKhotmilScanningOmr] = useState(false);
  const [khotmilScoreSaved, setKhotmilScoreSaved] = useState(false);

  // 4. Kirim WA State
  const [waSelectedCount, setWaSelectedCount] = useState(0);
  const [waPreviewModal, setWaPreviewModal] = useState(false);
  const [waSendingProgress, setWaSendingProgress] = useState(0);

  // 5. Setoran Juz Baru State
  const [juzOctValue, setJuzOctValue] = useState<number>(0);
  const [juzTotalValue, setJuzTotalValue] = useState<number>(4.5);

  // Efek simulasi otomatis setiap langkah berubah
  useEffect(() => {
    // Jalankan animasi perubahan sesuai langkah aktif
    if (sim.id === "flyer") {
      if (currentStepIndex >= 0) setFlyerSantriSelected(true);
      if (currentStepIndex >= 1) setFlyerPhotoLoaded(true);
      if (currentStepIndex >= 3) {
        setFlyerToast("Simulasi: Flyer 1080x1350 berhasil diunduh ke komputer!");
        setTimeout(() => setFlyerToast(null), 3000);
      }
    } else if (sim.id === "kegiatan") {
      if (currentStepIndex === 0) setKegiatanSesi("pagi");
      if (currentStepIndex >= 1) setKegiatanSesi("malam");
      if (currentStepIndex >= 2) setKegiatanAllHadir(true);
      if (currentStepIndex >= 3) setKegiatanSantri3Status("I");
    } else if (sim.id === "khotmil") {
      if (currentStepIndex === 0) {
        setKhotmilModalLjk(false);
        setKhotmilScanningOmr(false);
      }
      if (currentStepIndex === 1) setKhotmilModalLjk(true);
      if (currentStepIndex === 2) {
        setKhotmilModalLjk(false);
        setKhotmilScanningOmr(true);
      }
      if (currentStepIndex >= 3) {
        setKhotmilScanningOmr(false);
        setKhotmilScoreSaved(true);
      }
    } else if (sim.id === "wa") {
      if (currentStepIndex === 0) setWaSelectedCount(0);
      if (currentStepIndex >= 1) setWaSelectedCount(3);
      if (currentStepIndex === 2) setWaPreviewModal(true);
      if (currentStepIndex >= 3) {
        setWaPreviewModal(false);
        setWaSendingProgress(100);
      }
    } else if (sim.id === "juz_baru") {
      if (currentStepIndex >= 2) {
        setJuzOctValue(1.0);
        setJuzTotalValue(5.5);
      }
    }
  }, [sim.id, currentStepIndex]);

  const handleNextStep = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // Selesai simulasi, kembali ke buku panduan
      router.push("/pengaturan?tab=panduan");
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleResetSimulation = () => {
    setCurrentStepIndex(0);
    setFlyerSantriSelected(false);
    setFlyerPhotoLoaded(false);
    setKegiatanAllHadir(false);
    setKegiatanSantri3Status("H");
    setKhotmilScoreSaved(false);
    setKhotmilModalLjk(false);
    setKhotmilScanningOmr(false);
    setWaSelectedCount(0);
    setWaPreviewModal(false);
    setWaSendingProgress(0);
    setJuzOctValue(0);
    setJuzTotalValue(4.5);
  };

  const IconSim = sim.icon;

  return (
    <div className="min-h-screen bg-[#f8f9fc] dark:bg-slate-950 pb-36">
      {/* =================================================================== */}
      {/* BILAH ATAS: BANNER MODE SIMULASI (AMAN & TIDAK MENGUBAH DATA NYATA) */}
      {/* =================================================================== */}
      <div className="bg-gradient-to-r from-emerald-700 via-brand-dark to-brand text-white px-4 py-3 shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/pengaturan?tab=panduan"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition border border-white/15"
              title="Kembali ke Buku Panduan Utama"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Keluar Simulasi</span>
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-ping" />
                <span className="text-[10px] uppercase tracking-widest font-black bg-emerald-400 text-slate-950 px-2 py-0.5 rounded-full">
                  Mode Simulasi Interaktif
                </span>
                <span className="text-[11px] text-emerald-100 hidden sm:inline">
                  (Data Dummy Aman - Data Riil Pondok Tidak Berubah)
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-extrabold text-white leading-tight">
                Simulasi: {sim.name}
              </h1>
            </div>
          </div>

          {/* Pemilih Fitur Simulasi Lain */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-100 hidden md:inline">Ganti Fitur:</span>
            <select
              value={currentSimKey}
              onChange={(e) => router.push(`/panduan/simulasi?tour=${e.target.value}`)}
              className="bg-white/15 text-white border border-white/25 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-white/40"
            >
              <option value="flyer" className="text-slate-900">
                Flyer Khataman 30 Juz
              </option>
              <option value="kegiatan" className="text-slate-900">
                Absensi Kegiatan Halaqoh
              </option>
              <option value="khotmil" className="text-slate-900">
                Ujian Khotmil & Kamera OMR
              </option>
              <option value="wa" className="text-slate-900">
                Kirim Laporan WhatsApp (WAHA)
              </option>
              <option value="juz_baru" className="text-slate-900">
                Setoran Juz Baru Ziyadah
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* AREA UTAMA SIMULASI KERJA (ANTARMUKA LENGKAP FITUR)                 */}
      {/* =================================================================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* TOAST PEMBERITAHUAN SIMULASI */}
        {flyerToast && (
          <div className="fixed top-16 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-4 duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            <span className="text-xs font-bold">{flyerToast}</span>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* SIMULASI 1: FLYER KHATAMAN 30 JUZ                                 */}
        {/* ----------------------------------------------------------------- */}
        {sim.id === "flyer" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Panel Kiri Kontrol Flyer */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    Formulir Pembuat Flyer
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-brand-dark">
                    Simulasi Aktif
                  </span>
                </div>

                {/* Step 1: Pilih Santri */}
                <div
                  id="sim-flyer-select-santri"
                  className={`relative p-3.5 rounded-xl border transition-all ${
                    currentStep.targetId === "sim-flyer-select-santri"
                      ? "ring-4 ring-amber-400 border-amber-400 bg-amber-50/50 dark:bg-amber-950/20"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900"
                  }`}
                >
                  {currentStep.targetId === "sim-flyer-select-santri" && (
                    <AnimatedPointer
                      text={currentStep.pointerText}
                      placement={currentStep.pointerPlacement}
                    />
                  )}
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Pilih Santri Khatam 30 Juz
                  </label>
                  <div className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white flex items-center justify-between">
                    <span>
                      {flyerSantriSelected
                        ? "DIYAH AYU NINGRUM (Blok A - Kamar A.05)"
                        : "Pilih santri dari daftar..."}
                    </span>
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        flyerSantriSelected ? "text-emerald-500" : "text-slate-300"
                      }`}
                    />
                  </div>
                </div>

                {/* Step 2: Unggah Foto */}
                <div
                  id="sim-flyer-upload-photo"
                  className={`relative p-3.5 rounded-xl border transition-all ${
                    currentStep.targetId === "sim-flyer-upload-photo"
                      ? "ring-4 ring-amber-400 border-amber-400 bg-amber-50/50 dark:bg-amber-950/20"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900"
                  }`}
                >
                  {currentStep.targetId === "sim-flyer-upload-photo" && (
                    <AnimatedPointer
                      text={currentStep.pointerText}
                      placement={currentStep.pointerPlacement}
                    />
                  )}
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Foto Santri di Dalam Kubah
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFlyerPhotoLoaded(true)}
                      className="px-4 py-2 bg-brand text-white rounded-xl text-xs font-bold hover:bg-brand-dark transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{flyerPhotoLoaded ? "Ganti Foto Santri" : "Unggah Foto Santri"}</span>
                    </button>
                    {flyerPhotoLoaded && (
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        Foto terpasang
                      </span>
                    )}
                  </div>
                  {flyerPhotoLoaded && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                      <span>Zoom:</span>
                      <input
                        type="range"
                        min="80"
                        max="140"
                        value={flyerZoom}
                        onChange={(e) => setFlyerZoom(Number(e.target.value))}
                        className="flex-1 accent-brand"
                      />
                      <span>{flyerZoom}%</span>
                    </div>
                  )}
                </div>

                {/* Step 3: Biodata & Tanggal */}
                <div
                  id="sim-flyer-date-display"
                  className={`relative p-3.5 rounded-xl border transition-all ${
                    currentStep.targetId === "sim-flyer-date-display"
                      ? "ring-4 ring-amber-400 border-amber-400 bg-amber-50/50 dark:bg-amber-950/20"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900"
                  }`}
                >
                  {currentStep.targetId === "sim-flyer-date-display" && (
                    <AnimatedPointer
                      text={currentStep.pointerText}
                      placement={currentStep.pointerPlacement}
                    />
                  )}
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Kalkulasi Penanggalan Otomatis:
                  </span>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
                    Jum&apos;at, 15 Syawwal 1447 H / 23 Oktober 2026 M
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Afiliasi: Binti Syuhadi | Muncar, Banyuwangi
                  </div>
                </div>

                {/* Step 4: Tombol Aksi Ekspor */}
                <div
                  id="sim-flyer-download-btn"
                  className={`relative p-3.5 rounded-xl border transition-all ${
                    currentStep.targetId === "sim-flyer-download-btn"
                      ? "ring-4 ring-amber-400 border-amber-400 bg-amber-50/50 dark:bg-amber-950/20"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900"
                  }`}
                >
                  {currentStep.targetId === "sim-flyer-download-btn" && (
                    <AnimatedPointer
                      text={currentStep.pointerText}
                      placement={currentStep.pointerPlacement}
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFlyerToast("Simulasi: Berkas flyer 1080x1350 berhasil diunduh!");
                        setTimeout(() => setFlyerToast(null), 3000);
                      }}
                      className="flex-1 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md transition"
                    >
                      <Download className="w-4 h-4" />
                      <span>Unduh PNG (1080x1350)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFlyerToast("Simulasi: Gambar flyer disalin ke papan klip!");
                        setTimeout(() => setFlyerToast(null), 3000);
                      }}
                      className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition"
                    >
                      Salin
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel Kanan Kanvas Pratinjau Flyer */}
            <div className="lg:col-span-7 flex flex-col items-center">
              <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                {/* Kanvas Flyer Simulasi */}
                <div className="aspect-[4/5] rounded-2xl bg-gradient-to-b from-[#0f4d38] via-[#0b3829] to-[#06241a] text-white p-6 flex flex-col justify-between relative overflow-hidden border-4 border-amber-300/40 shadow-inner">
                  {/* Ornamen Atas */}
                  <div className="text-center">
                    <span className="text-[10px] tracking-widest font-bold uppercase text-amber-300">
                      LPTQ DARUSSALAM BLOKAGUNG
                    </span>
                    <h2 className="text-lg font-black tracking-wide text-white mt-0.5">
                      KHATAM AL-QUR&apos;AN 30 JUZ
                    </h2>
                  </div>

                  {/* Ornamen Kubah & Foto Santri */}
                  <div className="relative my-2 mx-auto w-44 h-56 rounded-t-full border-4 border-amber-300/80 overflow-hidden flex items-center justify-center bg-emerald-950/60 shadow-lg">
                    {flyerPhotoLoaded ? (
                      <div
                        className="w-full h-full bg-cover bg-center transition-transform duration-300"
                        style={{
                          backgroundImage:
                            "url('https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80')",
                          transform: `scale(${flyerZoom / 100})`,
                        }}
                      />
                    ) : (
                      <div className="text-center p-3 text-slate-300">
                        <Camera className="w-8 h-8 mx-auto text-amber-300 mb-1 opacity-70" />
                        <span className="text-[10px] font-bold block">Foto Santri</span>
                      </div>
                    )}
                  </div>

                  {/* Identitas Santri & Tanggal */}
                  <div className="text-center space-y-1">
                    <h3 className="text-base font-black tracking-tight text-amber-200 leading-tight uppercase">
                      {flyerSantriSelected ? "DIYAH AYU NINGRUM" : "NAMA LENGKAP SANTRI"}
                    </h3>
                    <p className="text-[11px] text-emerald-100 font-semibold">
                      Binti Syuhadi | Asrama Khadijah (A.05)
                    </p>
                    <div className="pt-2 border-t border-white/20 text-[10px] text-amber-300 font-bold">
                      Jum&apos;at, 15 Syawwal 1447 H / 23 Oktober 2026 M
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* SIMULASI 2: ABSENSI & KEGIATAN HALAQOH                            */}
        {/* ----------------------------------------------------------------- */}
        {sim.id === "kegiatan" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
            {/* Kontrol Atas Absensi */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              {/* Step 1: Sakelar Sesi Pagi / Malam */}
              <div
                id="sim-kegiatan-sesi-toggle"
                className={`relative inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 transition-all ${
                  currentStep.targetId === "sim-kegiatan-sesi-toggle"
                    ? "ring-4 ring-amber-400 ring-offset-2"
                    : ""
                }`}
              >
                {currentStep.targetId === "sim-kegiatan-sesi-toggle" && (
                  <AnimatedPointer
                    text={currentStep.pointerText}
                    placement={currentStep.pointerPlacement}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setKegiatanSesi("pagi")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    kegiatanSesi === "pagi"
                      ? "bg-brand text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  Sesi Pagi (Shubuh)
                </button>
                <button
                  type="button"
                  onClick={() => setKegiatanSesi("malam")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    kegiatanSesi === "malam"
                      ? "bg-brand text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  Sesi Malam (Maghrib)
                </button>
              </div>

              {/* Step 3: Tombol Set Semua Hadir */}
              <div
                id="sim-kegiatan-set-all-btn"
                className={`relative transition-all ${
                  currentStep.targetId === "sim-kegiatan-set-all-btn"
                    ? "ring-4 ring-amber-400 ring-offset-2 rounded-xl"
                    : ""
                }`}
              >
                {currentStep.targetId === "sim-kegiatan-set-all-btn" && (
                  <AnimatedPointer
                    text={currentStep.pointerText}
                    placement={currentStep.pointerPlacement}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setKegiatanAllHadir(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>Set Semua Hadir</span>
                </button>
              </div>
            </div>

            {/* Matriks Tabel Absensi Simulasi */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                    <th className="py-2.5 px-3 rounded-l-xl">Nama Santri</th>
                    <th className="py-2.5 px-2 text-center">Tgl 21</th>
                    <th className="py-2.5 px-2 text-center">Tgl 22</th>
                    {/* Step 2: Kolom Hari Ini (23 Okt) */}
                    <th
                      id="sim-kegiatan-today-col"
                      className={`relative py-2.5 px-3 text-center transition-all ${
                        currentStep.targetId === "sim-kegiatan-today-col"
                          ? "ring-4 ring-amber-400 bg-amber-100 text-slate-950 font-black rounded-lg"
                          : "bg-emerald-100 dark:bg-emerald-950/60 text-brand-dark dark:text-emerald-300 font-extrabold"
                      }`}
                    >
                      {currentStep.targetId === "sim-kegiatan-today-col" && (
                        <AnimatedPointer
                          text={currentStep.pointerText}
                          placement={currentStep.pointerPlacement}
                        />
                      )}
                      Hari Ini (23 Okt)
                    </th>
                    <th className="py-2.5 px-2 text-center text-slate-400">Tgl 24 (Jum&apos;at)</th>
                    <th className="py-2.5 px-3 text-center rounded-r-xl">Total Hadir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                      1. M. Ridho Firdaus (A.01)
                    </td>
                    <td className="text-center font-bold text-emerald-600">H</td>
                    <td className="text-center font-bold text-emerald-600">H</td>
                    <td className="text-center font-black text-emerald-600">
                      {kegiatanAllHadir ? "H" : "-"}
                    </td>
                    <td className="text-center text-slate-400 bg-slate-50/50">Libur</td>
                    <td className="text-center font-bold">{kegiatanAllHadir ? 3 : 2}</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                      2. Siti Nur Aisyah (B.03)
                    </td>
                    <td className="text-center font-bold text-emerald-600">H</td>
                    <td className="text-center font-bold text-emerald-600">H</td>
                    <td className="text-center font-black text-emerald-600">
                      {kegiatanAllHadir ? "H" : "-"}
                    </td>
                    <td className="text-center text-slate-400 bg-slate-50/50">Libur</td>
                    <td className="text-center font-bold">{kegiatanAllHadir ? 3 : 2}</td>
                  </tr>

                  {/* Step 4: Sel Santri 3 yang Diubah Menjadi Izin */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                      3. Ahmad Zaki Mubarak (A.02)
                    </td>
                    <td className="text-center font-bold text-emerald-600">H</td>
                    <td className="text-center font-bold text-amber-600">I</td>
                    <td
                      id="sim-kegiatan-single-cell"
                      className={`relative text-center font-black cursor-pointer transition-all ${
                        currentStep.targetId === "sim-kegiatan-single-cell"
                          ? "ring-4 ring-amber-400 bg-amber-100 rounded-lg text-slate-950"
                          : kegiatanSantri3Status === "I"
                          ? "text-amber-600 bg-amber-50 dark:bg-amber-950/40"
                          : "text-emerald-600"
                      }`}
                      onClick={() => setKegiatanSantri3Status("I")}
                    >
                      {currentStep.targetId === "sim-kegiatan-single-cell" && (
                        <AnimatedPointer
                          text={currentStep.pointerText}
                          placement={currentStep.pointerPlacement}
                        />
                      )}
                      {kegiatanSantri3Status}
                    </td>
                    <td className="text-center text-slate-400 bg-slate-50/50">Libur</td>
                    <td className="text-center font-bold">
                      {kegiatanSantri3Status === "I" ? 1 : 2}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* SIMULASI 3: KHOTMIL & OMR SCANNER                                 */}
        {/* ----------------------------------------------------------------- */}
        {sim.id === "khotmil" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
            {/* Tab Tahapan Khotmil */}
            <div
              id="sim-khotmil-tab-select"
              className={`relative flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-100 dark:border-slate-800 ${
                currentStep.targetId === "sim-khotmil-tab-select"
                  ? "ring-4 ring-amber-400 rounded-xl"
                  : ""
              }`}
            >
              {currentStep.targetId === "sim-khotmil-tab-select" && (
                <AnimatedPointer
                  text={currentStep.pointerText}
                  placement={currentStep.pointerPlacement}
                />
              )}
              {[1, 2, 3, 4, 5].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setKhotmilTahap(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    khotmilTahap === t
                      ? "bg-brand text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  Tahap {t} (Juz {t * 3 - 2}-{t * 3})
                </button>
              ))}
            </div>

            {/* Tombol Aksi Cetak LJK & Scan Kamera OMR */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div
                id="sim-khotmil-print-ljk-btn"
                className={`relative ${
                  currentStep.targetId === "sim-khotmil-print-ljk-btn"
                    ? "ring-4 ring-amber-400 rounded-xl"
                    : ""
                }`}
              >
                {currentStep.targetId === "sim-khotmil-print-ljk-btn" && (
                  <AnimatedPointer
                    text={currentStep.pointerText}
                    placement={currentStep.pointerPlacement}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setKhotmilModalLjk(true)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak LJK Khotmil</span>
                </button>
              </div>

              <div
                id="sim-khotmil-omr-scan-btn"
                className={`relative ${
                  currentStep.targetId === "sim-khotmil-omr-scan-btn"
                    ? "ring-4 ring-amber-400 rounded-xl"
                    : ""
                }`}
              >
                {currentStep.targetId === "sim-khotmil-omr-scan-btn" && (
                  <AnimatedPointer
                    text={currentStep.pointerText}
                    placement={currentStep.pointerPlacement}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setKhotmilScanningOmr(true)}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md transition"
                >
                  <Camera className="w-4 h-4 text-purple-200" />
                  <span>Scan Kamera LJK (OMR)</span>
                </button>
              </div>
            </div>

            {/* Jendela Modal LJK (Simulasi Cetak) */}
            {khotmilModalLjk && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-brand" />
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                      Pratinjau Lembar Jawab Komputer (LJK)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setKhotmilModalLjk(false)}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600"
                  >
                    Tutup
                  </button>
                </div>
                <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      LJK KHOTMIL TAHAP 1: M. RIDHO FIRDAUS
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Berisi kolom bulatan pensil 2B (Hal Kosong & Kesalahan)
                    </p>
                  </div>
                  <div className="w-12 h-12 border-2 border-slate-900 rounded p-1 flex items-center justify-center font-black text-[9px] text-center">
                    QR CODE
                  </div>
                </div>
              </div>
            )}

            {/* Jendela Simulasi Scanner Kamera OMR */}
            {khotmilScanningOmr && (
              <div className="p-5 bg-slate-950 text-white rounded-2xl space-y-3 shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Memindai Lembar LJK via Kamera Webcam...
                  </span>
                  <button
                    type="button"
                    onClick={() => setKhotmilScanningOmr(false)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Batal
                  </button>
                </div>

                <div className="h-44 rounded-xl bg-slate-900 border-2 border-dashed border-emerald-500/60 relative flex flex-col items-center justify-center text-center p-4 overflow-hidden">
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent absolute top-1/2 -translate-y-1/2 animate-pulse" />
                  <QrCode className="w-12 h-12 text-emerald-400 mb-2" />
                  <span className="text-xs font-bold text-emerald-200">
                    QR Terdeteksi: M. Ridho Firdaus (Tahap 1)
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1">
                    Bulatan terbaca: Hal Kosong: 0 | Kesalahan: 3
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-bold text-emerald-300">
                    Nilai Akhir Terhitung: <strong>97</strong> (LULUS KKM)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setKhotmilScanningOmr(false);
                      setKhotmilScoreSaved(true);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition shadow-md"
                  >
                    Simpan Nilai ke Sistem
                  </button>
                </div>
              </div>
            )}

            {/* Tabel Nilai Khotmil Simulasi */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                    <th className="py-2.5 px-3 rounded-l-xl">Nama Peserta</th>
                    <th className="py-2.5 px-2 text-center">Juz 1</th>
                    <th className="py-2.5 px-2 text-center">Juz 2</th>
                    <th className="py-2.5 px-2 text-center">Juz 3</th>
                    <th className="py-2.5 px-3 text-center">Rata-Rata</th>
                    <th className="py-2.5 px-3 text-center rounded-r-xl">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                      M. Ridho Firdaus
                    </td>
                    <td className="text-center font-bold">96</td>
                    <td className="text-center font-bold">98</td>
                    <td className="text-center font-bold">{khotmilScoreSaved ? 97 : "-"}</td>
                    <td className="text-center font-black text-brand">
                      {khotmilScoreSaved ? 97 : 97}
                    </td>
                    <td
                      id="sim-khotmil-score-badge"
                      className={`relative text-center ${
                        currentStep.targetId === "sim-khotmil-score-badge"
                          ? "ring-4 ring-amber-400 rounded-lg"
                          : ""
                      }`}
                    >
                      {currentStep.targetId === "sim-khotmil-score-badge" && (
                        <AnimatedPointer
                          text={currentStep.pointerText}
                          placement={currentStep.pointerPlacement}
                        />
                      )}
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                          khotmilScoreSaved
                            ? "bg-emerald-100 text-brand-dark dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {khotmilScoreSaved ? "Tuntas" : "Proses"}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* SIMULASI 4: BROADCAST WHATSAPP (WAHA)                             */}
        {/* ----------------------------------------------------------------- */}
        {sim.id === "wa" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
            {/* Kontrol Header WAHA */}
            <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Broadcast Laporan Hasil Ujian ke Wali Santri
                </h3>
              </div>

              {/* Step 1: Lencana Status WAHA */}
              <div
                id="sim-wa-status-badge"
                className={`relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-brand-dark dark:text-emerald-300 text-xs font-black ${
                  currentStep.targetId === "sim-wa-status-badge"
                    ? "ring-4 ring-amber-400"
                    : ""
                }`}
              >
                {currentStep.targetId === "sim-wa-status-badge" && (
                  <AnimatedPointer
                    text={currentStep.pointerText}
                    placement={currentStep.pointerPlacement}
                  />
                )}
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>SERVER WAHA: ONLINE</span>
              </div>
            </div>

            {/* Tindakan Massal */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Santri Terpilih: <strong>{waSelectedCount}</strong> santri
              </span>

              {/* Step 4: Tombol Mulai Kirim */}
              <div
                id="sim-wa-start-broadcast-btn"
                className={`relative ${
                  currentStep.targetId === "sim-wa-start-broadcast-btn"
                    ? "ring-4 ring-amber-400 rounded-xl"
                    : ""
                }`}
              >
                {currentStep.targetId === "sim-wa-start-broadcast-btn" && (
                  <AnimatedPointer
                    text={currentStep.pointerText}
                    placement={currentStep.pointerPlacement}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setWaSendingProgress(100)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Mulai Kirim Antrean</span>
                </button>
              </div>
            </div>

            {/* Bilah Progres Pengiriman */}
            {waSendingProgress > 0 && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-200">
                  <span>Mengirim pesan bergambar...</span>
                  <span>100% (3 dari 3 terkirim)</span>
                </div>
                <div className="w-full bg-emerald-200 dark:bg-emerald-900 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full w-full transition-all duration-500" />
                </div>
              </div>
            )}

            {/* Tabel Santri Kirim WA */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                    <th
                      id="sim-wa-checkbox-select"
                      className={`py-2.5 px-3 rounded-l-xl w-10 relative ${
                        currentStep.targetId === "sim-wa-checkbox-select"
                          ? "ring-4 ring-amber-400 bg-amber-100"
                          : ""
                      }`}
                    >
                      {currentStep.targetId === "sim-wa-checkbox-select" && (
                        <AnimatedPointer
                          text={currentStep.pointerText}
                          placement={currentStep.pointerPlacement}
                        />
                      )}
                      <input
                        type="checkbox"
                        checked={waSelectedCount > 0}
                        onChange={(e) => setWaSelectedCount(e.target.checked ? 3 : 0)}
                        className="rounded text-brand accent-brand"
                      />
                    </th>
                    <th className="py-2.5 px-3">Nama Santri</th>
                    <th className="py-2.5 px-3">Nomor WhatsApp</th>
                    <th className="py-2.5 px-3 text-center">Status Kirim</th>
                    <th className="py-2.5 px-3 text-center rounded-r-xl">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-3">
                      <input
                        type="checkbox"
                        checked={waSelectedCount > 0}
                        readOnly
                        className="rounded text-brand accent-brand"
                      />
                    </td>
                    <td className="font-bold text-slate-900 dark:text-white">
                      M. Ridho Firdaus (Kamar A.01)
                    </td>
                    <td className="text-slate-600 font-mono">0812-3456-7890</td>
                    <td className="text-center">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          waSendingProgress === 100
                            ? "bg-emerald-100 text-brand-dark"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {waSendingProgress === 100 ? "Terkirim" : "Belum"}
                      </span>
                    </td>
                    <td
                      id="sim-wa-preview-btn"
                      className={`relative text-center ${
                        currentStep.targetId === "sim-wa-preview-btn"
                          ? "ring-4 ring-amber-400 rounded-lg"
                          : ""
                      }`}
                    >
                      {currentStep.targetId === "sim-wa-preview-btn" && (
                        <AnimatedPointer
                          text={currentStep.pointerText}
                          placement={currentStep.pointerPlacement}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setWaPreviewModal(true)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300"
                      >
                        <Eye className="w-3.5 h-3.5 inline mr-1" />
                        Pratinjau
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Modal Pratinjau Rapor Digital */}
            {waPreviewModal && (
              <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-brand-dark dark:text-emerald-300">
                    Pratinjau Kartu Rapor Digital Otomatis:
                  </span>
                  <button
                    type="button"
                    onClick={() => setWaPreviewModal(false)}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600"
                  >
                    Tutup
                  </button>
                </div>
                <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                  <div className="font-bold text-slate-900 dark:text-white pb-2 border-b">
                    LAPORAN CAPAIAN KHOTMIL 15 JUZ - LPTQ BLOKAGUNG
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    Nama: <strong>M. Ridho Firdaus</strong> | Kamar: A.01
                  </div>
                  <div className="text-emerald-700 dark:text-emerald-400 font-bold">
                    Hasil Ujian Tahap 1: Nilai 97 (Dinyatakan TUNTAS KKM 85)
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* SIMULASI 5: SETORAN JUZ BARU                                      */}
        {/* ----------------------------------------------------------------- */}
        {sim.id === "juz_baru" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div
                id="sim-juz-year-select"
                className={`relative ${
                  currentStep.targetId === "sim-juz-year-select"
                    ? "ring-4 ring-amber-400 rounded-xl"
                    : ""
                }`}
              >
                {currentStep.targetId === "sim-juz-year-select" && (
                  <AnimatedPointer
                    text={currentStep.pointerText}
                    placement={currentStep.pointerPlacement}
                  />
                )}
                <span className="text-xs font-bold text-slate-500 mr-2">Tahun Rekap:</span>
                <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-black">
                  2026 Masehi
                </span>
              </div>

              <div
                id="sim-juz-add-btn"
                className={`relative ${
                  currentStep.targetId === "sim-juz-add-btn"
                    ? "ring-4 ring-amber-400 rounded-xl"
                    : ""
                }`}
              >
                {currentStep.targetId === "sim-juz-add-btn" && (
                  <AnimatedPointer
                    text={currentStep.pointerText}
                    placement={currentStep.pointerPlacement}
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setJuzOctValue(1.0);
                    setJuzTotalValue(5.5);
                  }}
                  className="px-4 py-2 bg-brand text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm"
                >
                  <BookMarked className="w-3.5 h-3.5" />
                  <span>+ Tambah Setoran</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                    <th className="py-2.5 px-3 rounded-l-xl">Nama Santri</th>
                    <th className="py-2.5 px-2 text-center">Jul</th>
                    <th className="py-2.5 px-2 text-center">Agu</th>
                    <th className="py-2.5 px-2 text-center">Sep</th>
                    <th
                      id="sim-juz-cell-october"
                      className={`relative py-2.5 px-2 text-center ${
                        currentStep.targetId === "sim-juz-cell-october"
                          ? "ring-4 ring-amber-400 bg-amber-100 font-black text-slate-950 rounded-lg"
                          : "font-bold text-brand"
                      }`}
                    >
                      {currentStep.targetId === "sim-juz-cell-october" && (
                        <AnimatedPointer
                          text={currentStep.pointerText}
                          placement={currentStep.pointerPlacement}
                        />
                      )}
                      Okt
                    </th>
                    <th
                      id="sim-juz-total-col"
                      className={`relative py-2.5 px-3 text-center rounded-r-xl ${
                        currentStep.targetId === "sim-juz-total-col"
                          ? "ring-4 ring-amber-400 bg-amber-100 font-black text-slate-950 rounded-lg"
                          : "font-extrabold"
                      }`}
                    >
                      {currentStep.targetId === "sim-juz-total-col" && (
                        <AnimatedPointer
                          text={currentStep.pointerText}
                          placement={currentStep.pointerPlacement}
                        />
                      )}
                      Total Juz
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                      M. Ridho Firdaus (Halaqoh 2A)
                    </td>
                    <td className="text-center font-semibold">1.5</td>
                    <td className="text-center font-semibold">1.0</td>
                    <td className="text-center font-semibold">2.0</td>
                    <td className="text-center font-black text-brand bg-emerald-50/40">
                      {juzOctValue}
                    </td>
                    <td className="text-center font-black text-emerald-700 dark:text-emerald-400">
                      {juzTotalValue} Juz
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* =================================================================== */}
      {/* PANEL PANDUAN MENGAMBANG (NAVIGASI LANGKAH & KONTROL SIMULASI)       */}
      {/* =================================================================== */}
      <aside
        aria-label="Panel Navigasi Langkah Simulasi"
        className="fixed bottom-6 right-6 z-50 w-[92vw] max-w-md sm:max-w-lg bg-white dark:bg-slate-900 border-2 border-brand/60 rounded-3xl shadow-2xl overflow-hidden ring-4 ring-brand/10"
      >
        {/* Header Panel */}
        <div className="bg-gradient-to-r from-brand to-brand-darker text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white shrink-0">
              <IconSim className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">
                {currentStep.badgeLabel}
              </span>
              <h4 className="text-xs font-extrabold truncate text-white leading-tight mt-0.5">
                {sim.name}
              </h4>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetSimulation}
            className="text-[11px] font-bold text-emerald-200 hover:text-white flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg"
            title="Reset simulasi ke langkah awal"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 overflow-hidden">
          <div
            className="bg-amber-400 h-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Konten Langkah */}
        <div className="p-5">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
              {currentStep.title}
            </h3>
            <span className="text-xs font-black text-slate-500">
              {currentStepIndex + 1} / {totalSteps}
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
            {currentStep.desc}
          </p>

          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-2.5 mb-4 text-[11px] text-amber-900 dark:text-amber-200 font-medium">
            <span className="text-base leading-none">👉</span>
            <span>
              <strong>Petunjuk Panah:</strong> {currentStep.pointerText}. Klik tombol di layar atau
              klik tombol <em>Lanjut</em> untuk mensimulasikan aksi ini secara otomatis.
            </span>
          </div>

          {/* Tombol Kontrol */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={currentStepIndex === 0}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  currentStepIndex === 0
                    ? "opacity-30 cursor-not-allowed text-slate-400 bg-slate-100 dark:bg-slate-800"
                    : "text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
                }`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>

              <Link
                href="/pengaturan?tab=panduan"
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
              >
                Buku Panduan
              </Link>
            </div>

            <button
              type="button"
              onClick={handleNextStep}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-brand hover:bg-brand-dark text-white shadow-lg transition"
            >
              {currentStepIndex < totalSteps - 1 ? (
                <>
                  <span>Lanjut (Simulasikan Aksi)</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Selesai & Keluar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function SimulationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-xs font-bold text-slate-500">
          Memuat Lingkungan Simulasi Interaktif...
        </div>
      }
    >
      <SimulationContent />
    </Suspense>
  );
}
