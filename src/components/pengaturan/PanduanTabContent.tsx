"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  Sparkles,
  CalendarCheck,
  BookMarked,
  ClipboardCheck,
  Award,
  FileImage,
  MessageSquare,
  Users,
  GraduationCap,
  Settings,
  Printer,
  Download,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
  FileText,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";

interface FeatureCard {
  id: string;
  title: string;
  category: string;
  desc: string;
  bullets: string[];
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}

const FEATURE_TOURS: FeatureCard[] = [
  {
    id: "kegiatan",
    title: "Absensi & Kegiatan Halaqoh Harian",
    category: "Tahfidz Umum",
    desc: "Pencatatan kehadiran santri dua kali sehari (sesi Pagi dan Malam) dengan matriks kalender bulanan dan tombol cepat 'Set Semua Hadir'.",
    bullets: [
      "Pilihan sesi presensi Pagi dan Malam",
      "Matriks tanggal 1 s.d. 31 dengan penanda libur hari Jumat",
      "Status Hadir, Alfa, Izin, Sakit dalam satu klik",
    ],
    url: "/panduan/simulasi?tour=kegiatan",
    icon: CalendarCheck,
    accentColor: "from-emerald-500 to-teal-700",
  },
  {
    id: "juz_baru",
    title: "Setoran Ziyadah Juz Baru (Pembimbing)",
    category: "Tahfidz Umum",
    desc: "Pencatatan perolehan hafalan baru yang disetorkan santri kepada asatidz pembimbing halaqoh dengan rekapitulasi bulanan otomatis.",
    bullets: [
      "Formulir rekam setoran harian",
      "Akumulasi perolehan Januari s.d. Desember",
      "Dukungan edit cepat langsung pada sel tabel",
    ],
    url: "/panduan/simulasi?tour=juz_baru",
    icon: BookMarked,
    accentColor: "from-teal-600 to-emerald-800",
  },
  {
    id: "evaluasi",
    title: "Evaluasi Hafalan Periodik (Pengurus Pusat)",
    category: "Tahfidz Umum",
    desc: "Pengujian kelancaran hafalan santri oleh Pengurus Pusat LPTQ yang tersambung langsung dengan grafik tren capaian di Dashboard.",
    bullets: [
      "Uji berkala verifikasi hafalan mutqin",
      "Terhubung dengan grafik tren Dashboard utama",
      "Filter jangka waktu 7, 14, 30 hari, dan bulan berjalan",
    ],
    url: "/panduan/simulasi?tour=evaluasi",
    icon: ClipboardCheck,
    accentColor: "from-blue-600 to-indigo-800",
  },
  {
    id: "khotmil",
    title: "Ujian Khotmil & Koreksi LJK Kamera OMR",
    category: "Tahfidz Khotmil",
    desc: "Sistem munaqosyah berstandar LJK (Khotmil 15 Juz 5 tahap; Khotmil 30 Juz 9 tahap) dengan pemindaian bulatan otomatis via kamera.",
    bullets: [
      "Cetak Lembar Jawab Komputer (LJK) ber-QR Code",
      "Pemindai OMR kamera untuk koreksi otomatis",
      "Penilaian objektif berbasis rumus standar KKM 85",
    ],
    url: "/panduan/simulasi?tour=khotmil",
    icon: Award,
    accentColor: "from-purple-600 to-violet-800",
  },
  {
    id: "flyer",
    title: "Generator Flyer Khataman 30 Juz",
    category: "Alat Lanjutan",
    desc: "Pembuatan poster digital ucapan khatam Al-Qur'an lengkap dengan sistem Template Flyer resmi, penataan geser foto interaktif, dan penanggalan Hijriah terpadu.",
    bullets: [
      "Sistem Template Flyer preset & kustom (menggantikan tombol Posisi Terkunci)",
      "Interaksi geser foto santri langsung di kanvas (double-tap di HP & tombol Tengahkan Foto)",
      "Deteksi santri khatam 30 juz otomatis & penanggalan Masehi/Hijriah hisab",
      "Ekspor berkas gambar PNG beresolusi tajam (814x1024 px)",
    ],
    url: "/panduan/simulasi?tour=flyer",
    icon: FileImage,
    accentColor: "from-amber-500 to-orange-700",
  },
  {
    id: "wa",
    title: "Broadcast Laporan WhatsApp (WAHA Gateway)",
    category: "Alat Lanjutan",
    desc: "Pengiriman laporan hasil evaluasi khotmil ke nomor WhatsApp wali santri disertai kartu rapor digital bergambar otomatis (100% gratis selamanya via Baileys & Cloudflare Tunnel).",
    bullets: [
      "Koneksi WhatsApp Gateway gratis (Port 3008 & Cloudflare HTTPS Tunnel)",
      "Scan QR Code WhatsApp langsung di dalam modal aplikasi",
      "Pembuatan kartu rapor digital otomatis via OpenGraph & pengiriman gambar asli",
      "Fallback WA Web dengan fitur cerdas Auto-Copy gambar ke Clipboard (Ctrl + V)",
    ],
    url: "/panduan/simulasi?tour=wa",
    icon: MessageSquare,
    accentColor: "from-green-600 to-emerald-800",
  },
  {
    id: "santri",
    title: "Master Data Santri & Hirarki Kamar",
    category: "Master Data",
    desc: "Pangkalan data seluruh santri tahfidz dengan penataan hirarki tempat tinggal (Blok, Asrama, Kamar) dan impor massal dari Excel.",
    bullets: [
      "Penomoran urut dan kode santri otomatis",
      "Standarisasi Blok, Asrama, dan Kamar pesantren",
      "Impor & ekspor Excel dengan sistem validasi format",
    ],
    url: "/panduan/simulasi?tour=santri",
    icon: Users,
    accentColor: "from-cyan-600 to-blue-800",
  },
  {
    id: "halaqoh",
    title: "Manajemen Halaqoh & Pembimbing",
    category: "Master Data",
    desc: "Pengorganisasian kelompok halaqoh kelas 1 s.d. 10, pencatatan kontak WhatsApp pembina, dan pemantauan santri berstatus Alfa.",
    bullets: [
      "Formasi 10 kelas (target 3 juz per kelas) bagian A-F",
      "Pencatatan nama dan kontak WhatsApp asatidz pembimbing",
      "Deteksi rekap ketidakhadiran santri per kelompok",
    ],
    url: "/panduan/simulasi?tour=halaqoh",
    icon: GraduationCap,
    accentColor: "from-sky-600 to-cyan-800",
  },
  {
    id: "pengaturan",
    title: "Pusat Konfigurasi & Pengaturan Sistem",
    category: "Sistem",
    desc: "Pengaturan identitas visual lembaga, penugasan hak akses pengguna granular, server WhatsApp, serta cadangan basis data.",
    bullets: [
      "Ubah logo, favicon, dan foto latar belakang login",
      "Manajemen akun dan hak akses modul (Sembunyikan/Baca/Edit)",
      "Pencadangan data ke berkas JSON",
    ],
    url: "/panduan/simulasi?tour=pengaturan",
    icon: Settings,
    accentColor: "from-slate-600 to-slate-800",
  },
];

interface ChapterItem {
  id: string;
  number: string;
  title: string;
  summary: string;
  topics: string[];
}

const CHAPTERS: ChapterItem[] = [
  {
    id: "bab-1",
    number: "BAB 1",
    title: "Pendahuluan dan Arsitektur Sistem",
    summary:
      "Tujuan digitalisasi sistem LPTQ Blokagung, tumpukan teknologi modern Next.js 14 & Supabase, serta pembagian peran akun pengguna.",
    topics: [
      "Latar Belakang & Profil 5 Modul Utama",
      "Arsitektur Teknologi & Keamanan Data (Supabase RLS)",
      "Matriks 5 Peran: Admin, Pengurus, Pembimbing, Operator Absen, Viewer",
      "Tiga Tingkat Izin Granular per Modul: Sembunyikan, Baca, Edit",
    ],
  },
  {
    id: "bab-2",
    number: "BAB 2",
    title: "Akses Masuk dan Navigasi Sistem",
    summary:
      "Prosedur autentikasi login, tata letak antarmuka AppShell, dan navigasi sidebar responsif.",
    topics: [
      "Prosedur Masuk Sistem dengan Username atau Email",
      "Fitur Semat (Pin) Sidebar & Mode Ciutkan Otomatis",
      "Bilah Atas: Pencarian Cepat Santri & Sakelar Mode Gelap",
      "Pengamanan Sesi & Prosedur Keluar Akun",
    ],
  },
  {
    id: "bab-3",
    number: "BAB 3",
    title: "Pengelolaan Data Santri Tahfidz",
    summary:
      "Tata cara pencatatan biodata santri, penetapan hirarki tempat tinggal, serta impor/ekspor data.",
    topics: [
      "Atribut Pokok Santri (NIS, WhatsApp Wali, Asrama, Kamar, Halaqoh)",
      "Konfigurasi Hirarki Wilayah Pesantren (Blok, Asrama, Kamar)",
      "Impor Massal Excel dengan Validasi Otomatis",
      "Ekspor Excel dan Cetak Kartu/Tabel Santri A4",
    ],
  },
  {
    id: "bab-4",
    number: "BAB 4",
    title: "Manajemen Halaqoh Al-Qur'an",
    summary:
      "Pengorganisasian kelompok halaqoh berdasarkan tingkatan hafalan dan asatidz pembimbing.",
    topics: [
      "Pemetaan 10 Kelas Halaqoh (Juz 1-3 hingga Juz 28-30) & Rombel A-F",
      "Penetapan Nama dan Nomor WhatsApp Pembimbing",
      "Pemantauan Akumulasi Ketidakhadiran (Alfa) per Bulan",
      "Jendela Detail: Tab Rekap Kegiatan & Tab Setoran Juz Baru",
    ],
  },
  {
    id: "bab-5",
    number: "BAB 5",
    title: "Tahfidz Umum (Kegiatan dan Setoran)",
    summary:
      "Alur presensi harian dua kali sehari, rekaman ziyadah hafalan baru, dan evaluasi berkala.",
    topics: [
      "Absensi Sesi Pagi (ba'da Shubuh) dan Sesi Malam (ba'da Maghrib)",
      "Matriks Kalender Bulanan & Tombol 'Set Semua Hadir'",
      "Setoran Juz Baru Ziyadah Bulanan (Januari s.d. Desember)",
      "Evaluasi Hafalan oleh Pengurus Pusat & Grafik Tren Dashboard",
    ],
  },
  {
    id: "bab-6",
    number: "BAB 6",
    title: "Tahfidz Khotmil (15 Juz dan 30 Juz)",
    summary:
      "Pelaksanaan ujian munaqosyah bertingkat, standar KKM 85, cetak LJK ber-QR, dan koreksi kamera OMR.",
    topics: [
      "Tahapan Khotmil: 5 Tahap pada 15 Juz; 9 Tahap pada 30 Juz",
      "Rumus Baku KKM: Bobot Halaman 65% dan Bobot Kesalahan 35%",
      "Cetak Lembar Jawab Komputer (LJK) Khotmil Ber-QR Code",
      "Pemindaian Lembar LJK via Kamera (OMR Scanner Otomatis)",
      "Rekapitulasi Kelulusan Kumulatif & Berita Acara Ujian",
    ],
  },
  {
    id: "bab-7",
    number: "BAB 7",
    title: "Alat Lanjutan (Flyer Khataman & WhatsApp Gateway)",
    summary:
      "Panduan lengkap pembuatan flyer khataman dengan sistem template & geser foto interaktif, serta integrasi WhatsApp Gateway (WAHA) gratis tanpa biaya pesan.",
    topics: [
      "Alur Kerja Gateway: Vercel -> Cloudflare Tunnel -> Gateway Laptop (Port 3008) -> WhatsApp -> Wali Santri",
      "Perbedaan Pilihan Cepat: 'Cloudflare HTTPS Tunnel (Untuk Vercel)' vs 'Port Lokal (3008)'",
      "Kepastian Biaya: 100% Gratis Selamanya (Open Source Baileys, Cloudflare Quick Tunnel, Supabase & Vercel Free Tier)",
      "2 Tips Keamanan Nomor: Jeda Otomatis Anti-Banned (4-7 detik) & Menjaga Laptop Tetap Menyala",
      "Prosedur Scan QR Code WhatsApp Langsung di Dalam Modal Aplikasi",
      "Generator Flyer Khataman: Sistem Template Flyer Preset & Kustom (Menggantikan Tombol Posisi Terkunci)",
      "Interaktivitas Geser Foto Santri di Kanvas: Mouse Drag di PC & Double-Tap di HP Layar Sentuh",
      "Pengiriman Kartu Rapor ke WA Web: Auto-Copy Gambar ke Clipboard (Ctrl + V) & Unduh File PNG",
    ],
  },
  {
    id: "bab-8",
    number: "BAB 8",
    title: "Pengaturan dan Administrasi Sistem",
    summary:
      "Kustomisasi identitas kelembagaan, pembatasan hak akses pengguna, dan pemeliharaan basis data.",
    topics: [
      "Branding: Ganti Logo, Favicon, Nama Aplikasi, dan Nilai KKM",
      "Manajemen Pengguna & Otoritas Modul (Sembunyikan/Baca/Edit)",
      "Integrasi Server WhatsApp Gateway",
      "Ekspor Cadangan Lengkap Data (Backup JSON) & Restore",
    ],
  },
  {
    id: "bab-9",
    number: "BAB 9",
    title: "Standar Operasional Prosedur (SOP)",
    summary:
      "Langkah-langkah baku operasional semesteran, harian, dan saat munaqosyah berlangsung.",
    topics: [
      "SOP Penerimaan Santri Baru & Tes Penempatan Halaqoh",
      "SOP Presensi Kegiatan Harian ba'da Shubuh & Maghrib",
      "SOP Ujian Khotmil: Cetak LJK, Pelaksanaan, Koreksi OMR, Validasi",
      "SOP Siaran Pengumuman Hasil Ujian ke Nomor Wali Santri",
    ],
  },
  {
    id: "bab-10",
    number: "BAB 10",
    title: "Panduan Pemecahan Masalah (Troubleshooting)",
    summary:
      "Daftar solusi praktis jika terjadi kendala teknis saat menjalankan aplikasi.",
    topics: [
      "Kendala Koneksi Pangkalan Data / Token Kedaluwarsa",
      "Izin Kamera Pemindai OMR Tertutup di Browser",
      "Bulatan LJK Tidak Terbaca Akibat Cahaya Kurang / Kertas Melengkung",
      "Status Sesi WhatsApp Gateway OFFLINE & Solusi Taut Ulang",
      "Format Kolom Impor Excel Santri Tidak Sesuai Template",
    ],
  },
];

export function PanduanTabContent() {
  const printRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedChapter, setExpandedChapter] = useState<string | null>("bab-1");
  const [targetHighlightBab, setTargetHighlightBab] = useState<string | null>(null);

  // Deteksi hash URL / query param saat halaman dibuka atau saat hash berubah untuk auto-expand dan auto-scroll ke BAB target
  useEffect(() => {
    const handleCheckTargetBab = () => {
      if (typeof window === "undefined") return;
      const hash = window.location.hash ? window.location.hash.replace("#", "") : null;
      const urlParams = new URLSearchParams(window.location.search);
      const babParam = urlParams.get("bab") || hash;

      if (babParam) {
        const found = CHAPTERS.find(
          (c) => c.id.toLowerCase() === babParam.toLowerCase()
        );
        if (found) {
          setExpandedChapter(found.id);
          setTargetHighlightBab(found.id);

          setTimeout(() => {
            const el = document.getElementById(found.id);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }, 250);

          setTimeout(() => {
            setTargetHighlightBab(null);
          }, 4000);
        }
      }
    };

    handleCheckTargetBab();
    window.addEventListener("hashchange", handleCheckTargetBab);
    return () => window.removeEventListener("hashchange", handleCheckTargetBab);
  }, []);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: "Buku_Panduan_Aplikasi_LPTQ_Blokagung",
  });

  const handleDownloadMarkdown = () => {
    window.open("/BUKU_PANDUAN_APLIKASI_LPTQ_BLOKAGUNG.md", "_blank");
  };

  const filteredTours = FEATURE_TOURS.filter((tour) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      tour.title.toLowerCase().includes(q) ||
      tour.desc.toLowerCase().includes(q) ||
      tour.category.toLowerCase().includes(q) ||
      tour.bullets.some((b) => b.toLowerCase().includes(q))
    );
  });

  const filteredChapters = CHAPTERS.filter((ch) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      ch.title.toLowerCase().includes(q) ||
      ch.summary.toLowerCase().includes(q) ||
      ch.topics.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* ================================================================= */}
      {/* BANNER UTAMA PANDUAN                                              */}
      {/* ================================================================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-brand-darker text-white p-6 sm:p-8 shadow-lg">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-emerald-100 mb-3 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            <span>Pusat Pembelajaran & Eksplorasi Aplikasi</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
            Buku Panduan & Tur Interaktif LPTQ Blokagung
          </h2>

          <p className="mt-2 text-xs sm:text-sm text-emerald-50 leading-relaxed max-w-2xl">
            Selamat datang di pusat panduan operasional sistem. Anda dapat mencoba{" "}
            <strong>Tur Interaktif</strong> langsung pada setiap halaman fitur unggulan, atau
            mempelajari 10 bab pedoman teknis lengkap di bawah ini.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-brand-dark font-extrabold text-xs shadow-md hover:bg-emerald-50 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Buku Panduan</span>
            </button>

            <a
              href="#daftar-bab"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition"
            >
              <BookOpen className="w-4 h-4" />
              <span>Baca Daftar 10 Bab</span>
            </a>
          </div>
        </div>

        {/* Ornamen Grafis Latar */}
        <div
          className="absolute -right-8 -bottom-10 w-72 h-72 rounded-full bg-white/5 blur-2xl pointer-events-none"
          aria-hidden="true"
        />
        <BookOpen
          className="absolute right-6 top-1/2 -translate-y-1/2 w-48 h-48 text-white/5 pointer-events-none hidden md:block"
          aria-hidden="true"
        />
      </div>

      {/* Kotak Pencarian Topik Panduan */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari topik panduan (contoh: LJK, OMR, Absensi, WAHA, KKM, Hirarki Kamar)..."
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/40 shadow-sm"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            Bersihkan
          </button>
        )}
      </div>

      {/* ================================================================= */}
      {/* SEKSI 1: SIMULASI INTERAKTIF FITUR UNGGULAN                      */}
      {/* ================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                Eksplorasi Fitur Unggulan (Simulasi Interaktif & Tur)
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Buka halaman simulasi mandiri yang dilengkapi <strong>panah petunjuk tombol</strong> dan
              simulasi aksi langsung saat tombol <em>Lanjut</em> diklik. Data riil pondok 100% aman karena
              berjalan di sandbox khusus.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTours.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.id}
                className="group relative flex flex-col justify-between bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 hover:border-brand/60 hover:shadow-xl dark:hover:border-brand/40 transition-all duration-200"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div
                      className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.accentColor} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {feature.category}
                    </span>
                  </div>

                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-brand transition-colors leading-snug">
                    {feature.title}
                  </h4>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1.5 mb-3">
                    {feature.desc}
                  </p>

                  <ul className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 mb-4">
                    {feature.bullets.map((b, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 leading-tight"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  href={feature.url}
                  className="mt-2 inline-flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-brand text-brand hover:text-white dark:bg-brand/10 dark:hover:bg-brand dark:text-emerald-300 dark:hover:text-white font-extrabold text-xs transition-all shadow-sm"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Mulai Simulasi Interaktif</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================================================================= */}
      {/* SEKSI 2: DAFTAR 10 BAB BUKU PANDUAN RESMI                         */}
      {/* ================================================================= */}
      <section id="daftar-bab" className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-brand" />
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                Daftar Bab Buku Panduan Lengkap
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Klik judul bab di bawah untuk membaca rangkuman pokok bahasan dan petunjuk teknis
              operasional.
            </p>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cetak Dokumen</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {filteredChapters.map((ch) => {
            const isExpanded = expandedChapter === ch.id;
            const isHighlighted = targetHighlightBab === ch.id;
            return (
              <div
                key={ch.id}
                id={ch.id}
                className={`scroll-mt-24 rounded-2xl overflow-hidden transition-all duration-500 ${
                  isHighlighted
                    ? "bg-emerald-50/90 dark:bg-emerald-950/50 border-2 border-emerald-500 ring-4 ring-emerald-500/25 shadow-xl shadow-emerald-500/10 scale-[1.01]"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setExpandedChapter(isExpanded ? null : ch.id)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition"
                >
                  <div className="flex items-start gap-3 min-w-0 pr-2">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-brand/10 text-brand text-xs font-black shrink-0">
                      {ch.number}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                        {ch.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {ch.summary}
                      </p>
                    </div>
                  </div>

                  <span className="text-slate-400 shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-brand" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </span>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/40">
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                      {ch.summary}
                    </p>

                    <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5">
                      <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                        Topik & Rincian Bahasan:
                      </h5>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {ch.topics.map((t, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Panduan Lengkap Interaktif Khusus Bab 7 (Flyer & WhatsApp Gateway) */}
                    {ch.id === "bab-7" && (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-5 text-xs text-slate-700 dark:text-slate-300">
                        {/* 1. Alur Kerja Gateway */}
                        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-extrabold flex items-center justify-center text-xs shrink-0">
                              1
                            </span>
                            <h5 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                              Bagaimana Alur Kerjanya Kok Bisa Terhubung &amp; Kirim Pesan?
                            </h5>
                          </div>

                          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                            Sistem ini terdiri dari <strong>3 komponen utama</strong>:
                          </p>
                          <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300 pl-1">
                            <li><strong>Website LPTQ Blokagung:</strong> Antarmuka web resmi yang diakses pengguna di browser (<code>https://lptq-blokagung.vercel.app</code>).</li>
                            <li><strong>Server Gateway di Laptop Anda:</strong> Program Node.js dengan engine <em>Baileys</em> yang berjalan lokal di port <code>3008</code>.</li>
                            <li><strong>Server Resmi WhatsApp / Meta:</strong> Server perpesanan terenkripsi di internet.</li>
                          </ol>

                          {/* Diagram Alur */}
                          <div className="p-3.5 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] leading-relaxed overflow-x-auto select-all">
                            <div>[Website LPTQ di Vercel]</div>
                            <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;(Kirim perintah pesan + foto rapor)</div>
                            <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼</div>
                            <div>[Cloudflare HTTPS Tunnel]&nbsp;&nbsp;&lt;--- Jembatan aman resmi dari internet ke laptop</div>
                            <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│</div>
                            <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼</div>
                            <div>[Server Gateway di Laptop (Port 3008)]</div>
                            <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;(Mengemas teks &amp; file gambar rapor)</div>
                            <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼</div>
                            <div>[Koneksi Perangkat Tertaut WhatsApp]</div>
                            <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;(Lewat nomor HP pengurus lembaga)</div>
                            <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼</div>
                            <div>[HP Wali Santri Penerima]</div>
                          </div>

                          <div className="space-y-2 pt-1">
                            <h6 className="font-bold text-slate-800 dark:text-slate-200">
                              Alur dari Scan QR sampai Pesan Terkirim:
                            </h6>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                                <span className="font-bold text-brand block">Tahap 1: Scan QR Code (Autentikasi)</span>
                                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                                  <li>Server di laptop membuka koneksi aman ke server WhatsApp.</li>
                                  <li>Server WhatsApp memberikan tiket sesi berupa QR Code.</li>
                                  <li>Saat Anda scan dengan HP, HP menyetujui laptop sebagai <strong>Perangkat Tertaut</strong> (sama seperti WhatsApp Web).</li>
                                  <li>Kunci login disimpan di folder <code>waha-gateway/auth_info_baileys/</code> sehingga <strong>tidak perlu scan berulang-ulang</strong>.</li>
                                </ul>
                              </div>
                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                                <span className="font-bold text-brand block">Tahap 2: Pengiriman Gambar Rapor &amp; Teks</span>
                                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                                  <li>Saat tombol <em>Kirim ke Wali</em> atau <em>Mulai Kirim Broadcast</em> diklik:</li>
                                  <li>Web mengirim nomor HP wali, teks evaluasi, dan URL gambar kartu rapor resmi.</li>
                                  <li>Server laptop mengunduh gambar kartu rapor lalu menembakkannya langsung via koneksi WhatsApp.</li>
                                  <li>Wali santri menerima foto rapor tajam dan teks nilai secara otomatis dari nomor lembaga!</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 2. Pilihan Cepat: Cloudflare vs Port Lokal */}
                        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-extrabold flex items-center justify-center text-xs shrink-0">
                              2
                            </span>
                            <h5 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                              Apa Beda Pilihan &quot;Cloudflare HTTPS Tunnel&quot; vs &quot;Port Lokal (3008)&quot;?
                            </h5>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-1.5">
                              <span className="font-bold text-emerald-800 dark:text-emerald-300 block">
                                ☁️ Cloudflare HTTPS Tunnel (Untuk Vercel)
                              </span>
                              <p className="text-[11px] text-emerald-900 dark:text-emerald-200 leading-relaxed">
                                <strong>Kapan dipakai?</strong> Saat Anda membuka website LPTQ melalui domain internet Vercel (<code>https://lptq-blokagung.vercel.app</code>).
                              </p>
                              <p className="text-[11px] text-emerald-900 dark:text-emerald-200 leading-relaxed">
                                <strong>Alasannya:</strong> Domain Vercel menggunakan <strong>HTTPS</strong>. Browser modern seperti Google Chrome melarang website HTTPS publik memanggil <code>http://localhost</code> secara langsung (aturan <em>Mixed Content &amp; Private Network Access</em>). Cloudflare Tunnel berfungsi sebagai <strong>terowongan aman resmi ber-HTTPS</strong> yang menghubungkan website Vercel ke laptop Anda tanpa terblokir browser.
                              </p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                                🏠 Port Lokal (3008)
                              </span>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                <strong>Kapan dipakai?</strong> Jika Anda membuka website LPTQ secara lokal di laptop Anda sendiri (misal alamat di browser adalah <code>http://localhost:3005</code>).
                              </p>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                <strong>Alasannya:</strong> Karena sama-sama di dalam laptop (HTTP ke HTTP), browser tidak memblokirnya sehingga bisa langsung terhubung tanpa bantuan tunnel internet.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* 3. Kepastian Biaya: 100% Gratis */}
                        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-extrabold flex items-center justify-center text-xs shrink-0">
                              3
                            </span>
                            <h5 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                              Apakah Itu Akan Tiba-Tiba Berbayar?
                            </h5>
                          </div>

                          <div className="p-3 rounded-xl bg-emerald-100/70 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 font-bold">
                            Jawabannya: TIDAK, 100% GRATIS SELAMANYA.
                          </div>

                          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                            Tidak ada tagihan apa pun yang akan muncul, dengan rincian berikut:
                          </p>

                          <ul className="space-y-2 text-[11px] text-slate-600 dark:text-slate-300">
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                              <div>
                                <strong>Engine WhatsApp Gateway (Baileys &amp; Node.js):</strong> Berlisensi Open Source (MIT) yang bebas dipakai gratis tanpa royalti atau biaya per pesan (berbeda dengan WhatsApp Business API resmi Meta yang bertarif ~Rp 400 - Rp 600 per pesan).
                              </div>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                              <div>
                                <strong>Cloudflare Quick Tunnel (trycloudflare.com):</strong> Disediakan secara resmi dan gratis oleh Cloudflare untuk pengembang tanpa memerlukan kartu kredit.
                              </div>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                              <div>
                                <strong>Infrastruktur Vercel &amp; Supabase:</strong> Akun yang digunakan berada pada paket <em>Hobby / Community (Free Tier)</em> yang gratis.
                              </div>
                            </li>
                          </ul>
                        </div>

                        {/* 4. Tips Keamanan Nomor */}
                        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-2xl p-4 sm:p-5 space-y-2.5">
                          <h5 className="font-extrabold text-sm text-amber-900 dark:text-amber-200 flex items-center gap-2">
                            <span>💡</span>
                            <span>2 Tips Penting untuk Menjaga Nomor Tetap Aman</span>
                          </h5>
                          <ul className="space-y-2 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
                            <li className="flex items-start gap-2">
                              <span className="font-bold shrink-0">1.</span>
                              <div>
                                <strong>Gunakan Jeda Otomatis (Anti-Banned):</strong> Di pengaturan, biarkan <em>Jeda Minimal: 4 detik</em> dan <em>Jeda Maksimal: 7 detik</em>. Jeda acak ini meniru jeda manusia mengetik sehingga nomor tidak dicurigai sebagai bot spam oleh Meta.
                              </div>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="font-bold shrink-0">2.</span>
                              <div>
                                <strong>Laptop Harus Menyala Saat Mengirim Broadcast:</strong> Karena mesin pengirimnya berada di laptop ini, pastikan laptop tetap menyala dan terhubung internet saat proses broadcast massal berjalan.
                              </div>
                            </li>
                          </ul>
                        </div>

                        {/* 5. Pembaruan Fitur Flyer Khataman & Kirim WA Web */}
                        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
                          <h5 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <span>✨</span>
                            <span>Pembaruan Fitur Flyer Khataman &amp; WhatsApp Web (Rilis Terkini)</span>
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                              <strong className="text-brand block">Flyer Khataman Al-Qur&apos;an (/alat/flyer-khataman)</strong>
                              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                                <li>Tombol <strong>Template Flyer</strong> menggantikan tombol lama <em>Posisi Terkunci</em>.</li>
                                <li>Dukungan preset resmi: <em>Template Putri (Resmi)</em>, <em>Template Putra (Resmi)</em>, dan <em>Khotmil 15 Juz</em>.</li>
                                <li>Foto santri dapat <strong>digeser langsung di kanvas pratinjau</strong>. Pada HP layar sentuh, cukup <strong>ketuk 2 kali (double-tap)</strong> untuk mengaktifkan mode geser agar tidak mengganggu scroll halaman.</li>
                                <li>Tombol cepat <strong>Tengahkan Foto</strong> untuk mereset posisi foto kembali ke <code>0px, 0px</code>.</li>
                              </ul>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                              <strong className="text-brand block">Kirim WhatsApp &amp; Rapor Digital (/alat/kirim-wa)</strong>
                              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                                <li><strong>Scan QR Code langsung di layar</strong> modal pengaturan aplikasi Vercel.</li>
                                <li><strong>Auto-Copy Gambar Rapor ke Clipboard:</strong> Saat klik tombol <em>WA Web</em>, gambar rapor otomatis disalin ke clipboard dan muncul panduan <kbd>Ctrl + V</kbd> di WhatsApp Web.</li>
                                <li>Tombol bantuan <strong>Unduh Gambar PNG</strong> dan <strong>Salin Gambar</strong> di bawah panel pratinjau.</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ================================================================= */}
      {/* AREA DOKUMEN CETAK A4 (Tersembunyi di Layar, Tampil saat Cetak)   */}
      {/* ================================================================= */}
      <div className="hidden">
        <div ref={printRef} className="p-10 font-sans text-slate-900 leading-relaxed">
          <div className="text-center pb-6 border-b-2 border-slate-900 mb-6">
            <h1 className="text-2xl font-black tracking-tight uppercase">
              Buku Panduan Aplikasi Sistem Informasi LPTQ Blokagung
            </h1>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 mt-1">
              Lembaga Pengembangan Tilawatil Qur&apos;an Pondok Pesantren Darussalam Blokagung
            </p>
          </div>

          <div className="space-y-6 text-xs">
            {CHAPTERS.map((ch) => (
              <div key={ch.id} className="pb-4 border-b border-slate-200">
                <h2 className="text-sm font-black text-slate-900">
                  {ch.number}: {ch.title}
                </h2>
                <p className="text-slate-600 mt-1">{ch.summary}</p>
                <ul className="mt-2 space-y-1 list-disc pl-5 text-slate-700">
                  {ch.topics.map((t, idx) => (
                    <li key={idx}>{t}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-4 border-t border-slate-300 text-center text-[10px] text-slate-500">
            Dokumen Panduan Resmi Sistem Informasi LPTQ Blokagung - Dicetak pada {new Date().toLocaleDateString("id-ID")}
          </div>
        </div>
      </div>
    </div>
  );
}
