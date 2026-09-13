# AKURAT — AI Agent Handoff

> Dokumen ini berisi semua yang dibutuhkan AI agent baru untuk melanjutkan proyek AKURAT tanpa perlu training ulang dari Ahmad.

---

## 1. Identitas Proyek

| | |
|---|---|
| **Nama** | AKURAT — platform edukasi Indonesia |
| **Owner** | Ahmad (GitHub: Ausartal) |
| **Live URL** | https://akurat-76834.web.app |
| **Repo** | https://github.com/ausartal/education-web-app |
| **Branch utama** | `main` — satu-satunya branch, tidak ada branching |
| **Firebase Project** | `akurat-76834` |

---

## 2. Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS v3
- **Backend:** Firebase — Firestore + Auth + Hosting
- **State/Fetching:** SWR via custom hook `useAuthSWR`
- **Animation:** Framer Motion
- **Icons:** Lucide React
- **Rich text:** next-mdx-remote, RichEditor component

### ESLint
Prettier **sudah dihapus** dari ESLint. Jangan tambahkan kembali.
`.eslintrc.json` hanya berisi `next/core-web-vitals` + `next/typescript`.
Alasan: Prettier menyebabkan 244 false-positive errors di VS Code.

---

## 3. Daftar Pages Teacher

Semua di bawah layout `(dashboard)` dengan `RoleGuard allowedRoles={['teacher', 'admin']}`.

| Route | File | Fungsi |
|---|---|---|
| `/teacher` | `teacher/page.tsx` | Dashboard utama guru |
| `/teacher/kelas` | `teacher/kelas/page.tsx` | Daftar kelas |
| `/teacher/kelas/[id]` | `teacher/kelas/[id]/page.tsx` | Detail kelas — tab: siswa, materi, ujian, tugas, chat |
| `/teacher/ujian` | `teacher/ujian/page.tsx` | Kelola semua jadwal ujian |
| `/teacher/ujian/soal` | `teacher/ujian/soal/page.tsx` | Bank soal + version badge |
| `/teacher/ujian/[id]/recap` | `teacher/ujian/[id]/recap/page.tsx` | Rekap hasil ujian per siswa |
| `/teacher/bank-soal` | `teacher/bank-soal/page.tsx` | Bank soal (2-panel: sidebar TP + main questions) |
| `/teacher/materials` | `teacher/materials/page.tsx` | Kelola materi (MDX content) |
| `/teacher/students` | `teacher/students/page.tsx` | Daftar semua siswa + stats |
| `/teacher/students/[uid]` | `teacher/students/[uid]/page.tsx` | Detail siswa individual |

### Navbar
- `TeacherNavbar.tsx` — desktop: Dashboard, Kelas, **Ujian**, Bank Soal, Materi, Siswa
- `TeacherMobileNav.tsx` — mobile bottom 5 tab: Home, Kelas, **Ujian**, Bank Soal, Siswa

---

## 4. Arsitektur & Pola Penting

### Auth Pattern

```typescript
// Server-side (API routes)
import { verifyTeacher } from '@/lib/server-auth';
const decoded = await verifyTeacher(req); // throws 401/403 if invalid

// Client-side fetching (SWR)
const { data, isLoading, mutate } = useAuthSWR<{ items: T[] }>('/api/endpoint');

// Manual fetch
const t = await user.getIdToken();
const res = await fetch('/api/...', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
  body: JSON.stringify(payload),
});
```

### Sistem Ujian (3 Tipe)

- **MSAT Adaptif** `examType: 'tp'` — pilih domainIds dari TP, soal dipilih adaptif 3-tier (anchor → T2 → T3)
- **Pilih Manual** `examType: 'manual'` — guru pilih soal spesifik by ID; server fetch + simpan sebagai `customQuestions` di schedule saat dibuat
- **Tulis Sendiri** `examType: 'custom'` — guru tulis soal MCQ inline; simpan langsung sebagai `customQuestions`

Session page memperlakukan `'manual'` dan `'custom'` identik — keduanya membaca dari `customQuestions`.

### Multiple Attempts
Field `maxAttempts` di schedule. `0` = unlimited. Start route menghitung completed sessions per student, tolak jika sudah melebihi limit.

### Question Versioning
Field `version` (number) + `versionHistory` (array) pada dokumen `exam_questions`. UI menampilkan badge di bank soal dan manual picker.

### sessionStorage Pattern
Key `exam_init_{sessionId}` — data exam (schedule, questions, mode, customQuestions) di-pass dari entry page ke session page tanpa re-fetch.

### Firestore Collections Penting

| Collection | Isi |
|---|---|
| `users` | Profil pengguna (role: student/teacher/admin) |
| `classes` | Data kelas, materialIds[], studentIds[] |
| `exam_schedules` | Jadwal ujian per kelas |
| `exam_sessions` | Sesi ujian per siswa per schedule |
| `exam_questions` | Soal bank dengan version tracking |
| `tp_definitions` | Tujuan Pembelajaran (domain/TP) |
| `class_chats/{classId}/messages` | Realtime chat kelas |

---

## 5. Cara Kerja Ahmad — Gaya Komunikasi

### Bahasa
Ahmad menulis dalam **Bahasa Indonesia casual**, kadang campur Inggris. Prompt tidak pernah teknis — dia kasih arah, AI yang figures out implementasi.

### Pola Prompt

**Perintah pendek:**
```
"kerjakan" / "deploy" / "ok"
```
→ Langsung implementasi atau deploy. Jangan tanya konfirmasi.

**Feature request bernomor:**
```
"1a. buat pilihan soal lebih detail dari mulai bikin soal sendiri...
 2a. perbaiki penulisan waktu durasi ujian..."
```
→ Implementasi semua item sekaligus. Selesai semua, baru lapor.

**UI polish request:**
```
"polish ulang semua dashboard untuk guru buat lebih menarik,
style nya samakan biar enak di lihat, pewarnaan yang bagus dan cerah serta pastel"
```
→ Redesign visual (gradient headers, consistent color, rounded cards) tanpa ubah fungsionalitas.

**Stop signal:**
```
"wait" / "gausah" / "tunggu"
```
→ Hentikan eksekusi, tunggu arahan baru.

---

## 6. Aturan Eksekusi

### Yang Harus Dilakukan (otomatis, tidak perlu diminta)
- ✅ Langsung implementasi untuk permintaan yang jelas
- ✅ Commit + push setelah perubahan signifikan
- ✅ Jalankan `npx tsc --noEmit` sebelum commit untuk cek TypeScript
- ✅ Tawarkan deploy setelah commit besar, atau langsung deploy jika diminta
- ✅ Gunakan **Bash tool** (bukan PowerShell) untuk semua perintah git

### Yang Tidak Boleh Dilakukan
- ❌ Jangan tambah `Co-Authored-By: Claude` di commit message — hanya nama **Ausartal** yang boleh muncul di git history
- ❌ Jangan spawn subagent kecuali Ahmad minta eksplisit
- ❌ Jangan tambah komentar ke kode yang menjelaskan apa yang dilakukan kode
- ❌ Jangan tambah Prettier ke ESLint
- ❌ Jangan tambah fitur di luar yang diminta
- ❌ Jangan gunakan PowerShell untuk git commit (here-string dengan `>` menyebabkan error)

---

## 7. Git & Deploy

### Commit Workflow

```bash
# Stage file spesifik (jangan git add -A)
git add src/app/(dashboard)/teacher/page.tsx

# Commit — TANPA Co-Authored-By
git commit -m "feat: polish teacher dashboard header dan nav"

# Push
git push
```

### Format Commit Message
- `feat:` — fitur baru
- `fix:` — bug fix
- `chore:` — config, tooling, non-functional

Contoh: `feat: exam creation overhaul — manual picker, duration fix, multi-attempt, recap polish`

### Deploy

```bash
# Selalu dua langkah ini, berurutan
npm run build
firebase deploy --only hosting
```

Firebase rebuild Next.js via Cloud Functions secara otomatis.
**Tidak ada GitHub Actions** — deploy selalu manual via dua perintah di atas.

### Cek Sebelum Commit

```bash
# TypeScript harus clean (no output = OK)
npx tsc --noEmit

# ESLint (optional)
npx next lint
```

---

## 8. Design System

### Palet Warna Per Seksi

| Seksi | Warna | Tailwind |
|---|---|---|
| Kelas / umum | Emerald | `from-emerald-500 to-teal-600` |
| Ujian / exam | Violet | `from-violet-600 to-indigo-700` |
| Tugas | Amber | `from-amber-500 to-orange-400` |
| Materi | Teal | `from-emerald-500 to-teal-600` |
| Siswa / students | Cyan | `from-primary to-cyan-500` |
| Bank Soal | Indigo | `from-violet-600 to-indigo-700` |

### Komponen Standar

```tsx
// Hero/header section
<div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white shadow-sm">

// Card
<div className="rounded-2xl bg-white shadow-sm">

// Tab bar
<div className="rounded-2xl bg-gray-100 p-1">
  <button className="rounded-xl bg-white shadow-sm">Active</button>  // active
  <button className="text-gray-500 hover:text-gray-700">Inactive</button>  // inactive
</div>

// Button primary
<button className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700">

// Badge/chip
<span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700">

// Input
<input className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
```

### Animasi Standar

```tsx
// Page entry
<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>

// List items dengan stagger
<motion.div transition={{ delay: i * 0.04 }}>

// Modal
// overlay:
initial={{ opacity: 0 }} animate={{ opacity: 1 }}
// modal content:
initial={{ scale: 0.96, y: 20 }} animate={{ scale: 1, y: 0 }}
```

### Bahasa UI
Semua teks UI dalam **Bahasa Indonesia**. Contoh: "Buat Ujian", "Simpan", "Kembali", "Siswa", "Tujuan Pembelajaran".

---

## 9. Pola Kode Berulang

### Number Input (Durasi) — Fix Agar Bisa Dihapus
```tsx
<input
  type="number" min={10} max={180}
  value={form.duration || ''}
  onChange={e => { const n = parseInt(e.target.value); setForm(f => ({ ...f, duration: isNaN(n) ? 0 : n })); }}
  onBlur={() => setForm(f => ({ ...f, duration: Math.min(180, Math.max(10, f.duration || 50)) }))}
  className="... [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
/>
```

### Empty State
```tsx
<div className="rounded-2xl bg-white py-16 text-center shadow-sm">
  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-300">
    <Icon size={32} />
  </div>
  <p className="text-sm font-medium text-gray-500">Judul</p>
  <p className="mt-1 text-xs text-gray-400">Deskripsi</p>
</div>
```

### RoleGuard Wrapper
```tsx
return (
  <RoleGuard allowedRoles={['teacher', 'admin']}>
    <div className="mx-auto max-w-5xl py-8">
      {/* content */}
    </div>
  </RoleGuard>
);
```

---

## 10. Riwayat Fitur yang Sudah Dibangun

### Exam Creation Overhaul (3-way source)
MSAT Adaptif (TP picker), Pilih Soal Manual (browse bank soal + filter TP/tier), Tulis Sendiri (custom MCQ builder). Duration input fix, max attempts (1×/2×/3×/∞), shuffle toggle. Tersedia di halaman `/teacher/ujian` dan modal di `/teacher/kelas/[id]`.

### Question Versioning
Field `version` + `versionHistory` di exam_questions. Version badge (v2, v3) di bank soal card. Edit modal menampilkan "v{n} → v{n+1}". Manual picker juga tampilkan version badge.

### Multiple Attempts
Field `maxAttempts` di schedule. Start route hitung completed sessions, tolak jika sudah melebihi limit. Recap menampilkan "Percobaan X/Y" badge per session, best score untuk rata-rata.

### Recap Polish
Per-session attempt badge, custom/manual answers ditampilkan sebagai dot berwarna (hijau=benar, merah=salah), expandable detail per siswa, stats total unique students vs total sessions.

### Navbar Update — Tambah Ujian
TeacherNavbar: tambah Ujian di antara Kelas dan Bank Soal. TeacherMobileNav: swap Materi → Ujian (tetap 5 tab). Materi masih accessible dari dalam halaman Kelas.

### UI Polish — Gradient Headers
Kelas detail: gradient emerald hero dengan nama kelas + join code + jumlah siswa & ujian. Students: stats inline di hero. Materials: teal gradient header. Bank Soal: sidebar header gradient violet-indigo.

### ESLint — Hapus Prettier
Dihapus `"plugin:prettier/recommended"` dari `.eslintrc.json`. 2 real errors (prefer-const + no-unused-expressions) diperbaiki manual.

### Class Colors, Chat Bubbles, Student Chat
5 warna per kelas dari palette, chat bubble style berbeda antara guru dan siswa, siswa bisa chat ke guru dari halaman kelas mereka.
