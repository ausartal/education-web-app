# AKURAT — Buku Pedoman Penggunaan Platform

> **Asesmen Kimia Ukur Adaptif Terpadu**  
> Versi Dokumen: 2.0  
> Tanggal: 23 Mei 2026  
> Penulis: Tim Pengembang AKURAT  
> Klasifikasi: Dokumen Publik

---

## Daftar Isi

1. [Pendahuluan](#1-pendahuluan)
2. [Memulai Penggunaan](#2-memulai-penggunaan)
3. [Panduan Siswa](#3-panduan-siswa)
4. [Panduan Guru](#4-panduan-guru)
5. [Panduan Administrator](#5-panduan-administrator)
6. [Fitur Pendukung](#6-fitur-pendukung)
7. [Sistem Gamifikasi](#7-sistem-gamifikasi)
8. [Spesifikasi Teknis](#8-spesifikasi-teknis)
9. [Pemecahan Masalah](#9-pemecahan-masalah)
10. [Lampiran](#10-lampiran)

---

## 1. Pendahuluan

### 1.1 Tentang AKURAT

AKURAT (Asesmen Kimia Ukur Adaptif Terpadu) adalah platform pembelajaran kimia berbasis web yang mengintegrasikan teknologi Multistage Adaptive Testing (MSAT) untuk mendiagnosis pemahaman dan miskonsepsi siswa secara presisi. Platform ini dirancang untuk memberikan pengalaman belajar yang personal, adaptif, dan menyenangkan.

### 1.2 Visi & Misi

**Visi:** Menjadi platform asesmen kimia adaptif terdepan yang mampu mengidentifikasi dan memperbaiki miskonsepsi siswa secara akurat.

**Misi:**
- Menyediakan materi kimia berkualitas tinggi yang mudah dipahami
- Mengukur kemampuan siswa secara adaptif menggunakan algoritma MSAT
- Memberikan umpan balik yang bermakna untuk perbaikan pembelajaran
- Memfasilitasi komunikasi antara guru dan siswa

### 1.3 Peran Pengguna

Platform AKURAT memiliki tiga peran pengguna dengan hak akses berbeda:

| Peran | Hak Akses | Tujuan Utama |
|-------|-----------|--------------|
| **Siswa (Student)** | Belajar, latihan, ujian, melihat progress | Memahami kimia dan mengukur kemampuan |
| **Guru (Teacher)** | Kelola materi, soal, pantau siswa, pesan | Membimbing dan memantau perkembangan siswa |
| **Administrator (Admin)** | Kelola platform, user, konten, konfigurasi | Mengelola dan mengawasi seluruh sistem |

### 1.4 Persyaratan Sistem

| Komponen | Minimum |
|----------|---------|
| Browser | Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ |
| Koneksi Internet | 1 Mbps (stabil) |
| Resolusi Layar | 360px (mobile) / 1024px (desktop) |
| JavaScript | Harus diaktifkan |

---

## 2. Memulai Penggunaan

### 2.1 Mengakses Platform

Buka browser dan kunjungi alamat platform AKURAT. Anda akan melihat halaman Landing Page dengan informasi tentang platform.

**Navigasi Landing Page:**
- **Home** — Kembali ke bagian atas
- **Learning Material** — Scroll ke daftar materi kimia
- **Learning Resources** — Scroll ke fitur-fitur platform
- **Assessment** — Scroll ke demo asesmen adaptif
- **Sign In** — Masuk ke akun yang sudah ada
- **Get Started** — Membuat akun baru

### 2.2 Membuat Akun Baru (Registrasi)

**Langkah-langkah:**

1. Klik tombol **Get Started** di navbar atau **Start Learning** / **Start Teaching** di hero section
2. Pada halaman registrasi, pilih tipe akun:
   - **Student** — Untuk siswa yang ingin belajar dan mengerjakan asesmen
   - **Teacher** — Untuk guru yang ingin mengelola kelas dan materi
3. Pilih metode registrasi:
   - **Google** — Registrasi instan menggunakan akun Google (direkomendasikan)
   - **Facebook** — Dalam pengembangan
   - **Email & Password** — Registrasi manual
4. Jika memilih registrasi manual, isi formulir:
   - **Full Name** — Nama lengkap Anda
   - **Username** — Nama pengguna unik
   - **Email** — Alamat email aktif (untuk verifikasi dan reset password)
   - **Password** — Minimal 6 karakter
5. Klik **Sign Up**
6. Anda akan diarahkan ke:
   - Siswa → Halaman Onboarding (pengaturan awal)
   - Guru → Dashboard Guru

### 2.3 Masuk ke Akun (Login)

**Langkah-langkah:**

1. Klik **Sign In** di navbar
2. Pilih metode login:
   - **Google** — Login instan
   - **Email & Password** — Masukkan kredensial
3. Klik **Sign in**
4. Anda akan diarahkan sesuai peran:
   - Siswa → `/dashboard`
   - Guru → `/teacher`
   - Admin → `/admin`

### 2.4 Lupa Password

1. Di halaman login, klik **Forgot Password**
2. Masukkan alamat email yang terdaftar
3. Klik tombol kirim
4. Buka email Anda dan klik link reset password
5. Buat password baru (minimal 6 karakter)

### 2.5 Logout

1. Klik avatar/foto profil di pojok kanan atas navbar
2. Pilih **Keluar** dari dropdown menu
3. Anda akan diarahkan kembali ke halaman login

---


## 3. Panduan Siswa

### 3.1 Onboarding (Pengaturan Awal)

Setelah registrasi pertama kali, siswa akan melewati proses onboarding 3 langkah:

**Langkah 1 — Selamat Datang**
- Perkenalan singkat tentang fitur-fitur AKURAT
- Penjelasan tentang sistem adaptif

**Langkah 2 — Preferensi Belajar**
- Pilih topik kimia yang diminati (bisa lebih dari satu)
- Atur target belajar harian (daily goal)

**Langkah 3 — Mulai Perjalanan**
- Konfirmasi pengaturan
- Klik "Mulai Belajar" untuk masuk ke Dashboard

> Onboarding hanya muncul sekali. Preferensi bisa diubah kapan saja di halaman Settings.

### 3.2 Dashboard Siswa

Dashboard adalah halaman utama setelah login. Berikut komponen-komponennya:

**A. Header Welcome**
- Sapaan personal dengan nama siswa
- Pesan motivasi harian

**B. Course Topics (Carousel)**
- Kartu topik kimia dengan gradient warna unik:
  - Stoikiometri (indigo → cyan)
  - Model Atom (violet → fuchsia)
  - Larutan (emerald → teal)
  - Ikatan Kimia (rose → orange)
  - Reaksi Redoks (amber → red)
  - Kesetimbangan (sky → indigo)
  - Geometri Molekul (lime → emerald)
- Navigasi: tombol panah kiri/kanan atau swipe (mobile)
- Setiap kartu menampilkan 3 sub-topik pelajaran

**C. Statistik Progress**
- **XP** — Total poin pengalaman yang dikumpulkan
- **Level** — Level saat ini berdasarkan XP
- **Streak** — Jumlah hari berturut-turut belajar
- **Materi Selesai** — Jumlah materi yang sudah dibaca
- **Total Waktu** — Akumulasi waktu belajar

**D. Weekly Activity Chart**
- Grafik batang aktivitas per hari (Senin-Minggu)
- Menampilkan XP yang diperoleh setiap hari
- Toggle view: List / Chart

**E. Jump Back In**
- Materi terakhir yang belum selesai
- Klik untuk langsung melanjutkan

### 3.3 Materi Pembelajaran

#### Melihat Daftar Materi (`/materi`)

1. Klik **Materi** di navbar atau bottom tab
2. Lihat daftar materi yang tersedia:
   - Judul dan deskripsi singkat
   - Estimasi waktu baca
   - Progress bar (jika sudah mulai)
   - Status: Belum Mulai / Sedang Dibaca / Selesai

#### Membaca Materi (`/materi/[id]`)

1. Klik salah satu materi dari daftar
2. Halaman baca menampilkan:
   - **Judul** dan metadata (waktu, topik)
   - **Konten** dalam format rich text:
     - Teks penjelasan
     - Rumus kimia dengan rendering KaTeX (contoh: $H_2O$, $\Delta G = \Delta H - T\Delta S$)
     - Tabel data
     - Daftar poin penting
   - **Learning Objectives** — Tujuan pembelajaran
3. Setelah selesai membaca, klik tombol **Tandai Selesai**
4. Progress tersimpan otomatis dan XP diberikan

### 3.4 Latihan Soal

#### Halaman Latihan (`/latihan`)

Latihan menggunakan sistem **Progressive Unlock** — tingkat kesulitan terbuka secara bertahap:

| Tingkat | Status Awal | Syarat Buka |
|---------|-------------|-------------|
| **Easy** (Mudah) | Terbuka | — |
| **Moderate** (Sedang) | Terkunci | Selesaikan Easy |
| **Hard** (Sulit) | Terkunci | Selesaikan Moderate |

#### Mengerjakan Latihan (`/latihan/[difficulty]`)

1. Pilih tingkat kesulitan yang tersedia
2. Interface latihan terdiri dari 2 kolom:
   - **Kiri** — Soal dan pilihan jawaban (format grid 2×2)
   - **Kanan** — Statistik (nomor soal, waktu, skor) dan tools
3. Pilih jawaban dari 5 opsi (A, B, C, D, E)
4. Setelah memilih, feedback langsung ditampilkan:
   - ✅ Benar — Animasi bounce + penjelasan
   - ❌ Salah — Animasi shake + jawaban benar + penjelasan
5. Klik **Soal Berikutnya** untuk melanjutkan
6. Setelah semua soal selesai, lihat ringkasan:
   - Skor total (benar/total)
   - Waktu pengerjaan
   - XP yang diperoleh

**Tools yang tersedia saat latihan:**
- **Kalkulator Saintifik** — Panel collapsible di sisi kanan
- **Tabel Periodik** — Panel collapsible di sisi kanan

### 3.5 Ujian Adaptif MSAT

#### Tentang MSAT

Multistage Adaptive Testing (MSAT) adalah metode asesmen yang menyesuaikan tingkat kesulitan soal berdasarkan kemampuan siswa secara real-time. Sistem ini:
- Menggunakan 3 stage dengan 7 soal per stage (total 21 soal)
- Menghitung estimasi kemampuan (theta) setelah setiap stage
- Menyesuaikan kesulitan stage berikutnya berdasarkan performa
- Mendeteksi anomali (jawaban acak, terlalu cepat)

#### Memulai Ujian (`/ujian`)

1. Klik **Ujian** di navbar
2. Baca halaman aturan ujian:
   - Total 21 soal dalam 3 tahap
   - Waktu terbatas per soal
   - Tidak bisa kembali ke soal sebelumnya
   - Tingkat kesulitan menyesuaikan otomatis
3. Klik **Mulai Ujian**

#### Mengerjakan Ujian (`/ujian/[examId]/session`)

1. Interface sama dengan latihan (2 kolom)
2. Timer berjalan per soal (waktu berbeda tiap kesulitan)
3. Pilih jawaban dan klik **Submit**
4. **Penting:** Tingkat kesulitan TIDAK ditampilkan ke siswa (berjalan di background)
5. Jika waktu habis, soal otomatis di-skip

#### Hasil Ujian (`/ujian/[examId]/results`)

Setelah menyelesaikan 21 soal, halaman hasil menampilkan:

| Metrik | Penjelasan |
|--------|-----------|
| **Theta Score** | Estimasi kemampuan (-3 sampai +3) |
| **Proficiency Level** | Kategori: Novice / Beginner / Intermediate / Advanced / Expert |
| **Confidence Score** | Tingkat kepercayaan hasil (0-100%) |
| **Soal Benar** | Jumlah jawaban benar dari 21 |
| **Waktu Total** | Total waktu pengerjaan |
| **Rekomendasi** | Saran topik untuk dipelajari lebih lanjut |

### 3.6 Profil & Achievements

#### Halaman Profil (`/profile`)

Menampilkan:
- Foto profil dan informasi dasar
- Statistik lengkap (XP, Level, Streak, Lessons, Quizzes)
- **Daftar Achievements** — Badge yang sudah diraih:
  - First Steps (selesaikan materi pertama)
  - Quiz Master (selesaikan semua tingkat latihan)
  - Streak Champion (streak 7 hari)
  - Dan lainnya (total 13 achievements)

### 3.7 Pengaturan

#### Halaman Settings (`/settings`)

| Tab | Fungsi |
|-----|--------|
| **Profil** | Edit nama, sekolah, kota, kelas |
| **Notifikasi** | Toggle notifikasi push |
| **Bahasa** | Pilih: Indonesia / English |
| **Privasi** | Pengaturan visibilitas profil |
| **Logout** | Keluar dari akun |

---


## 4. Panduan Guru

### 4.1 Dashboard Guru (`/teacher`)

Setelah login sebagai guru, Anda langsung diarahkan ke Dashboard Guru yang menampilkan:

**A. Kartu Statistik (4 kartu gradient)**
- Total Siswa — Jumlah siswa yang terdaftar
- Materi — Jumlah materi yang tersedia
- Bank Soal — Total soal di database
- Rata-rata XP — Rata-rata XP seluruh siswa

**B. Quick Actions (3 kartu aksi)**
- **Kelola Materi** — Akses cepat ke manajemen materi
- **Kelola Soal** — Akses cepat ke bank soal
- **Pesan** — Akses cepat ke messaging

**C. Siswa Teratas**
- Leaderboard 5 siswa dengan XP tertinggi
- Menampilkan: Ranking, Nama, Pelajaran selesai, XP, Terakhir aktif
- Klik nama siswa untuk melihat detail

### 4.2 Kelola Materi (`/teacher/materials`)

#### Melihat Daftar Materi

- Semua materi ditampilkan dalam bentuk kartu
- Setiap kartu menampilkan: Judul, Deskripsi, Waktu baca, Topik, Status
- Status materi:
  - **Publik** (hijau) — Terlihat oleh siswa
  - **Draf** (abu-abu) — Hanya terlihat oleh guru/admin

#### Menambah Materi Baru

1. Klik tombol **Tambah Materi** (gradient hijau)
2. Isi formulir dalam modal:
   - **Judul** — Judul materi (wajib)
   - **Deskripsi** — Ringkasan singkat materi
   - **Konten** — Tulis dalam format Markdown
     - Mendukung heading, bold, italic, list
     - Mendukung rumus KaTeX: `$rumus$` untuk inline, `$$rumus$$` untuk block
     - Mendukung tabel dan code block
3. Klik **Buat Materi**
4. Materi baru otomatis berstatus **Draf**

#### Mengelola Status Materi

- **Publikasikan** — Klik ikon mata (👁) pada materi berstatus Draf
- **Sembunyikan** — Klik ikon mata tertutup pada materi berstatus Publik
- **Edit** — Klik ikon pensil untuk mengedit konten

### 4.3 Kelola Soal (`/teacher/questions`)

#### Melihat Bank Soal

- Header menampilkan total soal yang tersedia
- **Filter** berdasarkan kesulitan:
  - Semua — Tampilkan semua soal
  - Mudah — Soal tingkat easy
  - Sedang — Soal tingkat moderate
  - Sulit — Soal tingkat hard
- Setiap filter menampilkan jumlah soal dalam kategori tersebut

#### Menambah Soal Baru

1. Klik tombol **Tambah Soal** (gradient ungu)
2. Isi formulir:
   - **Pertanyaan** — Teks soal (mendukung rumus kimia)
   - **Tingkat Kesulitan** — Pilih: Mudah / Sedang / Sulit
   - **Opsi A-E** — Lima pilihan jawaban
   - **Jawaban Benar** — Pilih huruf jawaban yang benar
   - **Penjelasan** — Penjelasan mengapa jawaban tersebut benar
3. Klik **Buat Soal**

#### Menghapus Soal

- Hover pada kartu soal → ikon hapus (merah) muncul di kanan
- Klik ikon hapus → soal langsung terhapus
- Konfirmasi via toast notification

#### Impor Massal (Bulk Import)

Untuk menambahkan banyak soal sekaligus:

1. Siapkan file JSON dengan format berikut:
```json
[
  {
    "topic": "stoikiometri",
    "subtopic": "konsep-mol",
    "difficulty": "easy",
    "stem": "Berapakah jumlah mol dalam 36 gram air (H₂O)?",
    "options": {
      "A": "1 mol",
      "B": "2 mol",
      "C": "3 mol",
      "D": "0.5 mol",
      "E": "4 mol"
    },
    "correctAnswer": "B",
    "explanation": "Mr H₂O = 2(1) + 16 = 18. Mol = massa/Mr = 36/18 = 2 mol.",
    "baseTime": 60
  }
]
```
2. Klik area **Impor Massal** di bagian bawah halaman
3. Pilih file JSON dari komputer
4. Soal otomatis ditambahkan ke database
5. Toast notification menampilkan jumlah soal yang berhasil diimpor

### 4.4 Daftar Siswa (`/teacher/students`)

#### Ringkasan Kelas

Tiga kartu statistik di bagian atas:
- **Total XP Kelas** — Akumulasi XP seluruh siswa
- **Rata-rata Level** — Level rata-rata kelas
- **Pelajaran Selesai** — Total pelajaran yang diselesaikan seluruh siswa

#### Mencari Siswa

- Gunakan search bar untuk mencari berdasarkan nama atau email
- Hasil filter secara real-time saat mengetik

#### Kartu Siswa

Setiap siswa ditampilkan dalam kartu yang berisi:
- Avatar (inisial nama)
- Nama lengkap dan email
- Statistik: XP, Streak, Lessons, Level

#### Detail Siswa (`/teacher/students/[id]`)

Klik nama siswa untuk melihat halaman detail:
- **Statistik Lengkap** — Semua metrik performa
- **Grafik Theta** — Perkembangan kemampuan dari waktu ke waktu
- **Catatan Guru** — Area teks untuk menulis catatan tentang siswa (tersimpan di Firestore)

### 4.5 Pesan (`/teacher/messages`)

#### Interface Messaging

Layout terbagi menjadi 2 panel:
- **Panel Kiri** — Daftar kontak siswa dengan search bar
- **Panel Kanan** — Area percakapan

#### Mengirim Pesan

1. Pilih siswa dari daftar kontak di panel kiri
2. Ketik pesan di input field di bagian bawah
3. Tekan **Enter** atau klik tombol kirim (ikon panah)
4. Pesan langsung terkirim dan tersimpan

#### Fitur Messaging

- Pencarian kontak real-time
- Bubble chat berwarna (biru untuk pesan terkirim, abu-abu untuk pesan diterima)
- Scroll otomatis ke pesan terbaru
- Indikator kontak aktif (highlight gradient)

---


## 5. Panduan Administrator

> **Catatan:** Peran Admin ditetapkan secara manual melalui Firebase Console.  
> Path: Firebase Console → Firestore → Collection `users` → Document user → Edit field `role` menjadi `"admin"`.

### 5.1 Dashboard Admin (`/admin`)

Halaman utama administrator menampilkan Key Performance Indicators (KPI):

**Kartu KPI:**
- **Total Users** — Jumlah seluruh pengguna terdaftar
- **Materials** — Jumlah materi yang tersedia
- **Exams** — Jumlah sesi ujian yang telah dilakukan
- **Questions** — Total soal di bank soal

**Grafik & Visualisasi:**
- **User Growth** — Grafik batang pertumbuhan pengguna mingguan
- **Platform Overview** — Progress bar:
  - Distribusi soal per tingkat kesulitan (Easy/Moderate/Hard)
  - Jumlah materi per status (Published/Draft)

### 5.2 User Management (`/admin/users`)

#### Tabel Pengguna

Menampilkan semua user dalam format tabel:
- Nama, Email, Role, Status (Active/Inactive), Tanggal Daftar

#### Fitur Manajemen

| Aksi | Cara |
|------|------|
| **Cari user** | Ketik di search bar (filter by nama/email) |
| **Filter by role** | Klik tab: All / Student / Teacher / Admin |
| **Ubah role** | Klik dropdown role pada baris user → pilih role baru |
| **Toggle status** | Klik toggle Active/Inactive |
| **Hapus user** | Klik tombol hapus → konfirmasi |

> Semua aksi memberikan feedback via toast notification.

### 5.3 Content Moderation (`/admin/content`)

#### Materi Pending

- Daftar materi berstatus "Draft" yang menunggu persetujuan
- Setiap item menampilkan: Judul, Penulis, Tanggal dibuat

#### Aksi Moderasi

- **Approve** — Mengubah status menjadi "Published" (terlihat oleh siswa)
- **Reject** — Menolak materi (tetap Draft, penulis diberitahu)

#### Overview Konten

- Ringkasan konten yang sudah dipublikasikan
- Status badge untuk setiap materi

### 5.4 Platform Configuration (`/admin/config`)

#### Parameter MSAT Algorithm

| Parameter | Default | Deskripsi |
|-----------|---------|-----------|
| Jumlah Stage | 3 | Tahapan dalam satu sesi ujian |
| Soal per Stage | 7 | Jumlah soal di setiap tahap |
| Theta Min | -3.0 | Batas bawah estimasi kemampuan |
| Theta Max | 3.0 | Batas atas estimasi kemampuan |
| Anomaly Threshold (Speed) | 5 detik | Batas waktu minimum (di bawah ini dianggap terlalu cepat) |
| Anomaly Threshold (Random) | 0.2 | Threshold deteksi jawaban acak |

#### Parameter Gamifikasi

| Parameter | Default | Deskripsi |
|-----------|---------|-----------|
| XP per Lesson Complete | 50 | XP saat menyelesaikan materi |
| XP per Quiz Complete | 100 | XP saat menyelesaikan latihan |
| XP per Exam Complete | 200 | XP saat menyelesaikan ujian |
| XP per Correct Answer | 10 | XP per jawaban benar |
| XP per Streak Day | 25 | XP bonus per hari streak |

#### Menyimpan Konfigurasi

1. Edit nilai parameter yang diinginkan
2. Klik tombol **Save**
3. Perubahan langsung tersimpan ke Firestore
4. Toast notification mengkonfirmasi penyimpanan

---

## 6. Fitur Pendukung

### 6.1 Navigasi

**Desktop (layar ≥ 768px):**
- Navbar horizontal di bagian atas
- Logo di kiri → klik untuk kembali ke halaman utama
- Menu navigasi di tengah
- Notifikasi + Avatar di kanan

**Mobile (layar < 768px):**
- Bottom tab bar dengan 5 ikon
- Siswa: Home, Materi, Latihan, Ujian, Profil
- Guru: Home, Materi, Soal, Siswa, Pesan

### 6.2 Notifikasi

**Mengakses:**
- Klik ikon lonceng (🔔) di navbar
- Dropdown menampilkan notifikasi terbaru

**Jenis Notifikasi:**
- Achievement baru diraih
- Pesan dari guru
- Pengingat belajar harian
- Level up

### 6.3 Kalkulator Saintifik

Tersedia di halaman **Latihan** dan **Ujian** sebagai panel collapsible di sisi kanan.

**Fitur:**
- Operasi dasar: +, −, ×, ÷
- Fungsi trigonometri: sin, cos, tan, arcsin, arccos, arctan
- Logaritma: log (basis 10), ln (natural)
- Pangkat: x², x³, xⁿ, √x
- Konstanta: π (3.14159...), e (2.71828...)
- Memori: MC, MR, M+, M−
- Radian / Derajat toggle

**Cara menggunakan:**
1. Klik tombol **Kalkulator** di panel tools (sisi kanan)
2. Panel kalkulator terbuka
3. Gunakan tombol-tombol untuk menghitung
4. Klik lagi untuk menutup panel

### 6.4 Tabel Periodik

Referensi tabel periodik unsur tersedia di halaman **Latihan** dan **Ujian**.

**Informasi yang ditampilkan:**
- Nomor atom
- Simbol unsur
- Nama unsur
- Massa atom relatif
- Golongan dan periode

### 6.5 Offline Indicator

Jika koneksi internet terputus:
- Banner kuning muncul di bagian atas halaman
- Pesan: "Kamu sedang offline"
- Banner otomatis hilang saat koneksi kembali

### 6.6 Progressive Web App (PWA)

AKURAT dapat di-install sebagai aplikasi di perangkat mobile:

**Android:**
1. Buka AKURAT di Chrome
2. Tap menu (⋮) → "Add to Home Screen"
3. Konfirmasi → ikon AKURAT muncul di home screen

**iOS:**
1. Buka AKURAT di Safari
2. Tap ikon Share (↑) → "Add to Home Screen"
3. Konfirmasi → ikon AKURAT muncul di home screen

### 6.7 Multi-Bahasa

Platform mendukung 2 bahasa:
- 🇮🇩 **Bahasa Indonesia** (default)
- 🇬🇧 **English**

Cara mengubah: Settings → Bahasa → Pilih bahasa → Otomatis diterapkan

---

## 7. Sistem Gamifikasi

### 7.1 Experience Points (XP)

XP adalah poin pengalaman yang dikumpulkan dari berbagai aktivitas:

| Aktivitas | XP |
|-----------|-----|
| Menyelesaikan materi | +50 XP |
| Menyelesaikan latihan | +100 XP |
| Menyelesaikan ujian | +200 XP |
| Jawaban benar (latihan/ujian) | +10 XP |
| Bonus streak harian | +25 XP |

### 7.2 Level System

Level naik berdasarkan akumulasi XP:

| Level | XP Dibutuhkan |
|-------|---------------|
| 1 | 0 |
| 2 | 100 |
| 3 | 250 |
| 4 | 500 |
| 5 | 1000 |
| ... | Progresif |

### 7.3 Streak

- Streak bertambah setiap hari Anda melakukan aktivitas belajar
- Streak reset ke 0 jika melewatkan 1 hari
- Longest streak tersimpan di profil

### 7.4 Achievements

13 achievements tersedia, contoh:

| Badge | Syarat |
|-------|--------|
| First Steps | Selesaikan materi pertama |
| Quiz Starter | Selesaikan latihan pertama |
| Exam Brave | Selesaikan ujian pertama |
| Streak 7 | Streak 7 hari berturut-turut |
| Streak 30 | Streak 30 hari berturut-turut |
| Perfect Score | Skor 100% di latihan |
| Chemistry Novice | Capai Level 5 |
| Chemistry Expert | Capai Level 10 |

---

## 8. Spesifikasi Teknis

### 8.1 Arsitektur Platform

| Komponen | Teknologi |
|----------|-----------|
| Frontend | Next.js 14 (React, App Router) |
| Bahasa | TypeScript |
| Styling | Tailwind CSS |
| Animasi | Framer Motion |
| Backend | Firebase (Firestore, Auth, Storage) |
| Rendering Rumus | KaTeX (via react-markdown + rehype-katex) |
| Testing | Vitest (18 unit tests) |

### 8.2 Database Collections

| Collection | Fungsi |
|------------|--------|
| `users` | Data profil dan statistik pengguna |
| `materials` | Konten materi pembelajaran |
| `question_bank` | Bank soal (96 soal: 32 per tingkat) |
| `exam_sessions` | Riwayat sesi ujian |
| `quiz_results` | Hasil latihan |
| `user_progress` | Progress belajar per materi |
| `achievements` | Definisi achievement |
| `user_achievements` | Achievement yang diraih user |
| `messages` | Pesan guru-siswa |
| `notifications` | Notifikasi pengguna |
| `app_config` | Konfigurasi platform |
| `analytics_events` | Event tracking |

### 8.3 Algoritma MSAT

Multistage Adaptive Testing bekerja sebagai berikut:

```
Stage 1 (7 soal moderate)
    ↓ Hitung theta
Stage 2 (7 soal, kesulitan berdasarkan theta Stage 1)
    ↓ Hitung theta
Stage 3 (7 soal, kesulitan berdasarkan theta Stage 2)
    ↓ Hitung theta final
Hasil: Theta, Proficiency Level, Confidence Score
```

**Proficiency Levels:**
- Theta < -1.5 → Novice
- Theta -1.5 to -0.5 → Beginner
- Theta -0.5 to 0.5 → Intermediate
- Theta 0.5 to 1.5 → Advanced
- Theta > 1.5 → Expert

---

## 9. Pemecahan Masalah

### 9.1 Masalah Umum

| Masalah | Solusi |
|---------|--------|
| Halaman tidak bisa dibuka | Periksa koneksi internet. Refresh halaman (Ctrl+R / Cmd+R) |
| Login gagal | Pastikan email dan password benar. Coba reset password |
| Latihan terkunci | Selesaikan tingkat sebelumnya terlebih dahulu |
| Ujian terhenti | Refresh halaman. Jika masih bermasalah, sesi mungkin sudah expired |
| Notifikasi tidak muncul | Periksa pengaturan notifikasi di Settings |
| Tampilan berantakan | Clear cache browser (Ctrl+Shift+Delete) |
| Facebook login tidak bisa | Fitur masih dalam pengembangan. Gunakan Google atau email |

### 9.2 Error Messages

Platform menampilkan pesan error yang ramah pengguna:

| Kode | Pesan | Solusi |
|------|-------|--------|
| auth/email-already-in-use | Email sudah terdaftar | Gunakan email lain atau login |
| auth/wrong-password | Password salah | Periksa kembali atau reset password |
| auth/user-not-found | Akun tidak ditemukan | Periksa email atau buat akun baru |
| auth/too-many-requests | Terlalu banyak percobaan | Tunggu beberapa menit |
| auth/weak-password | Password terlalu lemah | Gunakan minimal 6 karakter |

### 9.3 Kontak Dukungan

Jika masalah tidak terselesaikan:
1. Buka halaman `/contact`
2. Isi formulir kontak dengan deskripsi masalah
3. Tim support akan merespons dalam 1×24 jam

---

## 10. Lampiran

### 10.1 Daftar URL Halaman

**Publik (tanpa login):**
| URL | Halaman |
|-----|---------|
| `/` | Landing Page |
| `/about` | Tentang AKURAT |
| `/privacy` | Kebijakan Privasi |
| `/terms` | Syarat & Ketentuan |
| `/contact` | Kontak |
| `/login` | Halaman Login |
| `/register` | Halaman Registrasi |
| `/forgot-password` | Reset Password |

**Siswa (perlu login):**
| URL | Halaman |
|-----|---------|
| `/dashboard` | Dashboard Siswa |
| `/materi` | Daftar Materi |
| `/materi/[id]` | Baca Materi |
| `/latihan` | Daftar Latihan |
| `/latihan/[difficulty]` | Sesi Latihan |
| `/ujian` | Halaman Ujian |
| `/ujian/[id]/session` | Sesi Ujian MSAT |
| `/ujian/[id]/results` | Hasil Ujian |
| `/profile` | Profil & Achievements |
| `/settings` | Pengaturan |
| `/onboarding` | Onboarding (pertama kali) |

**Guru (perlu login sebagai Teacher):**
| URL | Halaman |
|-----|---------|
| `/teacher` | Dashboard Guru |
| `/teacher/materials` | Kelola Materi |
| `/teacher/questions` | Kelola Soal |
| `/teacher/students` | Daftar Siswa |
| `/teacher/students/[id]` | Detail Siswa |
| `/teacher/messages` | Pesan |

**Admin (perlu login sebagai Admin):**
| URL | Halaman |
|-----|---------|
| `/admin` | Dashboard Admin |
| `/admin/users` | Manajemen User |
| `/admin/content` | Moderasi Konten |
| `/admin/config` | Konfigurasi Platform |

### 10.2 Keyboard Shortcuts

| Shortcut | Fungsi |
|----------|--------|
| `Enter` | Submit jawaban (latihan/ujian) |
| `Enter` | Kirim pesan (messaging) |
| `1-5` atau `A-E` | Pilih opsi jawaban |

### 10.3 Format Penulisan Rumus (untuk Guru)

Saat menulis materi atau soal, gunakan format KaTeX:

| Penulisan | Hasil |
|-----------|-------|
| `$H_2O$` | H₂O (inline) |
| `$\Delta G$` | ΔG |
| `$\frac{n}{V}$` | n/V (pecahan) |
| `$K_c = \frac{[C]^c[D]^d}{[A]^a[B]^b}$` | Rumus Kc |
| `$$PV = nRT$$` | Persamaan gas ideal (block) |

---

*Dokumen ini merupakan panduan resmi penggunaan platform AKURAT versi 2.0. Untuk pembaruan terbaru, periksa repository dokumentasi atau hubungi tim pengembang.*

**© 2026 AKURAT — Asesmen Kimia Ukur Adaptif Terpadu. All rights reserved.**
