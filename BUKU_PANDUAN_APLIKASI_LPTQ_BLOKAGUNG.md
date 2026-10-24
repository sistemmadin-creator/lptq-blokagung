# BUKU PANDUAN PENGGUNAAN APLIKASI SISTEM INFORMASI LPTQ BLOKAGUNG

**Lembaga Pengembangan Tilawatil Qur'an (LPTQ)**  
**Pondok Pesantren Darussalam Blokagung, Banyuwangi**  
*Versi Dokumen: 1.0.0 | Pembaruan Terakhir: Oktober 2026*

---

## DAFTAR ISI

1. [BAB 1: PENDAHULUAN DAN ARSITEKTUR SISTEM](#bab-1-pendahuluan-dan-arsitektur-sistem)
   - 1.1 Latar Belakang dan Tujuan
   - 1.2 Profil Modul Utama
   - 1.3 Arsitektur Teknologi dan Keamanan Data
   - 1.4 Struktur Peran Pengguna (*Roles*) dan Matriks Hak Akses
2. [BAB 2: AKSES MASUK DAN NAVIGASI SISTEM](#bab-2-akses-masuk-dan-navigasi-sistem)
   - 2.1 Masuk ke Aplikasi (*Login*)
   - 2.2 Tata Letak Antarmuka (*AppShell*)
   - 2.3 Manajemen Sidebar (Mode Semat dan Ciutkan Otomatis)
   - 2.4 Mode Tampilan Gelap (*Dark Mode*)
   - 2.5 Keluar dari Sistem (*Logout*)
3. [BAB 3: PENGELOLAAN DATA SANTRI TAHFIDZ](#bab-3-pengelolaan-data-santri-tahfidz)
   - 3.1 Struktur Data Santri
   - 3.2 Menambah Data Santri secara Manual
   - 3.3 Mengubah dan Menghapus Data Santri
   - 3.4 Pengaturan Hirarki Wilayah (Blok, Asrama, Kode Kamar, dan Kamar)
   - 3.5 Impor Massal Data Santri dari File Excel
   - 3.6 Ekspor dan Cetak Data Santri
4. [BAB 4: MANAJEMEN HALAQOH AL-QUR'AN](#bab-4-manajemen-halaqoh-al-quran)
   - 4.1 Struktur Kelas dan Bagian Halaqoh
   - 4.2 Menentukan Pembimbing dan Nomor Kontak Halaqoh
   - 4.3 Menambah dan Menyesuaikan Formasi Halaqoh
   - 4.4 Pemantauan Santri dan Rekap Ketidakhadiran (*Alfa*)
   - 4.5 Kartu Halaqoh dan Riwayat Aktivitas Santri
5. [BAB 5: TAHFIDZ UMUM (KEGIATAN DAN SETORAN)](#bab-5-tahfidz-umum-kegiatan-dan-setoran)
   - 5.1 Kegiatan / Absensi Harian (Sesi Pagi dan Malam)
   - 5.2 Matriks Kalender Absensi dan Hari Libur Kegiatan
   - 5.3 Setoran Juz Baru (Pembimbing Halaqoh)
   - 5.4 Evaluasi Hafalan (Pengurus Pusat LPTQ)
   - 5.5 Grafik Tren Evaluasi Hafalan Santri
6. [BAB 6: TAHFIDZ KHOTMIL (15 JUZ DAN 30 JUZ)](#bab-6-tahfidz-khotmil-15-juz-dan-30-juz)
   - 6.1 Tahapan Khotmil 15 Juz dan Khotmil 30 Juz
   - 6.2 Standar Kriteria Ketuntasan Minimal (KKM) dan Rumus Penilaian
   - 6.3 Pendaftaran dan Input Nilai Peserta Ujian
   - 6.4 Pencetakan Lembar Jawab Komputer (LJK) Khotmil
   - 6.5 Pemindaian LJK Otomatis Menggunakan Kamera (*OMR Scanner*)
   - 6.6 Rekapitulasi Kelulusan dan Berita Acara Khotmil
7. [BAB 7: ALAT LANJUTAN](#bab-7-alat-lanjutan)
   - 7.1 Generator Flyer Khataman Santri
   - 7.2 Modul Kirim WhatsApp Terintegrasi (WAHA Gateway)
   - 7.3 Pembuatan Rapor Digital Otomatis dan Broadcast Pesan
8. [BAB 8: PENGATURAN DAN ADMINISTRASI SISTEM](#bab-8-pengaturan-dan-administrasi-sistem)
   - 8.1 Personalisasi Tampilan dan Identitas Lembaga (*Branding*)
   - 8.2 Manajemen Akun Pengguna dan Penugasan Hak Akses Modul
   - 8.3 Konfigurasi WhatsApp API Gateway (WAHA)
   - 8.4 Pencadangan dan Pemulihan Data (*Backup & Restore*)
9. [BAB 9: STANDAR OPERASIONAL PROSEDUR (SOP)](#bab-9-standar-operasional-prosedur-sop)
   - 9.1 SOP Awal Semester dan Registrasi Santri Baru
   - 9.2 SOP Pelaksanaan Kegiatan dan Absensi Harian
   - 9.3 SOP Ujian Khotmil Menggunakan LJK dan Kamera OMR
   - 9.4 SOP Pengumuman dan Pelaporan Hasil ke Wali Santri
10. [BAB 10: PANDUAN PEMECAHAN MASALAH (TROUBLESHOOTING)](#bab-10-panduan-pemecahan-masalah-troubleshooting)

---

## BAB 1: PENDAHULUAN DAN ARSITEKTUR SISTEM

### 1.1 Latar Belakang dan Tujuan
Aplikasi Sistem Informasi LPTQ Blokagung dikembangkan untuk mengelola seluruh administrasi pembinaan Al-Qur'an di lingkungan Pondok Pesantren Darussalam Blokagung. Aplikasi ini mendigitalkan pencatatan santri, absensi kehadiran halaqoh, setoran pertambahan hafalan, ujian khotmil Al-Qur'an berstandar LJK (Lembar Jawab Komputer), hingga penyampaian laporan capaian kepada wali santri.

Tujuan utama sistem ini:
1. Menghilangkan pencatatan manual berbasis kertas yang rentan hilang atau rusak.
2. Menyediakan data terpusat mengenai perkembangan hafalan seluruh santri.
3. Mempercepat proses koreksi ujian khotmil melalui teknologi pembaca bulatan otomatis (*Optical Mark Recognition* / OMR) berbasis kamera.
4. Memudahkan penyampaian informasi kemajuan santri kepada wali santri melalui WhatsApp secara resmi dan terstruktur.

### 1.2 Profil Modul Utama
Aplikasi terbagi menjadi lima kelompok kerja utama:
1. **Utama**: Dashboard ringkasan eksekutif, Master Data Santri, dan Manajemen Halaqoh.
2. **Tahfidz Umum**: Pencatatan Kegiatan/Absensi Harian (2 kali per hari), Setoran Juz Baru oleh Pembimbing Halaqoh, dan Evaluasi Hafalan oleh Pengurus Pusat.
3. **Tahfidz Khotmil**: Penilaian ujian Khotmil 15 Juz (5 tahap) dan Khotmil 30 Juz (9 tahap), pencetakan LJK ber-QR Code, pemindaian lembar jawaban via kamera, dan rekapitulasi kelulusan.
4. **Alat Lanjutan**: Generator e-flyer khataman beresolusi tinggi dan pengiriman laporan WhatsApp massal (*WA Gateway*).
5. **Sistem**: Pengaturan profil kelembagaan, manajemen pengguna, penentuan hirarki kamar, serta cadangan basis data.

### 1.3 Arsitektur Teknologi dan Keamanan Data
Aplikasi dibangun di atas tumpukan teknologi modern:
- **Kerangka Kerja Antarmuka**: Next.js 14 (App Router) dan React 18 dengan TypeScript.
- **Tata Letak dan Komponen**: Tailwind CSS, Lucide Icons, TanStack React Table, dan React Hook Form bersubsistem validasi Zod.
- **Basis Data dan Autentikasi**: Supabase PostgreSQL dengan dukungan *Row Level Security* (RLS) serta sesi token aman SSR.
- **Mesin Koreksi Mandiri**: jsQR dan Khotmil OMR Engine kustom pada sisi peramban web (*client-side canvas processing*).
- **Layanan Pesan Eksternal**: WhatsApp HTTP API (WAHA) yang beroperasi mandiri di server lokal atau *cloud*.

### 1.4 Struktur Peran Pengguna (*Roles*) dan Matriks Hak Akses
Sistem menyediakan 5 peran pengguna (*roles*) dengan tingkatan izin granular:

| Peran (*Role*) | Deskripsi Tanggung Jawab | Hak Akses Utama |
|---|---|---|
| **admin** | Administrator sistem utama | Akses penuh (*Edit*) ke seluruh modul sistem dan pengaturan akun. |
| **pengurus** | Pengurus harian LPTQ Pusat | Mengelola master santri, halaqoh, evaluasi pusat, ujian khotmil, alat kirim WA, dan flyer. |
| **pembimbing** | Asatidz pembimbing kelompok halaqoh | Mengisi setoran juz baru dan memantau perkembangan santri halaqoh yang dibimbingnya. |
| **operator_absen** | Petugas piket absensi | Menginput absensi halaqoh pagi dan malam pada hari berjalan. |
| **viewer** | Pengawas umum / tamu | Hanya melihat rekap data (*Baca*) tanpa izin mengubah atau menghapus rekaman data. |

Tiap modul sistem mendukung tiga tingkat izin spesifik per akun:
- **Sembunyikan**: Modul tidak tampil di menu navigasi dan rute URL diblokir otomatis.
- **Baca**: Data dapat dilihat, dicari, dan diekspor, namun tombol tambah, ubah, dan hapus dinonaktifkan.
- **Edit**: Akses penuh untuk menambah, memperbarui, dan menghapus rekaman data.

---

## BAB 2: AKSES MASUK DAN NAVIGASI SISTEM

### 2.1 Masuk ke Aplikasi (*Login*)
1. Buka peramban web (disarankan Google Chrome atau Microsoft Edge versi terbaru).
2. Akses alamat web aplikasi (contoh: `https://lptq.blokagung.net` atau alamat IP server lokal).
3. Halaman login menampilkan identitas resmi LPTQ Blokagung.
4. Masukkan **Username** atau **Email** yang terdaftar.
5. Masukkan **Kata Sandi** akun.
6. Klik tombol **Masuk**. Apabila kredensial cocok, sistem akan mengarahkan pengguna ke halaman Dashboard.

> **Catatan Akun Ditangguhkan**: Jika muncul pemberitahuan bahwa akun ditangguhkan (*suspended*), hubungi Administrator untuk mengaktifkan kembali status akun Anda.

### 2.2 Tata Letak Antarmuka (*AppShell*)
Antarmuka aplikasi terdiri dari tiga bagian utama:
1. **Sidebar Navigasi (Sisi Kiri)**: Menampung logo lembaga, daftar menu rute per kategori, kartu standar KKM, dan tombol pintas rekap khotmil.
2. **Bilah Atas / Topbar (Sisi Atas)**: Berisi pencarian cepat santri, indikator tanggal hari ini, tombol sakelar tema gelap/terang, identitas pengguna aktif, dan tombol keluar.
3. **Area Kerja Utama (Tengah/Kanan)**: Tempat formulir, tabel data, kartu visual, dan kontrol operasional ditampilkan.

### 2.3 Manajemen Sidebar (Mode Semat dan Ciutkan Otomatis)
Sidebar pada layar desktop memiliki dua mode perilaku:
- **Mode Dinamis (Bawaan)**: Sidebar mengecil menjadi deretan ikon saat kursor mouse keluar, dan melebar otomatis saat kursor mouse diarahkan ke sidebar.
- **Mode Semat (Pinned)**: Klik tombol **Ikon Pin** pada sudut kanan atas sidebar. Sidebar akan terkunci dalam keadaan lebar penuh secara permanen, sehingga teks menu selalu terbaca.

### 2.4 Mode Tampilan Gelap (*Dark Mode*)
Untuk kenyamanan mata pada pencahayaan redup:
1. Temukan ikon **Bulan / Matahari** pada bilah atas (*topbar*).
2. Klik ikon tersebut untuk beralih antara tema Terang (*Light Mode*) dan Gelap (*Dark Mode*).
3. Pilihan tema tersimpan otomatis pada peramban web pengguna.

### 2.5 Keluar dari Sistem (*Logout*)
1. Pada bilah atas sebelah kanan atau bagian paling bawah sidebar, klik tombol **Keluar** (*Logout*).
2. Sesi login akan ditutup seketika dan antarmuka dialihkan kembali ke formulir login.

---

## BAB 3: PENGELOLAAN DATA SANTRI TAHFIDZ

Menu rute: `/santri`

Modul ini merupakan basis data utama seluruh peserta tahfidz Al-Qur'an di LPTQ Blokagung. Semua modul lain (absensi, setoran, dan khotmil) terhubung langsung dengan ID santri pada modul ini.

### 3.1 Struktur Data Santri
Setiap rekaman santri memiliki atribut berikut:
- **No Urut**: Nomor urut otomatis dari sistem pangkalan data.
- **Kode Santri**: Identitas unik santri (opsional, dapat diisi NIS atau nomor induk pesantren).
- **Nama Lengkap**: Nama resmi santri sesuai kartu keluarga atau dokumen pesantren.
- **Nomor WhatsApp**: Nomor aktif santri atau wali santri (diawali kode negara 62 atau 08).
- **Blok**: Blok tempat tinggal santri di pesantren (contoh: Blok A, Blok B, Barat, Timur).
- **Asrama**: Nama gedung/asrama di dalam blok tersebut.
- **Kode Kamar & Kamar**: Penomoran kamar santri (misal: A.01, B.05).
- **Halaqoh Kelas**: Kelas capaian hafalan (Kelas 1 sampai 10).
- **Halaqoh Bagian**: Rombel kelompok halaqoh (Bagian A, B, C, D, E, atau F).

### 3.2 Menambah Data Santri secara Manual
1. Masuk ke menu **Data Santri Tahfidz**.
2. Klik tombol **Tambah Santri** (+).
3. Lengkapi formulir pendaftaran:
   - Ketik nama lengkap santri.
   - Masukkan nomor WhatsApp wali santri.
   - Pilih Blok, Asrama, dan Kamar. Pilihan ini terhubung dengan aturan hirarki wilayah.
   - Tentukan Kelas Halaqoh (1-10) dan Bagian Halaqoh (A-F).
4. Klik tombol **Simpan Data**. Santri langsung masuk ke daftar aktif.

### 3.3 Mengubah dan Menghapus Data Santri
- **Mengubah Data**: Klik ikon **Pensil (Edit)** pada baris santri yang bersangkutan, ubah kolom yang diperlukan, lalu klik **Perbarui**.
- **Menghapus Satu Santri**: Klik ikon **Tempat Sampah** pada baris santri, lalu konfirmasi penghapusan.
- **Menghapus Massal (Batch)**: Beri tanda centang pada kotak di sisi kiri beberapa nama santri, lalu klik tombol merah **Hapus Terpilih** di atas tabel.

### 3.4 Pengaturan Hirarki Wilayah (Blok, Asrama, Kode Kamar, dan Kamar)
Untuk mencegah penulisan asrama atau kamar yang tidak seragam:
1. Klik tombol **Atur Hirarki Kamar** di bagian atas halaman Data Santri.
2. Anda dapat menambahkan nama Blok baru, menetapkan Asrama di bawah blok tersebut, serta memasukkan daftar nomor kamar yang sah.
3. Setelah disimpan, formulir penambahan santri akan menampilkan dropdown pilihan yang terkunci rapi sesuai hirarki pesantren.

### 3.5 Impor Massal Data Santri dari File Excel
Untuk memasukkan ratusan data santri sekaligus:
1. Di halaman Data Santri, klik tombol **Unduh Template Excel**.
2. Buka file template yang diunduh (`template_data_santri.xlsx`).
3. Isi kolom sesuai judul:
   - `nama_lengkap` (wajib diisi).
   - `no_wa` (nomor WhatsApp).
   - `blok`, `asrama`, `kamar`.
   - `halaqoh_kelas` (angka 1 sampai 10).
   - `halaqoh_bagian` (huruf kapital A, B, C, D, E, atau F).
4. Simpan file Excel.
5. Pada aplikasi, klik tombol **Unggah Excel**, pilih file yang sudah diisi.
6. Sistem memvalidasi isi baris. Jika seluruh baris valid, data langsung disimpan ke basis data.

### 3.6 Ekspor dan Cetak Data Santri
- **Ekspor Excel**: Klik tombol **Ekspor Excel** untuk mengunduh seluruh daftar santri aktif dalam format `.xlsx`.
- **Cetak Dokumen**: Klik tombol **Cetak Daftar Santri**. Sistem menyiapkan pratinjau siap cetak berukuran A4 lengkap dengan kop resmi dan pembagian halaman rapi.

---

## BAB 4: MANAJEMEN HALAQOH AL-QUR'AN

Menu rute: `/halaqoh`

Modul Halaqoh mengelompokkan santri ke dalam rombongan belajar Al-Qur'an berdasarkan target juz dan asatidz pembimbingnya.

### 4.1 Struktur Kelas dan Bagian Halaqoh
LPTQ Blokagung membagi tingkatan halaqoh menjadi 10 Kelas dengan target capaian bertahap:
- **Kelas 1**: Target Juz 1 - 3
- **Kelas 2**: Target Juz 4 - 6
- **Kelas 3**: Target Juz 7 - 9
- **Kelas 4**: Target Juz 10 - 12
- **Kelas 5**: Target Juz 13 - 15
- **Kelas 6**: Target Juz 16 - 18
- **Kelas 7**: Target Juz 19 - 21
- **Kelas 8**: Target Juz 22 - 24
- **Kelas 9**: Target Juz 25 - 27
- **Kelas 10**: Target Juz 28 - 30

Setiap kelas memiliki pembagian kelompok rombel berupa abjad Bagian (**A, B, C, D, E, F**), contoh: **Kelas 1 Bagian A (1A)**.

### 4.2 Menentukan Pembimbing dan Nomor Kontak Halaqoh
1. Pada kartu atau baris kelompok halaqoh yang dituju, klik tombol **Atur Pembimbing**.
2. Masukkan **Nama Asatidz Pembimbing** (contoh: Ust. Ahmad Fauzi).
3. Masukkan **Nomor WhatsApp Pembimbing**.
4. Klik **Simpan**. Nama dan kontak pembimbing akan tertera pada kartu halaqoh dan tercantum saat mencetak rekapitulasi.

### 4.3 Menambah dan Menyesuaikan Formasi Halaqoh
Pengurus dapat membuka formasi kelompok baru jika jumlah santri bertambah:
1. Klik tombol **Tambah Formasi Halaqoh**.
2. Pilih nomor kelas (1-10) dan tentukan bagian (A-F).
3. Simpan formasi. Formasi baru akan langsung muncul di daftar kartu halaqoh.

### 4.4 Pemantauan Santri dan Rekap Ketidakhadiran (*Alfa*)
Setiap kartu halaqoh menampilkan:
- Target hafalan juz kelompok.
- Jumlah santri yang terdaftar dalam kelompok.
- Pembina halaqoh beserta tautan kontak cepat WhatsApp.
- **Indikator Alfa**: Menghitung akumulasi jumlah hari di mana santri dalam kelompok tersebut tidak hadir tanpa keterangan pada bulan berjalan.

### 4.5 Kartu Halaqoh dan Riwayat Aktivitas Santri
1. Klik tombol **Buka Detail Halaqoh** pada salah satu kartu halaqoh.
2. Jendela modal menyajikan dua tab interaktif:
   - **Tab Kegiatan**: Matriks kehadiran seluruh santri di kelompok tersebut untuk bulan yang dipilih.
   - **Tab Juz Baru**: Rekap setoran pertambahan juz baru dari Januari sampai Desember khusus anggota halaqoh tersebut.
3. Pengurus dapat memantau santri mana yang aktif dan santri mana yang tertinggal setorannya secara langsung.

---

## BAB 5: TAHFIDZ UMUM (KEGIATAN DAN SETORAN)

### 5.1 Kegiatan / Absensi Harian (Sesi Pagi dan Malam)
Menu rute: `/tahfidz/umum/kegiatan`

Absensi santri dicatat 2 kali dalam satu hari:
1. **Sesi Pagi**: Dilaksanakan pada waktu halaqoh pagi (ba'da Shubuh).
2. **Sesi Malam**: Dilaksanakan pada waktu halaqoh malam (ba'da Maghrib atau Isya).

Di bagian atas halaman, gunakan tombol sakelar sesi untuk memilih **Pagi** atau **Malam**.

### 5.2 Matriks Kalender Absensi dan Hari Libur Kegiatan
Halaman absensi menampilkan tabel kalender bulanan dari tanggal 1 hingga 31:
- Kolom tanggal hari ini disorot dengan warna khusus agar fokus penginputan tepat.
- **Hari Jumat**: Diberi tanda visual khusus sebagai hari libur kegiatan mingguan pesantren.
- **Kode Status Absensi**:
  - **Hadir (H)**: Ditandai warna hijau. Santri hadir di halaqoh tepat waktu.
  - **Alfa (A)**: Ditandai warna merah. Santri tidak hadir tanpa izin resmi.
  - **Izin (I)**: Ditandai warna kuning. Santri berhalangan hadir dengan surat izin tertulis.
  - **Sakit (S)**: Ditandai warna biru. Santri berhalangan hadir karena sakit.
- **Cara Input**:
  - Klik pada sel pertemuan santri yang bersangkutan, lalu pilih status kehadiran.
  - **Tombol Pintas "Set Semua Hadir"**: Untuk mempercepat pencatatan, klik tombol ini untuk mengisi status Hadir bagi seluruh santri yang belum diabsen pada sesi tersebut, lalu ubah santri yang tidak hadir satu per satu.

### 5.3 Setoran Juz Baru (Pembimbing Halaqoh)
Menu rute: `/tahfidz/umum/juz-baru`

Modul ini digunakan oleh pembimbing halaqoh untuk mencatat pertambahan hafalan baru (*ziyadah*):
1. Pilih tahun penanggalan yang diinginkan.
2. Cari nama santri melalui kotak pencarian atau saring berdasarkan halaqoh.
3. Klik tombol **Tambah Setoran**.
4. Masukkan tanggal setoran, jumlah juz tambahan (contoh: 0.5 juz, 1 juz), dan catatan jika ada.
5. Klik **Simpan**.
6. Nilai setoran otomatis terakumulasi pada kolom bulan yang bersangkutan (Januari s.d. Desember) serta kolom **Total Setoran Tahun Ini**.

> **Edit Cepat**: Pengguna dengan hak akses edit dapat langsung mengeklik angka pada sel bulan di tabel untuk mengubah perolehan juz tanpa membuka formulir panjang.

### 5.4 Evaluasi Hafalan (Pengurus Pusat LPTQ)
Menu rute: `/tahfidz/umum/evaluasi`

Berbeda dengan setoran juz baru yang dilakukan harian di hadapan pembimbing halaqoh, **Evaluasi Hafalan** adalah ujian periodik yang diuji langsung oleh tim Pengurus Pusat LPTQ untuk memverifikasi kualitas dan kelancaran hafalan santri yang telah disetorkan.
- Tata letak dan cara penginputan identik dengan modul Juz Baru.
- Data yang dimasukkan di modul ini menjadi dasar grafik tren evaluasi pada Dashboard utama.

### 5.5 Grafik Tren Evaluasi Hafalan Santri
Pada halaman muka (Dashboard), bagan garis interaktif (*Line Chart*) menyajikan tren pencapaian evaluasi:
- Dapat difilter berdasarkan jangka waktu: 7 hari terakhir, 14 hari terakhir, 30 hari terakhir, atau bulan berjalan.
- Menunjukkan grafik volume setoran santri untuk melihat produktivitas hafalan santri dari hari ke hari.

---

## BAB 6: TAHFIDZ KHOTMIL (15 JUZ DAN 30 JUZ)

Menu rute:
- Khotmil 15 Juz: `/tahfidz/khotmil/15`
- Khotmil 30 Juz: `/tahfidz/khotmil/30`

Modul Khotmil adalah sistem ujian munaqosyah kelulusan hafalan bertingkat yang menggunakan standar lembar jawab komputer (LJK) dan pemindai kamera otomatis.

### 6.1 Tahapan Khotmil 15 Juz dan Khotmil 30 Juz

#### Pembagian Tahap Khotmil 15 Juz (5 Tahap):
- **Tahap 1**: Menguji Juz 1 sampai 5 (5 juz)
- **Tahap 2**: Menguji Juz 6 sampai 10 (5 juz)
- **Tahap 3**: Menguji Juz 1 sampai 10 (10 juz gabungan)
- **Tahap 4**: Menguji Juz 11 sampai 15 (5 juz)
- **Tahap 5**: Menguji Juz 1 sampai 15 (15 juz penuh)

#### Pembagian Tahap Khotmil 30 Juz (9 Tahap):
- **Tahap 1**: Menguji Juz 1 sampai 5
- **Tahap 2**: Menguji Juz 6 sampai 10
- **Tahap 3**: Menguji Juz 1 sampai 10 (10 juz)
- **Tahap 4**: Menguji Juz 11 sampai 15
- **Tahap 5**: Menguji Juz 16 sampai 20
- **Tahap 6**: Menguji Juz 11 sampai 20 (10 juz)
- **Tahap 7**: Menguji Juz 21 sampai 25
- **Tahap 8**: Menguji Juz 26 sampai 30
- **Tahap 9**: Menguji Juz 21 sampai 30 (10 juz)

### 6.2 Standar Kriteria Ketuntasan Minimal (KKM) dan Rumus Penilaian
Standar kelulusan baku di LPTQ Blokagung adalah **KKM = 85**. Nilai akhir dihitung secara objektif berdasarkan dua parameter:

$$\text{Nilai Akhir} = \text{Skor Kelengkapan Halaman (Bobot 65)} + \text{Skor Ketepatan/Kelancaran (Bobot 35)}$$

Detail formula perhitungan:
1. **Standar 1 Juz** dihitung setara **20 halaman** Al-Qur'an Pojok (Mushaf Standar Indonesia/Madinah).
2. **Skor Halaman (Maksimal 65 poin)**:
   - Setiap halaman kosong yang tidak dibaca mengurangi 3.25 poin:
   $$\text{Skor Halaman} = \max(0,\, 65 - (\text{Jumlah Halaman Kosong} \times 3.25))$$
   - *Ketentuan Mutlak*: Jika santri tidak membaca satu juz penuh (halaman kosong $\ge$ 20), nilai juz tersebut otomatis dinilai **0 (Nol)**.
3. **Skor Kesalahan (Maksimal 35 poin)**:
   - Setiap kesalahan bacaan (salah harakat, tertinggal ayat, lupa kelanjutan ayat) mengurangi 1.0 poin:
   $$\text{Skor Kesalahan} = \max(0,\, 35 - (\text{Jumlah Kesalahan} \times 1.0))$$
4. **Status Kelulusan**: Santri dinyatakan **LULUS TAHAP** jika nilai per juz dan rata-rata seluruh juz pada tahap tersebut mencapai atau melampaui angka KKM (85).

### 6.3 Pendaftaran dan Input Nilai Peserta Ujian
1. Masuk ke halaman Khotmil (15 Juz atau 30 Juz).
2. Pilih tab **Tahap** yang sedang diuji (contoh: Tahap 1).
3. Klik tombol **Daftarkan Peserta Ujian** untuk memilih santri yang berhak mengikuti ujian tahap tersebut.
4. **Input Manual**: Klik langsung pada kolom juz santri di tabel untuk mengisi nilai (0-100). Sistem otomatis menghitung nilai rata-rata dan menandai lencana Tuntas (Hijau) atau Belum Tuntas (Abu-abu/Kuning).
5. **Impor Nilai Excel**: Penguji dapat mengunduh format penilaian, mengisi nilai juz di Excel, dan mengunggahnya kembali ke sistem.

### 6.4 Pencetakan Lembar Jawab Komputer (LJK) Khotmil
Sistem dilengkapi generator LJK resmi berstandar pemindai optik:
1. Di halaman Khotmil, klik tombol **Cetak LJK Khotmil**.
2. Pilih santri yang akan dicetak lembar jawabannya (bisa satu santri, seluruh santri di tahap, atau rombongan tertentu).
3. Sistem membuat dokumen LJK siap cetak berukuran A4 yang memuat:
   - Identitas santri (Nama, Kode, Asrama, Kamar).
   - **QR Code Terenkripsi**: Menyimpan data identitas, tahap, ID santri, dan daftar juz yang diujikan.
   - **Tabel Lembar Bulatan Pensil**: Baris-baris bulatan angka 0 sampai 9 untuk mengisi jumlah halaman kosong dan jumlah kesalahan per juz secara presisi.
4. Cetak LJK menggunakan printer laserjet atau inkjet di atas kertas putih standar 70-80 gsm.

### 6.5 Pemindaian LJK Otomatis Menggunakan Kamera (*OMR Scanner*)
Setelah ujian selesai dan penguji mengarsir bulatan pada LJK:
1. Di halaman Khotmil, klik tombol **Scan Kamera LJK (OMR)**.
2. Izinkan peramban web mengakses kamera web (*webcam* laptop atau kamera ponsel/tablet).
3. Arahkan kamera ke lembar LJK:
   - Kamera pertama kali mencari dan membaca **QR Code** di pojok lembar untuk mengidentifikasi santri dan tahap ujian secara otomatis.
   - Setelah QR Code terverifikasi (bingkai hijau menyala), mesin OMR menganalisis kotak-kotak bulatan pensil (*luminance threshold* < 115).
   - Mesin membaca bulatan tergelap pada kolom Halaman Kosong dan kolom Kesalahan.
4. Layar menampilkan hasil deteksi secara seketika: jumlah halaman kosong, jumlah kesalahan, dan hasil kalkulasi nilai otomatis.
5. Klik **Simpan Nilai ke Sistem**. Data nilai langsung tersimpan ke pangkalan data Supabase tanpa perlu mengetik angka satu per satu.

### 6.6 Rekapitulasi Kelulusan dan Berita Acara Khotmil
1. Akses menu pintas **Rekapitulasi Khotmil** melalui dropdown di sidebar.
2. Tabel rekap menampilkan seluruh tahap secara berdampingan:
   - Status kelulusan tiap tahap (Tahap 1 sampai 5 pada 15 Juz; Tahap 1 sampai 9 pada 30 Juz).
   - Nilai rata-rata kumulatif.
   - Tanda centang kelulusan akhir bagi santri yang telah menyelesaikan seluruh tahapan.
3. Klik tombol **Cetak Berita Acara** untuk mencetak laporan resmi lengkap dengan kolom tanda tangan dewan penguji dan pimpinan LPTQ.

---

## BAB 7: ALAT LANJUTAN (FLYER KHATAMAN & WHATSAPP GATEWAY)

### 7.1 Generator Flyer Khataman Santri
Menu rute: `/alat/flyer-khataman`

Modul ini memproduksi e-flyer ucapan selamat khatam Al-Qur'an 30 Juz secara digital dengan tata letak resmi LPTQ Blokagung.

1. **Pemilihan Santri**:
   - Sistem otomatis mendeteksi dan menampilkan santri yang telah menyelesaikan seluruh hafalan 30 Juz.
   - Anda juga dapat mencari santri secara manual melalui kotak pencarian database.
2. **Sistem Template Flyer (Pembaruan Terkini)**:
   - Tombol **Template Flyer** (`🎨 Template Flyer`) menggantikan tombol lama *Posisi Terkunci*.
   - Menyediakan pilihan template preset resmi: **Template Putri (Resmi)**, **Template Putra (Resmi)**, dan **Template Khotmil 15 Juz**.
   - Pengurus dapat menyimpan variasi tata letak baru menjadi template tersimpan ke penyimpanan lokal (*LocalStorage*).
3. **Pengunggahan & Interaksi Geser Foto Santri**:
   - Klik tombol **Unggah Foto Santri**.
   - **Interaksi Geser di Kanvas (Desktop)**: Foto santri dapat diklik dan digeser (*drag*) secara bebas langsung di atas kanvas pratinjau. Zoom foto juga dapat diatur dengan roda gulir mouse (*scroll wheel*).
   - **Interaksi Sentuh (Mobile / HP)**: Pada layar sentuh smartphone, lakukan **ketuk 2 kali (*double-tap*)** untuk mengaktifkan/menonaktifkan mode geser foto (disertai getaran haptic singkat dan notifikasi toast), sehingga pengguna tetap bebas melakukan *scroll* halaman tanpa sengaja menggeser foto.
   - **Tombol Cepat Tengahkan Foto**: Mengembalikan nilai pergeseran foto (*offset*) ke posisi semula `0px, 0px`.
4. **Data Biodata dan Penanggalan Otomatis**:
   - Nama santri dan nama orang tua (*Bin / Binti*) terisi otomatis.
   - Tanggal khatam ditampilkan dalam dua format penanggalan resmi: **Tanggal Masehi** dan **Tanggal Hijriah** (dihitung otomatis melalui pustaka hisab terpadu).
5. **Kustomisasi Detail Koordinat Teks**:
   - Disediakan accordion opsional **Penyesuaian Detail Koordinat Teks** untuk mengatur koordinat X/Y, ukuran huruf (*font size*), serta warna teks.
6. **Penyimpanan Hasil**:
   - Klik tombol **Unduh Flyer (PNG)** untuk mengunduh gambar resolusi tinggi (814x1024 px asli tanpa buram).
   - Klik tombol **Salin** untuk menempelkan gambar secara instan ke clipboard.

### 7.2 Integrasi WhatsApp Gateway (WAHA & Baileys)
Menu rute: `/alat/kirim-wa`

Modul ini menghubungkan aplikasi LPTQ dengan nomor resmi WhatsApp lembaga untuk mengirimkan kartu rapor digital dan pesan evaluasi berkala kepada wali santri secara otomatis.

#### 1. Bagaimana Alur Kerjanya Kok Bisa Terhubung & Kirim Pesan?
Sistem ini terdiri dari **3 komponen utama**:
1. **Website LPTQ Blokagung** (yang dibuka di browser Chrome: `https://lptq-blokagung.vercel.app` atau `http://localhost:3005`).
2. **Server Gateway di Laptop Anda** (program Node.js + engine *Baileys* yang berjalan di port `3008`).
3. **Server Resmi WhatsApp / Meta** di internet.

```text
[Website LPTQ di Vercel] 
          │  (Kirim perintah pesan + foto rapor)
          ▼
[Cloudflare HTTPS Tunnel]  <--- Jembatan aman resmi dari internet ke laptop
          │
          ▼
[Server Gateway di Laptop (Port 3008)]
          │  (Mengemas teks & file gambar rapor)
          ▼
[Koneksi Perangkat Tertaut WhatsApp]
          │  (Lewat nomor HP pengurus lembaga)
          ▼
[HP Wali Santri Penerima]
```

**Alur dari Scan QR sampai Pesan Terkirim:**
- **Tahap 1: Scan QR Code (Autentikasi)**:
  - Server di laptop Anda membuka koneksi aman ke server WhatsApp.
  - Server WhatsApp memberikan tiket sesi berupa QR Code.
  - Saat Anda melakukan scan dengan aplikasi WhatsApp HP, HP menyetujui laptop Anda sebagai **"Perangkat Tertaut"** (sama persis seperti saat Anda login ke *WhatsApp Web* di browser).
  - Kunci login ini disimpan di folder `waha-gateway/auth_info_baileys/` di laptop Anda, sehingga Anda **tidak perlu scan QR berulang-ulang**.
- **Tahap 2: Pengiriman Gambar Rapor & Teks**:
  - Saat pengurus mengklik **Kirim ke Wali** atau **Mulai Kirim Broadcast**:
  - Website LPTQ mengirimkan instruksi ke server gateway di laptop berisi:
    1. Nomor HP wali santri tujuan.
    2. Teks pesan keterangan evaluasi / kelulusan juz.
    3. Tautan gambar kartu rapor digital resmi.
  - Server di laptop Anda mengunduh gambar kartu rapor tersebut, lalu menembakkannya langsung ke WhatsApp wali santri melalui koneksi perangkat tertaut tadi.
  - Wali santri akan menerima foto rapor digital yang tajam beserta teksnya secara otomatis dari nomor lembaga!

#### 2. Apa Beda Pilihan "Cloudflare HTTPS Tunnel" vs "Port Lokal (3008)"?
- **☁️ Cloudflare HTTPS Tunnel (Untuk Vercel)**:
  - **Kapan dipakai?** Saat Anda membuka website LPTQ melalui domain internet Vercel (`https://lptq-blokagung.vercel.app`).
  - **Alasannya:** Domain Vercel menggunakan **HTTPS** (gembok hijau/aman). Browser modern (seperti Chrome) memiliki aturan keamanan ketat (*Mixed Content & Private Network Access*): browser melarang website HTTPS publik memanggil `http://localhost` secara langsung. Cloudflare Tunnel berfungsi sebagai **terowongan aman resmi ber-HTTPS** yang menghubungkan website Vercel ke server di laptop Anda tanpa terblokir browser.
- **🏠 Port Lokal (3008)**:
  - **Kapan dipakai?** Jika Anda membuka website LPTQ secara lokal di laptop Anda sendiri (misal alamat di browser adalah `http://localhost:3005`).
  - Karena sama-sama di dalam laptop (HTTP ke HTTP), browser tidak memblokirnya sehingga bisa langsung terhubung tanpa bantuan tunnel internet.

#### 3. Apakah Itu Akan Tiba-Tiba Berbayar?
**Jawabannya: TIDAK, 100% GRATIS SELAMANYA.**

Tidak ada tagihan apa pun yang akan muncul, dengan rincian berikut:
1. **Engine WhatsApp Gateway (Baileys & Node.js)**:
   - Engine ini berlisensi **Open Source (MIT)** yang bebas dipakai secara gratis tanpa royalti atau biaya per pesan (berbeda dengan WhatsApp Business API resmi Meta yang bertarif ~Rp 400 - Rp 600 per pesan).
2. **Cloudflare Quick Tunnel (`trycloudflare.com`)**:
   - Disediakan secara resmi dan gratis oleh Cloudflare untuk pengembang tanpa memerlukan kartu kredit.
3. **Infrastruktur Vercel & Supabase**:
   - Akun yang digunakan berada pada paket *Hobby / Community (Free Tier)* yang gratis.

#### 4. Dua (2) Tips Penting untuk Menjaga Nomor Tetap Aman:
1. **Gunakan Jeda Otomatis (Anti-Banned)**:
   - Di pengaturan, biarkan **Jeda Minimal: 4 detik** dan **Jeda Maksimal: 7 detik**.
   - Jeda acak ini meniru jeda manusia saat mengetik sehingga nomor WhatsApp Anda tidak dicurigai sebagai robot spam oleh server Meta.
2. **Laptop Harus Menyala Saat Mengirim Broadcast**:
   - Karena mesin pengirimnya berada di laptop ini, pastikan laptop Anda tetap menyala dan terhubung ke internet saat proses broadcast massal sedang berjalan.

### 7.3 Pembuatan Rapor Digital Otomatis dan Pengiriman via WA Web
1. **Pembuatan Gambar Rapor Otomatis**:
   - Sistem menyediakan rute dinamis `/api/og/rapor-evaluasi` yang secara otomatis menggambar kartu laporan hasil ujian santri (lengkap dengan kop LPTQ, nilai per juz, rata-rata, dan status kelulusan).
   - Gambar ini dikirimkan langsung sebagai lampiran gambar resmi WhatsApp kepada wali santri.
2. **Pengiriman via WhatsApp Web (Pembaruan Terkini)**:
   - **Auto-Copy Gambar Rapor ke Clipboard**: Saat pengguna mengeklik tombol **WA Web**, gambar rapor santri secara otomatis disalin ke *Clipboard* perangkat sebagai file PNG asli (`navigator.clipboard.write`).
   - **Panduan Tempel (Ctrl + V)**: Muncul jendela panduan interaktif yang mengarahkan pengguna saat WhatsApp Web terbuka untuk cukup menekan **<kbd>Ctrl + V</kbd>** (atau *Paste*) di kolom chat. Gambar rapor langsung terlampir bersama teks keterangan nilai.
   - **Tombol Bantuan Cepat**: Tersedia tombol **Unduh Gambar PNG** dan **Salin Gambar** di bawah panel pratinjau kartu rapor.
3. **Penyuntingan Template Pesan**:
   - Klik tombol **Draf Pesan** di bilah kontrol atas.
   - Anda dapat menggunakan variabel dinamis: `{nama}`, `{asrama}`, `{kamar}`, `{program}`, `{tahap}`, `{rata_rata}`, `{status}`, `{catatan}`.
4. **Prosedur Pengiriman Massal**:
   - Pilih santri di tabel dengan memberi centang.
   - Klik tombol hijau **Mulai Kirim Broadcast**.
   - Sistem mengirim pesan satu per satu dengan jeda aman anti-banned (4-7 detik).
   - Pengurus dapat menekan tombol **Jeda (Pause)** atau **Lanjut (Play)** sewaktu-waktu.

---

## BAB 8: PENGATURAN DAN ADMINISTRASI SISTEM

Menu rute: `/pengaturan`

Modul ini hanya dapat diakses oleh pengguna dengan peran **admin** atau pengguna yang memiliki izin edit pada modul pengaturan.

### 8.1 Personalisasi Tampilan dan Identitas Lembaga (*Branding*)
Pada Tab **Branding**:
- **Nama Aplikasi**: Mengubah nama resmi sistem (bawaan: "LPTQ BLOKAGUNG").
- **Subtitle Aplikasi**: Mengubah sub-judul (bawaan: "Pondok Pesantren Darussalam").
- **Logo Lembaga**: Unggah file logo resmi (PNG/SVG latar belakang transparan). Logo ini langsung muncul di sudut sidebar, halaman cetak LJK, dan kop flyer.
- **Favicon**: Unggah ikon kecil peramban web (format .ico atau .png).
- **Gambar Latar Belakang Login**: Mengubah gambar pemandangan latar belakang pada halaman masuk sistem.
- **Standar KKM Khotmil**: Menentukan nilai batas kelulusan default yang berlaku di seluruh sistem (default: 85).

### 8.2 Manajemen Akun Pengguna dan Penugasan Hak Akses Modul
Pada Tab **Pengguna**:
1. **Membuat Pengguna Baru**:
   - Klik tombol **Tambah Pengguna Baru**.
   - Masukkan Username, Nama Lengkap, Email, dan Kata Sandi baru.
   - Tentukan Peran Utama (*Role*): `admin`, `pengurus`, `pembimbing`, `operator_absen`, atau `viewer`.
   - Jika pengguna adalah pembimbing halaqoh, pilih Kelas dan Bagian Halaqoh binaannya.
2. **Kustomisasi Perizinan Granular**:
   - Di bawah formulir peran, terdapat daftar modul sistem:
     - *Dashboard*, *Data Santri*, *Halaqoh*, *Kegiatan (Absensi)*, *Juz Baru*, *Evaluasi*, *Khotmil 15*, *Khotmil 30*, *Flyer Khataman*, *Kirim WA*, dan *Manajemen Akun*.
   - Setiap modul dapat disetel secara mandiri ke status: **Sembunyikan**, **Baca**, atau **Edit**.
   - Hal ini memungkinkan pembuatan akun khusus (contoh: akun petugas yang hanya boleh membuka modul absensi tanpa bisa melihat nilai khotmil).
3. **Mengunci / Menangguhkan Akun (*Suspend*)**:
   - Ubah status akun menjadi **Suspended** untuk mencabut akses masuk tanpa perlu menghapus histori data yang pernah dibuat akun tersebut.

### 8.3 Konfigurasi WhatsApp API Gateway (WAHA)
Pada Tab **Integrasi WAHA**:
- **Endpoint URL**: Alamat server WAHA (contoh: `http://localhost:3000` atau `https://waha.pesantren.id`).
- **Session Name**: Nama sesi WhatsApp yang terdaftar di WAHA (bawaan: `default`).
- **API Key**: Kunci keamanan otentikasi WAHA (jika server dipasangi token pelindung).
- Klik tombol **Uji Sambungan** untuk memastikan aplikasi berhasil berkomunikasi dengan server WAHA sebelum digunakan untuk siaran massal.

### 8.4 Pencadangan dan Pemulihan Data (*Backup & Restore*)
Pada Tab **Cadangan Data**:
- **Ekspor Cadangan Lengkap**: Menghasilkan file arsip `.json` yang memuat seluruh tabel santri, rekaman absensi, nilai khotmil, serta pengaturan hirarki. Simpan file cadangan ini secara berkala ke media penyimpanan eksternal.
- **Pemulihan Data**: Digunakan untuk mengembalikan seluruh kondisi sistem saat terjadi kendala teknis atau perpindahan server.

---

## BAB 9: STANDAR OPERASIONAL PROSEDUR (SOP)

### 9.1 SOP Awal Semester dan Registrasi Santri Baru
1. Pengurus menyiapkan file Excel data santri baru sesuai template resmi aplikasi.
2. Lakukan pengecekan terhadap keunikan nama dan kelengkapan nomor WhatsApp wali santri.
3. Buka menu **Data Santri**, lalu unggah file Excel melalui fitur **Unggah Excel**.
4. Buka menu **Halaqoh**, lalu distribusikan santri baru ke dalam kelas 1-10 sesuai hasil tes penempatan (*tahsin/tahfidz placement test*).
5. Tetapkan nama asatidz pembimbing dan nomor kontak pada masing-masing kelompok halaqoh.

### 9.2 SOP Pelaksanaan Kegiatan dan Absensi Harian
1. Petugas piket atau pembimbing membuka menu **Kegiatan (Absensi)** sebelum halaqoh dimulai.
2. Pilih sesi yang aktif (**Pagi** saat ba'da Shubuh; **Malam** saat ba'da Maghrib).
3. Gunakan tombol **Set Semua Hadir** untuk menetapkan kehadiran awal seluruh peserta.
4. Saat presensi dipanggil, ubah santri yang tidak hadir ke status **Izin**, **Sakit**, atau **Alfa**.
5. Pada akhir sesi, pastikan tidak ada santri yang statusnya belum terdata. Rekap ketidakhadiran akan terakumulasi otomatis ke profil halaqoh.

### 9.3 SOP Ujian Khotmil Menggunakan LJK dan Kamera OMR
1. **H-2 Ujian**: Pengurus menentukan daftar santri yang memenuhi syarat ujian pada tab Tahap Khotmil.
2. **H-1 Ujian**:
   - Pengurus mencetak lembar LJK resmi melalui tombol **Cetak LJK Khotmil**.
   - Pastikan kode QR tercetak tajam dan bulatan pensil tidak berbayang.
   - Bagikan LJK kepada dewan asatidz penguji.
3. **Saat Ujian Berlangsung**:
   - Penguji menyimak bacaan santri per juz.
   - Penguji mengarsir bulatan pada LJK menggunakan pensil 2B atau spidol hitam:
     - Arsiran angka pada kolom **Halaman Kosong**.
     - Arsiran angka pada kolom **Jumlah Kesalahan**.
4. **Pasca Ujian (Koreksi Nilai)**:
   - Pengurus mengumpulkan seluruh lembar LJK yang telah diarsir.
   - Buka menu Khotmil di aplikasi, klik **Scan Kamera LJK (OMR)**.
   - Dekatkan lembar LJK ke kamera hingga kode QR terdeteksi dan nilai terbaca di layar.
   - Klik **Simpan Nilai**. Lakukan hingga seluruh lembar peserta selesai dipindai.
   - Buka rekapitulasi nilai untuk memastikan seluruh nilai masuk dan memenuhi KKM.

### 9.4 SOP Pengumuman dan Pelaporan Hasil ke Wali Santri
1. Setelah ujian selesai divalidasi oleh ketua LPTQ, buka menu **Alat Lanjutan > Kirim WA**.
2. Pilih program Khotmil dan nomor Tahap yang baru saja diuji.
3. Periksa status gateway WAHA (pastikan berstatus **ONLINE**).
4. Klik **Pratinjau Pesan** pada salah satu baris santri untuk memastikan format kartu rapor digital dan teks pengumuman sudah sesuai.
5. Centang seluruh peserta yang berstatus *Belum Dikirim*, lalu klik **Mulai Kirim Antrean**.
6. Pantau bilah kemajuan (*progress bar*) hingga seluruh laporan terkirim dengan status centang hijau.

---

## BAB 10: PANDUAN PEMECAHAN MASALAH (TROUBLESHOOTING)

### 1. Muncul Tulisan "Koneksi Pangkalan Data Gagal" atau Data Tidak Muncul
- **Penyebab**: Koneksi internet server terputus atau batas kuota permintaan Supabase tercapai.
- **Solusi**:
  1. Periksa koneksi internet perangkat Anda.
  2. Buka berkas konfigurasi lingkungan (`.env.local`) di peladen, pastikan variabel `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` valid.
  3. Muat ulang halaman peramban dengan menekan tombol **Ctrl + F5**.

### 2. Kamera Pemindai OMR Tidak Terbuka atau Layar Hitam
- **Penyebab**: Izin penggunaan kamera belum diberikan pada peramban web atau kamera sedang dipakai aplikasi lain.
- **Solusi**:
  1. Klik ikon gembok pada bilah alamat peramban web (URL bar).
  2. Pastikan opsi **Camera** berada pada status **Allow (Izinkan)**.
  3. Tutup aplikasi lain yang mungkin sedang memakai kamera (seperti Zoom, Google Meet, atau Camera Windows).
  4. Muat ulang halaman dan coba buka kembali jendela pemindai.

### 3. QR Code Terbaca, tetapi Angka Bulatan LJK Salah Terdeteksi
- **Penyebab**: Pencahayaan ruangan terlalu gelap, lembar kertas bergelombang/terlipat, atau arsiran pensil kurang hitam pekat.
- **Solusi**:
  1. Posisikan lembar LJK di tempat yang terang merata tanpa bayangan tajam.
  2. Pastikan lembar kertas dipegang rata sejajar dengan bidang kamera.
  3. Pastikan penguji menggunakan pensil hitam pekat (2B) dan bulatan terisi penuh.
  4. Anda tetap dapat memperbaiki angka secara manual pada tabel nilai jika diperlukan.

### 4. Status WAHA Gateway "OFFLINE" di Halaman Kirim WA
- **Penyebab**: Layanan kontainer WAHA terhenti atau sesi WhatsApp pada ponsel terputus (*logged out*).
- **Solusi**:
  1. Buka dasbor server WAHA, periksa apakah status sesi berbunyi `STOPPED` atau `SCAN_QR_CODE`.
  2. Buka aplikasi WhatsApp pada ponsel pusat LPTQ, tautkan ulang perangkat dengan memindai kode QR WAHA.
  3. Setelah status di server WAHA menjadi `WORKING`, klik tombol **Segarkan Status** di aplikasi LPTQ.

### 5. Gagal Mengunggah Berkas Excel Data Santri
- **Penyebab**: Nama kolom tidak sesuai dengan template atau terdapat kolom wajib yang kosong.
- **Solusi**:
  1. Pastikan Anda menggunakan file yang diunduh langsung dari tombol **Unduh Template Excel**.
  2. Pastikan kolom `nama_lengkap`, `blok`, `asrama`, `kamar`, `halaqoh_kelas`, dan `halaqoh_bagian` terisi lengkap.
  3. Nilai `halaqoh_kelas` harus berupa angka bulat 1 sampai 10, dan `halaqoh_bagian` harus berupa satu huruf kapital (A, B, C, D, E, atau F).

---

## PENUTUP DAN PENGESAHAN

Buku panduan ini merupakan pedoman baku operasional sistem informasi di lingkungan Lembaga Pengembangan Tilawatil Qur'an (LPTQ) Pondok Pesantren Darussalam Blokagung. Seluruh asatidz, pengurus, dan staf operator diwajibkan memahami serta menjalankan tata cara yang tertera di dalam dokumen ini demi menjaga keteraturan, ketertiban, dan keandalan data hafalan Al-Qur'an para santri.

Ditetapkan di: **Blokagung, Banyuwangi**  
Pengurus Lembaga Pengembangan Tilawatil Qur'an (LPTQ)  
Pondok Pesantren Darussalam Blokagung
