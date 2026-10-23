"use client";

import React, { useState, useRef } from "react";
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
    url: "/tahfidz/umum/kegiatan?tour=kegiatan",
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
    url: "/tahfidz/umum/juz-baru?tour=juz_baru",
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
    url: "/tahfidz/umum/evaluasi?tour=evaluasi",
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
    url: "/tahfidz/khotmil/15?tour=khotmil",
    icon: Award,
    accentColor: "from-purple-600 to-violet-800",
  },
  {
    id: "flyer",
    title: "Generator Flyer Khataman 30 Juz",
    category: "Alat Lanjutan",
    desc: "Pembuatan poster digital ucapan khatam Al-Qur'an lengkap dengan ornamen kubah, penanggalan Masehi & Hijriah hisab terpadu.",
    bullets: [
      "Deteksi santri khatam 30 juz otomatis",
      "Kontrol pemosisian foto, zoom, dan border",
      "Ekspor berkas gambar PNG beresolusi 1080x1350 px",
    ],
    url: "/alat/flyer-khataman?tour=flyer",
    icon: FileImage,
    accentColor: "from-amber-500 to-orange-700",
  },
  {
    id: "wa",
    title: "Broadcast Laporan WhatsApp (WAHA Gateway)",
    category: "Alat Lanjutan",
    desc: "Pengiriman laporan hasil evaluasi khotmil ke nomor WhatsApp wali santri disertai kartu rapor digital bergambar otomatis.",
    bullets: [
      "Pembuatan kartu rapor digital otomatis via OpenGraph",
      "Pesan dengan variabel dinamis nama, tahap, dan nilai",
      "Pengiriman antrean massal dengan jeda aman anti-blokir",
    ],
    url: "/alat/kirim-wa?tour=wa",
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
    url: "/santri?tour=santri",
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
    url: "/halaqoh?tour=halaqoh",
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
    url: "/pengaturan?tab=branding&tour=pengaturan",
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
    title: "Alat Lanjutan (Flyer & WhatsApp)",
    summary:
      "Fasilitas pembuatan ucapan khataman otomatis dan integrasi gateway siaran pesan WhatsApp resmi.",
    topics: [
      "Generator Flyer Khataman 30 Juz dengan Penanggalan Hijriah Otomatis",
      "Pengaturan Kanvas Foto, Ornamen Kubah, dan Unduh PNG 1080x1350",
      "Konfigurasi Endpoint Server WhatsApp HTTP API (WAHA)",
      "Kartu Rapor Digital Bergambar Otomatis & Antrean Kirim Massal Aman",
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
      {/* SEKSI 1: TUR INTERAKTIF FITUR UNGGULAN                           */}
      {/* ================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                Eksplorasi Fitur Unggulan (Tur Interaktif)
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Klik salah satu tombol <strong>Mulai Tur</strong> di bawah untuk membuka halaman fitur
              disertai panduan langkah-demi-langkah interaktif di layar.
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
                    <span>Mulai Tur Interaktif</span>
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
            return (
              <div
                key={ch.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition"
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
