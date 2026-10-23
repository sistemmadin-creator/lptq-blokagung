"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  BookOpen,
  Eye,
  Info,
} from "lucide-react";

export interface TourStep {
  title: string;
  desc: string;
  actionHint?: string;
  targetBadge?: string;
}

export interface FeatureTour {
  id: string;
  title: string;
  badge: string;
  returnPath: string;
  steps: TourStep[];
}

export const TOURS_CONFIG: Record<string, FeatureTour> = {
  kegiatan: {
    id: "kegiatan",
    title: "Absensi & Kegiatan Halaqoh Harian",
    badge: "Tahfidz Umum",
    returnPath: "/pengaturan?tab=panduan",
    steps: [
      {
        title: "Pilih Sesi Absensi (Pagi / Malam)",
        desc: "Aktivitas halaqoh dicatat dua kali sehari: Sesi Pagi (ba'da Shubuh) dan Sesi Malam (ba'da Maghrib). Gunakan tombol sakelar sesi di pojok atas tabel untuk berpindah waktu pencatatan.",
        actionHint: "Perhatikan tombol sakelar 'Pagi' dan 'Malam' di atas tabel.",
        targetBadge: "Langkah 1: Waktu Halaqoh",
      },
      {
        title: "Pahami Matriks Kalender Bulanan",
        desc: "Tabel menampilkan tanggal 1 sampai 31 untuk bulan yang dipilih. Kolom hari ini disorot dengan warna khusus, dan hari Jumat ditandai sebagai hari libur kegiatan mingguan pesantren.",
        actionHint: "Periksa kolom tanggal hari ini pada matriks tabel.",
        targetBadge: "Langkah 2: Kalender Pertemuan",
      },
      {
        title: "Input Kehadiran Satuan per Santri",
        desc: "Klik pada sel nama santri di tanggal hari ini untuk memilih status: Hadir (H / Hijau), Alfa (A / Merah), Izin (I / Kuning), atau Sakit (S / Biru). Data tersimpan seketika.",
        actionHint: "Klik sel tanggal santri untuk mengganti status kehadiran.",
        targetBadge: "Langkah 3: Status Kehadiran",
      },
      {
        title: "Fitur Cepat 'Set Semua Hadir'",
        desc: "Gunakan tombol hijau 'Set Semua Hadir' di atas tabel untuk mengisi otomatis seluruh santri yang belum diabsen menjadi Hadir. Setelah itu, Anda cukup mengubah santri yang berhalangan satu per satu.",
        actionHint: "Klik 'Set Semua Hadir' untuk mempercepat pengisian presensi massal.",
        targetBadge: "Langkah 4: Presensi Cepat",
      },
    ],
  },
  juz_baru: {
    id: "juz_baru",
    title: "Setoran Ziyadah Juz Baru (Pembimbing)",
    badge: "Tahfidz Umum",
    returnPath: "/pengaturan?tab=panduan",
    steps: [
      {
        title: "Tentukan Tahun Penanggalan",
        desc: "Gunakan dropdown tahun di pojok atas untuk menyaring perolehan setoran hafalan santri pada tahun masehi atau tahun ajaran aktif.",
        actionHint: "Pilih tahun aktif pada sudut kanan atas tabel.",
        targetBadge: "Langkah 1: Tahun Rekap",
      },
      {
        title: "Pencarian Santri Cepat",
        desc: "Ketik nama santri atau kode santri pada kotak pencarian di kiri atas tabel untuk langsung menemukan rekaman santri yang hendak menyetorkan hafalan.",
        actionHint: "Ketik nama santri di kotak pencarian.",
        targetBadge: "Langkah 2: Cari Santri",
      },
      {
        title: "Input Formulir Tambah Setoran",
        desc: "Klik tombol '+ Tambah Setoran' untuk membuka jendela input. Masukkan tanggal setoran, jumlah pertambahan juz (contoh: 0.5 atau 1 juz), dan catatan kelancaran.",
        actionHint: "Klik tombol '+ Tambah Setoran' di pojok atas.",
        targetBadge: "Langkah 3: Rekam Ziyadah",
      },
      {
        title: "Pembaruan Langsung pada Sel Bulan",
        desc: "Bagi pengguna berhak akses edit, Anda juga dapat langsung mengeklik angka pada sel bulan (Januari s.d. Desember) di baris santri untuk memperbarui capaian juz secara instan.",
        actionHint: "Klik sel angka bulan di tabel untuk edit cepat tanpa formulir panjang.",
        targetBadge: "Langkah 4: Edit Cepat",
      },
    ],
  },
  evaluasi: {
    id: "evaluasi",
    title: "Evaluasi Hafalan Periodik (Pengurus Pusat)",
    badge: "Tahfidz Umum",
    returnPath: "/pengaturan?tab=panduan",
    steps: [
      {
        title: "Tujuan Pengujian Evaluasi",
        desc: "Modul ini digunakan oleh Pengurus Pusat LPTQ untuk memverifikasi dan menguji kelancaran hafalan santri secara periodik di luar setoran harian asatidz pembimbing.",
        actionHint: "Data evaluasi ini menjadi tolok ukur kesiapan ujian khotmil.",
        targetBadge: "Langkah 1: Peran Pengurus",
      },
      {
        title: "Pencatatan Nilai Evaluasi Santri",
        desc: "Klik tombol '+ Tambah Evaluasi' atau klik langsung pada sel bulan santri untuk memasukkan jumlah juz hafalan yang telah teruji mutqin.",
        actionHint: "Gunakan formulir atau sel tabel untuk memperbarui angka evaluasi.",
        targetBadge: "Langkah 2: Rekam Hasil Uji",
      },
      {
        title: "Pantau Tren Evaluasi di Dashboard",
        desc: "Seluruh hasil evaluasi yang Anda simpan di sini otomatis diolah menjadi grafik garis tren pada Dashboard utama untuk memantau kemajuan hafalan pondok dari waktu ke waktu.",
        actionHint: "Grafik garis tren di halaman muka mencerminkan data modul ini.",
        targetBadge: "Langkah 3: Analisis Tren",
      },
    ],
  },
  khotmil: {
    id: "khotmil",
    title: "Ujian Khotmil & Koreksi LJK Kamera OMR",
    badge: "Tahfidz Khotmil",
    returnPath: "/pengaturan?tab=panduan",
    steps: [
      {
        title: "Pilih Tahapan Ujian",
        desc: "Pilih tab tahapan yang sedang diuji (Tahap 1 s.d. 5 untuk 15 Juz; Tahap 1 s.d. 9 untuk 30 Juz). Tiap tahap memiliki cakupan juz ujian yang telah dibakukan sistem.",
        actionHint: "Klik tab nomor tahap di bagian atas halaman.",
        targetBadge: "Langkah 1: Tahap Khotmil",
      },
      {
        title: "Pendaftaran Peserta Ujian",
        desc: "Klik tombol 'Daftarkan Peserta Ujian' untuk memilih santri-santri yang telah memenuhi syarat hafalan untuk diuji pada tahap bersangkutan.",
        actionHint: "Pastikan seluruh peserta tahap telah terdaftar di tabel.",
        targetBadge: "Langkah 2: Peserta Tahap",
      },
      {
        title: "Cetak Lembar Jawab Komputer (LJK)",
        desc: "Klik tombol 'Cetak LJK Khotmil'. Sistem mencetak lembar LJK resmi ukuran A4 yang dilengkapi kode QR identitas santri dan kolom bulatan pensil 2B untuk penguji.",
        actionHint: "Gunakan kertas HVS putih standar 70-80 gsm saat mencetak LJK.",
        targetBadge: "Langkah 3: Cetak LJK Ber-QR",
      },
      {
        title: "Pindai Lembar LJK via Kamera (OMR Scanner)",
        desc: "Setelah ujian selesai, klik tombol 'Scan Kamera LJK (OMR)'. Arahkan kamera ke lembar LJK: mesin membaca QR Code dan bulatan pensil secara otomatis, lalu menghitung nilai akhir berbasis rumus KKM (default 85).",
        actionHint: "Klik tombol kamera ungu di atas tabel untuk memulai pemindaian otomatis.",
        targetBadge: "Langkah 4: Koreksi Kamera OMR",
      },
      {
        title: "Rekapitulasi Kelulusan Akhir",
        desc: "Buka menu Rekapitulasi Khotmil di sidebar untuk melihat status ketuntasan seluruh tahapan secara berdampingan dan mencetak Berita Acara Kelulusan resmi.",
        actionHint: "Periksa status 'Tuntas' hijau pada rekapitulasi kumulatif.",
        targetBadge: "Langkah 5: Berita Acara",
      },
    ],
  },
  flyer: {
    id: "flyer",
    title: "Generator Flyer Khataman 30 Juz",
    badge: "Alat Lanjutan",
    returnPath: "/pengaturan?tab=panduan",
    steps: [
      {
        title: "Pilih Santri Khatam",
        desc: "Sistem otomatis mendeteksi dan menampilkan daftar santri yang telah menyelesaikan hafalan 30 Juz. Anda juga dapat mencari nama santri tertentu melalui kolom pencarian.",
        actionHint: "Pilih nama santri dari daftar drop-down pencarian santri.",
        targetBadge: "Langkah 1: Identitas Santri",
      },
      {
        title: "Unggah dan Posisikan Foto",
        desc: "Klik 'Unggah Foto Santri'. Atur zoom, rotasi, pergeseran posisi X/Y, dan kelengkungan sudut agar foto santri terlihat proporsional di dalam ornamen kubah.",
        actionHint: "Gunakan panel kontrol foto di sisi kiri kanvas flyer.",
        targetBadge: "Langkah 2: Penyesuaian Foto",
      },
      {
        title: "Penanggalan Masehi & Hijriah Otomatis",
        desc: "Sistem mengonversi tanggal khatam Masehi menjadi penanggalan Hijriah pesantren secara otomatis menggunakan kalkulasi hisab terpadu.",
        actionHint: "Periksa teks tanggal Masehi dan Hijriah di bagian bawah flyer.",
        targetBadge: "Langkah 3: Penanggalan Hisab",
      },
      {
        title: "Unduh Flyer PNG Berkualitas Tinggi",
        desc: "Klik tombol 'Unduh Flyer (PNG)' untuk menyimpan berkas gambar beresolusi tajam 1080x1350 px yang siap dicetak atau diunggah ke status media sosial pesantren.",
        actionHint: "Klik 'Salin ke Clipboard' untuk menempel langsung ke aplikasi pesan.",
        targetBadge: "Langkah 4: Ekspor Flyer",
      },
    ],
  },
  wa: {
    id: "wa",
    title: "Broadcast Laporan Evaluasi WhatsApp (WAHA)",
    badge: "Alat Lanjutan",
    returnPath: "/pengaturan?tab=panduan",
    steps: [
      {
        title: "Pemeriksaan Status Gateway WAHA",
        desc: "Pastikan indikator status di pojok atas bertuliskan 'ONLINE' berwarna hijau. Jika offline, periksa sambungan server WAHA Anda di tab Pengaturan Integrasi WhatsApp.",
        actionHint: "Periksa lencana status koneksi WhatsApp di sudut kanan atas.",
        targetBadge: "Langkah 1: Status Gateway",
      },
      {
        title: "Pilih Program & Tahap Ujian",
        desc: "Pilih program Khotmil (15 Juz atau 30 Juz) serta nomor tahap yang laporannya hendak dikirimkan kepada wali santri.",
        actionHint: "Pilih program dan nomor tahap pada filter di atas tabel.",
        targetBadge: "Langkah 2: Filter Tahap",
      },
      {
        title: "Pratinjau Kartu Rapor Digital",
        desc: "Klik ikon mata (Pratinjau) pada baris santri untuk melihat tampilan gambar kartu rapor digital otomatis yang akan dikirimkan beserta teks pesan resmi.",
        actionHint: "Gambar rapor dibuat otomatis oleh sistem tanpa perlu mendesain manual.",
        targetBadge: "Langkah 3: Rapor Digital",
      },
      {
        title: "Kirim Antrean Massal dengan Jeda Aman",
        desc: "Beri tanda centang pada santri yang hendak dikirimi laporan, lalu klik 'Mulai Kirim Antrean'. Sistem mengirim pesan satu per satu dengan jeda aman anti-blokir.",
        actionHint: "Gunakan tombol Jeda dan Lanjut sewaktu-waktu selama proses pengiriman.",
        targetBadge: "Langkah 4: Siaran Massal",
      },
    ],
  },
  santri: {
    id: "santri",
    title: "Master Data Santri & Hirarki Kamar",
    badge: "Master Data",
    returnPath: "/pengaturan?tab=panduan",
    steps: [
      {
        title: "Pencarian dan Filter Rinci",
        desc: "Cari nama santri dengan cepat melalui kotak pencarian atau gunakan filter blok, asrama, kamar, serta kelompok halaqoh untuk memilah data secara terarah.",
        actionHint: "Gunakan kolom filter dan pencarian di bagian atas tabel.",
        targetBadge: "Langkah 1: Filter Data",
      },
      {
        title: "Tambah Data Santri Manual",
        desc: "Klik tombol '+ Tambah Santri' untuk mendaftarkan santri baru, menentukan kelompok halaqoh awal, serta menyimpan nomor WhatsApp wali santri.",
        actionHint: "Klik tombol hijau '+ Tambah Santri' di atas tabel.",
        targetBadge: "Langkah 2: Registrasi Manual",
      },
      {
        title: "Pengaturan Hirarki Wilayah Kamar",
        desc: "Klik tombol 'Atur Hirarki Kamar' untuk membakukan nama Blok, Asrama, dan nomor kamar di pesantren agar pilihan dropdown selalu konsisten.",
        actionHint: "Buka pengaturan hirarki agar input kamar seragam dan rapi.",
        targetBadge: "Langkah 3: Hirarki Wilayah",
      },
      {
        title: "Impor Massal dari File Excel",
        desc: "Gunakan tombol 'Unduh Template Excel' dan 'Unggah Excel' untuk memasukkan ratusan data santri baru sekaligus secara cepat dengan validasi otomatis.",
        actionHint: "Gunakan template resmi sistem agar data terbaca sempurna.",
        targetBadge: "Langkah 4: Impor Excel",
      },
    ],
  },
  halaqoh: {
    id: "halaqoh",
    title: "Manajemen Halaqoh & Pembimbing",
    badge: "Master Data",
    returnPath: "/pengaturan?tab=panduan",
    steps: [
      {
        title: "Struktur Kelas 1 sampai 10",
        desc: "Santri dikelompokkan ke dalam Kelas 1 s.d. 10 (target 3 juz per kelas) dan rombel Bagian A s.d. F. Setiap kartu mewakili satu kelompok halaqoh.",
        actionHint: "Perhatikan pembagian target juz pada masing-masing kartu kelas.",
        targetBadge: "Langkah 1: Struktur Halaqoh",
      },
      {
        title: "Penetapan Pembimbing & WhatsApp",
        desc: "Klik tombol 'Atur Pembimbing' pada kartu halaqoh untuk mencantumkan nama asatidz dan kontak WhatsApp agar mudah dihubungi oleh pengurus maupun santri.",
        actionHint: "Pastikan nomor kontak pembimbing aktif dan diawali kode nomor resmi.",
        targetBadge: "Langkah 2: Data Pembimbing",
      },
      {
        title: "Pemantauan Ketidakhadiran (Alfa)",
        desc: "Kartu halaqoh menampilkan indikator akumulasi ketidakhadiran santri tanpa keterangan (Alfa) pada bulan berjalan untuk membantu evaluasi kedisiplinan kelompok.",
        actionHint: "Periksa angka alfa pada kartu kelompok untuk mendeteksi santri tertinggal.",
        targetBadge: "Langkah 3: Pantau Alfa",
      },
      {
        title: "Buka Jendela Detail Halaqoh",
        desc: "Klik 'Buka Detail Halaqoh' untuk mengakses laporan gabungan yang memuat riwayat absensi harian dan rekap perolehan juz baru seluruh anggota halaqoh tersebut.",
        actionHint: "Gunakan tab Kegiatan dan tab Juz Baru di dalam jendela modal.",
        targetBadge: "Langkah 4: Rekap Kelompok",
      },
    ],
  },
  pengaturan: {
    id: "pengaturan",
    title: "Pusat Konfigurasi & Pengaturan Sistem",
    badge: "Sistem",
    returnPath: "/pengaturan?tab=panduan",
    steps: [
      {
        title: "Tab Panduan Interaktif",
        desc: "Tab 'Panduan' ini merupakan pusat referensi buku panduan operasional resmi dan pintu masuk tur interaktif ke seluruh fitur unggulan sistem.",
        actionHint: "Klik kartu fitur mana saja untuk mencoba panduan langsung di tempat.",
        targetBadge: "Langkah 1: Panduan Interaktif",
      },
      {
        title: "Tab Tampilan & Logo (Identitas)",
        desc: "Sesuaikan logo lembaga, favicon tab browser, foto latar belakang login, serta standar nilai batas kelulusan (KKM Khotmil) yang berlaku.",
        actionHint: "Ubah identitas visual lembaga di tab Tampilan & Logo.",
        targetBadge: "Langkah 2: Branding Lembaga",
      },
      {
        title: "Tab Pengguna & Hak Akses Granular",
        desc: "Kelola akun pengguna (Admin, Pengurus, Pembimbing, Operator Absen, Viewer) dan atur izin spesifik per modul (Sembunyikan, Baca, Edit).",
        actionHint: "Pastikan tiap petugas hanya memiliki hak akses sesuai tugasnya.",
        targetBadge: "Langkah 3: Akun Pengguna",
      },
      {
        title: "Tab WhatsApp Gateway & Cadangan Data",
        desc: "Atur alamat endpoint server WAHA untuk siaran otomatis serta unduh berkas cadangan data (JSON) secara berkala demi keamanan pangkalan data.",
        actionHint: "Lakukan pencadangan data secara rutin setiap akhir bulan.",
        targetBadge: "Langkah 4: Integrasi & Backup",
      },
    ],
  },
};

export function InteractiveTourGuide() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tourParam = searchParams.get("tour");
  const activeTour = tourParam ? TOURS_CONFIG[tourParam] : null;

  const [currentStep, setCurrentStep] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (activeTour) {
      setCurrentStep(0);
      setIsMinimized(false);
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [tourParam, activeTour]);

  if (!activeTour || !isVisible) {
    return null;
  }

  const step = activeTour.steps[currentStep] || activeTour.steps[0];
  const totalSteps = activeTour.steps.length;
  const progressPercent = Math.round(((currentStep + 1) / totalSteps) * 100);

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleCompleteTour();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("tour");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
    }
  };

  const handleCompleteTour = () => {
    handleClose();
    router.push(activeTour.returnPath);
  };

  if (isMinimized) {
    return (
      <aside
        aria-label="Panduan Interaktif Terciut"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-gradient-to-r from-brand to-brand-dark text-white px-4 py-2.5 rounded-full shadow-2xl border border-white/20 hover:scale-105 transition cursor-pointer"
        onClick={() => setIsMinimized(false)}
      >
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-ping shrink-0" />
        <span className="text-xs font-black tracking-tight">
          Panduan: {activeTour.title} ({currentStep + 1}/{totalSteps})
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsMinimized(false);
          }}
          className="ml-1 text-emerald-100 hover:text-white"
          title="Buka panel panduan"
          aria-label="Buka panel panduan"
        >
          <Eye className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Panduan Interaktif Fitur Unggulan"
      className="fixed bottom-6 right-6 z-50 w-[92vw] max-w-md sm:max-w-lg bg-white dark:bg-slate-900 border-2 border-brand/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300 ring-4 ring-brand/10"
    >
      <div className="bg-gradient-to-r from-brand to-brand-darker text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/20 text-white shrink-0">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-extrabold bg-emerald-300 text-brand-dark px-2 py-0.5 rounded-full">
                {activeTour.badge}
              </span>
              <span className="text-[11px] text-emerald-100 font-semibold truncate">
                Panduan Interaktif
              </span>
            </div>
            <h4 className="text-xs font-black truncate text-white leading-tight mt-0.5">
              {activeTour.title}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-100 hover:text-white hover:bg-white/10 text-xs font-bold"
            title="Kecilkan panel panduan"
            aria-label="Kecilkan panel panduan"
          >
            _
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-100 hover:text-white hover:bg-white/10"
            title="Tutup panduan"
            aria-label="Tutup panduan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 overflow-hidden">
        <div
          className="bg-brand h-full transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand uppercase tracking-wider bg-brand/10 dark:bg-brand/20 px-2.5 py-1 rounded-md">
            {step.targetBadge || `Langkah ${currentStep + 1}`}
          </span>
          <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400">
            {currentStep + 1} dari {totalSteps}
          </span>
        </div>

        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
          {step.title}
        </h3>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
          {step.desc}
        </p>

        {step.actionHint && (
          <div className="flex items-start gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-2.5 mb-4 text-[11px] text-emerald-900 dark:text-emerald-200">
            <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-snug">
              <strong>Petunjuk Aksi:</strong> {step.actionHint}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                currentStep === 0
                  ? "opacity-40 cursor-not-allowed text-slate-400 bg-slate-100 dark:bg-slate-800"
                  : "text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Sebelumnya</span>
            </button>

            <Link
              href={activeTour.returnPath}
              onClick={handleClose}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition"
              title="Kembali ke Buku Panduan Utama"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Daftar Panduan</span>
            </Link>
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-brand hover:bg-brand-dark text-white shadow-md hover:shadow-lg transition"
          >
            {currentStep < totalSteps - 1 ? (
              <>
                <span>Lanjut</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                <span>Selesai & Tutup</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
