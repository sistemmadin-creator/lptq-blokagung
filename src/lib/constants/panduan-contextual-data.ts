/**
 * Basis Data Panduan Kontekstual & Indeks Pencarian Dokumentasi LPTQ Blokagung
 * Menyediakan pemetaan spesifik untuk seluruh rute halaman dan pencarian live search.
 */

export interface ContextualGuide {
  routeKey: string;
  pageTitle: string;
  chapter: string;
  chapterId: string;
  category: string;
  summary: string;
  steps: string[];
  keyFeatures: { title: string; desc: string }[];
  tips: string[];
  tourUrl?: string;
  fullGuideUrl: string;
}

export interface GuideSearchItem {
  id: string;
  title: string;
  chapter: string;
  category: string;
  snippet: string;
  keywords: string[];
  url: string;
  type: "page" | "bab" | "tour";
}

export const CONTEXTUAL_GUIDES: Record<string, ContextualGuide> = {
  "/": {
    routeKey: "/",
    pageTitle: "Dashboard Utama Ringkasan & Tren LPTQ",
    chapter: "BAB 1 & BAB 2: Pendahuluan & Navigasi Sistem",
    chapterId: "bab-1",
    category: "Navigasi & Ringkasan",
    summary:
      "Pusat kendali dan visualisasi performa tahfidz seluruh santri Pondok Pesantren Darussalam Blokagung secara terpadu dan real-time.",
    steps: [
      "Amati 4 Kartu Metrik Utama: Total Santri Aktif, Asatidz Pembimbing, Santri Lulus Khotmil, dan Tingkat Kehadiran Harian.",
      "Gunakan Filter Rentang Waktu (7 Hari, 14 Hari, 30 Hari, atau Bulan Ini) pada grafik tren setoran.",
      "Pantau Grafik Capaian Setoran & Evaluasi untuk melihat dinamika kelancaran hafalan santri.",
      "Cek widget 'Aktivitas Terbaru' dan status koneksi WhatsApp Gateway untuk memastikan operasional berjalan lancar.",
    ],
    keyFeatures: [
      {
        title: "Statistik Real-time",
        desc: "Perhitungan otomatis dari basis data Supabase tanpa perlu refresh manual.",
      },
      {
        title: "Grafik Tren Interaktif",
        desc: "Grafik visual batang dan garis yang responsif di PC maupun smartphone.",
      },
      {
        title: "Pintasan Cepat Modul",
        desc: "Akses langsung ke pencatatan kegiatan, setoran, dan flyer dalam satu klik.",
      },
    ],
    tips: [
      "Tekan logo LPTQ di pojok kiri atas kapan saja untuk kembali ke Dashboard ini.",
      "Gunakan tombol sakelar bulan/matahari di bilah atas untuk beralih antara Mode Gelap dan Terang.",
    ],
    fullGuideUrl: "/pengaturan?tab=panduan#bab-1",
  },

  "/santri": {
    routeKey: "/santri",
    pageTitle: "Master Data Santri Tahfidz",
    chapter: "BAB 3: Pengelolaan Data Santri Tahfidz",
    chapterId: "bab-3",
    category: "Master Data",
    summary:
      "Pangkalan data induk seluruh santri tahfidz dengan penataan hirarki tempat tinggal pesantren (Blok, Asrama, Kamar) dan integrasi kontak WhatsApp wali.",
    steps: [
      "Tambah Santri Baru: Klik tombol hijau '+ Tambah Santri' di kanan atas dan isi biodata lengkap beserta nomor WhatsApp wali.",
      "Impor Massal dari Excel: Klik ikon 'Impor Excel', unduh template standar, isi data (No, Nama, Asrama, Kamar, No WA), lalu unggah kembali.",
      "Pencarian & Filter Cepat: Ketik nama, nomor WA, asrama, atau kamar pada bilah filter tabel.",
      "Ubah / Hapus Data: Gunakan tombol 'Edit' atau 'Hapus' pada baris santri yang bersangkutan.",
      "Cetak & Ekspor: Klik ikon printer untuk mencetak tabel format A4 atau ikon ekspor untuk mengunduh berkas Excel.",
    ],
    keyFeatures: [
      {
        title: "Format WhatsApp Internasional",
        desc: "Nomor HP berawalan 08 atau 8 otomatis dikonversi ke format 62 untuk WhatsApp resmi.",
      },
      {
        title: "Hirarki Tempat Tinggal",
        desc: "Kombinasi Blok, Asrama, dan Kamar mencegah duplikasi penempatan kamar santri.",
      },
      {
        title: "Validasi Impor Cerdas",
        desc: "Pendeteksian otomatis baris kosong, nomor ganda, dan karakter khusus saat mengunggah Excel.",
      },
    ],
    tips: [
      "Pastikan nomor WhatsApp wali valid agar kartu rapor evaluasi dapat terkirim secara otomatis melalui Gateway WAHA.",
      "Tombol 'Tabel' dan 'Kartu' di atas tabel memudahkan tampilan saat dibuka di layar smartphone.",
    ],
    tourUrl: "/panduan/simulasi?tour=santri",
    fullGuideUrl: "/pengaturan?tab=panduan#bab-3",
  },

  "/halaqoh": {
    routeKey: "/halaqoh",
    pageTitle: "Manajemen Halaqoh & Pembimbing",
    chapter: "BAB 4: Manajemen Halaqoh Al-Qur'an",
    chapterId: "bab-4",
    category: "Master Data",
    summary:
      "Pengelompokan santri ke dalam 10 tingkatan kelas halaqoh (target 3 juz per kelas) dan rombel bagian A sampai F beserta asatidz pembimbing.",
    steps: [
      "Pilih Kelas Halaqoh: Klik tab kelas (1 s.d. 10) sesuai jenjang target juz santri.",
      "Pilih Bagian / Rombel: Klik sub-bagian (A, B, C, D, E, F) untuk melihat daftar santri di kelompok tersebut.",
      "Atur Asatidz Pembimbing: Masukkan nama ustadz/ustadzah pembina dan nomor kontak WhatsApp resminya.",
      "Pantau Rekap Alfa: Perhatikan kotak peringatan santri dengan ketidakhadiran tertinggi pada bulan berjalan.",
      "Buka Jendela Detail: Klik kartu kelompok untuk melihat rekap kegiatan dan setoran bulanan santri.",
    ],
    keyFeatures: [
      {
        title: "Struktur 10 Kelas Berjenjang",
        desc: "Membagi target 30 juz: Kelas 1 (Juz 1-3), Kelas 2 (Juz 4-6), hingga Kelas 10 (Juz 28-30).",
      },
      {
        title: "Integrasi Kontak WhatsApp Guru",
        desc: "Memudahkan pengurus pusat menghubungi ustadz pembina halaqoh bersangkutan.",
      },
      {
        title: "Deteksi Santri Rawan Alfa",
        desc: "Otomatis menghitung akumulasi ketidakhadiran tanpa izin untuk pembinaan disiplin.",
      },
    ],
    tips: [
      "Santri yang telah tuntas 3 juz di kelasnya dapat dinaikkan ke kelas berikutnya melalui menu Master Santri.",
    ],
    tourUrl: "/panduan/simulasi?tour=halaqoh",
    fullGuideUrl: "/pengaturan?tab=panduan#bab-4",
  },

  "/tahfidz/umum/kegiatan": {
    routeKey: "/tahfidz/umum/kegiatan",
    pageTitle: "Presensi Kegiatan Halaqoh Harian",
    chapter: "BAB 5: Tahfidz Umum (Kegiatan dan Setoran)",
    chapterId: "bab-5",
    category: "Tahfidz Umum",
    summary:
      "Pencatatan kehadiran santri dua kali sehari (sesi Pagi ba'da Shubuh dan Malam ba'da Maghrib) dengan matriks kalender interaktif bulanan.",
    steps: [
      "Pilih Halaqoh & Sesi: Tentukan kelas halaqoh, bulan, dan sesi presensi (Pagi atau Malam).",
      "Gunakan 'Set Semua Hadir': Klik tombol hijau untuk menandai seluruh santri hadir sekaligus dalam 1 detik.",
      "Sesuaikan yang Berhalangan: Klik sel tanggal santri yang tidak masuk untuk mengubah ke Alfa (merah), Izin (kuning), atau Sakit (biru).",
      "Perhatikan Hari Libur: Hari Jumat otomatis ditandai abu-abu sebagai jadwal libur kegiatan pesantren.",
      "Simpan Otomatis: Setiap perubahan status tersimpan langsung ke server tanpa perlu tombol simpan manual.",
    ],
    keyFeatures: [
      {
        title: "Dual Sesi Pagi & Malam",
        desc: "Pemisahan catatan kehadiran antara sesi ba'da Shubuh dan ba'da Maghrib.",
      },
      {
        title: "Satu Klik 'Set Semua Hadir'",
        desc: "Memangkas waktu pencatatan presensi dari 5 menit menjadi kurang dari 3 detik.",
      },
      {
        title: "Toleransi Koreksi Instan",
        desc: "Mengklik sel yang sama akan menggulir status: Hadir ➔ Izin ➔ Sakit ➔ Alfa.",
      },
    ],
    tips: [
      "Operator Absensi hanya memerlukan akun khusus berotoritas 'Operator Absen' untuk mencatat di halaman ini.",
    ],
    tourUrl: "/panduan/simulasi?tour=kegiatan",
    fullGuideUrl: "/pengaturan?tab=panduan#bab-5",
  },

  "/tahfidz/umum/juz-baru": {
    routeKey: "/tahfidz/umum/juz-baru",
    pageTitle: "Setoran Ziyadah Juz Baru (Pembimbing)",
    chapter: "BAB 5: Tahfidz Umum (Kegiatan dan Setoran)",
    chapterId: "bab-5",
    category: "Tahfidz Umum",
    summary:
      "Pencatatan perolehan hafalan baru yang disetorkan santri kepada asatidz pembimbing dengan akumulasi bulanan dari Januari hingga Desember.",
    steps: [
      "Pilih Kelompok Halaqoh dan Tahun Masehi berjalan pada bilah atas.",
      "Tambah Catatan Baru: Klik tombol '+ Tambah Setoran', pilih nama santri, tanggal setoran, dan juz yang disetorkan.",
      "Edit Cepat di Sel: Anda dapat mengklik langsung nilai perolehan di dalam tabel bulanan untuk memperbarui angka.",
      "Pantau Kolom Total: Kolom 'Total Juz' di sisi kanan otomatis menghitung akumulasi juz yang telah diselesaikan santri.",
    ],
    keyFeatures: [
      {
        title: "Matriks 12 Bulan (Jan - Des)",
        desc: "Merekam progres hafalan santri sepanjang tahun masehi secara komprehensif.",
      },
      {
        title: "Inline Cell Editing",
        desc: "Mempercepat asatidz mengoreksi data tanpa membuka form pop-up satu per satu.",
      },
      {
        title: "Akumulasi Otomatis",
        desc: "Total hafalan langsung sinkron dengan profil santri dan syarat ujian khotmil.",
      },
    ],
    tips: [
      "Pastikan juz baru yang disetorkan santri telah diuji kelancarannya sebelum diinputkan ke sistem.",
    ],
    tourUrl: "/panduan/simulasi?tour=juz_baru",
    fullGuideUrl: "/pengaturan?tab=panduan#bab-5",
  },

  "/tahfidz/umum/evaluasi": {
    routeKey: "/tahfidz/umum/evaluasi",
    pageTitle: "Evaluasi Hafalan Periodik (Pengurus Pusat)",
    chapter: "BAB 5: Tahfidz Umum (Kegiatan dan Setoran)",
    chapterId: "bab-5",
    category: "Tahfidz Umum",
    summary:
      "Pengujian berkala kelancaran hafalan santri oleh Pengurus Pusat LPTQ untuk memverifikasi hafalan mutqin sebelum diajukan ke ujian khotmil.",
    steps: [
      "Pilih Kelas Halaqoh atau cari santri yang dijadwalkan mengikuti evaluasi.",
      "Input Nilai Pengujian: Masukkan nilai kelancaran, fashohah, dan tajwid dari penguji pusat.",
      "Tentukan Status Lulus / Mengulang berdasarkan batas KKM yang ditetapkan lembaga.",
      "Cetak Kartu Rapor: Tekan tombol cetak rapor evaluasi resmi untuk diserahkan ke wali santri.",
    ],
    keyFeatures: [
      {
        title: "Standar Uji Mutqin",
        desc: "Memastikan kualitas hafalan santri terjaga sebelum melangkah ke jenjang khotmil.",
      },
      {
        title: "Sinkronisasi Tren Dashboard",
        desc: "Hasil evaluasi langsung memengaruhi grafik tren kelulusan di Dashboard utama.",
      },
    ],
    tips: [
      "Hasil evaluasi di halaman ini dapat langsung dikirimkan ke WhatsApp wali melalui menu 'Kirim WA'.",
    ],
    tourUrl: "/panduan/simulasi?tour=evaluasi",
    fullGuideUrl: "/pengaturan?tab=panduan#bab-5",
  },

  "/tahfidz/khotmil/15": {
    routeKey: "/tahfidz/khotmil/15",
    pageTitle: "Ujian Khotmil 15 Juz & Scanner OMR",
    chapter: "BAB 6: Tahfidz Khotmil (15 Juz dan 30 Juz)",
    chapterId: "bab-6",
    category: "Tahfidz Khotmil",
    summary:
      "Sistem munaqosyah berjenjang Khotmil 15 Juz yang terbagi dalam 5 tahap ujian dengan standar kelulusan KKM 85 dan koreksi LJK kamera OMR.",
    steps: [
      "Pilih Tahap Ujian: Klik tab Tahap 1 (Juz 1-3), Tahap 2 (Juz 4-6), Tahap 3 (Juz 7-9), Tahap 4 (Juz 10-12), atau Tahap 5 (Juz 13-15).",
      "Cetak LJK Ber-QR: Klik tombol 'Cetak LJK' untuk mencetak lembar jawab resmi peserta yang dilengkapi QR code unik.",
      "Munaqosyah & Pengarsiran: Penguji mengarsir bulanan nilai pada lembar LJK fisik selama ujian.",
      "Koreksi Otomatis OMR: Klik 'Pindai LJK Kamera', arahkan kamera ke lembar LJK, sistem otomatis membaca bulatan dan menghitung nilai.",
      "Input Manual / Edit Cepat: Anda juga dapat memasukkan nilai langsung di kolom tabel jika tanpa kamera.",
      "Impor/Ekspor Excel: Gunakan template kolom tabel resmi (No, Nama Santri, Asrama, Halaqoh, Juz 1 s.d. 5).",
    ],
    keyFeatures: [
      {
        title: "5 Tahap Berjenjang",
        desc: "Ujian terbagi rapi tiap 3 juz untuk menjaga kemutqinan hafalan santri.",
      },
      {
        title: "Rumus Baku KKM 85",
        desc: "Bobot Kelancaran Halaman 65% + Bobot Minim Kesalahan 35%.",
      },
      {
        title: "Scanner OMR Kamera Seketika",
        desc: "Membaca QR kode santri dan bulatan pensil dalam hitungan 1-2 detik.",
      },
    ],
    tips: [
      "Pastikan pencahayaan cukup dan lembar LJK tidak terlipat saat melakukan pemindaian kamera OMR.",
    ],
    tourUrl: "/panduan/simulasi?tour=khotmil",
    fullGuideUrl: "/pengaturan?tab=panduan#bab-6",
  },

  "/tahfidz/khotmil/30": {
    routeKey: "/tahfidz/khotmil/30",
    pageTitle: "Ujian Khotmil 30 Juz & Scanner OMR",
    chapter: "BAB 6: Tahfidz Khotmil (15 Juz dan 30 Juz)",
    chapterId: "bab-6",
    category: "Tahfidz Khotmil",
    summary:
      "Pelaksanaan ujian akhir khataman Al-Qur'an 30 Juz Bil Hifdzi (9 Tahap) sebagai syarat resmi wisuda tahfidz Pondok Pesantren Darussalam Blokagung.",
    steps: [
      "Pilih Tahap 1 s.d. Tahap 9 sesuai jenjang juz yang sedang diujikan.",
      "Cetak LJK Resmi Khotmil 30 Juz ber-QR Code untuk masing-masing santri peserta ujian.",
      "Gunakan Scanner OMR Kamera untuk koreksi instan atau masukkan nilai langsung pada tabel.",
      "Verifikasi Kelulusan KKM: Santri yang tuntas nilai rata-rata >= 85 dinyatakan Lulus.",
      "Impor/Ekspor Excel: Menggunakan template resmi kolom tabel 9 tahap juz.",
    ],
    keyFeatures: [
      {
        title: "9 Tahap Wisuda 30 Juz",
        desc: "Tahapan baku penentu kelulusan wisudawan/wisudawati Al-Qur'an.",
      },
      {
        title: "Terhubung Otomatis ke Flyer Khataman",
        desc: "Santri yang lulus tahap 9 otomatis terdaftar pada generator Flyer Apresiasi Khataman.",
      },
      {
        title: "Rekap Nilai Kumulatif",
        desc: "Nilai seluruh 9 tahap tercatat permanen dalam arsip transkrip tahfidz pondok.",
      },
    ],
    tips: [
      "Santri yang telah lulus 30 juz dapat langsung dibuatkan poster flyer di menu 'Flyer Khataman Al-Qur'an'.",
    ],
    tourUrl: "/panduan/simulasi?tour=khotmil",
    fullGuideUrl: "/pengaturan?tab=panduan#bab-6",
  },

  "/tahfidz/khotmil/rekap/15": {
    routeKey: "/tahfidz/khotmil/rekap/15",
    pageTitle: "Rekapitulasi Kelulusan Khotmil 15 Juz",
    chapter: "BAB 6: Tahfidz Khotmil (15 Juz dan 30 Juz)",
    chapterId: "bab-6",
    category: "Tahfidz Khotmil",
    summary:
      "Tabel rekapitulasi kumulatif kelulusan 5 tahap ujian Khotmil 15 Juz santri untuk evaluasi kelayakan naik ke juz 16 ke atas.",
    steps: [
      "Tinjau status kelulusan tiap tahap (Tahap 1 s.d. 5) pada tabel santri.",
      "Filter berdasarkan Asrama atau Halaqoh untuk memantau perolehan santri bimbingan.",
      "Cetak Berita Acara / Ekspor Laporan Excel untuk arsip laporan pengurus pusat.",
    ],
    keyFeatures: [
      {
        title: "Matriks Ketuntasan 5 Tahap",
        desc: "Melihat riwayat nilai tiap tahap secara berdampingan dalam satu layar.",
      },
      {
        title: "Persentase Kelulusan",
        desc: "Menghitung rasio santri tuntas KKM vs yang masih perlu remidi.",
      },
    ],
    tips: [
      "Santri yang belum tuntas salah satu tahap dapat dijadwalkan ujian susulan pada tahap bersangkutan.",
    ],
    fullGuideUrl: "/pengaturan?tab=panduan#bab-6",
  },

  "/tahfidz/khotmil/rekap/30": {
    routeKey: "/tahfidz/khotmil/rekap/30",
    pageTitle: "Rekapitulasi Kelulusan Khotmil 30 Juz",
    chapter: "BAB 6: Tahfidz Khotmil (15 Juz dan 30 Juz)",
    chapterId: "bab-6",
    category: "Tahfidz Khotmil",
    summary:
      "Daftar rekapitulasi kelulusan 9 tahap munaqosyah Khotmil 30 Juz Bil Hifdzi sebagai rujukan daftar peserta wisuda dan penerima syahadah.",
    steps: [
      "Periksa kelengkapan nilai Tahap 1 hingga Tahap 9 seluruh calon wisudawan.",
      "Pastikan status kelulusan akhir telah bertanda 'LULUS 30 JUZ'.",
      "Gunakan tombol Ekspor untuk mencetak lampiran Surat Keputusan (SK) Kelulusan Tahfidz.",
    ],
    keyFeatures: [
      {
        title: "Rujukan Sah Wisuda",
        desc: "Data pada rekapitulasi ini menjadi acuan pencetakan ijazah dan syahadah resmi.",
      },
      {
        title: "Filter Asrama & Kelas",
        desc: "Mempermudah koordinasi pengurus asrama santri berprestasi.",
      },
    ],
    tips: [
      "Gunakan data ini untuk mengirimkan laporan ucapan selamat massal ke seluruh wali santri.",
    ],
    fullGuideUrl: "/pengaturan?tab=panduan#bab-6",
  },

  "/alat/flyer-khataman": {
    routeKey: "/alat/flyer-khataman",
    pageTitle: "Generator Flyer Khataman 30 Juz & Kirim WA",
    chapter: "BAB 7: Alat Lanjutan (Flyer Khataman & WhatsApp Gateway)",
    chapterId: "bab-7",
    category: "Alat Lanjutan",
    summary:
      "Pembuatan poster apresiasi wisuda khataman 30 juz (bil hifdzi) santri secara otomatis dari database dengan sistem Template Flyer resmi, geser foto interaktif di kanvas, dan kirim langsung via WhatsApp.",
    steps: [
      "Pilih Santri Khatam: Gunakan dropdown pencarian santri (otomatis filter santri yang telah lulus 30 juz).",
      "Pilih Template: Klik tombol 'Template Flyer' di header untuk memilih desain twibbon resmi (putri/putra) atau kustom.",
      "Unggah & Atur Foto: Unggah foto santri, lalu posisikan langsung di dalam kanvas.",
      "Geser Foto di Kanvas: Klik dan tahan mouse di PC untuk drag posisi foto; atau ketuk dua kali (double-tap) di HP layar sentuh.",
      "Gunakan 'Tengahkan Foto' jika ingin mengembalikan foto tepat ke tengah bingkai kubah.",
      "Kirim ke WhatsApp: Klik tombol hijau 'Kirim WA' untuk mengirim poster ke wali santri via Gateway WAHA atau WhatsApp Web.",
      "Unduh Berkas Gambar: Klik tombol 'Unduh PNG' untuk mengunduh poster beresolusi tinggi 814x1024 px.",
    ],
    keyFeatures: [
      {
        title: "Sistem Template Flyer Preset",
        desc: "Pilihan resmi twibbon putri & putra yang menggantikan tombol Posisi Terkunci lama.",
      },
      {
        title: "Kanvas Interaktif PC & HP",
        desc: "Bisa menggeser (drag/pan) foto dan zoom skala foto secara mulus langsung di atas kanvas.",
      },
      {
        title: "Kirim WA Dual-Engine",
        desc: "Kirim otomatis via Gateway WAHA di latar belakang atau salin gambar instan (Ctrl + V) ke WA Web.",
      },
      {
        title: "Penanggalan Masehi & Hijriah Otomatis",
        desc: "Konversi otomatis kalender Hijriah hisab terpadu khas pesantren.",
      },
    ],
    tips: [
      "Di smartphone, ketuk tombol mengambang 'Geser Foto (HP)' untuk mengaktifkan atau menyelesaikan mode geser foto.",
      "Saat mengirim via WA Web di desktop, gambar flyer otomatis tersalin ke clipboard; Anda cukup menekan Ctrl + V di chat.",
    ],
    tourUrl: "/panduan/simulasi?tour=flyer",
    fullGuideUrl: "/pengaturan?tab=panduan#bab-7",
  },

  "/alat/kirim-wa": {
    routeKey: "/alat/kirim-wa",
    pageTitle: "WhatsApp Gateway (WAHA), Scan QR & Broadcast Rapor",
    chapter: "BAB 7: Alat Lanjutan (Flyer Khataman & WhatsApp Gateway)",
    chapterId: "bab-7",
    category: "Alat Lanjutan",
    summary:
      "Layanan pengiriman laporan evaluasi dan kartu rapor digital bergambar ke WhatsApp wali santri 100% gratis selamanya via Baileys & Cloudflare Tunnel.",
    steps: [
      "Jalankan Gateway di Laptop: Buka command prompt laptop dan jalankan server gateway lokal port 3008.",
      "Pilih Jalur Koneksi: Pilih 'Cloudflare HTTPS Tunnel' jika membuka web di Vercel, atau 'Port Lokal (3008)' jika membuka web di localhost.",
      "Scan QR Code: Klik tombol status gateway, scan QR Code yang muncul di layar dengan WhatsApp HP Anda.",
      "Pilih Santri yang Ingin Dikirimi: Centang santri peserta ujian pada tabel sebelah kiri.",
      "Periksa Pratinjau Rapor: Klik salah satu baris santri untuk melihat tampilan kartu rapor digital.",
      "Mulai Broadcast: Klik tombol hijau 'Mulai Kirim Broadcast' untuk pengiriman massal dengan jeda anti-banned acak (4-7 detik).",
      "Kirim Tunggal via WA Web: Klik tombol 'Kirim WA' di tabel untuk langsung membuka WhatsApp Web dengan gambar rapor otomatis tersalin ke clipboard.",
    ],
    keyFeatures: [
      {
        title: "100% Gratis Selamanya",
        desc: "Tanpa biaya per pesan Meta API, menggunakan open-source engine Baileys dan Cloudflare Quick Tunnel.",
      },
      {
        title: "Jeda Otomatis Anti-Banned",
        desc: "Jeda acak 4-7 detik meniru ketikan manusia sehingga nomor aman dari pemblokiran spam.",
      },
      {
        title: "Scan QR Langsung di Modal",
        desc: "QR code ditampilkan secara interaktif di layar web tanpa perlu membuka tab backend lain.",
      },
      {
        title: "Kartu Rapor Digital Bergambar",
        desc: "Menghasilkan kartu rapor grafis tajam berlogo resmi LPTQ Darussalam Blokagung.",
      },
    ],
    tips: [
      "Pastikan laptop tetap menyala dan terhubung ke internet saat proses broadcast massal sedang berjalan.",
      "Jika membuka website dari domain Vercel (https://), wajib memilih opsi 'Cloudflare HTTPS Tunnel' agar tidak terblokir Mixed Content browser.",
    ],
    tourUrl: "/panduan/simulasi?tour=wa",
    fullGuideUrl: "/pengaturan?tab=panduan#bab-7",
  },

  "/pengaturan": {
    routeKey: "/pengaturan",
    pageTitle: "Pengaturan Sistem, Profil Lembaga & Backup",
    chapter: "BAB 8: Pengaturan dan Administrasi Sistem",
    chapterId: "bab-8",
    category: "Pengaturan & Konfigurasi",
    summary:
      "Pusat konfigurasi identitas visual lembaga, nilai standar kelulusan KKM, pencadangan basis data JSON, dan akses buku panduan lengkap.",
    steps: [
      "Ubah Identitas Lembaga: Perbarui Nama Lembaga, Nilai Standar KKM (default 85), dan logo pada tab 'Branding'.",
      "Ganti Foto Latar Belakang Login: Unggah foto masjid / gedung pesantren untuk mempercantik layar login.",
      "Cadangkan Data (Backup): Klik tombol 'Unduh Cadangan JSON' untuk mengamankan seluruh data santri, setoran, dan nilai ke laptop.",
      "Buku Panduan Lengkap: Buka tab 'Buku Panduan' untuk membaca atau mencetak panduan resmi BAB 1 s.d. BAB 9 format A4.",
    ],
    keyFeatures: [
      {
        title: "Kustomisasi Branding",
        desc: "Mengubah nama lembaga dan visual aplikasi secara dinamis tanpa menyentuh kode program.",
      },
      {
        title: "Cadangan Mandiri (JSON Backup)",
        desc: "Memberikan rasa aman bagi pengurus jika sewaktu-waktu membutuhkan arsip offline.",
      },
      {
        title: "Buku Panduan Siap Cetak (A4)",
        desc: "Dilengkapi fitur print PDF dengan tata letak dokumen resmi lembaga.",
      },
    ],
    tips: [
      "Lakukan pencadangan (backup) data secara rutin setiap akhir semester sebelum munaqosyah wisuda.",
    ],
    tourUrl: "/panduan/simulasi?tour=pengaturan",
    fullGuideUrl: "/pengaturan?tab=panduan#bab-8",
  },

  "/pengaturan/pengguna": {
    routeKey: "/pengaturan/pengguna",
    pageTitle: "Daftar Pengguna & Otoritas Modul",
    chapter: "BAB 8: Pengaturan dan Administrasi Sistem",
    chapterId: "bab-8",
    category: "Pengaturan & Konfigurasi",
    summary:
      "Manajemen akun petugas LPTQ, pembagian 5 peran (Admin, Pengurus, Pembimbing, Operator, Viewer), serta penugasan hak akses granular per modul.",
    steps: [
      "Tambah Akun Petugas: Klik '+ Tambah Pengguna Baru', isi Nama, Username, Email, dan tentukan Peran utama.",
      "Tentukan Hak Akses Granular: Atur izin per modul (Sembunyikan, Baca Saja, atau Dapat Mengedit).",
      "Penugasan Halaqoh: Untuk ustadz pembimbing, pilih kelas halaqoh binaannya agar hanya dapat mengedit kelompoknya.",
      "Beralih ke Log Aktivitas: Gunakan sakelar segmented switch di atas tabel untuk melihat riwayat aktivitas seluruh petugas.",
    ],
    keyFeatures: [
      {
        title: "5 Peran Akun Bertingkat",
        desc: "Admin (Akses Penuh), Pengurus Pusat, Pembimbing Halaqoh, Operator Absensi, dan Viewer.",
      },
      {
        title: "Matriks Otoritas Granular",
        desc: "Tiap modul dapat diatur izinnya secara spesifik (Hidden, Read-Only, Read-Write).",
      },
      {
        title: "Row-Level Security (RLS)",
        desc: "Keamanan data level database Supabase menjamin akun tidak bisa mengakses data di luar wewenangnya.",
      },
    ],
    tips: [
      "Gunakan peran 'Operator Absen' untuk santri piket agar hanya bisa mengisi presensi kegiatan tanpa bisa mengubah data nilai ujian.",
    ],
    tourUrl: "/panduan/simulasi?tour=pengaturan",
    fullGuideUrl: "/pengaturan?tab=panduan#bab-8",
  },

  "/pengaturan/log-aktivitas": {
    routeKey: "/pengaturan/log-aktivitas",
    pageTitle: "Log Aktivitas Pengguna & Audit Retensi 6 Bulan",
    chapter: "BAB 8: Pengaturan dan Administrasi Sistem",
    chapterId: "bab-8",
    category: "Pengaturan & Konfigurasi",
    summary:
      "Rekam jejak audit keamanan seluruh aktivitas pengguna sistem (login, impor nilai, perubahan santri, broadcast WA) yang otomatis dibersihkan setiap 6 bulan (180 hari).",
    steps: [
      "Lihat Riwayat Terkini: Tabel memuat nama pengguna, aksi operasional, modul terkait, alamat IP, dan waktu eksekusi.",
      "Filter Kata Kunci / Modul: Cari berdasarkan nama pengguna, jenis aksi, atau modul tertentu.",
      "Ekspor Audit ke Excel: Klik tombol 'Ekspor Log Excel' untuk menyimpan laporan audit resmi ke komputer.",
      "Pemangkasan Otomatis: Sistem secara berkala menghapus catatan log yang berusia lebih dari 180 hari untuk menjaga performa database.",
    ],
    keyFeatures: [
      {
        title: "Audit Keamanan Transparan",
        desc: "Mencegah manipulasi data dan memantau siapa yang mengubah data nilai ujian atau biodata.",
      },
      {
        title: "Retensi Otomatis 180 Hari",
        desc: "Menjaga ruang penyimpanan database Supabase Free Tier tetap ramping dan cepat selamanya.",
      },
      {
        title: "Ekspor Excel Siap Audit",
        desc: "Memudahkan pelaporan berkala kepada pengasuh pondok pesantren.",
      },
    ],
    tips: [
      "Anda dapat membuka langsung halaman ini melalui URL query: /pengaturan?tab=pengguna&sub=log.",
    ],
    fullGuideUrl: "/pengaturan?tab=panduan#bab-8",
  },

  "/panduan/simulasi": {
    routeKey: "/panduan/simulasi",
    pageTitle: "Pusat Tur Simulasi Interaktif Modul",
    chapter: "BAB 1 s.d. BAB 7: Tur Interaktif Terpandu",
    chapterId: "bab-1",
    category: "Panduan & Simulasi",
    summary:
      "Laboratorium simulasi interaktif langkah-demi-langkah dengan data tiruan (dummy) yang aman untuk melatih pengurus baru tanpa takut merusak data riil pondok.",
    steps: [
      "Pilih Modul yang Ingin Dipelajari pada dropdown 'Ganti Fitur' di pojok kanan atas.",
      "Ikuti Petunjuk Panah Kuning dan teks panduan langkah di kartu mengambang kanan bawah.",
      "Klik Tombol 'Lanjut (Simulasikan Aksi)' untuk melihat interaksi berjalan otomatis layaknya penggunaan nyata.",
      "Tekan 'Reset' untuk mengulang simulasi dari langkah pertama.",
      "Tekan 'Keluar Simulasi' di pojok kiri atas untuk kembali ke halaman kerja sistem.",
    ],
    keyFeatures: [
      {
        title: "Data Dummy 100% Aman",
        desc: "Seluruh aksi di ruang simulasi tidak menyentuh maupun mengubah database asli santri.",
      },
      {
        title: "Panduan Panah Visual Dinamis",
        desc: "Menunjuk langsung elemen tombol yang harus diklik pada setiap langkah.",
      },
      {
        title: "Mencakup 6 Modul Utama",
        desc: "Simulasi Absensi Kegiatan, Setoran Juz Baru, Evaluasi Ujian, Khotmil OMR, Flyer Khataman, dan WA Gateway.",
      },
    ],
    tips: [
      "Sangat direkomendasikan bagi asatidz dan pengurus baru sebelum mulai mengoperasikan sistem secara langsung.",
    ],
    fullGuideUrl: "/pengaturan?tab=panduan",
  },
};

/**
 * Basis Data Indeks Pencarian Khusus Panduan (Live Search)
 * Mencakup seluruh bab buku panduan (BAB 1 - 9), seluruh halaman sistem, dan modul simulasi.
 */
export const GUIDE_SEARCH_INDEX: GuideSearchItem[] = [
  // --- INDEKS PER BAB ---
  {
    id: "search-bab-1",
    title: "BAB 1: Pendahuluan dan Arsitektur Sistem",
    chapter: "BAB 1",
    category: "Konsep & Arsitektur",
    snippet:
      "Profil sistem LPTQ Blokagung, tumpukan teknologi Next.js 14 & Supabase, matriks 5 peran pengguna, dan izin granular per modul.",
    keywords: ["arsitektur", "supabase", "nextjs", "peran", "role", "admin", "pengurus", "pembimbing", "operator", "viewer", "pendahuluan", "rls"],
    url: "/pengaturan?tab=panduan#bab-1",
    type: "bab",
  },
  {
    id: "search-bab-2",
    title: "BAB 2: Akses Masuk dan Navigasi Sistem",
    chapter: "BAB 2",
    category: "Navigasi & Akun",
    snippet:
      "Prosedur autentikasi login, semat pin sidebar responsif, bilah atas pencarian cepat santri, sakelar tema gelap, dan pengamanan sesi.",
    keywords: ["login", "masuk", "password", "kata sandi", "sidebar", "navigasi", "mode gelap", "dark mode", "keluar", "logout", "keamanan"],
    url: "/pengaturan?tab=panduan#bab-2",
    type: "bab",
  },
  {
    id: "search-bab-3",
    title: "BAB 3: Pengelolaan Data Santri Tahfidz",
    chapter: "BAB 3",
    category: "Master Data",
    snippet:
      "Pencatatan NIS santri, nomor WhatsApp wali internasional (+62), hirarki Blok Asrama Kamar, impor massal Excel template resmi, dan ekspor cetak.",
    keywords: ["santri", "biodata", "nis", "asrama", "kamar", "blok", "whatsapp", "wali", "impor excel", "import", "ekspor", "cetak", "a4"],
    url: "/pengaturan?tab=panduan#bab-3",
    type: "bab",
  },
  {
    id: "search-bab-4",
    title: "BAB 4: Manajemen Halaqoh Al-Qur'an",
    chapter: "BAB 4",
    category: "Master Data",
    snippet:
      "Pembagian 10 kelas halaqoh (target 3 juz/kelas, rombel A-F), penugasan asatidz pembina, kontak WA guru, dan pemantauan santri alfa.",
    keywords: ["halaqoh", "kelas", "rombel", "ustadz", "pembimbing", "guru", "alfa", "absen", "target juz", "kelompok"],
    url: "/pengaturan?tab=panduan#bab-4",
    type: "bab",
  },
  {
    id: "search-bab-5",
    title: "BAB 5: Tahfidz Umum (Kegiatan dan Setoran)",
    chapter: "BAB 5",
    category: "Tahfidz Umum",
    snippet:
      "Presensi harian Pagi & Malam, tombol 'Set Semua Hadir', kalender bulanan, setoran ziyadah juz baru Jan-Des, dan evaluasi mutqin pengurus.",
    keywords: ["kegiatan", "presensi", "kehadiran", "pagi", "malam", "shubuh", "maghrib", "set semua hadir", "juz baru", "ziyadah", "evaluasi", "mutqin"],
    url: "/pengaturan?tab=panduan#bab-5",
    type: "bab",
  },
  {
    id: "search-bab-6",
    title: "BAB 6: Tahfidz Khotmil (15 Juz dan 30 Juz)",
    chapter: "BAB 6",
    category: "Tahfidz Khotmil",
    snippet:
      "Ujian munaqosyah berjenjang (5 tahap pada 15 juz; 9 tahap pada 30 juz), rumus baku KKM 85, cetak LJK ber-QR Code, dan koreksi kamera OMR.",
    keywords: ["khotmil", "15 juz", "30 juz", "ujian", "munaqosyah", "kkm", "85", "ljk", "omr", "kamera", "scan", "kelulusan", "rekap khotmil"],
    url: "/pengaturan?tab=panduan#bab-6",
    type: "bab",
  },
  {
    id: "search-bab-7",
    title: "BAB 7: Alat Lanjutan (Flyer Khataman & WhatsApp Gateway)",
    chapter: "BAB 7",
    category: "Alat Lanjutan",
    snippet:
      "Alur lengkap WhatsApp Gateway WAHA Port 3008 & Cloudflare HTTPS Tunnel gratis selamanya, scan QR di modal, jeda anti-banned, dan Generator Flyer Khataman kanvas interaktif.",
    keywords: [
      "whatsapp",
      "waha",
      "gateway",
      "baileys",
      "cloudflare tunnel",
      "port 3008",
      "gratis",
      "scan qr",
      "qr code",
      "anti banned",
      "jeda",
      "rapor",
      "flyer",
      "khataman",
      "twibbon",
      "geser foto",
      "tengahkan foto",
      "template flyer",
      "ctrl v",
      "clipboard",
    ],
    url: "/pengaturan?tab=panduan#bab-7",
    type: "bab",
  },
  {
    id: "search-bab-8",
    title: "BAB 8: Pengaturan dan Administrasi Sistem",
    chapter: "BAB 8",
    category: "Pengaturan & Sistem",
    snippet:
      "Branding visual lembaga, nilai KKM, manajemen akun pengguna bertingkat, cadangan JSON (backup), dan log aktivitas retensi 6 bulan.",
    keywords: ["pengaturan", "branding", "logo", "favicon", "kkm", "backup", "cadangan json", "pengguna", "user", "otoritas", "log aktivitas", "retensi", "6 bulan", "180 hari"],
    url: "/pengaturan?tab=panduan#bab-8",
    type: "bab",
  },
  {
    id: "search-bab-9",
    title: "BAB 9: Standar Operasional Prosedur (SOP)",
    chapter: "BAB 9",
    category: "SOP Pesantren",
    snippet:
      "SOP penerimaan santri baru, SOP presensi harian ba'da Shubuh & Maghrib, SOP ujian khotmil LJK & OMR, serta SOP siaran WhatsApp ke wali santri.",
    keywords: ["sop", "standar operasional", "prosedur", "tata tertib", "wisuda", "pengumuman", "wali santri"],
    url: "/pengaturan?tab=panduan#bab-9",
    type: "bab",
  },

  // --- INDEKS TUR SIMULASI INTERAKTIF ---
  {
    id: "tour-santri",
    title: "Simulasi: Master Data Santri & Hirarki Kamar",
    chapter: "SIMULASI",
    category: "Tur Interaktif",
    snippet: "Tur langkah-demi-langkah panduan pendaftaran santri baru, penataan asrama, dan impor Excel dengan data dummy aman.",
    keywords: ["simulasi santri", "tur santri", "latihan santri", "impor excel dummy"],
    url: "/panduan/simulasi?tour=santri",
    type: "tour",
  },
  {
    id: "tour-kegiatan",
    title: "Simulasi: Presensi Absensi Halaqoh Harian",
    chapter: "SIMULASI",
    category: "Tur Interaktif",
    snippet: "Tur interaktif mencoba tombol 'Set Semua Hadir' dan penggantian status Alfa/Izin/Sakit pada kalender presensi.",
    keywords: ["simulasi kegiatan", "tur absen", "latihan presensi", "set semua hadir"],
    url: "/panduan/simulasi?tour=kegiatan",
    type: "tour",
  },
  {
    id: "tour-juz-baru",
    title: "Simulasi: Setoran Ziyadah Hafalan Baru",
    chapter: "SIMULASI",
    category: "Tur Interaktif",
    snippet: "Tur interaktif cara menginput setoran bulanan santri dan pengeditan cepat langsung pada tabel matriks.",
    keywords: ["simulasi setoran", "tur juz baru", "latihan ziyadah"],
    url: "/panduan/simulasi?tour=juz_baru",
    type: "tour",
  },
  {
    id: "tour-khotmil",
    title: "Simulasi: Ujian Khotmil & Scanner LJK OMR Kamera",
    chapter: "SIMULASI",
    category: "Tur Interaktif",
    snippet: "Tur interaktif cara mencetak LJK ber-QR Code dan menyimulasikan pemindaian kamera otomatis untuk koreksi nilai.",
    keywords: ["simulasi khotmil", "tur omr", "latihan scanner", "ljk kamera"],
    url: "/panduan/simulasi?tour=khotmil",
    type: "tour",
  },
  {
    id: "tour-flyer",
    title: "Simulasi: Generator Flyer Khataman 30 Juz",
    chapter: "SIMULASI",
    category: "Tur Interaktif",
    snippet: "Tur interaktif mencoba template flyer resmi, menggeser foto di kanvas, hingga mengunduh poster resolusi tinggi.",
    keywords: ["simulasi flyer", "tur twibbon", "latihan flyer", "geser foto"],
    url: "/panduan/simulasi?tour=flyer",
    type: "tour",
  },
  {
    id: "tour-wa",
    title: "Simulasi: Broadcast WhatsApp Gateway & Kirim Rapor",
    chapter: "SIMULASI",
    category: "Tur Interaktif",
    snippet: "Tur interaktif menghubungkan WhatsApp gateway, scan QR code, hingga mengirim broadcast laporan evaluasi ke wali santri.",
    keywords: ["simulasi wa", "tur waha", "latihan gateway", "broadcast rapor"],
    url: "/panduan/simulasi?tour=wa",
    type: "tour",
  },
];

/**
 * Mencari panduan kontekstual secara spesifik berdasarkan URL pathname dan sub-query
 */
export function getContextualGuideByPath(
  pathname: string,
  searchParams?: { get: (k: string) => string | null }
): ContextualGuide {
  const cleanPath = pathname.replace(/\/+$/, "") || "/";

  // Tangani rute khusus Pengaturan berdasarkan tab/sub query
  if (cleanPath === "/pengaturan" && searchParams) {
    const tab = searchParams.get("tab");
    const sub = searchParams.get("sub");

    if (tab === "pengguna") {
      if (sub === "log") {
        return CONTEXTUAL_GUIDES["/pengaturan/log-aktivitas"];
      }
      return CONTEXTUAL_GUIDES["/pengaturan/pengguna"];
    }
  }

  if (CONTEXTUAL_GUIDES[cleanPath]) {
    return CONTEXTUAL_GUIDES[cleanPath];
  }

  // Fallback pencocokan prefix
  for (const key of Object.keys(CONTEXTUAL_GUIDES)) {
    if (key !== "/" && cleanPath.startsWith(key)) {
      return CONTEXTUAL_GUIDES[key];
    }
  }

  // Fallback default (Dashboard)
  return CONTEXTUAL_GUIDES["/"];
}

/**
 * Algoritma Pencarian Khusus Panduan (Live Search)
 * Menelusuri seluruh indeks topik, kata kunci, bab, dan tur simulasi.
 */
export function searchPanduan(keyword: string): GuideSearchItem[] {
  const clean = keyword.trim().toLowerCase();
  if (!clean) return [];

  const tokens = clean.split(/\s+/).filter(Boolean);

  return GUIDE_SEARCH_INDEX.filter((item) => {
    const fullSearchable = `${item.title} ${item.chapter} ${item.category} ${item.snippet} ${item.keywords.join(" ")}`.toLowerCase();
    // Seluruh token kata kunci harus cocok (AND matching)
    return tokens.every((token) => fullSearchable.includes(token));
  }).slice(0, 8); // Batasi 8 hasil teratas paling relevan
}
