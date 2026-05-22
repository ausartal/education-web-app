# AKURAT — Buku Pedoman Penggunaan

> Platform Asesmen Kimia Ukur Adaptif Terpadu  
> Versi: 1.0 | Terakhir diperbarui: 23 Mei 2026

---

## Daftar Isi

1. [Pengenalan](#1-pengenalan)
2. [Halaman Publik (Tanpa Login)](#2-halaman-publik-tanpa-login)
3. [Registrasi & Login](#3-registrasi--login)
4. [Panduan Siswa (Student)](#4-panduan-siswa-student)
5. [Panduan Guru (Teacher)](#5-panduan-guru-teacher)
6. [Panduan Admin](#6-panduan-admin)
7. [Fitur Umum](#7-fitur-umum)
8. [FAQ & Troubleshooting](#8-faq--troubleshooting)

---

## 1. Pengenalan

**AKURAT** (Asesmen Kimia Ukur Adaptif Terpadu) adalah platform edukasi kimia berbasis AI yang menggunakan Multistage Adaptive Testing (MSAT) untuk mendiagnosis pemahaman dan miskonsepsi siswa secara presisi.

### Peran Pengguna

| Peran | Deskripsi |
|-------|-----------|
| **Student** | Belajar materi, mengerjakan latihan & ujian adaptif, melihat progress |
| **Teacher** | Mengelola materi, soal, memantau siswa, mengirim pesan |
| **Admin** | Mengelola platform, user, konten, dan konfigurasi sistem |

---

## 2. Halaman Publik (Tanpa Login)

Halaman-halaman ini bisa diakses siapa saja tanpa perlu login.

### 2.1 Landing Page (`/`)

- Halaman utama yang menampilkan informasi tentang AKURAT
- Berisi: Hero section, Chemistry Materials, Learning Resources, Assessment demo, CTA
- Tombol **Start Learning** → ke halaman Register (sebagai Student)
- Tombol **Start Teaching** → ke halaman Register (sebagai Teacher)
- Jika sudah login, otomatis redirect ke Dashboard

### 2.2 Halaman Informasi

| Halaman | URL | Isi |
|---------|-----|-----|
| Tentang | `/about` | Informasi tentang AKURAT |
| Privasi | `/privacy` | Kebijakan privasi |
| Syarat & Ketentuan | `/terms` | Terms of Service |
| Kontak | `/contact` | Form kontak |

---

## 3. Registrasi & Login

### 3.1 Registrasi (`/register`)

1. Buka halaman `/register` atau klik **Get Started** di navbar
2. Pilih tipe akun: **Student** atau **Teacher**
3. Pilih metode:
   - **Google** — Login langsung dengan akun Google
   - **Facebook** — Coming soon
   - **Manual** — Isi form:
     - Full Name
     - Username
     - Email
     - Password (minimal 6 karakter)
4. Klik **Sign Up**
5. Setelah berhasil:
   - Student → diarahkan ke Onboarding
   - Teacher → diarahkan ke Teacher Dashboard

### 3.2 Login (`/login`)

1. Buka halaman `/login` atau klik **Sign In** di navbar
2. Pilih metode:
   - **Google** — Login langsung
   - **Manual** — Masukkan Email & Password
3. Klik **Sign in**
4. Setelah berhasil:
   - Student → diarahkan ke `/dashboard`
   - Teacher → diarahkan ke `/teacher`
   - Admin → diarahkan ke `/admin`

### 3.3 Lupa Password (`/forgot-password`)

1. Klik link "Forgot Password" di halaman login
2. Masukkan email yang terdaftar
3. Klik kirim → cek inbox email untuk link reset

---

## 4. Panduan Siswa (Student)

### 4.1 Onboarding (`/onboarding`)

Setelah registrasi pertama kali, siswa akan melewati 3 langkah onboarding:
1. **Welcome** — Perkenalan platform
2. **Preferensi** — Pilih topik yang diminati & daily goal
3. **Selesai** — Mulai belajar

### 4.2 Dashboard (`/dashboard`)

Halaman utama setelah login. Berisi:
- **Welcome message** dengan nama siswa
- **Course Topics** — Carousel topik kimia (Stoikiometri, Model Atom, Larutan, dll.)
- **Progress Overview** — Materi selesai, waktu belajar, XP
- **Weekly Activity** — Grafik aktivitas mingguan
- **Streak** — Hari berturut-turut belajar
- **Jump Back In** — Lanjutkan materi terakhir

### 4.3 Materi (`/materi`)

1. Buka menu **Materi** di navbar
2. Lihat daftar materi yang tersedia (dengan progress bar)
3. Klik salah satu materi untuk membaca
4. Halaman baca (`/materi/[id]`) berisi:
   - Konten markdown dengan rumus kimia (KaTeX)
   - Estimasi waktu baca
   - Tombol "Selesai" untuk menandai progress

### 4.4 Latihan (`/latihan`)

Latihan soal dengan 3 tingkat kesulitan (progressive unlock):

1. **Easy** — Tersedia langsung
2. **Moderate** — Terbuka setelah Easy selesai
3. **Hard** — Terbuka setelah Moderate selesai

Cara mengerjakan:
1. Pilih tingkat kesulitan
2. Jawab soal satu per satu (format 2x2 grid pilihan)
3. Lihat feedback langsung (benar/salah + penjelasan)
4. Setelah selesai, lihat ringkasan skor

**Tools tersedia saat latihan:**
- Kalkulator Saintifik (collapsible panel)
- Tabel Periodik (collapsible panel)

### 4.5 Ujian MSAT (`/ujian`)

Ujian adaptif yang menyesuaikan kesulitan berdasarkan kemampuan siswa:

1. Buka menu **Ujian**
2. Baca aturan ujian
3. Klik **Mulai Ujian**
4. Kerjakan 21 soal (7 soal × 3 stage)
   - Tingkat kesulitan otomatis menyesuaikan (tidak ditampilkan ke siswa)
   - Timer berjalan per soal
5. Setelah selesai, lihat hasil:
   - Skor theta (kemampuan)
   - Proficiency level
   - Confidence score
   - Rekomendasi belajar

**Tools tersedia saat ujian:**
- Kalkulator Saintifik
- Tabel Periodik

### 4.6 Profil (`/profile`)

- Lihat statistik: XP, Level, Streak, Total Lessons, Total Quizzes
- Lihat achievements/badges yang sudah diraih
- Edit foto profil

### 4.7 Pengaturan (`/settings`)

- **Profil** — Edit nama, sekolah, kota, kelas
- **Notifikasi** — Aktifkan/nonaktifkan notifikasi
- **Bahasa** — Pilih Indonesia atau English
- **Privasi** — Pengaturan privasi
- **Logout** — Keluar dari akun

### 4.8 Notifikasi

- Klik ikon lonceng di navbar
- Lihat notifikasi: achievement baru, pesan dari guru, pengingat belajar
- Klik notifikasi untuk membuka detail

---

## 5. Panduan Guru (Teacher)

### 5.1 Teacher Dashboard (`/teacher`)

Halaman utama guru setelah login. Berisi:
- **Statistik** — Total Siswa, Materi, Bank Soal, Rata-rata XP
- **Quick Actions** — Akses cepat ke Kelola Materi, Kelola Soal, Pesan
- **Siswa Teratas** — Leaderboard 5 siswa dengan XP tertinggi

### 5.2 Kelola Materi (`/teacher/materials`)

1. Lihat daftar semua materi (dengan status Publik/Draf)
2. **Tambah Materi** — Klik tombol "Tambah Materi":
   - Isi judul, deskripsi, konten (Markdown)
   - Materi baru otomatis berstatus "Draf"
3. **Publikasi/Sembunyikan** — Klik ikon mata untuk toggle status
4. **Edit** — Klik ikon pensil untuk mengedit

### 5.3 Kelola Soal (`/teacher/questions`)

1. Lihat semua soal di Bank Soal
2. **Filter** — Pilih: Semua, Mudah, Sedang, Sulit
3. **Tambah Soal** — Klik "Tambah Soal":
   - Tulis pertanyaan
   - Pilih tingkat kesulitan
   - Isi 5 opsi jawaban (A-E)
   - Pilih jawaban benar
   - Tulis penjelasan
4. **Hapus Soal** — Hover soal, klik ikon hapus
5. **Impor Massal** — Upload file JSON untuk menambah banyak soal sekaligus

Format JSON untuk impor:
```json
[
  {
    "topic": "stoikiometri",
    "subtopic": "mol",
    "difficulty": "easy",
    "stem": "Pertanyaan...",
    "options": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." },
    "correctAnswer": "A",
    "explanation": "Penjelasan...",
    "baseTime": 60
  }
]
```

### 5.4 Daftar Siswa (`/teacher/students`)

1. Lihat ringkasan kelas: Total XP, Rata-rata Level, Pelajaran Selesai
2. **Cari siswa** — Ketik nama atau email di search bar
3. **Lihat detail** — Klik nama siswa untuk melihat:
   - Statistik lengkap (XP, Level, Streak, Lessons, Quizzes)
   - Grafik perkembangan theta
   - Catatan guru (bisa ditambah/edit)

### 5.5 Pesan (`/teacher/messages`)

1. Pilih siswa dari daftar kontak di sidebar kiri
2. **Cari kontak** — Ketik nama di search bar
3. Ketik pesan di input bawah
4. Tekan Enter atau klik tombol kirim
5. Pesan real-time (tersimpan di Firestore)

---

## 6. Panduan Admin

> **Cara menjadi Admin:** Ubah field `role` menjadi `"admin"` di Firebase Console → Firestore → collection `users` → pilih document user → edit field `role`.

### 6.1 Admin Dashboard (`/admin`)

Halaman utama admin. Berisi:
- **KPI Cards** — Total Users, Materials, Exams, Questions
- **User Growth** — Grafik pertumbuhan user mingguan
- **Platform Overview** — Progress bar distribusi soal per kesulitan & jumlah materi

### 6.2 User Management (`/admin/users`)

1. Lihat tabel semua user
2. **Cari** — Ketik nama atau email
3. **Filter** — Pilih role: All, Student, Teacher, Admin
4. **Ubah Role** — Klik dropdown role di baris user, pilih role baru
5. **Toggle Status** — Aktifkan/nonaktifkan user
6. **Hapus User** — Klik tombol hapus (dengan konfirmasi)

### 6.3 Content Moderation (`/admin/content`)

1. Lihat materi yang menunggu persetujuan (status: draft)
2. **Approve** — Klik tombol Approve untuk mempublikasikan
3. **Reject** — Klik tombol Reject untuk menolak
4. Lihat overview konten yang sudah dipublikasikan

### 6.4 Platform Configuration (`/admin/config`)

Pengaturan sistem yang bisa diedit:

**MSAT Algorithm:**
- Jumlah stage (default: 3)
- Soal per stage (default: 7)
- Range theta (-3 sampai 3)
- Threshold anomaly detection

**Gamification:**
- XP per lesson complete
- XP per quiz complete
- XP per exam complete
- XP per correct answer
- XP per streak day

Klik **Save** untuk menyimpan perubahan ke Firestore.

---

## 7. Fitur Umum

### 7.1 Navigasi

**Desktop:**
- Navbar di atas dengan link menu
- Logo klik → kembali ke Dashboard/Teacher/Admin (sesuai role)

**Mobile:**
- Bottom tab bar dengan 5 ikon
- Student: Home, Materi, Latihan, Ujian, Profil
- Teacher: Home, Materi, Soal, Siswa, Pesan

### 7.2 Offline Indicator

Jika koneksi internet terputus, banner "Kamu sedang offline" akan muncul di atas halaman.

### 7.3 PWA (Progressive Web App)

AKURAT bisa di-install di HP:
1. Buka di browser mobile
2. Klik "Add to Home Screen" / "Install App"
3. Akses seperti aplikasi native

### 7.4 Bahasa

Platform mendukung 2 bahasa:
- 🇮🇩 Bahasa Indonesia
- 🇬🇧 English

Ubah di: Settings → Bahasa

### 7.5 Gamification

- **XP** — Poin pengalaman dari setiap aktivitas
- **Level** — Naik level setiap mencapai threshold XP
- **Streak** — Hari berturut-turut belajar
- **Achievements** — Badge yang didapat dari pencapaian tertentu

### 7.6 Kalkulator Saintifik

Tersedia di halaman Latihan dan Ujian:
- Operasi dasar (+, -, ×, ÷)
- Fungsi trigonometri (sin, cos, tan)
- Logaritma (log, ln)
- Pangkat dan akar
- Konstanta (π, e)

### 7.7 Tabel Periodik

Referensi tabel periodik interaktif tersedia di halaman Latihan dan Ujian.

---

## 8. FAQ & Troubleshooting

### Q: Saya lupa password, bagaimana cara reset?
**A:** Buka `/login` → klik "Forgot Password" → masukkan email → cek inbox.

### Q: Kenapa latihan Moderate/Hard terkunci?
**A:** Selesaikan tingkat sebelumnya terlebih dahulu. Easy → Moderate → Hard (progressive unlock).

### Q: Bagaimana cara melihat hasil ujian saya?
**A:** Setelah menyelesaikan ujian, hasil langsung ditampilkan. Anda juga bisa melihat riwayat di halaman Profil.

### Q: Kenapa Facebook login tidak bisa?
**A:** Fitur Facebook login masih dalam pengembangan (coming soon). Gunakan Google atau email/password.

### Q: Bagaimana guru bisa melihat progress siswa?
**A:** Buka `/teacher/students` → klik nama siswa → lihat statistik dan grafik perkembangan.

### Q: Bagaimana cara menjadi admin?
**A:** Admin ditentukan secara manual melalui Firebase Console. Hubungi administrator sistem untuk mengubah role Anda.

### Q: Apakah data saya aman?
**A:** Ya. AKURAT menggunakan Firebase Authentication untuk keamanan akun dan Firestore Security Rules untuk proteksi data. Baca kebijakan privasi di `/privacy`.

### Q: Aplikasi terasa lambat atau error?
**A:** Coba:
1. Refresh halaman (Ctrl+R)
2. Clear cache browser
3. Pastikan koneksi internet stabil
4. Jika masih bermasalah, hubungi admin melalui `/contact`

---

*Dokumen ini adalah panduan resmi penggunaan platform AKURAT. Untuk pertanyaan lebih lanjut, hubungi tim pengembang melalui halaman Contact.*
