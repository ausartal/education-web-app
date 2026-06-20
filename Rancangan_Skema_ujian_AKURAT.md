# Rancangan Skema & Mekanisme Ujian AKURAT
### Adaptive Chemistry Assessment — Computer Adaptive Diagnostic Test untuk Kimia

| | |
|---|---|
| **Status dokumen** | Draft rancangan sistem |
| **Dasar acuan** | Lampiran Rencana Produk (Studi Pendahuluan, Kisi-Kisi, Bank Soal, Angket Validasi, Spesifikasi Platform) |
| **Tujuan dokumen** | Spesifikasi teknis & konseptual untuk pembangunan website ujian, level kematangan setara TOEFL/computer-adaptive testing internasional, dalam ranah kimia |
| **Catatan** | Bagian yang ditandai 🔵 **Sumber Lampiran** berarti diambil langsung dari dokumen asli. Bagian yang ditandai 🟢 **Usulan Penyempurnaan** adalah pengembangan tambahan dari saya untuk mencapai standar internasional dan kebutuhan sistem nyata. |

---

## 1. Ringkasan Eksekutif

AKURAT adalah ujian diagnostik kimia berbasis **Multistage Adaptive Testing (MSAT)** yang dipadukan dengan **multi-tier diagnostic assessment**. Berbeda dari ujian pilihan ganda konvensional, AKURAT tidak hanya mengukur skor benar/salah, tapi menghasilkan **profil pemahaman** tiap peserta: apakah ia benar-benar paham konsep, paham sebagian, tidak paham, mengalami miskonsepsi, atau sekadar menebak jawaban.

Model bisnis dan pengalaman penggunanya dirancang setara ujian terstandar internasional (TOEFL/TOEIC/computer-adaptive testing pada umumnya):

- Soal disesuaikan otomatis dengan kemampuan peserta secara *real-time* (adaptive).
- Hasil bukan cuma angka, tapi laporan diagnostik yang dapat diverifikasi.
- Bank soal besar, terkalibrasi, dan teracak untuk menjaga keamanan ujian.
- Dapat diskalakan ke banyak topik kimia (tidak terbatas stoikiometri saja) dan banyak bahasa/kurikulum.
- Dilengkapi mekanisme integritas ujian (proctoring, anti-kecurangan) layaknya ujian sertifikasi internasional.

🔵 **Sumber Lampiran**: Konsep dasar MSAT, multi-tier, fitur backtrack, dan deteksi *guessing* berasal langsung dari hasil studi pendahuluan dan kisi-kisi AKURAT (Lampiran 1, 3, 5, 6).

🟢 **Usulan Penyempurnaan**: Struktur modular multi-topik, skema penskoran terstandar, mekanisme proctoring, sertifikasi terverifikasi, dan arsitektur sistem untuk skala pengguna internasional — ditambahkan agar produk ini layak disejajarkan dengan ujian kaliber TOEFL.

---

## 2. Filosofi & Konsep Ujian

### 2.1 Tiga pilar AKURAT

| Pilar | Definisi | Fungsi |
|---|---|---|
| **Multistage Adaptive Testing (MSAT)** | Tingkat kesulitan soal berikutnya ditentukan otomatis oleh benar/salahnya jawaban soal sebelumnya | Efisiensi waktu ujian, ketepatan estimasi kemampuan |
| **Multi-tier diagnostic** | Jawaban dikumpulkan sebagai rangkaian pola (bukan dinilai satu-satu), lalu dipetakan ke kategori pemahaman | Mendeteksi miskonsepsi, bukan cuma nilai |
| **Certainty of Response Index (CRI)** | Peserta menyatakan tingkat keyakinan atas jawabannya | Membedakan "tidak tahu" dari "yakin tapi salah" (miskonsepsi) dan dari "menebak" |

### 2.2 Mengapa ini berbeda dari ujian pilihan ganda biasa

Ujian konvensional hanya menjawab: *"berapa skornya?"*
AKURAT menjawab tiga pertanyaan sekaligus:
1. **Seberapa benar** jawaban peserta? (skor)
2. **Seberapa yakin** peserta saat menjawab? (CRI)
3. **Seberapa konsisten** pola jawabannya di berbagai level kesulitan? (diagnosis)

🔵 Pendekatan ini sesuai temuan studi pendahuluan: instrumen yang ada selama ini dinilai "masih memiliki keterbatasan, khususnya dalam mengidentifikasi tingkat pemahaman siswa secara mendalam dan mendeteksi miskonsepsi secara spesifik."

---

## 3. Struktur Ujian (Exam Blueprint)

### 3.1 Hierarki konten

```
Ujian (Exam)
 └─ Modul (mis. "Kimia Dasar — Stoikiometri")
     └─ Domain/Tujuan Pembelajaran (TP)        ← saat ini 6 TP di lampiran
         └─ Rangkaian 3-tahap soal adaptif
             └─ Tahap 1 → Tahap 2 → Tahap 3
                 └─ Pertanyaan keyakinan (di akhir seluruh modul)
```

🔵 6 domain yang sudah tersedia di kisi-kisi (Lampiran 3):
1. Hubungan mol & pereaksi pembatas
2. Stoikiometri gas (hukum Avogadro/STP)
3. Konsep mol & jumlah partikel
4. Rumus empiris & rumus molekul
5. Konsentrasi larutan (molaritas, molalitas, persen massa)

🟢 **Usulan**: Arsitektur ini dibuat **modular** sejak awal, sehingga modul lain (Termokimia, Kesetimbangan, Asam-Basa, Elektrokimia, Kimia Organik, dst.) bisa ditambahkan tanpa mengubah mesin adaptif — cukup menambah bank soal baru per domain. Ini yang memungkinkan AKURAT berkembang dari "ujian topik stoikiometri" menjadi "ujian sertifikasi kimia komprehensif".

### 3.2 Algoritma percabangan adaptif per domain

Setiap domain (TP) terdiri dari 3 soal berjenjang dengan logika berikut:

| Tahap | Aturan |
|---|---|
| Tahap 1 | Selalu level **Sedang** — sama untuk semua peserta (item jangkar/anchor) |
| Tahap 2 | Tahap 1 **salah** → soal **Mudah** &nbsp;•&nbsp; Tahap 1 **benar** → soal **Sukar** |
| Tahap 3 | S→Mudah(benar) → **Sedang** &nbsp;•&nbsp; S→Mudah(salah) → **Sangat Mudah** &nbsp;•&nbsp; B→Sukar(benar) → **Sangat Sukar** &nbsp;•&nbsp; B→Sukar(salah) → **Sedang** |

🔵 Logika ini diturunkan langsung dari pola kombinasi soal di kisi-kisi Lampiran 3 (kolom Soal 1/2/3 dan levelnya).

🟢 **Usulan penyempurnaan algoritmik**: untuk skala internasional, percabangan biner sederhana di atas sebaiknya dilengkapi **Item Response Theory (IRT)** di belakang layar — setiap soal punya parameter kalibrasi (tingkat kesukaran `b`, daya beda `a`, dugaan kemampuan peserta `θ`). Logika "Mudah/Sedang/Sukar" tetap dipakai sebagai label tampilan, tapi pemilihan soal sesungguhnya berbasis estimasi `θ` real-time. Ini standar yang dipakai TOEFL iBT, GRE, dan ujian adaptif internasional lain — supaya hasil antar-peserta tetap bisa dibandingkan secara statistik walau soal yang dikerjakan berbeda-beda.

### 3.3 Tahap keyakinan (CRI)

🔵 Setelah **seluruh soal pada modul selesai dijawab**, muncul satu pertanyaan keyakinan: **"Yakin"** atau **"Tidak Yakin"**, mencakup keseluruhan jawaban peserta pada modul tersebut.

🟢 **Usulan**: Untuk modul dengan banyak domain (6 TP atau lebih), pertanyaan keyakinan sebaiknya diberikan **per domain**, bukan hanya sekali di akhir seluruh modul. Alasannya: jika hanya satu pertanyaan keyakinan untuk 18 soal, datanya terlalu kasar untuk mendiagnosis miskonsepsi per topik secara akurat — peserta bisa yakin di topik A tapi ragu di topik B. CRI per-domain menjaga presisi skema diagnosis di bagian 4.

---

## 4. Skema Penilaian & Diagnosis (Scoring Engine)

### 4.1 Pemetaan pola jawaban → kategori pemahaman

🔵 Diambil langsung dari "Skema Kemungkinan" di Lampiran 5:

| Pola (Tahap1–Tahap2–Tahap3) | Jika **Yakin** | Jika **Tidak Yakin** |
|---|---|---|
| Benar–Benar–Benar | Paham konsep | Paham konsep |
| Salah–Benar–Benar | Paham sebagian konsep | Paham sebagian konsep |
| Benar–Benar–Salah / Benar–Salah–Benar | Paham sebagian konsep | Paham sebagian konsep |
| Salah–Benar–Salah / Salah–Salah–Benar | Tidak paham konsep | Tidak paham konsep |
| Salah–Salah–Salah | **Miskonsepsi** | Tidak paham konsep |
| Benar–Salah–Salah | Hasil nebak | Hasil nebak |

### 4.2 Skor numerik (🟢 usulan tambahan)

Lampiran tidak menyebutkan rumus skor numerik — hanya kategori kualitatif. Untuk kebutuhan sertifikasi/pelaporan setara TOEFL, sistem perlu skor yang bisa dibandingkan lintas peserta dan lintas sesi ujian. Usulan formula:

```
Skor Domain = Σ (bobot_kesulitan_soal × benar/salah) / Σ bobot_kesulitan_maksimum × 100

Bobot kesulitan:
  Sangat Mudah = 1   Mudah = 2   Sedang = 3   Sukar = 4   Sangat Sukar = 5
```

- **Skor Modul** = rata-rata tertimbang seluruh Skor Domain dalam modul.
- **Skor Keseluruhan (Overall Score)** dilaporkan dalam skala standar, misalnya **0–120** (mengikuti konvensi TOEFL iBT) atau skala **0–9** model band score (mengikuti konvensi IELTS) — dipilih sesuai target pasar.
- **Indeks Diagnostik** (kategori dari 4.1) dilaporkan terpisah dari skor numerik, sebagai lapisan kualitatif tambahan — ini yang membedakan AKURAT dari TOEFL biasa: bukan cuma "berapa skornya" tapi "di mana letak miskonsepsinya".

### 4.3 Deteksi kecurangan/anomali berbasis pola (🟢 usulan)

Karena kategori **"Hasil Nebak"** sudah ada secara konsep, sistem otomatis bisa diperluas untuk deteksi integritas ujian:
- Response time anomaly: jawaban benar pada soal sukar dengan waktu sangat singkat (di bawah ambang wajar) ditandai untuk *review*.
- Rasio kategori "Hasil Nebak" yang tinggi pada satu sesi → flag otomatis ke admin/proctor.
- Pola jawaban identik antar-peserta dalam satu sesi (indikasi kebocoran soal) → flag kemiripan.

---

## 5. Estimasi Waktu Pengerjaan

🟢 **Catatan penting**: lampiran sumber **tidak mencantumkan durasi pengerjaan**. Estimasi di bawah adalah usulan rancangan awal berbasis asumsi waktu wajar per tingkat kesulitan soal kimia hitungan, dan **perlu dikalibrasi ulang lewat uji coba (pilot test)** sebelum dijadikan standar resmi.

### 5.1 Estimasi waktu per soal berdasarkan tingkat kesulitan

| Level kesulitan | Tipe soal (contoh dari bank soal) | Estimasi waktu |
|---|---|---|
| Sangat Mudah | Definisi/konsep dasar (C1) | 30–45 detik |
| Mudah | Perbandingan koefisien/mol (C2) | 45–60 detik |
| Sedang | Perhitungan 1 langkah (C2–C3) | 90–120 detik |
| Sukar | Pereaksi pembatas, konversi massa→mol (C3–C4) | 120–180 detik |
| Sangat Sukar | Perhitungan multi-langkah (massa produk maksimum, C4) | 150–210 detik |

### 5.2 Estimasi total per domain (3 tahap)

Rata-rata terbobot lintas kemungkinan jalur adaptif (asumsi populasi peserta terbagi merata di tiap cabang):

| Komponen | Estimasi |
|---|---|
| Tahap 1 (selalu Sedang) | ~105 detik |
| Tahap 2 (rata-rata Mudah/Sukar) | ~100 detik |
| Tahap 3 (rata-rata 4 kemungkinan level) | ~110 detik |
| Pertanyaan keyakinan per domain | ~10–15 detik |
| **Total per domain** | **≈ 5,5 menit** |

### 5.3 Estimasi total ujian (modul stoikiometri, 6 domain)

| Komponen | Estimasi waktu |
|---|---|
| Instruksi & pengecekan sistem (system check) | 5 menit |
| 6 domain × ±5,5 menit | ±33 menit |
| Buffer transisi antar-domain | 2 menit |
| **Total estimasi pengerjaan murni** | **≈ 40 menit** |
| Dengan toleransi/buffer peserta (+25%) | **≈ 50 menit** |

🟢 **Rekomendasi**: tetapkan **durasi resmi 50 menit** dengan **soft warning** pada menit ke-40 dan auto-submit pada batas waktu — pola umum di ujian adaptif internasional. Jika nanti ditambah modul lain, total waktu disesuaikan secara linear per modul (±40 menit/modul) atau dipecah menjadi sesi terpisah seperti TOEFL (Reading/Listening sebagai sesi berbeda).

---

## 6. Mekanisme Pelaksanaan Ujian (End-to-End Flow)

🔵 Tahapan dasar (jadwal ditentukan guru, jawaban tersimpan otomatis, tanpa pembahasan saat ujian, fitur backtrack, hasil + interpretasi di akhir) diambil dari Lampiran 6.1. Dikembangkan menjadi alur lengkap setara ujian sertifikasi:

| Tahap | Deskripsi | Sumber |
|---|---|---|
| **1. Registrasi & penjadwalan** | Peserta mendaftar, memilih slot ujian (tanggal/waktu), institusi pengundang (guru/sekolah) menjadwalkan sesi | 🔵 + 🟢 |
| **2. Pra-ujian** | Verifikasi identitas, system check (kamera/koneksi jika pakai proctoring), instruksi & contoh soal latihan (tier demo) | 🟢 |
| **3. Pelaksanaan** | Peserta mengerjakan tiap domain secara berurutan, soal beradaptasi otomatis, fitur backtrack aktif dalam satu domain, tanpa pembahasan | 🔵 |
| **4. Pertanyaan keyakinan** | Diberikan di akhir tiap domain (usulan) | 🔵 + 🟢 |
| **5. Submission & locking** | Jawaban terkunci setelah submit/waktu habis, tidak bisa diubah | 🟢 |
| **6. Scoring otomatis** | Sistem menghitung skor numerik + kategori diagnosis per domain | 🟢 |
| **7. Hasil peserta** | Skor + interpretasi ditampilkan ke peserta (tanpa pembahasan jawaban) | 🔵 |
| **8. Laporan ke guru/institusi** | Rekap pola jawaban kelas, distribusi kategori pemahaman per topik | 🔵 |
| **9. Sertifikasi (opsional)** | Sertifikat digital terverifikasi untuk peserta yang ujian via jalur resmi/berbayar | 🟢 |

---

## 7. Peran Pengguna (User Roles)

| Peran | Sumber | Fungsi utama |
|---|---|---|
| **Peserta didik (Test-taker)** | 🔵 | Mengerjakan ujian, melihat riwayat & profil hasil |
| **Guru/Pendidik** | 🔵 | Membuat materi, membuat & menjadwalkan ujian, melihat interpretasi hasil kelas |
| **Admin** | 🔵 | Dashboard pengguna, monitoring sistem, manajemen bank soal |
| **Item Writer / Validator soal** | 🟢 (formal dari proses Lampiran 5) | Menulis & memvalidasi soal baru, kalibrasi tingkat kesulitan |
| **Proctor (pengawas)** | 🟢 | Memantau sesi ujian langsung/AI-proctoring untuk integritas |
| **Institusi/Penerima skor** | 🟢 | Universitas/perusahaan yang memverifikasi sertifikat peserta |

---

## 8. Arsitektur Sistem (untuk Tim Pengembang)

### 8.1 Modul sistem inti

```
1. Auth & Identity        → login, verifikasi identitas, SSO opsional
2. Item Bank Management    → CRUD soal, tagging domain/level, versi soal
3. Adaptive Test Engine    → logika percabangan + (opsional) mesin IRT
4. Session & Scheduling     → penjadwalan ujian, slot waktu, time zone
5. Scoring & Diagnostic Engine → kalkulasi skor, kategori, CRI
6. Proctoring & Integrity   → webcam/screen monitoring, anomaly detection
7. Reporting & Analytics    → dashboard guru/admin, ekspor data
8. Certification Service    → sertifikat digital + kode verifikasi publik
9. Notification Service     → email/reminder jadwal ujian
10. Localization Service    → multi-bahasa, multi-kurikulum
```

### 8.2 Entitas data inti (skema awal)

| Entitas | Atribut kunci |
|---|---|
| `User` | id, role, nama, email, institusi, bahasa |
| `Module` | id, nama, kurikulum/standar acuan |
| `Domain` (TP) | id, module_id, nama, deskripsi capaian |
| `Item` (soal) | id, domain_id, tier, level_kesulitan, level_kognitif (C1–C4), teks, opsi, kunci, status_validasi |
| `BranchRule` | domain_id, dari_tier, hasil_jawaban, ke_item_id |
| `TestSession` | id, user_id, module_id, jadwal, status, waktu_mulai, waktu_selesai |
| `ResponseRecord` | session_id, item_id, jawaban, benar/salah, waktu_jawab |
| `ConfidenceResponse` | session_id, domain_id, yakin/tidak_yakin |
| `DiagnosticResult` | session_id, domain_id, kategori, skor |
| `Certificate` | session_id, nomor_sertifikat, kode_verifikasi, tanggal_terbit |

### 8.3 Pertimbangan skalabilitas internasional

- **Stateless adaptive engine** di balik API agar bisa di-*scale horizontal* saat banyak peserta ujian bersamaan (mis. ujian massal serentak ala TOEFL).
- **Bank soal terenkripsi** dan diacak per sesi (item rotation) untuk mencegah kebocoran soal antar zona waktu.
- **CDN & multi-region hosting** agar latensi rendah untuk peserta lintas negara.
- **Time-zone aware scheduling** — satu jadwal global ditampilkan otomatis sesuai zona waktu lokal peserta.
- **Multi-bahasa**: teks UI dan instruksi diterjemahkan; notasi kimia (rumus, satuan) tetap universal sehingga bank soal inti tidak perlu diterjemahkan ulang, hanya teks naratif soal.
- **Audit trail** lengkap tiap sesi (untuk sengketa hasil, mirip proses banding skor TOEFL).

---

## 9. Validasi & Quality Assurance (berkelanjutan)

🔵 Lampiran 5 sudah menyediakan instrumen validasi ahli (skala 1–4) untuk:
- Kesesuaian soal dengan indikator & materi
- Kejelasan bahasa, distraktor homogen, tidak multitafsir
- Validasi tampilan platform (3 sisi: peserta didik, guru, admin)

🟢 **Usulan tambahan untuk standar internasional**:
- **Field testing**: soal baru diujicobakan ke sampel kecil sebelum masuk bank soal resmi, untuk mengukur parameter kesulitan aktual (bukan hanya estimasi ahli).
- **Reliability testing**: hitung konsistensi internal (mis. Cronbach's alpha) per domain.
- **Bias review**: tinjau soal agar tidak bias budaya/bahasa saat dipakai lintas negara.
- **Periodic recalibration**: soal yang sudah lama dipakai dikaji ulang tingkat kesulitannya berdasarkan data jawaban riil peserta.

---

## 10. Roadmap Pengembangan (🟢 usulan bertahap)

| Fase | Cakupan |
|---|---|
| **MVP** | 1 modul (Stoikiometri, 6 domain — sesuai lampiran), 3 peran pengguna (siswa/guru/admin), tanpa proctoring |
| **Fase 2** | Tambah 2–3 modul kimia lain, skor numerik terstandar, sertifikat digital |
| **Fase 3** | Proctoring & integrity engine, multi-bahasa, time-zone scheduling |
| **Fase 4** | IRT penuh di mesin adaptif, kalibrasi bank soal berbasis data riil, ekspansi multi-negara |

---

## 11. Ringkasan Perbedaan Kunci vs Ujian Konvensional / TOEFL

| Aspek | Ujian konvensional | TOEFL | **AKURAT** |
|---|---|---|---|
| Soal | Tetap (statis) | Adaptif (per bagian) | Adaptif (per item, 3-tahap) |
| Output | Skor saja | Skor band | Skor **+** kategori diagnosis pemahaman |
| Deteksi miskonsepsi | Tidak ada | Tidak ada | Ada (lewat pola + CRI) |
| Deteksi menebak | Tidak ada | Tidak ada | Ada (kategori "Hasil Nebak") |
| Sertifikasi | Bervariasi | Terverifikasi global | Diusulkan: terverifikasi + dapat diaudit |

---

*Dokumen ini disusun sebagai dasar pengembangan sistem (engineering spec) dan dapat diperbarui seiring hasil pilot testing, kalibrasi soal, dan masukan klien.*

# Command AI — Generator Soal Ujian AKURAT

Dokumen ini berisi *prompt*/command siap pakai untuk meminta AI (Claude, ChatGPT, atau model lain) membuat satu paket soal AKURAT yang lengkap — 3-tahap adaptif + skema percabangan — sesuai struktur yang sudah dirancang di `Rancangan_Skema_Ujian_AKURAT.md`.

## Cara pakai

1. Salin **Command Utama** di bagian 1.
2. Isi semua placeholder `[...]`.
3. Tempel ke AI. AI akan mengembalikan **JSON siap impor** ke item bank (sesuai skema `Item` & `BranchRule` di rancangan sistem).
4. Hasilnya tetap wajib lewat proses validasi ahli (lihat checklist bagian 3) sebelum dipakai ke ujian sungguhan — AI men-generate draf, bukan soal final.

---

## 1. Command Utama — Generate Satu Domain Penuh

```
PERAN
Kamu adalah penulis soal (item writer) kimia berpengalaman yang membuat butir soal
untuk sistem ujian adaptif AKURAT — Multistage Adaptive Testing (MSAT) dengan
diagnosis miskonsepsi 3-tahap.

KONTEKS SISTEM
AKURAT menguji satu domain/Tujuan Pembelajaran (TP) lewat rangkaian 3 soal
berjenjang kesulitan yang bercabang otomatis berdasarkan jawaban peserta:

  Tahap 1 -> selalu level SEDANG, sama untuk semua peserta (item jangkar)
  Tahap 2 -> jika Tahap 1 SALAH -> level MUDAH
             jika Tahap 1 BENAR -> level SUKAR
  Tahap 3 -> Salah->Mudah(benar)  -> SEDANG
             Salah->Mudah(salah)  -> SANGAT MUDAH
             Benar->Sukar(benar)  -> SANGAT SUKAR
             Benar->Sukar(salah)  -> SEDANG

Artinya satu domain membutuhkan TUJUH butir soal berbeda:
  1x Sedang   (Tahap 1, anchor)
  1x Mudah    (Tahap 2)
  1x Sukar    (Tahap 2)
  1x Sangat Mudah  (Tahap 3, jalur Salah-Mudah-Salah)
  1x Sedang        (Tahap 3, jalur Salah-Mudah-Benar)
  1x Sedang        (Tahap 3, jalur Benar-Sukar-Salah)
  1x Sangat Sukar  (Tahap 3, jalur Benar-Sukar-Benar)

Catatan: dua soal "Sedang" di Tahap 3 HARUS soal yang berbeda satu sama lain
(dan berbeda dari soal Sedang di Tahap 1), supaya tidak mudah ditebak/dibocorkan.

INPUT YANG AKAN AKU BERIKAN
- Domain/Tujuan Pembelajaran : [contoh: "Hubungan mol dan pereaksi pembatas"]
- Mata pelajaran & jenjang   : [contoh: "Kimia SMA kelas X / setara A-Level Chemistry"]
- Indikator capaian          : [contoh: "Peserta didik dapat menentukan pereaksi
                                 pembatas dan massa zat sisa dari suatu reaksi"]
- Miskonsepsi umum yang ingin dideteksi (opsional) : [contoh: "siswa mengira mol
  terbesar = pereaksi pembatas, tanpa membagi dengan koefisien"]
- Gaya bahasa  : [Indonesia formal akademik / English academic / dwibahasa]

ATURAN WAJIB UNTUK SETIAP BUTIR SOAL
1. Pilihan ganda, 4-5 opsi, hanya SATU jawaban benar.
2. Setiap distraktor (opsi salah) harus mencerminkan miskonsepsi/kesalahan
   hitung yang masuk akal dan SEJENIS satu sama lain (homogen) — bukan
   pengecoh yang asal-asalan atau jelas salah.
3. Bahasa soal jelas, baku, tidak menimbulkan multitafsir.
4. Pokok soal (stem) tidak boleh memberi petunjuk jawaban secara tidak sengaja.
5. Tiap soal diberi label level kognitif: C1 (mengingat) - C2 (memahami) -
   C3 (mengaplikasi) - C4 (menganalisis), konsisten dengan tingkat
   kesulitannya (Sangat Mudah/Mudah ~ C1-C2, Sedang ~ C2-C3, Sukar/Sangat
   Sukar ~ C3-C4).
6. Soal pada tahap yang sama (Mudah vs Sukar; dan 4 soal Tahap 3) harus tetap
   menguji indikator/domain yang SAMA, hanya beda kompleksitas perhitungan
   atau kedalaman konsep — bukan topik yang melenceng.
7. Sertakan kunci jawaban dan alasan singkat tiap distraktor (untuk
   kepentingan validasi ahli, lihat checklist bagian 3 dokumen ini).

FORMAT OUTPUT
Kembalikan HANYA dalam format JSON berikut, tanpa teks tambahan di luar JSON:

{
  "domain": "[nama domain]",
  "indikator": "[indikator capaian]",
  "items": [
    {
      "item_id": "D1-T1",
      "tier": 1,
      "level_kesulitan": "Sedang",
      "level_kognitif": "C2",
      "jalur_percabangan": "anchor (semua peserta)",
      "soal": "...",
      "opsi": {"A": "...", "B": "...", "C": "...", "D": "..."},
      "kunci": "B",
      "alasan_distraktor": {
        "A": "miskonsepsi: ...",
        "C": "kesalahan hitung: ...",
        "D": "miskonsepsi: ..."
      }
    }
    // ... lanjutkan untuk D1-T2-MUDAH, D1-T2-SUKAR, D1-T3-SM, D1-T3-S1,
    //     D1-T3-S2, D1-T3-SS  (total 7 item)
  ],
  "branch_rules": [
    {"dari": "D1-T1", "jika": "salah", "ke": "D1-T2-MUDAH"},
    {"dari": "D1-T1", "jika": "benar", "ke": "D1-T2-SUKAR"},
    {"dari": "D1-T2-MUDAH", "jika": "benar", "ke": "D1-T3-S1"},
    {"dari": "D1-T2-MUDAH", "jika": "salah", "ke": "D1-T3-SM"},
    {"dari": "D1-T2-SUKAR", "jika": "benar", "ke": "D1-T3-SS"},
    {"dari": "D1-T2-SUKAR", "jika": "salah", "ke": "D1-T3-S2"}
  ]
}

ISI PARAMETER DI BAWAH INI:
Domain/Tujuan Pembelajaran : [ISI DI SINI]
Mata pelajaran & jenjang   : [ISI DI SINI]
Indikator capaian          : [ISI DI SINI]
Miskonsepsi yang dideteksi : [ISI DI SINI, atau "AI yang tentukan"]
Gaya bahasa                : [ISI DI SINI]
```

---

## 2. Command Turunan (untuk kebutuhan lain)

### 2.1 Generate satu modul penuh (banyak domain sekaligus)

```
Gunakan PERAN, KONTEKS SISTEM, ATURAN WAJIB, dan FORMAT OUTPUT yang sama
seperti Command Utama. Tapi kali ini buatkan untuk SELURUH domain berikut
dalam satu modul "[nama modul]":

1. [Domain 1 + indikator]
2. [Domain 2 + indikator]
3. [Domain 3 + indikator]
...

Kembalikan JSON array berisi satu objek domain (struktur sama seperti
Command Utama) untuk tiap domain di atas. Pastikan tidak ada soal yang
identik atau terlalu mirip antar-domain.
```

### 2.2 Ganti satu butir soal saja (item replacement)

Dipakai kalau satu soal gagal validasi ahli dan perlu diganti tanpa mengubah soal lain di domain yang sama.

```
Berikut satu domain AKURAT yang sudah ada (JSON terlampir): [tempel JSON domain]

Soal dengan item_id "[contoh: D1-T3-S1]" gagal validasi ahli dengan alasan:
"[contoh: distraktor C terlalu jelas salah, mudah ditebak]"

Buatkan SATU soal pengganti untuk item_id tersebut, dengan:
- Level kesulitan dan level kognitif yang SAMA seperti soal asli
- Domain dan indikator yang SAMA
- Tetap mengikuti semua ATURAN WAJIB di Command Utama
- Tidak boleh duplikat/terlalu mirip dengan 6 soal lain di domain yang sama

Kembalikan hanya objek JSON satu item tersebut (format sama seperti item di
Command Utama), siap menggantikan item lama di item bank.
```

### 2.3 Audit otomatis soal yang sudah ada

Dipakai sebagai *pre-screening* sebelum soal masuk ke proses validasi ahli manusia (bagian 3) — bukan pengganti validasi ahli.

```
Tinjau soal AKURAT berikut (JSON terlampir): [tempel JSON]

Untuk setiap butir soal, beri penilaian SKOR 1-4 pada 9 kriteria berikut,
dan tunjukkan secara spesifik bagian mana dari soal yang menjadi alasannya:

1. Indikator soal mampu mengukur ketercapaian kompetensi
2. Butir soal sesuai dengan materi yang dibahas
3. Butir soal sesuai dengan rumusan indikator soal
4. Butir soal menggunakan bahasa yang mudah dipahami
5. Butir soal tidak menimbulkan multitafsir
6. Hanya terdapat satu pilihan jawaban benar
7. Distraktor homogen (sejenis, sama-sama masuk akal)
8. Pokok soal tidak memberi petunjuk jawaban
9. Konsep yang diujikan relevan dengan tingkat pendidikan peserta didik

Beri juga rekomendasi: LOLOS / REVISI MINOR / REVISI MAYOR / TOLAK,
untuk tiap butir soal, beserta saran perbaikan konkret jika REVISI/TOLAK.
```

---

## 3. Checklist Validasi Manual (tetap wajib dilakukan manusia)

Output AI dari command di atas adalah **draf**, bukan soal final. Sebelum masuk item bank resmi, tiap butir tetap harus dinilai ahli memakai 9 kriteria berikut (skala 1-4), sesuai instrumen validasi yang sudah ada:

| No | Kriteria |
|---|---|
| 1 | Indikator soal mampu mengukur ketercapaian kompetensi |
| 2 | Butir soal sesuai dengan materi yang dibahas |
| 3 | Butir soal sesuai dengan rumusan indikator soal |
| 4 | Butir soal menggunakan bahasa yang mudah dipahami |
| 5 | Butir soal tidak menimbulkan multitafsir |
| 6 | Hanya terdapat satu pilihan jawaban benar |
| 7 | Distraktor homogen |
| 8 | Pokok soal tidak memberi petunjuk jawaban |
| 9 | Konsep yang diujikan relevan dengan tingkat pendidikan peserta didik |

Alur kerja yang disarankan: **AI generate draf → Command 2.3 (audit otomatis) → ahli manusia validasi final memakai tabel di atas → soal lolos masuk item bank.**

---

## 4. Contoh Pengisian Singkat

```
Domain/Tujuan Pembelajaran : Konsep mol dan jumlah partikel
Mata pelajaran & jenjang   : Kimia SMA kelas X
Indikator capaian          : Peserta didik dapat menghitung jumlah partikel
                              (atom/molekul) dari suatu jumlah mol zat
                              menggunakan bilangan Avogadro
Miskonsepsi yang dideteksi : siswa mengira 1 mol selalu = 6,02 x 10^23 gram
                              (menukar satuan partikel dengan satuan massa)
Gaya bahasa                : Indonesia formal akademik
```

AI akan mengembalikan JSON 7-item lengkap dengan branch_rules siap diimpor ke tabel `Item` dan `BranchRule` pada skema database AKURAT.

---

## 5. Catatan Desain Tambahan

### 5.1 Interpretasi Hasil per Tujuan Pembelajaran (TP)

Pola jawaban 3 soal berjenjang per TP menghasilkan kategori:

| Pola | Interpretasi |
|------|-------------|
| Benar - Benar - Benar | **Mahir** — paham konsep sepenuhnya |
| Benar - Benar - Salah | **Paham sebagian** — ada celah pemahaman di tingkat lanjut |
| Benar - Salah - * | **Miskonsepsi** — paham permukaan, gagal di penerapan |
| Salah - Benar - Benar | **Menebak** — jawaban benar tidak konsisten |
| Salah - Salah - Salah | **Tidak paham** |

Siswa hanya melihat skor akhir. Proficiency dan interpretasi per TP **hanya tersedia untuk guru** di rekap hasil.

### 5.2 Sistem Kelas & Akses Ujian

- Guru membuat kelas → sistem generate **kode kelas** unik
- Siswa bergabung ke kelas dengan memasukkan kode kelas
- Kelas membuka akses ke: materi khusus kelas, chat ruang kelas, ujian terjadwal, latihan
- Guru menjadwalkan ujian → sistem generate **token ujian** untuk sesi tertentu
- Siswa harus memasukkan token ujian saat akan memulai (sesuai jadwal)
- Guru dapat memilih kompetensi (TP) mana yang diujikan saat membuat jadwal

### 5.3 Bank Soal

- Dua bank soal terpisah: **Bank Latihan** (bisa dilihat/dilatih siswa) dan **Bank Ujian** (rahasia, server-side only)
- Setiap soal langsung bermuatan kompetensi/TP saat dibuat
- Soal dapat berisi gambar dan persamaan (equation dengan KaTeX)
- Penambahan soal mengharuskan mengisi: jawaban benar, opsi salah + misconception tag, penjelasan

### 5.4 Alur Satu Sesi Ujian

**Sebelum ujian:**

**Sebelum ujian:**

1. Guru membuat kelas -> sistem generate kode kelas unik
2. Siswa bergabung ke kelas dengan memasukkan kode kelas
3. Kelas membuka akses ke: materi khusus kelas, chat ruang kelas, ujian, dan latihan
4. Guru menjadwalkan ujian ("Buat Test") -> sistem generate token ujian
5. Guru memilih TP (Tujuan Pembelajaran) yang akan diujikan

**Saat ujian:**

1. Siswa login -> masuk halaman Test sesuai jadwal -> masukkan token ujian
2. Untuk setiap TP, siswa mengerjakan 3 soal berjenjang:
   - Soal 1 (sedang) -> Soal 2 (menyesuaikan benar/salah soal 1) -> Soal 3 (menyesuaikan pola jawaban 1+2)
3. Jika ada 6 TP -> total 18 soal per sesi (6 x 3 tahap)
4. Selama proses: tidak ada pembahasan, nomor soal berubah gelap setelah dijawab, siswa bisa backtrack ke soal sebelumnya
5. Durasi estimasi: **1 soal = 5-7 menit**
6. Setelah semua TP selesai -> muncul satu pertanyaan keyakinan: "Yakin" / "Tidak Yakin" untuk keseluruhan jawaban (bukan per soal)

**Setelah ujian:**

1. Submit -> halaman Hasil: tampil benar/salah per soal + interpretasi kategori per TP (Paham konsep / Paham sebagian / Tidak paham / Miskonsepsi / Hasil nebak) -- tanpa pembahasan
2. Guru melihat rekap hasil dan pola jawaban semua siswa di platform guru, terurut berdasarkan waktu pelaksanaan terbaru
