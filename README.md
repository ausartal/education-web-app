# AKURAT — Asesmen Kimia Ukur Adaptif Terpadu

Platform pembelajaran kimia berbasis web dengan **Multistage Adaptive Testing (MSAT)** — mendiagnosis pemahaman dan miskonsepsi siswa secara adaptif dan presisi.

**Live:** https://akurat-76834.web.app

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + CSS Variables |
| Animation | Framer Motion |
| Icons | Lucide React |
| Backend | Firebase (Auth, Firestore, Storage) |
| Hosting | Firebase Hosting (webframeworks preview) |

---

## Fitur Utama

### Siswa
- Dashboard adaptif dengan carousel materi kimia
- Halaman baca materi dengan rendering Markdown + rumus KaTeX
- Latihan soal (Easy / Moderate / Hard)
- Ujian MSAT adaptif — soal menyesuaikan kemampuan real-time
- Fitur **Kelas**: Materi, Ujian, Tugas, dan Live Chat per kelas
- Profil, XP, streak, dan pencapaian (gamifikasi)

### Guru
- Dashboard guru dengan manajemen kelas
- Buat & kelola materi (rich editor dengan Markdown + KaTeX)
- Bank soal: tambah, filter, impor bulk (JSON)
- Jadwal ujian dengan token akses
- Tugas dengan batas waktu
- Live Chat per kelas dengan siswa
- Rekap hasil ujian per siswa

### Admin
- Dashboard KPI (total user, materi, ujian, soal)
- Manajemen user (ubah role, nonaktifkan, hapus)
- Moderasi konten
- Konfigurasi parameter MSAT & gamifikasi
- Log aktivitas & analytics

---

## Setup Lokal

### Prasyarat
- Node.js 18+
- Firebase CLI: `npm install -g firebase-tools`

### Instalasi

```bash
git clone https://github.com/ausartal/education-web-app.git
cd education-web-app
npm install
```

### Environment Variables

Buat file `.env.local` dari template berikut:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

Isi dengan nilai dari Firebase Console → Project Settings.

### Jalankan Dev Server

```bash
npm run dev
```

Buka `http://localhost:3000`

---

## Deployment (Firebase Hosting)

```bash
# Login Firebase (sekali saja)
firebase login

# Deploy
firebase deploy --only hosting,functions
```

> **Catatan:** Deploy menggunakan Firebase Hosting webframeworks (Next.js preview). Package ~500MB — upload memerlukan koneksi stabil.

---

## Struktur Proyek

```
src/
├── app/
│   ├── (auth)/          # Login, Register, Forgot Password
│   ├── (dashboard)/     # Halaman siswa (kelas, materi, ujian, dll)
│   ├── (admin)/         # Halaman admin
│   ├── (public)/        # Landing page, About, dll
│   └── api/             # API Routes (Next.js Route Handlers)
│       ├── student/     # API endpoint siswa
│       ├── teacher/     # API endpoint guru
│       └── admin/       # API endpoint admin
├── components/
│   ├── admin/           # Komponen admin (sidebar, dll)
│   ├── guards/          # AuthGuard, RoleGuard
│   ├── landing/         # Komponen landing page
│   ├── layout/          # Navbar, Footer, MobileNav
│   └── teacher/         # RichEditor, MarkdownPreview
├── context/             # AuthContext
├── hooks/               # useToast, dll
└── lib/                 # firebase.ts, firebase-admin.ts
```

---

## Database (Firestore Collections)

| Koleksi | Isi |
|---------|-----|
| `users` | Profil user (role, stats, XP) |
| `materials` | Materi pembelajaran |
| `question_bank` | Bank soal MSAT |
| `classes` | Data kelas (guru, siswa, materialIds) |
| `class_chats/{classId}/messages` | Pesan chat real-time per kelas |
| `exam_schedules` | Jadwal ujian per kelas |
| `exam_sessions` | Sesi ujian siswa |
| `assignments` | Tugas per kelas |

---

## User Roles

| Role | Akses |
|------|-------|
| `student` | Dashboard siswa, materi, latihan, ujian, kelas |
| `teacher` | Semua akses siswa + kelola kelas, materi, ujian, tugas |
| `admin` | Semua akses + manajemen user, konten, konfigurasi sistem |

Akses admin panel: Login → Settings → "Masuk ke Admin Dashboard" (hanya tampil untuk role admin).

---

## Scripts Utilitas

```bash
# Set role admin untuk akun tertentu
node scripts/set-admin.js

# Update password akun
node scripts/update-password.js
```

---

## Lisensi

Proyek ini dikembangkan untuk keperluan penelitian dan pendidikan.
