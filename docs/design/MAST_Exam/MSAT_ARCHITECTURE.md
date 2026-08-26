# MAST Exam System — Architecture & Flow

## Daftar Isi
1. [Overview](#1-overview)
2. [Perbedaan dengan Sistem Lama](#2-perbedaan-dengan-sistem-lama)
3. [Firestore Schema](#3-firestore-schema)
4. [Alur Lengkap (End-to-End Flow)](#4-alur-lengkap)
5. [MAST Scoring Engine](#5-mast-scoring-engine)
6. [API Routes](#6-api-routes)
7. [Page & Component Structure](#7-page--component-structure)
8. [Admin Dashboard — MAST Management](#8-admin-dashboard)
9. [File Tree — Semua File yang Perlu Dibuat/Dimodifikasi](#9-file-tree)
10. [Simulasi 3 Siswa (Validasi)](#10-simulasi)

---

## 1. Overview

Sistem ujian adaptif **MAST (Multistage Adaptive Scored Testing)** untuk mengukur kompetensi kimia siswa. Berbeda dari sistem MSAT lama yang per-domain (3 soal per domain), sistem baru ini menggunakan **3 stage × 12 soal per stage** dengan 3 domain kognitif (Knowing, Applying, Reasoning).

**Fitur Utama:**
- Akses ujian via **kode** (dibuat admin, bukan teacher)
- **Ruang tunggu** sebelum ujian — admin kontrol kapan ujian dimulai
- Mode **auto-start** (siswa langsung masuk) atau **manual-start** (admin harus start)
- **Istirahat 10 menit** antar stage — hanya bisa di-skip oleh admin
- **4 Simpulan** di hasil akhir: Overall + Knowing + Applying + Reasoning
- Predikat: Istimewa / Unggul / Madya / Semenjana / Terbatas

---

## 2. Perbedaan dengan Sistem Lama

| Aspek | MSAT Lama (existing) | MAST Baru |
|-------|---------------------|-----------|
| **Struktur** | Per-domain, 3 tier per domain | Per-stage, 12 soal per stage |
| **Soal per unit** | 3 soal (1 per tier) | 12 soal (4K + 4A + 4R) |
| **Skor** | 0–120 TOEFL-style | 0–100 dengan predikat |
| **Bobot** | Difficulty weights (1–5) | Stage multiplier (1.0 / 1.2 / 1.5) |
| **Predikat** | Comprehension categories | 5 predikat (Istimewa–Terbatas) |
| **Sub-skor** | Tidak ada | Knowing / Applying / Reasoning % |
| **Akses** | Token dari teacher | Kode dari admin |
| **Ruang tunggu** | Tidak ada | Ada, admin kontrol |
| **Istirahat** | Tidak ada | 10 menit antar stage |
| **Halaman** | `/ujian/[examId]` | `/exam` (terpisah) |

> Sistem lama (`/ujian/*`) **tidak diubah** — tetap berjalan untuk ujian teacher-created. MAST adalah sistem baru di route `/exam`.

---

## 3. Firestore Schema

### 3.1 Collection: `mast_exams` (Ujian MAST — dibuat admin)

```
mast_exams/{examId}
  id: string
  title: string                          // "Ujian Kimia Semester 1"
  description: string
  examCode: string                       // 6-char uppercase alphanumeric (unik)
  createdBy: string                      // admin uid
  createdAt: Timestamp
  
  // Konfigurasi
  mode: 'auto_start' | 'manual_start'   // auto = siswa langsung masuk, manual = tunggu admin
  durationPerStage: number               // menit per stage (default 30)
  breakDuration: number                  // menit istirahat antar stage (default 10)
  totalStages: 3                         // fixed 3
  
  // Soal — referensi ke mast_questions
  stage1QuestionIds: string[12]          // 12 soal stage 1 (medium difficulty)
  stage2QuestionIds: {                   // soal stage 2 (tergantung branch)
    high: string[12]
    low: string[12]
  }
  stage3QuestionIds: {                   // soal stage 3 (tergantung branch)
    high: string[12]
    medium: string[12]
    low: string[12]
  }
  
  // Status
  status: 'draft' | 'active' | 'in_progress' | 'completed' | 'archived'
  startedAt: Timestamp | null            // admin klik "Mulai Ujian"
  completedAt: Timestamp | null
  
  // Peserta
  enrolledStudentIds: string[]           // siswa yang boleh ikut (opsional, kosong = semua)
```

### 3.2 Collection: `mast_questions` (Bank Soal MAST)

```
mast_questions/{questionId}
  id: string
  stem: string                           // teks soal (Markdown + LaTeX)
  options: { A: string, B: string, C: string, D: string, E?: string }
  correctAnswer: 'A' | 'B' | 'C' | 'D' | 'E'
  explanation: string
  
  // Klasifikasi
  cognitiveDomain: 'knowing' | 'applying' | 'reasoning'
  stageDifficulty: 'low' | 'medium' | 'high'  // kesulitan stage tempat soal ini dipakai
  
  // Metadata
  topic: string                          // e.g. "Stoikiometri"
  subtopic: string
  createdBy: string
  createdAt: Timestamp
  status: 'active' | 'inactive'
  usageCount: number
  avgCorrectRate: number
```

**Kebutuhan minimum soal per ujian:**
- Stage 1 (medium): 4K + 4A + 4R = 12 soal
- Stage 2 (high): 4K + 4A + 4R = 12 soal
- Stage 2 (low): 4K + 4A + 4R = 12 soal
- Stage 3 (high): 4K + 4A + 4R = 12 soal
- Stage 3 (medium): 4K + 4A + 4R = 12 soal
- Stage 3 (low): 4K + 4A + 4R = 12 soal
- **Total minimum: 72 soal per ujian**

### 3.3 Collection: `mast_sessions` (Sesi Ujian Siswa)

```
mast_sessions/{sessionId}
  id: string
  studentId: string
  examId: string                         // ref ke mast_exams
  examCode: string                       // kode yang dimasukkan siswa
  
  // Status
  status: 'waiting' | 'in_progress' | 'on_break' | 'completed' | 'timed_out' | 'flagged'
  startedAt: Timestamp | null            // siswa mulai mengerjakan stage 1
  completedAt: Timestamp | null
  
  // Stage tracking
  currentStage: 1 | 2 | 3
  currentStageDifficulty: 'low' | 'medium' | 'high'
  stagePath: string[]                    // ['medium', 'high', 'high'] — jalur yang ditempuh
  
  // Jawaban per stage
  stageResponses: [
    {
      stageNumber: 1
      stageDifficulty: 'medium'
      questions: [
        { questionId, cognitiveDomain, selectedAnswer, isCorrect, timeSpentMs }
        // ... 12 soal
      ]
      knowingCorrect: number             // 0–4
      applyingCorrect: number            // 0–4
      reasoningCorrect: number           // 0–4
      totalCorrect: number               // 0–12
      passed: boolean                    // ≥8/12
      weightedScore: number              // totalCorrect × stageMultiplier
    },
    // ... stage 2, 3
  ]
  
  // Istirahat
  breakStartedAt: Timestamp | null       // kapan istirahat dimulai
  breakSkippedBy: string | null          // admin uid yang skip (jika di-skip)
  breakEndsAt: Timestamp | null          // kapan istirahat berakhir
  
  // Hasil akhir (diisi saat complete)
  finalScore: number | null              // 0–100
  predikat: string | null                // 'Istimewa' | 'Unggul' | 'Madya' | 'Semenjana' | 'Terbatas'
  
  // 4 Simpulan
  conclusions: {
    overall: {                           // Simpulan 1 — keseluruhan
      score: number                      // 0–100
      description: string                // deskripsi predikat
    }
    knowing: {                           // Simpulan 2 — Knowing
      score: number                      // 0–100 (persentase penguasaan)
      description: string
    }
    applying: {                          // Simpulan 3 — Applying
      score: number
      description: string
    }
    reasoning: {                         // Simpulan 4 — Reasoning
      score: number
      description: string
    }
  } | null
  
  // Metadata
  anomalyFlags: string[]
  durationMinutes: number
```

### 3.4 Collection: `mast_waiting_room` (Ruang Tunggu)

```
mast_waiting_room/{examId}               // 1 doc per ujian
  examId: string
  status: 'waiting' | 'started' | 'ended'
  students: {
    [studentId]: {
      joinedAt: Timestamp
      displayName: string
      ready: boolean                     // siswa sudah di halaman ruang tunggu
    }
  }
  startedAt: Timestamp | null            // admin klik mulai
  breakState: {
    active: boolean                      // sedang istirahat?
    stageNumber: number                  // istirahat setelah stage berapa
    startedAt: Timestamp | null
    endsAt: Timestamp | null
    skippedBy: string | null
  } | null
```

---

## 4. Alur Lengkap (End-to-End Flow)

### 4.1 Flow Diagram — Keseluruhan

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ADMIN FLOW                                   │
│                                                                     │
│  Admin Login → Dashboard → MAST Exam → Buat Ujian Baru             │
│    ├─ Isi judul, deskripsi, durasi per stage, durasi istirahat      │
│    ├─ Pilih mode: auto_start / manual_start                         │
│    ├─ Generate exam code (6 char)                                   │
│    ├─ Pilih soal per stage (12 soal × 3 domain kognitif)            │
│    │   ├─ Stage 1 (Medium): 4K + 4A + 4R                           │
│    │   ├─ Stage 2 (High): 4K + 4A + 4R                             │
│    │   ├─ Stage 2 (Low): 4K + 4A + 4R                              │
│    │   ├─ Stage 3 (High): 4K + 4A + 4R                             │
│    │   ├─ Stage 3 (Medium): 4K + 4A + 4R                           │
│    │   └─ Stage 3 (Low): 4K + 4A + 4R                              │
│    └─ Simpan → Status: draft                                        │
│                                                                     │
│  Admin → Aktifkan Ujian → Status: active                            │
│    └─ Kode ujian bisa dibagikan ke siswa                            │
│                                                                     │
│  Admin → Monitoring Ruang Tunggu                                    │
│    ├─ Lihat siswa yang sudah join                                   │
│    ├─ [Jika manual_start] Klik "Mulai Ujian"                        │
│    │   └─ Semua siswa di ruang tunggu → status berubah ke in_progress│
│    └─ [Jika auto_start] Siswa langsung masuk saat join              │
│                                                                     │
│  Admin → Monitoring Istirahat                                       │
│    ├─ Lihat countdown istirahat per siswa                           │
│    ├─ Klik "Skip Istirahat" → siswa langsung ke stage berikutnya    │
│    └─ Atau tunggu 10 menit habis otomatis                           │
│                                                                     │
│  Admin → Lihat Hasil                                                │
│    ├─ Rekap semua siswa: skor, predikat, 4 simpulan                 │
│    ├─ Detail per siswa: radar chart, cognitive profile               │
│    └─ Export data                                                    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       SISWA FLOW                                    │
│                                                                     │
│  Siswa Login → Menu "EXAM" → Masukkan Kode (6 char)                │
│    │                                                                 │
│    ├─ [auto_start] → Langsung ke Stage 1                            │
│    └─ [manual_start] → Masuk Ruang Tunggu                           │
│        ├─ Tampilan: "Menunggu admin memulai ujian..."               │
│        ├─ Countdown tidak ada — menunggu sinyal admin               │
│        └─ Admin klik start → Siswa otomatis masuk Stage 1           │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │              STAGE 1 (Medium) — 12 Soal                 │        │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │        │
│  │  │K1  K2   │ │A1  A2   │ │R1  R2   │ │         │      │        │
│  │  │K3  K4   │ │A3  A4   │ │R3  R4   │ │ Timer   │      │        │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘      │        │
│  │  Navigasi: Soal 1→12, bisa bolak-balik dalam stage     │        │
│  │  Submit Stage → Server hitung: K/A/R correct, total     │        │
│  └──────────────────────┬──────────────────────────────────┘        │
│                         │                                           │
│              ┌──────────▼──────────┐                                │
│              │  ≥8/12 → HIGH path  │                                │
│              │  <8/12 → LOW path   │                                │
│              └──────────┬──────────┘                                │
│                         │                                           │
│  ┌──────────────────────▼──────────────────────────────────┐        │
│  │           ISTIRAHAT 10 MENIT                            │        │
│  │  - Countdown timer 10:00                                │        │
│  │  - Tips: "Istirahatlah sejenak, minum air"              │        │
│  │  - Admin bisa skip → langsung ke stage berikutnya       │        │
│  │  - Siswa TIDAK bisa skip sendiri                        │        │
│  └──────────────────────┬──────────────────────────────────┘        │
│                         │                                           │
│  ┌──────────────────────▼──────────────────────────────────┐        │
│  │        STAGE 2 (High/Low) — 12 Soal                     │        │
│  │  Sama seperti Stage 1, difficulty sesuai branch          │        │
│  └──────────────────────┬──────────────────────────────────┘        │
│                         │                                           │
│              ┌──────────▼──────────┐                                │
│              │  ≥8/12 → naik       │                                │
│              │  <8/12 → turun      │                                │
│              └──────────┬──────────┘                                │
│                         │                                           │
│  ┌──────────────────────▼──────────────────────────────────┐        │
│  │           ISTIRAHAT 10 MENIT (lagi)                     │        │
│  └──────────────────────┬──────────────────────────────────┘        │
│                         │                                           │
│  ┌──────────────────────▼──────────────────────────────────┐        │
│  │        STAGE 3 (High/Medium/Low) — 12 Soal              │        │
│  │  Stage terakhir, tidak ada branching lagi                │        │
│  └──────────────────────┬──────────────────────────────────┘        │
│                         │                                           │
│  ┌──────────────────────▼──────────────────────────────────┐        │
│  │              HASIL UJIAN                                │        │
│  │                                                         │        │
│  │  ┌─────────────────────────────────────────────┐        │        │
│  │  │  Skor Akhir: 78/100                         │        │        │
│  │  │  Predikat: UNGGUL (Peringkat II)            │        │        │
│  │  └─────────────────────────────────────────────┘        │        │
│  │                                                         │        │
│  │  ┌─ Simpulan 1: Keseluruhan ─────────────────────┐     │        │
│  │  │  Skor: 78% — Predikat: Unggul                 │     │        │
│  │  │  "Peserta memiliki pemahaman konsep dasar..."  │     │        │
│  │  └────────────────────────────────────────────────┘     │        │
│  │                                                         │        │
│  │  ┌─ Simpulan 2: Knowing ─────────────────────────┐     │        │
│  │  │  Skor: 83% — "Menguasai konsep dasar..."      │     │        │
│  │  └────────────────────────────────────────────────┘     │        │
│  │                                                         │        │
│  │  ┌─ Simpulan 3: Applying ────────────────────────┐     │        │
│  │  │  Skor: 75% — "Mampu menerapkan rumus..."      │     │        │
│  │  └────────────────────────────────────────────────┘     │        │
│  │                                                         │        │
│  │  ┌─ Simpulan 4: Reasoning ───────────────────────┐     │        │
│  │  │  Skor: 67% — "Penalaran masih terbatas..."    │     │        │
│  │  └────────────────────────────────────────────────┘     │        │
│  │                                                         │        │
│  │  ┌─ Jalur Stage ─────────────────────────────────┐     │        │
│  │  │  Stage 1: Medium (10/12) → Naik               │     │        │
│  │  │  Stage 2: High (8/12) → Naik                  │     │        │
│  │  │  Stage 3: High (9/12) → Selesai               │     │        │
│  │  └────────────────────────────────────────────────┘     │        │
│  └─────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Adaptive Branching Detail

```
                    ┌──────────────┐
                    │   STAGE 1    │
                    │   Medium     │
                    │  (12 soal)   │
                    └──────┬───────┘
                           │
                ┌──────────┴──────────┐
                │                     │
          ≥8/12 benar           <8/12 benar
                │                     │
        ┌───────▼───────┐    ┌───────▼───────┐
        │    STAGE 2    │    │    STAGE 2    │
        │    High       │    │    Low        │
        │  (12 soal)    │    │  (12 soal)    │
        └───────┬───────┘    └───────┬───────┘
                │                     │
         ┌──────┴──────┐       ┌──────┴──────┐
         │             │       │             │
    ≥8/12 benar  <8/12 benar  ≥8/12 benar  <8/12 benar
         │             │       │             │
   ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
   │  STAGE 3  │ │  STAGE 3  │ │  STAGE 3  │ │  STAGE 3  │
   │   High    │ │  Medium   │ │  Medium   │ │    Low    │
   │ (12 soal) │ │ (12 soal) │ │ (12 soal) │ │ (12 soal) │
   └───────────┘ └───────────┘ └───────────┘ └───────────┘
```

**Stage Weight Multiplier:**
| Stage Difficulty | Multiplier (Ws) |
|-----------------|-----------------|
| Low             | 1.0             |
| Medium          | 1.2             |
| High            | 1.5             |

### 4.3 Istirahat Flow

```
Stage N selesai → Submit jawaban
        │
        ▼
┌───────────────────────────────────┐
│  Server menghitung skor stage     │
│  Menentukan branch berikutnya     │
│  Update mast_session              │
│  Set status = 'on_break'          │
│  Set breakStartedAt = now         │
│  Set breakEndsAt = now + 10 min   │
└───────────────┬───────────────────┘
                │
        ┌───────▼───────┐
        │  ISTIRAHAT    │
        │  Countdown    │
        │  10:00        │
        └───────┬───────┘
                │
    ┌───────────┼───────────┐
    │           │           │
Timer habis  Admin skip  Siswa close
    │           │           │
    ▼           ▼           ▼
Auto start   Langsung    Resume saat
Stage N+1    ke Stage    buka lagi
             N+1         (countdown
                         lanjut)
```

**Admin Skip Istirahat:**
- Admin melihat daftar siswa yang sedang istirahat
- Tombol "Skip Istirahat" per siswa atau "Skip Semua"
- Siswa yang di-skip langsung masuk stage berikutnya
- Real-time update via Firestore listener

---

## 5. MAST Scoring Engine

### 5.1 Formula

```
// Input per stage
K = jumlah benar Knowing (0–4)
A = jumlah benar Applying (0–4)
R = jumlah benar Reasoning (0–4)
totalCorrect = K + A + R (0–12)

// Stage Weight Multiplier
Ws = { low: 1.0, medium: 1.2, high: 1.5 }

// Weighted Score per stage
SW = totalCorrect × Ws

// Final Scaled Score (0–100)
Score = (ΣSW / Σ(12 × Ws)) × 100

// Predikat
81–100  → Istimewa (Peringkat I)
61–80   → Unggul (Peringkat II)
41–60   → Madya (Peringkat III)
21–40   → Semenjana (Peringkat IV)
0–20    → Terbatas (Peringkat V)

// Cognitive Sub-scores (independen)
Knowing%   = (ΣK / (4 × N_stages)) × 100
Applying%  = (ΣA / (4 × N_stages)) × 100
Reasoning% = (ΣR / (4 × N_stages)) × 100
```

### 5.2 Simpulan (4 Kesimpulan)

**Simpulan 1 — Keseluruhan (berdasarkan predikat):**

| Predikat | Skor | Deskripsi |
|----------|------|-----------|
| Istimewa | 81–100% | Menguasai seluruh konsep dasar kimia secara mendalam (Knowing), terampil mengaplikasikan rumus dan hukum kimia tanpa kekeliruan (Applying), serta mampu menganalisis masalah kompleks melalui penalaran ilmiah yang logis dan kritis (Reasoning). |
| Unggul | 61–80% | Memiliki pemahaman konsep dasar kimia yang kokoh (Knowing) dan mampu menerapkannya secara akurat (Applying), serta mulai mampu melakukan penalaran ilmiah tingkat menengah (Reasoning). |
| Madya | 41–60% | Memahami istilah dan prinsip-prinsip utama kimia (Knowing) serta mampu mengaplikasikannya pada perhitungan sederhana (Applying), namun penalaran masih terbatas pada hubungan sebab-akibat langsung (Reasoning). |
| Semenjana | 21–40% | Mengenali beberapa fakta dan definisi dasar kimia (Knowing), namun masih mengalami kesulitan saat menerapkan konsep (Applying), serta belum mampu melakukan analisis penalaran secara mandiri (Reasoning). |
| Terbatas | 0–20% | Hanya mengingat sebagian kecil pengetahuan kimia yang sangat parsial (Knowing), belum mampu menerapkan rumus/prinsip secara tepat (Applying), dan belum mampu menunjukkan kemampuan penalaran ilmiah (Reasoning). |

**Simpulan 2 — Knowing (pemahaman konsep):**

| Level | Skor | Deskripsi |
|-------|------|-----------|
| Tinggi | ≥75% | Menguasai konsep dasar kimia secara mendalam dan konsisten di semua stage. |
| Sedang | 50–74% | Memahami sebagian besar konsep dasar, namun ada beberapa celah pemahaman. |
| Rendah | <50% | Pemahaman konsep dasar masih lemah, perlu penguatan pada hafalan dan definisi. |

**Simpulan 3 — Applying (penerapan konsep):**

| Level | Skor | Deskripsi |
|-------|------|-----------|
| Tinggi | ≥75% | Terampil mengaplikasikan rumus dan hukum kimia pada berbagai variasi soal. |
| Sedang | 50–74% | Mampu menerapkan konsep pada soal rutin, namun masih kesulitan pada variasi baru. |
| Rendah | <50% | Belum mampu menerapkan rumus/prinsip secara tepat, perlu latihan prosedural. |

**Simpulan 4 — Reasoning (penalaran konsep):**

| Level | Skor | Deskripsi |
|-------|------|-----------|
| Tinggi | ≥75% | Mampu menganalisis masalah kompleks, mengintegrasikan multi-konsep, dan memecahkan masalah kontekstual. |
| Sedang | 50–74% | Mulai mampu melakukan penalaran ilmiah, namun masih terbatas pada kasus sederhana. |
| Rendah | <50% | Penalaran masih terbatas pada hubungan sebab-akibat langsung, belum mampu analisis mandiri. |

---

## 6. API Routes

### 6.1 Admin APIs

| Method | Route | Deskripsi |
|--------|-------|-----------|
| `POST` | `/api/admin/mast-exams` | Buat ujian MAST baru |
| `GET` | `/api/admin/mast-exams` | List semua ujian MAST |
| `GET` | `/api/admin/mast-exams/[id]` | Detail ujian MAST |
| `PATCH` | `/api/admin/mast-exams/[id]` | Update ujian (status, soal, dll) |
| `DELETE` | `/api/admin/mast-exams/[id]` | Hapus ujian |
| `POST` | `/api/admin/mast-exams/[id]/start` | Admin mulai ujian (manual_start mode) |
| `POST` | `/api/admin/mast-exams/[id]/end` | Admin akhiri ujian |
| `POST` | `/api/admin/mast-exams/[id]/skip-break` | Skip istirahat untuk siswa tertentu |
| `GET` | `/api/admin/mast-exams/[id]/waiting-room` | Status ruang tunggu (realtime) |
| `GET` | `/api/admin/mast-exams/[id]/sessions` | List semua sesi siswa + hasil |
| `GET` | `/api/admin/mast-exams/[id]/results` | Rekap hasil semua siswa |

### 6.2 Siswa APIs

| Method | Route | Deskripsi |
|--------|-------|-----------|
| `POST` | `/api/mast/join` | Masukkan kode → masuk ruang tunggu / langsung mulai |
| `GET` | `/api/mast/sessions/[id]` | Status sesi (termasuk break state) |
| `POST` | `/api/mast/sessions/[id]/submit-stage` | Submit jawaban 1 stage |
| `POST` | `/api/mast/sessions/[id]/complete` | Selesaikan ujian, hitung skor akhir |
| `GET` | `/api/mast/sessions/[id]/results` | Hasil ujian siswa |

### 6.3 Detail API Contracts

#### `POST /api/mast/join`
```typescript
// Request
{ examCode: string }

// Response (auto_start)
{ sessionId: string, mode: 'auto_start', exam: MASTExam, questions: StageQuestions }

// Response (manual_start)
{ sessionId: string, mode: 'manual_start', waitingRoom: true }

// Response (error)
{ error: string } // "Kode tidak valid" | "Ujian belum aktif" | "Ujian sudah selesai"
```

#### `POST /api/mast/sessions/[id]/submit-stage`
```typescript
// Request
{
  answers: [
    { questionId: string, selectedAnswer: AnswerKey, timeSpentMs: number }
    // ... 12 soal
  ]
}

// Response
{
  stageResult: {
    stageNumber: 1|2|3,
    stageDifficulty: 'low'|'medium'|'high',
    knowingCorrect: number,
    applyingCorrect: number,
    reasoningCorrect: number,
    totalCorrect: number,
    passed: boolean,           // ≥8/12
    nextStageDifficulty: 'low'|'medium'|'high' | null  // null jika stage 3
  },
  break: {
    active: boolean,
    durationMinutes: number,
    endsAt: string             // ISO timestamp
  } | null
}
```

#### `POST /api/mast/sessions/[id]/complete`
```typescript
// Response
{
  finalScore: number,          // 0–100
  predikat: string,
  peringkat: number,           // I–V
  stagePath: string[],         // ['medium', 'high', 'high']
  conclusions: {
    overall: { score, description },
    knowing: { score, description },
    applying: { score, description },
    reasoning: { score, description }
  },
  stageResponses: StageResponse[]
}
```

---

## 7. Page & Component Structure

### 7.1 Route Structure

```
src/app/
├── (dashboard)/
│   └── exam/                              ← Siswa: halaman utama EXAM
│       ├── page.tsx                       ← Input kode ujian
│       ├── waiting/
│       │   └── [sessionId]/
│       │       └── page.tsx              ← Ruang tunggu
│       ├── session/
│       │   └── [sessionId]/
│       │       └── page.tsx              ← Halaman ujian (per stage)
│       ├── break/
│       │   └── [sessionId]/
│       │       └── page.tsx              ← Halaman istirahat
│       └── results/
│           └── [sessionId]/
│               └── page.tsx              ← Hasil ujian (4 simpulan)
│
├── (admin)/
│   └── admin/
│       └── mast/                          ← Admin: MAST Management
│           ├── page.tsx                   ← List semua ujian MAST
│           ├── create/
│           │   └── page.tsx              ← Buat ujian baru
│           ├── [examId]/
│           │   ├── page.tsx              ← Detail + monitoring
│           │   ├── edit/
│           │   │   └── page.tsx          ← Edit ujian
│           │   ├── waiting-room/
│           │   │   └── page.tsx          ← Monitor ruang tunggu
│           │   ├── breaks/
│           │   │   └── page.tsx          ← Monitor & skip istirahat
│           │   └── results/
│           │       └── page.tsx          ← Rekap hasil semua siswa
│           └── questions/
│               └── page.tsx              ← Bank soal MAST
```

### 7.2 Component Structure

```
src/components/
├── exam/                                  ← Komponen ujian MAST siswa
│   ├── ExamCodeInput.tsx                 ← Input 6-char kode
│   ├── WaitingRoom.tsx                   ← Ruang tunggu
│   ├── StageExam.tsx                     ← Halaman ujian 1 stage (12 soal)
│   ├── QuestionCard.tsx                  ← Kartu 1 soal
│   ├── StageNavigation.tsx               ← Navigasi soal dalam stage (1–12)
│   ├── StageTimer.tsx                    ← Timer per stage
│   ├── BreakScreen.tsx                   ← Layar istirahat 10 menit
│   ├── BreakCountdown.tsx               ← Countdown istirahat
│   ├── ExamResults.tsx                   ← Hasil ujian lengkap
│   ├── PredikatBadge.tsx                 ← Badge predikat (warna)
│   ├── CognitiveRadarChart.tsx           ← Radar chart Knowing/Applying/Reasoning
│   ├── ConclusionCard.tsx                ← Kartu simpulan (4 kartu)
│   ├── StagePathVisualization.tsx        ← Visualisasi jalur stage
│   └── ExamLayout.tsx                    ← Layout wrapper ujian
│
├── admin-mast/                            ← Komponen admin MAST
│   ├── MASTExamForm.tsx                  ← Form buat/edit ujian
│   ├── QuestionSelector.tsx              ← Pilih soal per stage
│   ├── WaitingRoomMonitor.tsx            ← Monitor ruang tunggu
│   ├── BreakMonitor.tsx                  ← Monitor & skip istirahat
│   ├── SessionTable.tsx                  ← Tabel sesi siswa
│   ├── ResultsRecap.tsx                  ← Rekap hasil
│   └── MASTExamCard.tsx                  ← Card ujian di list
```

### 7.3 Page Descriptions

#### Siswa: `/exam` — Input Kode
- Input field 6 karakter (auto-uppercase, auto-submit saat 6 char terisi)
- Validasi kode → redirect ke waiting room atau langsung ke session
- Error handling: kode salah, ujian belum aktif, ujian sudah selesai

#### Siswa: `/exam/waiting/[sessionId]` — Ruang Tunggu
- Tampilan: "Menunggu admin memulai ujian..."
- Nama ujian, jumlah peserta yang sudah join
- Real-time listener: ketika admin start, auto-redirect ke session
- Jika mode auto_start, halaman ini tidak dipakai

#### Siswa: `/exam/session/[sessionId]` — Halaman Ujian
- **12 soal per stage**, ditampilkan satu per satu
- Navigasi: nomor soal 1–12 di sidebar/atas, bisa bolak-balik
- Setiap soal: stem (Markdown/LaTeX), opsi A–E, timer
- Tombol "Kumpulkan Stage" → konfirmasi → submit ke server
- Anti-cheat: fullscreen, tab-switch detection
- Tools: kalkulator, tabel periodik (re-use existing)

#### Siswa: `/exam/break/[sessionId]` — Istirahat
- Countdown 10:00 menit
- Tips istirahat
- Stage yang sudah diselesaikan: skor sementara
- Stage berikutnya: "Stage X — Difficulty Y"
- Tidak ada tombol skip untuk siswa
- Auto-redirect ke stage berikutnya saat countdown habis
- Real-time listener: jika admin skip, auto-redirect

#### Siswa: `/exam/results/[sessionId]` — Hasil
- **Header**: Skor akhir (0–100) + Predikat + Peringkat
- **4 Simpulan** (4 kartu):
  1. Simpulan Keseluruhan — deskripsi predikat
  2. Simpulan Knowing — skor % + deskripsi level
  3. Simpulan Applying — skor % + deskripsi level
  4. Simpulan Reasoning — skor % + deskripsi level
- **Radar Chart**: 3 axis (Knowing, Applying, Reasoning)
- **Jalur Stage**: Visualisasi path (Medium → High → High, dll)
- **Detail per Stage**: 12 soal, jawaban benar/salah

#### Admin: `/admin/mast` — List Ujian
- Tabel: judul, kode, mode, status, jumlah peserta, aksi
- Tombol "Buat Ujian Baru"

#### Admin: `/admin/mast/create` — Buat Ujian
- Form: judul, deskripsi, mode (auto/manual), durasi per stage, durasi istirahat
- Generate kode (6 char, bisa regenerate)
- **Question Selector**: Pilih 12 soal per stage-branch
  - Stage 1 (Medium): tab Knowing / Applying / Reasoning, pilih 4 soal masing-masing
  - Stage 2 (High): sama
  - Stage 2 (Low): sama
  - Stage 3 (High): sama
  - Stage 3 (Medium): sama
  - Stage 3 (Low): sama
- Preview total: 72 soal minimum
- Simpan → status: draft

#### Admin: `/admin/mast/[examId]` — Detail & Monitoring
- Info ujian + kode (copy button)
- Status: draft / active / in_progress / completed
- Tombol: Aktifkan, Mulai (jika manual), Edit, Hapus
- Real-time: jumlah siswa di waiting room, jumlah yang sedang ujian
- Quick stats: rata-rata skor, distribusi predikat

#### Admin: `/admin/mast/[examId]/waiting-room` — Monitor Ruang Tunggu
- Daftar siswa yang sudah join (nama, waktu join)
- Tombol "Mulai Ujian" (jika manual_start)
- Real-time update

#### Admin: `/admin/mast/[examId]/breaks` — Monitor Istirahat
- Daftar siswa yang sedang istirahat
- Countdown per siswa
- Tombol "Skip Istirahat" per siswa
- Tombol "Skip Semua Istirahat"

#### Admin: `/admin/mast/[examId]/results` — Rekap Hasil
- Tabel: nama siswa, skor, predikat, jalur stage, status
- Detail per siswa: 4 simpulan, radar chart
- Export CSV

---

## 8. Admin Dashboard

### 8.1 Sidebar Update

Tambah menu baru di `AdminSidebar.tsx`:

```typescript
{ href: '/admin/mast', label: 'MAST Exam', icon: FileText }
```

### 8.2 Admin MAST Page Hierarchy

```
/admin/mast                    → List ujian (CRUD)
/admin/mast/create             → Buat ujian baru
/admin/mast/[examId]           → Detail + monitoring
/admin/mast/[examId]/edit      → Edit ujian
/admin/mast/[examId]/waiting-room → Monitor ruang tunggu
/admin/mast/[examId]/breaks    → Monitor istirahat
/admin/mast/[examId]/results   → Rekap hasil
/admin/mast/questions          → Bank soal MAST
```

---

## 9. File Tree — Semua File yang Perlu Dibuat/Dimodifikasi

### File BARU (dibuat dari nol):

```
src/lib/mast-engine.ts                          ← Scoring engine MAST

src/types/mast.ts                               ← Tipe TypeScript untuk MAST

src/app/(dashboard)/exam/page.tsx               ← Input kode
src/app/(dashboard)/exam/waiting/[sessionId]/page.tsx  ← Ruang tunggu
src/app/(dashboard)/exam/session/[sessionId]/page.tsx  ← Ujian
src/app/(dashboard)/exam/break/[sessionId]/page.tsx    ← Istirahat
src/app/(dashboard)/exam/results/[sessionId]/page.tsx  ← Hasil

src/app/(admin)/admin/mast/page.tsx             ← List ujian
src/app/(admin)/admin/mast/create/page.tsx      ← Buat ujian
src/app/(admin)/admin/mast/[examId]/page.tsx    ← Detail
src/app/(admin)/admin/mast/[examId]/edit/page.tsx      ← Edit
src/app/(admin)/admin/mast/[examId]/waiting-room/page.tsx ← Monitor tunggu
src/app/(admin)/admin/mast/[examId]/breaks/page.tsx    ← Monitor istirahat
src/app/(admin)/admin/mast/[examId]/results/page.tsx   ← Rekap hasil
src/app/(admin)/admin/mast/questions/page.tsx   ← Bank soal

src/app/api/admin/mast-exams/route.ts           ← CRUD ujian
src/app/api/admin/mast-exams/[id]/route.ts      ← Detail/update/delete
src/app/api/admin/mast-exams/[id]/start/route.ts ← Start ujian
src/app/api/admin/mast-exams/[id]/end/route.ts  ← End ujian
src/app/api/admin/mast-exams/[id]/skip-break/route.ts ← Skip istirahat
src/app/api/admin/mast-exams/[id]/waiting-room/route.ts ← Status tunggu
src/app/api/admin/mast-exams/[id]/sessions/route.ts ← List sesi
src/app/api/admin/mast-exams/[id]/results/route.ts ← Rekap hasil

src/app/api/mast/join/route.ts                  ← Siswa join via kode
src/app/api/mast/sessions/[id]/route.ts         ← Status sesi
src/app/api/mast/sessions/[id]/submit-stage/route.ts ← Submit stage
src/app/api/mast/sessions/[id]/complete/route.ts ← Selesai + skor akhir
src/app/api/mast/sessions/[id]/results/route.ts ← Hasil siswa

src/components/exam/ExamCodeInput.tsx
src/components/exam/WaitingRoom.tsx
src/components/exam/StageExam.tsx
src/components/exam/QuestionCard.tsx
src/components/exam/StageNavigation.tsx
src/components/exam/StageTimer.tsx
src/components/exam/BreakScreen.tsx
src/components/exam/BreakCountdown.tsx
src/components/exam/ExamResults.tsx
src/components/exam/PredikatBadge.tsx
src/components/exam/CognitiveRadarChart.tsx
src/components/exam/ConclusionCard.tsx
src/components/exam/StagePathVisualization.tsx
src/components/exam/ExamLayout.tsx

src/components/admin-mast/MASTExamForm.tsx
src/components/admin-mast/QuestionSelector.tsx
src/components/admin-mast/WaitingRoomMonitor.tsx
src/components/admin-mast/BreakMonitor.tsx
src/components/admin-mast/SessionTable.tsx
src/components/admin-mast/ResultsRecap.tsx
src/components/admin-mast/MASTExamCard.tsx

src/__tests__/mast-engine.test.ts               ← Unit tests engine
```

### File yang DIMODIFIKASI:

```
src/components/admin/AdminSidebar.tsx            ← Tambah menu "MAST Exam"
src/app/(dashboard)/dashboard/page.tsx           ← Tambah tombol/card "EXAM"
src/components/layout/Navbar.tsx                 ← Tambah link "EXAM" (jika perlu)
src/components/layout/MobileNav.tsx              ← Tambah link "EXAM" mobile
```

---

## 10. Simulasi

### Siswa A (Pola Konsisten Tinggi)

| Stage | Difficulty | K | A | R | Total | Status | Ws | SW |
|-------|-----------|---|---|---|-------|--------|-----|-----|
| 1 | Medium | 4 | 3 | 3 | 10/12 | ≥8 → Naik | 1.2 | 12.0 |
| 2 | High | 3 | 3 | 3 | 9/12 | ≥8 → Naik | 1.5 | 13.5 |
| 3 | High | 4 | 4 | 3 | 11/12 | Selesai | 1.5 | 16.5 |

```
Score = (12.0 + 13.5 + 16.5) / (12×1.2 + 12×1.5 + 12×1.5) × 100
      = 42.0 / 50.4 × 100
      = 83.3 → Istimewa

Knowing%   = (4+3+4) / 12 × 100 = 91.7%
Applying%  = (3+3+4) / 12 × 100 = 83.3%
Reasoning% = (3+3+3) / 12 × 100 = 75.0%
```

### Siswa B (Pola Adaptif Dinamis)

| Stage | Difficulty | K | A | R | Total | Status | Ws | SW |
|-------|-----------|---|---|---|-------|--------|-----|-----|
| 1 | Medium | 3 | 3 | 2 | 8/12 | ≥8 → Naik | 1.2 | 9.6 |
| 2 | High | 2 | 2 | 1 | 5/12 | <8 → Turun | 1.5 | 7.5 |
| 3 | Medium | 4 | 3 | 2 | 9/12 | Selesai | 1.2 | 10.8 |

```
Score = (9.6 + 7.5 + 10.8) / (12×1.2 + 12×1.5 + 12×1.2) × 100
      = 27.9 / 46.8 × 100
      = 59.6 → Madya

Knowing%   = (3+2+4) / 12 × 100 = 75.0%
Applying%  = (3+2+3) / 12 × 100 = 66.7%
Reasoning% = (2+1+2) / 12 × 100 = 41.7%
```

### Siswa C (Pola Remedial/Rendah)

| Stage | Difficulty | K | A | R | Total | Status | Ws | SW |
|-------|-----------|---|---|---|-------|--------|-----|-----|
| 1 | Medium | 2 | 1 | 1 | 4/12 | <8 → Turun | 1.2 | 4.8 |
| 2 | Low | 3 | 2 | 1 | 6/12 | <8 → Turun | 1.0 | 6.0 |
| 3 | Low | 4 | 3 | 1 | 8/12 | Selesai | 1.0 | 8.0 |

```
Score = (4.8 + 6.0 + 8.0) / (12×1.2 + 12×1.0 + 12×1.0) × 100
      = 18.8 / 40.8 × 100
      = 46.1 → Madya

Knowing%   = (2+3+4) / 12 × 100 = 75.0%
Applying%  = (1+2+3) / 12 × 100 = 50.0%
Reasoning% = (1+1+1) / 12 × 100 = 25.0%
```

---

## Implementasi Phase

### Phase 1: Foundation
1. `src/types/mast.ts` — semua tipe
2. `src/lib/mast-engine.ts` — scoring engine + unit tests
3. Firestore security rules untuk collection baru

### Phase 2: Admin Backend
4. API routes admin (CRUD, start, end, skip-break, waiting-room, sessions, results)
5. Bank soal MAST page

### Phase 3: Admin Frontend
6. Admin sidebar update
7. MAST list page + create page + detail page
8. Waiting room monitor + break monitor
9. Results recap page

### Phase 4: Siswa Backend
10. API routes siswa (join, submit-stage, complete, results)

### Phase 5: Siswa Frontend
11. Exam code input page
12. Waiting room page
13. Stage exam page (12 soal + navigasi + timer)
14. Break screen page
15. Results page (4 simpulan + radar chart + jalur stage)

### Phase 6: Integration & Testing
16. End-to-end testing simulasi 3 siswa
17. Anti-cheat integration
18. Real-time listener testing (Firestore onSnapshot)
