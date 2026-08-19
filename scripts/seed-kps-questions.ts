import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

// ── Types ──
type KPSDifficultyLevel = 'tetap_rendah' | 'rendah' | 'menengah_lebih_rendah' | 'menengah' | 'menengah_lebih_tinggi' | 'tinggi' | 'tetap_tinggi';
type KPSIndicator = 'merumuskan_masalah' | 'membuat_hipotesis' | 'mengontrol_variabel' | 'merancang_investigasi' | 'mengumpulkan_mencatat_data' | 'menganalisis_menginterpretasi_data' | 'membuat_kesimpulan';

interface QuestionData {
  indicator: KPSIndicator;
  order: number;
  questionType: string;
  stem: string;
  explanation: string;
  // MC
  options?: Record<string, string>;
  correctAnswer?: string | boolean;
  // Complex MC
  correctAnswers?: string[];
  partialCredit?: boolean;
  // True/False
  statement?: string;
  // Complex TF
  statements?: Array<{ id: string; text: string; correctAnswer: boolean }>;
  requireAll?: boolean;
  // Matching
  premises?: Array<{ id: string; text: string }>;
  matchingOptions?: Array<{ id: string; text: string }>;
  correctMatches?: Record<string, string>;
}

interface StimulusData {
  level: KPSDifficultyLevel;
  stage: 1 | 2 | 3;
  title: string;
  content: string;
}

// ── INDICATOR ORDER ──
const INDICATORS: KPSIndicator[] = [
  'merumuskan_masalah',
  'membuat_hipotesis',
  'mengontrol_variabel',
  'merancang_investigasi',
  'mengumpulkan_mencatat_data',
  'menganalisis_menginterpretasi_data',
  'membuat_kesimpulan',
];

// ── LEVEL → STAGE MAPPING ──
// Stage 1: menengah
// Stage 2: tinggi (high path), rendah (low path)
// Stage 3: tetap_tinggi, menengah_lebih_tinggi, menengah_lebih_rendah, tetap_rendah
const LEVEL_STAGE_MAP: Record<KPSDifficultyLevel, { stage: 1 | 2 | 3 }> = {
  menengah: { stage: 1 },
  tinggi: { stage: 2 },
  rendah: { stage: 2 },
  tetap_tinggi: { stage: 3 },
  menengah_lebih_tinggi: { stage: 3 },
  menengah_lebih_rendah: { stage: 3 },
  tetap_rendah: { stage: 3 },
};

// ═══════════════════════════════════════════════════════════════════
// STIMULI DATA
// ═══════════════════════════════════════════════════════════════════

const stimuli: StimulusData[] = [
  // Stage 1: Menengah
  {
    level: 'menengah', stage: 1, title: 'Paradoks Warna dalam Tabung',
    content: `Di sebuah laboratorium SMA, Bu Sinta mengambil dua tabung reaksi tertutup yang masing-masing berisi campuran gas N₂O₄ dan NO₂ dalam kesetimbangan pada suhu ruang (25°C). Kedua tabung awalnya menampilkan warna cokelat muda yang sama persis.

Reaksi kesetimbangan: N₂O₄(g) ⇌ 2NO₂(g) ΔH = +57 kJ/mol
- N₂O₄ = tidak berwarna
- NO₂ = cokelat kemerahan

Tabung pertama dicelupkan ke dalam air es (±5°C), tabung kedua ke dalam air panas (±70°C). Tabung dalam air panas berubah menjadi cokelat sangat tua, tabung dalam air es berubah menjadi hampir tidak berwarna. Keduanya kembali ke cokelat muda saat dikembalikan ke suhu ruang.

**Tabel Data:**
| Tabung | Kondisi | Suhu (°C) | [N₂O₄] (M) | [NO₂] (M) | Warna |
|--------|---------|-----------|-------------|------------|-------|
| 1 dan 2 | Awal | 25 | 0,0450 | 0,0450 | Cokelat Muda |
| 1 | Air es | 5 | 0,0710 | 0,0120 | Hampir tidak berwarna |
| 1 | Kembali suhu ruang | 25 | 0,0452 | 0,0338 | Cokelat Muda |
| 2 | Air panas | 70 | 0,0080 | 0,1150 | Cokelat sangat tua |
| 2 | Kembali suhu ruang | 25 | 0,0449 | 0,0341 | Cokelat Muda |

Siswa Dito: "Bu, bukannya mendinginkan sesuatu itu biasanya membuat warna semakin gelap? Seperti teh yang didiamkan makin lama makin pekat. Kenapa justru tabung yang dipanaskan yang warnanya semakin tua?"`,
  },
  // Stage 2: Tinggi
  {
    level: 'tinggi', stage: 2, title: 'Pembuatan Asam Sulfat',
    content: `**Pembuatan Asam Sulfat (H₂SO₄) Menggunakan Proses Kontak**

Dalam industri pembuatan asam sulfat, salah satu tahap penting adalah pembentukan sulfur trioksida melalui reaksi kesetimbangan berikut:

2SO₂(g) + O₂(g) ⇌ 2SO₃(g) ΔH = −191 kJ

Reaksi tersebut berlangsung dengan bantuan katalis V₂O₅. Sekelompok siswa ingin menyelidiki pengaruh suhu dan tekanan terhadap jumlah SO₃ yang dihasilkan. Mereka menggunakan campuran awal yang sama pada setiap percobaan.

**Tabel Data:**
| Percobaan | Suhu (°C) | Tekanan (atm) | SO₃ terbentuk (mol) |
|-----------|-----------|---------------|---------------------|
| 1 | 350 | 1 | 2,8 |
| 2 | 350 | 2 | 3,2 |
| 3 | 350 | 3 | 3,4 |
| 4 | 450 | 1 | 2,4 |
| 5 | 450 | 2 | 2,9 |
| 6 | 450 | 3 | 3,1 |
| 7 | 550 | 1 | 1,8 |
| 8 | 550 | 2 | 2,2 |
| 9 | 550 | 3 | 2,5 |`,
  },
  // Stage 2: Rendah
  {
    level: 'rendah', stage: 2, title: 'Penguapan dan Pengembunan Air',
    content: `**Proses Penguapan dan Pengembunan Air dalam Wadah Tertutup**

Pernahkah kamu memanaskan air dalam panci yang ditutup rapat? Saat air dipanaskan, sebagian air berubah menjadi uap air (penguapan). Proses ini membutuhkan energi dari lingkungan, sehingga disebut reaksi endoterm (menyerap kalor, ΔH bernilai positif).

Karena wadah tertutup, uap tidak bisa keluar dan menempel di bagian dalam tutup sebagai butiran air (pengembunan), lalu jatuh kembali ke dalam panci. Proses ini melepaskan energi ke lingkungan, sehingga disebut reaksi eksoterm (melepas kalor, ΔH bernilai negatif).

Kedua proses ini berlangsung terus-menerus secara bolak-balik. Pada suatu titik, laju penguapan = laju pengembunan — jumlah air dan uap di dalam wadah tidak berubah lagi meskipun kedua proses tetap berlangsung. Keadaan inilah yang disebut **kesetimbangan dinamis**.

Reaksi: H₂O(l) ⇌ H₂O(g)

**Tabel Data Pengamatan:**
| No. | Waktu (menit) | Volume air (mL) | Kondisi Uap Air | Kondisi Dinding Wadah |
|-----|---------------|-----------------|-----------------|----------------------|
| 1 | 0 | 100 | Tidak terlihat | Kering |
| 2 | 5 | 95 | Mulai terbentuk | Ada titik-titik air |
| 3 | 10 | 90 | Banyak uap | Banyak embun |
| 4 | 15 | 90 | Tetap banyak | Tetesan air terbentuk |
| 5 | 20 | 90 | Tetap | Banyak tetesan air |`,
  },
  // Stage 3: Tetap Tinggi
  {
    level: 'tetap_tinggi', stage: 3, title: 'Penentuan Konstanta Kesetimbangan',
    content: `**Investigasi Eksperimen Penentuan Konstanta Kesetimbangan (Kc)**

Reaksi redoks antara ion perak Ag⁺ dan ion besi(II) Fe²⁺:
Ag⁺(aq) + Fe²⁺(aq) ⇌ Ag(s) + Fe³⁺(aq)

Titrasi balik dengan KSCN:
Ag⁺(aq) + SCN⁻(aq) → AgSCN(s)

Indikator: Fe³⁺(aq) + SCN⁻(aq) → FeSCN²⁺(aq) (warna merah = titik akhir)

**Tabel Data Titrasi:**
| | Titrasi kasar | Titrasi 1 | Titrasi 2 | Titrasi 3 |
|---|---|---|---|---|
| Volume awal buret (mL) | 22,50 | 21,50 | 31,65 | 32,20 |
| Volume akhir buret (mL) | 0,00 | 0,00 | 9,75 | 10,40 |
| Volume titrasi (mL) | 22,50 | 21,50 | 21,90 | 21,80 |

**Tabel Data Suhu vs Kc:**
| Suhu (K) | Volume KSCN konkordan (mL) | Kc | Warna Larutan |
|---|---|---|---|
| 298 | 21,80 | 3,40 | Orange Pekat |
| 308 | 20,40 | 3,20 | Kuning-Orange |
| 318 | 19,00 | 3,00 | Kuning Pucat |
| 328 | 17,60 | 2,80 | Kuning Sangat Pucat |
| 338 | 16,20 | 2,60 | Hampir Tidak Berwarna |
| 348 | 14,80 | 2,40 | Tidak Berwarna |`,
  },
  // Stage 3: Menengah Lebih Tinggi
  {
    level: 'menengah_lebih_tinggi', stage: 3, title: 'Produksi Metanol',
    content: `**Produksi Metanol (CH₃OH) dalam Skala Industri**

Metanol diproduksi melalui reaksi:
CO(g) + 2H₂(g) ⇌ CH₃OH(g) ΔH = −90,5 kJ/mol

Reaksi ini bersifat eksoterm dan berlangsung dalam reaktor bertekanan tinggi dengan bantuan katalis Cu/ZnO/Al₂O₃. Jenis katalis, volume reaktor, dan waktu reaksi dijaga tetap.

**Tabel Data:**
| Percobaan | Tekanan (atm) | Suhu (°C) | [CO] awal (mol/L) | Mol CH₃OH terbentuk |
|-----------|---------------|-----------|-------------------|---------------------|
| A | 75 | 260 | 0,50 | 1,05 |
| B | 100 | 260 | 0,50 | 1,22 |
| C | 100 | 300 | 0,50 | 1,12 |
| D | 125 | 260 | 0,75 | 1,30 |

Insinyur A berpendapat bahwa menaikkan suhu adalah pilihan terbaik karena reaksi akan berlangsung lebih cepat sehingga produksi metanol meningkat.

Insinyur B berpendapat bahwa menurunkan suhu lebih menguntungkan karena reaksi bersifat eksoterm sehingga kesetimbangan akan bergeser ke arah pembentukan metanol.

Manajer pabrik menekankan bahwa peningkatan tekanan membutuhkan energi yang besar, sedangkan suhu yang terlalu rendah dapat memperlambat laju produksi.`,
  },
  // Stage 3: Menengah Lebih Rendah
  {
    level: 'menengah_lebih_rendah', stage: 3, title: 'Proses Haber-Bosch',
    content: `**Proses Haber-Bosch untuk Produksi Amonia**

Amonia (NH₃) diproduksi secara industri melalui proses Haber-Bosch:
N₂(g) + 3H₂(g) ⇌ 2NH₃(g) ΔH = −92 kJ/mol

Reaksi ini bersifat eksoterm dan mengalami penurunan jumlah mol gas dari 4 mol reaktan menjadi 2 mol produk. Katalis besi oksida yang mengandung Al₂O₃, MgO, CaO, dan K₂O digunakan untuk memaksimalkan produksi.

Dalam skala industri, kondisi operasi dipilih sebagai kompromi antara laju reaksi (meningkat pada suhu tinggi) dan posisi kesetimbangan (menguntungkan pada suhu rendah dan tekanan tinggi). Tekanan optimal 150–250 atm.`,
  },
  // Stage 3: Tetap Rendah
  {
    level: 'tetap_rendah', stage: 3, title: 'Keracunan CO dan Hemoglobin',
    content: `**Keracunan Karbon Monoksida dan Hemoglobin**

Karbon monoksida (CO) merupakan gas beracun yang dihasilkan dari pembakaran tidak sempurna bahan bakar kendaraan bermotor. Gas ini dapat masuk ke dalam tubuh melalui sistem pernapasan dan berikatan dengan hemoglobin (Hb) dalam darah.

Reaksi kesetimbangan yang terjadi adalah:
HbO₂(aq) + CO(g) ⇌ HbCO(aq) + O₂(g)

Jika konsentrasi gas CO di udara meningkat, maka kesetimbangan akan bergeser sehingga lebih banyak Hb yang berikatan dengan CO dibandingkan dengan O₂. Akibatnya, kadar oksigen dalam darah menurun dan dapat menyebabkan gangguan pernapasan.

Seorang peserta didik melakukan percobaan sederhana untuk mengetahui pengaruh peningkatan konsentrasi CO terhadap kesetimbangan tersebut. Pada percobaan, konsentrasi CO dinaikkan sementara suhu dijaga tetap. Hasil pengamatan menunjukkan bahwa jumlah HbCO meningkat dan kadar O₂ menurun.`,
  },
];

// ═══════════════════════════════════════════════════════════════════
// QUESTIONS DATA (7 per level × 7 levels = 49 questions)
// ═══════════════════════════════════════════════════════════════════

const questionsByLevel: Record<KPSDifficultyLevel, QuestionData[]> = {
  // ── MENENGAH (Stage 1) ──
  menengah: [
    {
      indicator: 'merumuskan_masalah', order: 1, questionType: 'multiple_choice',
      stem: 'Rumusan masalah yang paling tepat untuk menyelidiki fenomena yang diamati dalam demonstrasi Bu Sinta adalah…',
      options: {
        A: 'Bagaimana pengaruh perubahan suhu terhadap laju reaksi penguraian N₂O₄ menjadi NO₂ dalam tabung tertutup?',
        B: 'Mengapa warna campuran gas dalam tabung tertutup berubah menjadi lebih tua saat dipanaskan dan lebih muda saat didinginkan?',
        C: 'Bagaimana pengaruh perubahan suhu terhadap pergeseran posisi kesetimbangan reaksi N₂O₄ ⇌ 2NO₂ yang ditunjukkan oleh perubahan konsentrasi dan warna campuran gas?',
        D: 'Bagaimana hubungan antara intensitas warna cokelat campuran gas NO₂ dengan konsentrasi N₂O₄?',
        E: 'Apakah perubahan warna membuktikan bahwa reaksi penguraian N₂O₄ bersifat reversibel secara termodinamika?',
      },
      correctAnswer: 'C',
      explanation: 'Rumusan masalah yang tepat harus mencakup variabel bebas (suhu), variabel terikat (pergeseran kesetimbangan), dan dapat diuji secara ilmiah.',
    },
    {
      indicator: 'membuat_hipotesis', order: 2, questionType: 'complex_true_false',
      stem: 'Tentukan apakah setiap hipotesis berikut BENAR (logis, dapat diuji, dan sesuai konsep) atau SALAH!',
      statements: [
        { id: 's1', text: 'Jika suhu campuran gas N₂O₄ ⇌ 2NO₂ dinaikkan, maka konsentrasi NO₂ akan meningkat karena reaksi bersifat endoterm sehingga sistem menyerap energi panas untuk menggeser kesetimbangan ke arah produk.', correctAnswer: true },
        { id: 's2', text: 'Jika tabung dikembalikan ke suhu semula setelah dipanaskan, maka warna campuran akan tetap lebih tua dari kondisi awal karena sebagian N₂O₄ sudah terurai secara permanen menjadi NO₂.', correctAnswer: false },
        { id: 's3', text: 'Jika suhu campuran gas diturunkan, maka konsentrasi N₂O₄ akan meningkat karena reaksi eksoterm ke arah kiri akan lebih dominan dalam kondisi suhu rendah.', correctAnswer: true },
        { id: 's4', text: 'Jika volume tabung diperbesar pada suhu tetap, maka warna campuran gas akan menjadi lebih tua karena tekanan yang menurun menggeser kesetimbangan ke arah NO₂.', correctAnswer: false },
      ],
      requireAll: true, explanation: 'Hipotesis harus logis, dapat diuji, dan sesuai dengan konsep kesetimbangan kimia serta Azas Le Chatelier.',
    },
    {
      indicator: 'mengontrol_variabel', order: 3, questionType: 'matching',
      stem: 'Jodohkan setiap pernyataan di kolom kiri dengan pilihan yang paling tepat di kolom kanan berdasarkan rancangan demonstrasi Bu Sinta!',
      premises: [
        { id: 'p1', text: 'Variabel bebas dalam demonstrasi Bu Sinta adalah…' },
        { id: 'p2', text: 'Variabel terikat dalam demonstrasi Bu Sinta adalah…' },
        { id: 'p3', text: 'Variabel kontrol dalam demonstrasi Bu Sinta adalah…' },
      ],
      matchingOptions: [
        { id: 'o1', text: 'Perubahan warna campuran gas yang diamati selama demonstrasi' },
        { id: 'o2', text: 'Suhu yang dimanipulasi dengan menempatkan tabung ke dalam air es dan air panas' },
        { id: 'o3', text: 'Volume tabung reaksi yang dijaga tetap sama selama demonstrasi' },
      ],
      correctMatches: { p1: 'o2', p2: 'o1', p3: 'o3' },
      explanation: 'Variabel bebas adalah yang dimanipulasi, variabel terikat adalah yang diamati, dan variabel kontrol adalah yang dijaga tetap.',
    },
    {
      indicator: 'merancang_investigasi', order: 4, questionType: 'complex_multiple_choice',
      stem: 'Dito ingin merancang percobaan lanjutan untuk menyelidiki pengaruh suhu terhadap kesetimbangan N₂O₄ ⇌ 2NO₂ secara kuantitatif. Pilih DUA pernyataan yang merupakan langkah perancangan investigasi yang paling tepat dan ilmiah!',
      options: {
        A: 'Dito sebaiknya menggunakan beberapa nilai suhu yang bervariasi secara sistematis dan mengukur konsentrasi NO₂ pada setiap suhu setelah sistem mencapai kesetimbangan, sambil menjaga volume dan komposisi awal gas tetap sama.',
        B: 'Dito sebaiknya menggunakan dua tabung dengan volume berbeda pada suhu yang sama untuk membuktikan bahwa warna berubah akibat suhu, bukan akibat perbedaan volume.',
        C: 'Dito sebaiknya melakukan percobaan hanya pada suhu 5°C dan 70°C saja karena kedua suhu ekstrem sudah cukup membuktikan pengaruh suhu.',
        D: 'Untuk memastikan data yang diperoleh valid, Dito sebaiknya mengulangi setiap percobaan pada masing-masing suhu minimal tiga kali dan menghitung rata-rata konsentrasi yang terukur.',
        E: 'Dito sebaiknya mengganti tabung tertutup dengan tabung terbuka agar gas dapat keluar masuk dengan bebas sehingga perubahan konsentrasi lebih mudah diamati.',
      },
      correctAnswers: ['A', 'D'],
      partialCredit: true,
      explanation: 'Rancangan investigasi yang baik harus menggunakan variasi suhu sistematis, kontrol variabel, dan replikasi untuk validitas data.',
    },
    {
      indicator: 'mengumpulkan_mencatat_data', order: 5, questionType: 'complex_true_false',
      stem: 'Tentukan apakah setiap pernyataan berikut BENAR atau SALAH berdasarkan data pada tabel stimulus!',
      statements: [
        { id: 's1', text: 'Ketika tabung dikembalikan ke suhu 25°C setelah dipanaskan, konsentrasi NO₂ berubah menjadi 0,0341 M, lebih tinggi dari kondisi awal 0,0450 M.', correctAnswer: true },
        { id: 's2', text: 'Pada suhu 5°C, konsentrasi N₂O₄ mengalami penurunan dibandingkan kondisi awal pada suhu 25°C.', correctAnswer: false },
        { id: 's3', text: 'Data menunjukkan bahwa perubahan warna yang terjadi pada kedua tabung bersifat reversibel karena konsentrasi kedua gas kembali mendekati nilai awal setelah suhu dikembalikan ke 25°C.', correctAnswer: true },
        { id: 's4', text: 'Selisih konsentrasi NO₂ antara kondisi tabung air panas (70°C) dan tabung air es (5°C) adalah sebesar 0,1030 M.', correctAnswer: true },
      ],
      requireAll: true,
      explanation: 'Data menunjukkan sifat reversibel kesetimbangan dan perubahan konsentrasi sesuai Azas Le Chatelier.',
    },
    {
      indicator: 'menganalisis_menginterpretasi_data', order: 6, questionType: 'multiple_choice',
      stem: 'Interpretasi yang paling tepat untuk menjelaskan mengapa tabung yang dipanaskan justru berwarna lebih tua adalah…',
      options: {
        A: 'Pemanasan mempercepat laju reaksi ke kanan sehingga lebih banyak tumbukan antar molekul yang menghasilkan NO₂ berwarna cokelat.',
        B: 'Reaksi penguraian N₂O₄ menjadi NO₂ bersifat endoterm, sehingga penambahan energi panas menggeser kesetimbangan ke arah produk NO₂ yang berwarna cokelat kemerahan.',
        C: 'NO₂ memiliki massa molar lebih kecil dari N₂O₄ sehingga lebih mudah menguap pada suhu tinggi dan konsentrasinya meningkat.',
        D: 'Pemanasan menyebabkan N₂O₄ terdekomposisi secara irreversibel menjadi NO₂ sehingga warna menjadi lebih tua.',
        E: 'Warna cokelat tua pada tabung air panas disebabkan oleh reaksi NO₂ dengan uap air yang masuk ke dalam tabung selama pemanasan.',
      },
      correctAnswer: 'B',
      explanation: 'Reaksi N₂O₄ ⇌ 2NO₂ bersifat endoterm. Pemanasan menggeser kesetimbangan ke arah produk (NO₂) sesuai Azas Le Chatelier.',
    },
    {
      indicator: 'membuat_kesimpulan', order: 7, questionType: 'complex_multiple_choice',
      stem: 'Berdasarkan keseluruhan data dan fenomena dalam stimulus, pilih DUA pernyataan yang paling tepat sebagai kesimpulan yang valid dan didukung bukti!',
      options: {
        A: 'Reaksi N₂O₄ ⇌ 2NO₂ bersifat endoterm dan reversibel, terbukti dari pergeseran warna yang berlawanan arah saat dipanaskan dan didinginkan, serta kemampuan sistem kembali ke kondisi awal saat suhu dikembalikan.',
        B: 'Suhu merupakan satu-satunya faktor yang mempengaruhi posisi kesetimbangan reaksi N₂O₄ ⇌ 2NO₂ berdasarkan data percobaan ini.',
        C: 'Analogi Dito tentang teh yang menggelap saat didiamkan tidak tepat karena perubahan warna pada teh adalah perubahan fisika, sedangkan pada tabung reaksi adalah perubahan kimia akibat pergeseran kesetimbangan.',
        D: 'Nilai tetapan kesetimbangan (Kc) reaksi ini akan tetap sama pada suhu 5°C, 25°C, dan 70°C karena sistem selalu kembali ke kondisi kesetimbangan yang sama.',
        E: 'Fakta bahwa kedua tabung kembali ke warna cokelat muda yang sama setelah dikembalikan ke suhu 25°C membuktikan bahwa reaksi ini benar-benar bersifat reversibel dan kesetimbangan dinamis masih berlangsung.',
      },
      correctAnswers: ['A', 'E'],
      partialCredit: true,
      explanation: 'Kesimpulan harus didukung bukti empiris dari data dan sesuai dengan konsep kesetimbangan dinamis.',
    },
  ],

  // ── TINGGI (Stage 2 - High Path) ──
  tinggi: [
    {
      indicator: 'merumuskan_masalah', order: 1, questionType: 'complex_true_false',
      stem: 'Perhatikan beberapa rumusan masalah berikut. Beri tanda "B" jika rumusan masalah tepat, dan beri tanda "S" jika bukan rumusan masalah yang tepat.',
      statements: [
        { id: 's1', text: 'Bagaimana pengaruh perubahan suhu dan tekanan terhadap jumlah SO₃ yang terbentuk pada reaksi 2SO₂(g) + O₂(g) ⇌ 2SO₃(g)?', correctAnswer: true },
        { id: 's2', text: 'Mengapa katalis V₂O₅ merupakan satu-satunya faktor yang menentukan terbentuknya SO₃?', correctAnswer: false },
        { id: 's3', text: 'Bagaimana kondisi suhu dan tekanan memengaruhi hasil pembentukan SO₃ jika jumlah pereaksi awal, volume reaktor, dan katalis dibuat tetap?', correctAnswer: true },
        { id: 's4', text: 'Pengaruh suhu dan tekanan terhadap jumlah SO₃ yang terbentuk pada reaksi kesetimbangan dapat diselidiki melalui data percobaan.', correctAnswer: false },
        { id: 's5', text: 'Apakah katalis merupakan satu-satunya faktor yang menentukan terbentuknya SO₃?', correctAnswer: false },
      ],
      requireAll: true,
      explanation: 'Rumusan masalah yang tepat harus spesifik, dapat diuji, dan mencakup variabel yang jelas.',
    },
    {
      indicator: 'membuat_hipotesis', order: 2, questionType: 'complex_multiple_choice',
      stem: 'Hipotesis yang tepat berdasarkan reaksi kesetimbangan adalah..',
      options: {
        A: 'Jika suhu dinaikkan, maka jumlah SO₃ yang terbentuk akan bertambah karena laju reaksi semakin cepat.',
        B: 'Jika tekanan dinaikkan, maka jumlah SO₃ yang terbentuk cenderung bertambah karena sistem akan bergeser ke jumlah mol gas yang lebih sedikit.',
        C: 'Jika suhu diturunkan, maka jumlah SO₃ yang terbentuk cenderung bertambah karena reaksi pembentukan SO₃ bersifat eksoterm.',
        D: 'Jika katalis V₂O₅ digunakan, maka kesetimbangan pasti bergeser ke kanan sehingga SO₃ yang terbentuk selalu maksimum.',
        E: 'Jika suhu dan tekanan diubah, maka jumlah SO₃ yang terbentuk dapat diubah walaupun jumlah pereaksi awal, volume reaktor, dan katalis tetap.',
      },
      correctAnswers: ['B', 'C', 'E'],
      partialCredit: true,
      explanation: 'Hipotesis harus sesuai dengan Azas Le Chatelier dan sifat reaksi (eksoterm, penurunan mol gas).',
    },
    {
      indicator: 'mengontrol_variabel', order: 3, questionType: 'matching',
      stem: 'Jodohkan setiap komponen pada kolom A dengan jenis variabel yang paling tepat pada kolom B!',
      premises: [
        { id: 'p1', text: 'Suhu reaksi' },
        { id: 'p2', text: 'Volume reaktor' },
        { id: 'p3', text: 'Tekanan reaksi' },
        { id: 'p4', text: 'Jumlah awal SO₂ dan O₂' },
        { id: 'p5', text: 'Jumlah SO₃ yang terbentuk' },
      ],
      matchingOptions: [
        { id: 'o1', text: 'Variabel terikat' },
        { id: 'o2', text: 'Variabel kontrol' },
        { id: 'o3', text: 'Variabel bebas' },
      ],
      correctMatches: { p1: 'o3', p2: 'o2', p3: 'o3', p4: 'o2', p5: 'o1' },
      explanation: 'Variabel bebas adalah yang dimanipulasi (suhu, tekanan), variabel kontrol yang dijaga tetap, variabel terikat yang diukur.',
    },
    {
      indicator: 'merancang_investigasi', order: 4, questionType: 'complex_multiple_choice',
      stem: 'Pilihlah semua pernyataan yang menunjukkan rancangan investigasi yang tepat.',
      options: {
        A: 'Mengubah suhu, tekanan, volume reaktor, dan jumlah pereaksi sekaligus agar data lebih banyak dalam satu kali percobaan.',
        B: 'Menggunakan jumlah awal SO₂ dan O₂ yang sama pada setiap percobaan agar hasil yang dibandingkan berasal dari perubahan suhu dan tekanan.',
        C: 'Menggunakan katalis yang berbeda pada setiap percobaan supaya pengaruh suhu terhadap jumlah SO₃ tampak lebih jelas.',
        D: 'Mengukur jumlah SO₃ yang terbentuk setelah campuran reaksi diberi perlakuan suhu dan tekanan tertentu selama waktu yang sama.',
        E: 'Melakukan percobaan pada beberapa variasi suhu dan tekanan, sedangkan katalis, volume reaktor, jumlah pereaksi, dan waktu pengamatan dibuat tetap.',
      },
      correctAnswers: ['B', 'D', 'E'],
      partialCredit: true,
      explanation: 'Rancangan yang baik harus mengontrol variabel dan hanya memvariasikan satu atau dua faktor yang diteliti.',
    },
    {
      indicator: 'mengumpulkan_mencatat_data', order: 5, questionType: 'matching',
      stem: 'Jodohkan setiap bentuk pengumpulan dan pencatatan data pada kolom A dengan penilaian yang paling tepat pada kolom B!',
      premises: [
        { id: 'p1', text: 'Data memuat suhu dan jumlah SO₃ tetapi tidak disertai satuan besaran' },
        { id: 'p2', text: 'Data SO₃ dicatat untuk seluruh percobaan, tetapi tekanan pada beberapa kondisi tidak dicantumkan' },
        { id: 'p3', text: 'Data kuantitatif dicatat dalam tabel, kualitatif pada bagian keterangan terpisah' },
        { id: 'p4', text: 'Salah satu hasil ulangan yang berbeda cukup jauh tidak dicatat dalam tabel akhir' },
        { id: 'p5', text: 'Tabel memuat suhu, tekanan, jumlah SO₃ serta hasil ulangan pada setiap kondisi' },
      ],
      matchingOptions: [
        { id: 'o1', text: 'Pencatatan data tidak objektif' },
        { id: 'o2', text: 'Pencatatan data belum memadai' },
        { id: 'o3', text: 'Pencatatan data baik (kuantitatif/kualitatif terpisah)' },
        { id: 'o4', text: 'Pencatatan data baik (memungkinkan pemeriksaan konsistensi)' },
        { id: 'o5', text: 'Pencatatan data kurang layak (tidak dapat ditafsirkan)' },
      ],
      correctMatches: { p1: 'o5', p2: 'o2', p3: 'o3', p4: 'o1', p5: 'o4' },
      explanation: 'Pencatatan data yang baik harus lengkap, objektif, dan memungkinkan analisis lebih lanjut.',
    },
    {
      indicator: 'menganalisis_menginterpretasi_data', order: 6, questionType: 'complex_multiple_choice',
      stem: 'Pada setiap percobaan digunakan campuran awal 4 mol SO₂ dan 2 mol O₂. Jumlah maksimum SO₃ = 4 mol. Pilihlah semua pernyataan yang benar!',
      options: {
        A: 'Persentase hasil SO₃ pada percobaan 3 adalah 85% (3,4/4 × 100 = 85%).',
        B: 'Pada suhu 450°C dan tekanan 3 atm, sisa SO₂ yang belum bereaksi adalah 0,9 mol (4 - 3,1 = 0,9).',
        C: 'Pada tekanan 2 atm, jumlah SO₃ pada 350°C lebih besar daripada pada 550°C sebesar 1,0 mol (3,2 - 2,2 = 1,0).',
        D: 'Pada suhu yang sama, kenaikan tekanan dari 1 atm menjadi 3 atm selalu menyebabkan jumlah SO₃ bertambah.',
        E: 'Data menunjukkan bahwa suhu makin tinggi selalu menghasilkan SO₃ makin banyak.',
      },
      correctAnswers: ['A', 'B', 'C', 'D'],
      partialCredit: true,
      explanation: 'Analisis data menunjukkan bahwa suhu tinggi menurunkan yield (eksoterm) sedangkan tekanan tinggi meningkatkan yield.',
    },
    {
      indicator: 'membuat_kesimpulan', order: 7, questionType: 'multiple_choice',
      stem: 'Berdasarkan data tersebut, kesimpulan yang paling tepat adalah…',
      options: {
        A: 'Pembentukan SO₃ paling dipengaruhi oleh kenaikan suhu karena suhu tinggi selalu memperbesar hasil reaksi.',
        B: 'Pada setiap tekanan, kenaikan suhu cenderung menurunkan jumlah SO₃, sedangkan pada setiap suhu kenaikan tekanan cenderung menambah jumlah SO₃.',
        C: 'Tekanan tidak memengaruhi hasil reaksi karena pada semua percobaan jumlah SO₃ tidak berbeda jauh.',
        D: 'Kondisi terbaik untuk menghasilkan SO₃ adalah suhu tertinggi dan tekanan terendah.',
        E: 'Katalis V₂O₅ merupakan penyebab utama bertambahnya jumlah SO₃ pada setiap percobaan.',
      },
      correctAnswer: 'B',
      explanation: 'Data menunjukkan hubungan terbalik antara suhu dan yield (eksoterm) serta hubungan searah antara tekanan dan yield.',
    },
  ],

  // ── RENDAH (Stage 2 - Low Path) ──
  rendah: [
    {
      indicator: 'merumuskan_masalah', order: 1, questionType: 'multiple_choice',
      stem: 'Berdasarkan fenomena pada stimulus, rumusan masalah yang paling tepat untuk menyelidiki kesetimbangan reaksi H₂O(l) ⇌ H₂O(g) dalam wadah tertutup adalah…',
      options: {
        A: 'Mengapa air dalam wadah tertutup bisa berubah menjadi uap saat dipanaskan?',
        B: 'Bagaimana pengaruh kenaikan suhu terhadap waktu tercapainya kesetimbangan antara air dan uap dalam wadah tertutup?',
        C: 'Kapan semua air dalam wadah tertutup akan habis berubah menjadi uap jika terus dipanaskan?',
        D: 'Siapa yang pertama kali menemukan konsep kesetimbangan dinamis pada penguapan air?',
        E: 'Berapa mililiter air yang menguap dari menit ke-0 hingga menit ke-10?',
      },
      correctAnswer: 'B',
      explanation: 'Rumusan masalah yang tepat mengaitkan variabel bebas (suhu) dengan variabel terikat (waktu kesetimbangan).',
    },
    {
      indicator: 'membuat_hipotesis', order: 2, questionType: 'complex_multiple_choice',
      stem: 'Pilih semua pernyataan yang merupakan hipotesis yang tepat berkaitan dengan kesetimbangan reaksi H₂O(l) ⇌ H₂O(g) dalam wadah tertutup!',
      options: {
        A: 'Jika suhu dinaikkan setelah kesetimbangan tercapai, maka kesetimbangan akan bergeser ke kanan sehingga volume air berkurang karena reaksi penguapan bersifat endoterm.',
        B: 'Karena penguapan bersifat endoterm, maka kenaikan suhu akan menggeser kesetimbangan ke kiri sehingga lebih banyak uap berubah kembali menjadi air.',
        C: 'Jika wadah dibuka saat sudah setimbang, uap air akan keluar sehingga konsentrasi uap berkurang dan kesetimbangan bergeser ke kanan.',
        D: 'Jika suhu diturunkan setelah kesetimbangan tercapai, kesetimbangan akan bergeser ke kiri sehingga lebih banyak uap yang mengembun.',
        E: 'Pada menit ke-10, volume air dalam tabel adalah 90 mL karena 10 mL air sudah menguap sejak awal percobaan.',
      },
      correctAnswers: ['A', 'C', 'D'],
      partialCredit: true,
      explanation: 'Hipotesis yang tepat sesuai dengan Azas Le Chatelier dan sifat endoterm reaksi penguapan.',
    },
    {
      indicator: 'merancang_investigasi', order: 3, questionType: 'complex_true_false',
      stem: 'Seorang siswa ingin menyelidiki "bagaimana pengaruh suhu terhadap volume air yang tersisa saat kesetimbangan tercapai dalam wadah tertutup." Tentukan Benar atau Salah untuk setiap pernyataan!',
      statements: [
        { id: 's1', text: 'Suhu adalah variabel bebas karena sengaja divariasikan oleh siswa di setiap percobaan.', correctAnswer: true },
        { id: 's2', text: 'Volume air yang tersisa saat kesetimbangan tercapai adalah variabel terikat karena nilainya bergantung pada suhu yang diberikan.', correctAnswer: true },
        { id: 's3', text: 'Jumlah air awal harus dibuat berbeda di tiap percobaan agar hasil lebih bervariasi dan menarik.', correctAnswer: false },
        { id: 's4', text: 'Ukuran wadah dan jenis air yang digunakan termasuk variabel kontrol yang harus dijaga sama di semua percobaan.', correctAnswer: true },
      ],
      requireAll: true,
      explanation: 'Variabel kontrol harus dijaga tetap untuk memastikan validitas hasil percobaan.',
    },
    {
      indicator: 'mengumpulkan_mencatat_data', order: 4, questionType: 'complex_true_false',
      stem: 'Perhatikan tabel pengamatan pada stimulus. Tentukan apakah setiap pernyataan berikut Benar atau Salah!',
      statements: [
        { id: 's1', text: 'Berdasarkan tabel, volume air berkurang dari 100 mL menjadi 90 mL, menunjukkan bahwa pada rentang waktu tersebut laju penguapan lebih besar daripada laju pengembunan.', correctAnswer: true },
        { id: 's2', text: 'Data pada menit ke-15 dan ke-20 menunjukkan volume air tetap 90 mL, sehingga dapat disimpulkan bahwa proses penguapan sudah berhenti total.', correctAnswer: false },
        { id: 's3', text: 'Kolom "kondisi uap air" dan "kondisi dinding wadah" merupakan contoh data kualitatif karena berupa deskripsi pengamatan, bukan angka.', correctAnswer: true },
        { id: 's4', text: 'Kesetimbangan dinamis mulai tercapai pada menit ke-10, karena sejak saat itu volume air tidak berubah lagi.', correctAnswer: true },
      ],
      requireAll: true,
      explanation: 'Pada kesetimbangan dinamis, kedua proses tetap berlangsung dengan laju yang sama.',
    },
    {
      indicator: 'menganalisis_menginterpretasi_data', order: 5, questionType: 'complex_multiple_choice',
      stem: 'Pilih dua pernyataan yang tepat berdasarkan data tabel dalam kaitannya dengan reaksi kesetimbangan H₂O(l) ⇌ H₂O(g)!',
      options: {
        A: 'Pada menit ke-5 dan ke-10, volume air terus berkurang karena penguapan berlangsung lebih cepat daripada pengembunan sehingga kesetimbangan belum tercapai.',
        B: 'Pada menit ke-15 dan ke-20, volume air tetap 90 mL karena reaksi penguapan sudah berhenti total.',
        C: 'Munculnya tetesan air di dinding wadah pada menit ke-15 dan ke-20 menunjukkan bahwa reaksi pengembunan tetap berlangsung bersamaan dengan penguapan.',
        D: 'Volume air yang tetap 90 mL sejak menit ke-15 menunjukkan laju penguapan sudah sama dengan laju pengembunan sehingga sistem berada dalam kesetimbangan dinamis.',
        E: 'Dinding wadah yang kering pada menit ke-0 menunjukkan bahwa kesetimbangan dinamis sudah tercapai sejak awal percobaan.',
      },
      correctAnswers: ['C', 'D'],
      partialCredit: true,
      explanation: 'Kesetimbangan dinamis ditandai oleh laju penguapan = laju pengembunan, bukan berhentinya reaksi.',
    },
    {
      indicator: 'membuat_kesimpulan', order: 6, questionType: 'complex_true_false',
      stem: 'Berdasarkan seluruh data tabel pengamatan, tentukan apakah setiap kesimpulan berikut BENAR atau SALAH!',
      statements: [
        { id: 's1', text: 'Kesetimbangan dinamis pada percobaan ini baru tercapai pada menit ke-15, ditandai dengan volume air yang tidak lagi berubah.', correctAnswer: true },
        { id: 's2', text: 'Saat kesetimbangan tercapai, proses penguapan sudah selesai sehingga yang tersisa hanya proses pengembunan.', correctAnswer: false },
        { id: 's3', text: 'Percobaan ini harus dilakukan dalam wadah tertutup rapat karena jika wadah dibuka, uap air akan keluar dan kesetimbangan tidak akan tercapai.', correctAnswer: true },
        { id: 's4', text: 'Volume air berkurang dari 100 mL menjadi 90 mL karena air habis bereaksi secara permanen dan tidak bisa kembali menjadi air cair.', correctAnswer: false },
      ],
      requireAll: true,
      explanation: 'Kesetimbangan dinamis bersifat reversibel — kedua proses tetap berlangsung.',
    },
    {
      indicator: 'mengontrol_variabel', order: 7, questionType: 'complex_multiple_choice',
      stem: 'Dalam melakukan percobaan untuk mengetahui pengaruh tekanan terhadap hasil amonia pada proses Haber, pernyataan yang benar adalah:',
      options: {
        A: 'Suhu harus dibuat tetap.',
        B: 'Tekanan dibuat bervariasi.',
        C: 'Jenis katalis harus diubah-ubah.',
        D: 'Konsentrasi awal reaktan dijaga tetap.',
        E: 'Tekanan dan suhu harus dibuat tetap secara bersamaan.',
      },
      correctAnswers: ['A', 'B', 'D'],
      partialCredit: true,
      explanation: 'Untuk menguji pengaruh tekanan, suhu dan konsentrasi harus dikontrol (tetap), sementara tekanan divariasikan.',
    },
  ],

  // ── TETAP TINGGI (Stage 3 - High/High Path) ──
  tetap_tinggi: [
    {
      indicator: 'merumuskan_masalah', order: 1, questionType: 'multiple_choice',
      stem: 'Manakah rumusan masalah yang paling tepat untuk menggambarkan keseluruhan investigasi penentuan Kc reaksi Ag⁺ + Fe²⁺?',
      options: {
        A: 'Bagaimana pengaruh ion tiosianat, SCN⁻ terhadap proses kesetimbangan dan nilai Kc?',
        B: 'Bagaimana pengaruh suhu terhadap nilai konstanta kesetimbangan (Kc) reaksi Ag⁺(aq) + Fe²⁺(aq) ⇌ Ag(s) + Fe³⁺(aq)?',
        C: 'Bagaimana cara menentukan konsentrasi ion Ag⁺ dalam larutan kesetimbangan menggunakan metode titrasi balik dengan KSCN?',
        D: 'Bagaimana pengaruh Kc terhadap perubahan entalpi, ΔH pada kesetimbangan?',
        E: 'Seberapa besar pengaruh konsentrasi awal AgNO₃ dan FeSO₄ terhadap posisi kesetimbangan reaksi redoks ini?',
      },
      correctAnswer: 'B',
      explanation: 'Rumusan masalah harus mencerminkan variabel utama yang diselidiki (suhu) dan reaksi yang diteliti.',
    },
    {
      indicator: 'membuat_hipotesis', order: 2, questionType: 'complex_multiple_choice',
      stem: 'Berdasarkan selurut data dan pengamatan, manakah pernyataan yang merupakan hipotesis yang valid secara ilmiah dan dapat diuji? Pilihlah 2 Hipotesis!',
      options: {
        A: 'Apabila reaksi bersifat eksoterm, maka kenaikan suhu akan menggeser kesetimbangan ke kiri sehingga konsentrasi Fe³⁺ berkurang, menjelaskan memudarnya warna larutan dan menurunnya nilai Kc.',
        B: 'Karena nilai Kc menurun seiring naiknya suhu, dapat dihipotesiskan bahwa reaksi bersifat eksoterm dan dapat diverifikasi dengan memplot ln Kc terhadap 1/T.',
        C: 'Memudarnya warna larutan menunjukkan laju reaksi ke produk semakin cepat, sehingga Fe³⁺ terurai kembali lebih cepat.',
        D: 'Karena Kc tidak bergantung pada konsentrasi awal, perubahan warna semata-mata disebabkan oleh perubahan sifat optis pelarut air pada suhu berbeda.',
        E: 'Nilai Kc yang lebih kecil pada suhu tinggi menunjukkan sistem memerlukan lebih sedikit KSCN karena konsentrasi Ag⁺ sisa semakin kecil.',
      },
      correctAnswers: ['A', 'B'],
      partialCredit: true,
      explanation: 'Hipotesis harus dapat diuji secara ilmiah dan sesuai dengan data Kc vs suhu.',
    },
    {
      indicator: 'mengontrol_variabel', order: 3, questionType: 'multiple_choice',
      stem: 'Agar hasil yang diperoleh valid dan dapat dibandingkan secara ilmiah, variabel manakah yang harus dijaga konstan selama investigasi berlangsung?',
      options: {
        A: 'Suhu inkubasi labu A, karena suhu merupakan variabel yang sedang diteliti.',
        B: 'Nilai Kc yang dihasilkan di setiap suhu, karena Kc adalah tetapan yang tidak boleh berubah.',
        C: 'Konsentrasi awal AgNO₃ dan FeSO₄, volume sampel yang dipindahkan, serta konsentrasi larutan KSCN.',
        D: 'Volume KSCN yang digunakan pada setiap titrasi.',
        E: 'Lama waktu inkubasi labu A saja.',
      },
      correctAnswer: 'C',
      explanation: 'Variabel kontrol harus dijaga tetap agar perbedaan hasil hanya disebabkan oleh perubahan suhu.',
    },
    {
      indicator: 'merancang_investigasi', order: 4, questionType: 'complex_true_false',
      stem: 'Tentukan apakah setiap pernyataan berikut BENAR atau SALAH berdasarkan prinsip perancangan investigasi yang valid!',
      statements: [
        { id: 's1', text: 'Agar Kc lebih akurat, siswa mengganti volume sampel dari 10,0 mL menjadi 25,0 mL karena volume yang lebih besar menghasilkan volume titrasi yang lebih besar sehingga kesalahan pembacaan buret relatif lebih kecil.', correctAnswer: true },
        { id: 's2', text: 'Siswa mempersingkat waktu inkubasi dari 12 jam menjadi 2 jam dengan alasan pengadukan mempercepat tumbukan sehingga kesetimbangan dicapai lebih cepat.', correctAnswer: false },
        { id: 's3', text: 'Siswa mengganti pipet volumetrik dengan gelas ukur 10 mL dengan alasan selama volume konsisten, jenis alat ukur tidak mempengaruhi keakuratan.', correctAnswer: false },
        { id: 's4', text: 'Siswa memutuskan tidak menggunakan titrasi kasar dan langsung melakukan titrasi 1, 2, 3.', correctAnswer: false },
        { id: 's5', text: 'Siswa menambahkan lebih banyak Fe³⁺ sebagai indikator dengan alasan penambahan Fe³⁺ tidak mempengaruhi hasil.', correctAnswer: false },
      ],
      requireAll: true,
      explanation: 'Perancangan investigasi harus mempertimbangkan akurasi, presisi, dan validitas eksperimen.',
    },
    {
      indicator: 'mengumpulkan_mencatat_data', order: 5, questionType: 'complex_true_false',
      stem: 'Pernyataan manakah yang benar terkait pengumpulan dan pencatatan data titrasi tersebut?',
      statements: [
        { id: 's1', text: 'Volume titrasi yang digunakan untuk perhitungan Kc adalah rata-rata dari Titrasi 1, 2, dan 3 karena ketiganya merupakan titrasi presisi.', correctAnswer: false },
        { id: 's2', text: 'Volume titrasi yang konkordan dan valid untuk perhitungan adalah hasil Titrasi 2 dan Titrasi 3, karena selisih keduanya ≤ 0,10 mL.', correctAnswer: true },
        { id: 's3', text: 'Titrasi kasar tidak dicatat sebagai data valid karena fungsinya hanya untuk memperkirakan titik akhir.', correctAnswer: true },
        { id: 's4', text: 'Volume KSCN yang digunakan pada Titrasi 2 adalah 21,90 mL, dihitung dari 31,65 − 9,75.', correctAnswer: true },
        { id: 's5', text: 'Data titrasi 1 harus diikutsertakan dalam perhitungan rata-rata karena volumenya mendekati hasil Titrasi 2 dan 3.', correctAnswer: false },
      ],
      requireAll: true,
      explanation: 'Hanya data konkordan (selisih ≤ 0,10 mL) yang valid untuk perhitungan.',
    },
    {
      indicator: 'menganalisis_menginterpretasi_data', order: 6, questionType: 'matching',
      stem: 'Jodohkan pertanyaan di kiri dengan pernyataan di kanan berdasarkan data titrasi dan grafik!',
      premises: [
        { id: 'p1', text: 'Berapa mol Ag⁺ yang bereaksi pada kesetimbangan?' },
        { id: 'p2', text: 'Apa yang terjadi pada nilai Kc jika suhu dinaikkan?' },
        { id: 'p3', text: 'Bagaimana hubungan suhu dan volume KSCN?' },
        { id: 'p4', text: 'Apa arti gradien grafik ln K vs 1/T?' },
      ],
      matchingOptions: [
        { id: 'o1', text: 'Berkorelasi negatif — suhu naik, volume KSCN turun' },
        { id: 'o2', text: 'Menurun — menunjukkan reaksi bersifat eksoterm' },
        { id: 'o3', text: 'Dihitung dari selisih mol awal Ag⁺ dan mol Ag⁺ sisa (dari titrasi)' },
        { id: 'o4', text: 'Gradien positif = ΔH negatif (eksoterm)' },
      ],
      correctMatches: { p1: 'o3', p2: 'o2', p3: 'o1', p4: 'o4' },
      explanation: 'Analisis data titrasi dan grafik Van\'t Hoff untuk menentukan sifat termodinamika reaksi.',
    },
    {
      indicator: 'membuat_kesimpulan', order: 7, questionType: 'complex_multiple_choice',
      stem: 'Pilih DUA kesimpulan yang paling tepat berdasarkan keseluruhan data dan informasi dalam stimulus!',
      options: {
        A: 'Reaksi Ag⁺(aq) + Fe²⁺(aq) ⇌ Ag(s) + Fe³⁺(aq) bersifat eksoterm karena Kc menurun saat suhu naik dan warna larutan memudar.',
        B: 'Kc bergantung pada suhu — semakin tinggi suhu, semakin kecil Kc, yang berarti kesetimbangan bergeser ke kiri pada suhu tinggi.',
        C: 'Metode titrasi balik dengan KSCN tidak akurat untuk menentukan konsentrasi Ag⁺ sisa karena adanya interferensi dari ion Fe³⁺.',
        D: 'Nilai Kc yang diperoleh pada setiap suhu menunjukkan bahwa reaksi ini berlangsung sangat cepat sehingga tidak memerlukan waktu inkubasi yang lama.',
        E: 'Data membuktikan bahwa katalis tidak mempengaruhi nilai Kc tetapi dapat mempercepat tercapainya kesetimbangan.',
      },
      correctAnswers: ['A', 'B'],
      partialCredit: true,
      explanation: 'Kesimpulan harus didukung oleh data Kc vs suhu dan interpretasi termodinamika yang benar.',
    },
  ],

  // ── MENENGAH LEBIH TINGGI (Stage 3 - High/Low Path) ──
  menengah_lebih_tinggi: [
    {
      indicator: 'merumuskan_masalah', order: 1, questionType: 'multiple_choice',
      stem: 'Berdasarkan data percobaan serta pertimbangan efisiensi proses industri, rumusan masalah yang paling tepat adalah…',
      options: {
        A: 'Bagaimana pengaruh tekanan terhadap mol CH₃OH yang terbentuk jika suhu dan konsentrasi awal CO dikondisikan tetap?',
        B: 'Bagaimana pengaruh tekanan dan suhu terhadap mol CH₃OH dengan asumsi konsentrasi awal CO tidak memberikan pengaruh signifikan?',
        C: 'Bagaimana pengaruh tekanan, suhu, dan konsentrasi awal CO terhadap mol CH₃OH serta implikasinya terhadap efisiensi operasi reaktor?',
        D: 'Bagaimana menentukan kondisi tekanan dan suhu yang menghasilkan mol CH₃OH tertinggi sehingga dapat langsung diterapkan sebagai standar operasi?',
        E: 'Apakah kenaikan tekanan selalu menghasilkan peningkatan mol CH₃OH yang lebih besar dibandingkan kenaikan konsentrasi awal CO?',
      },
      correctAnswer: 'C',
      explanation: 'Rumusan masalah yang komprehensif mencakup semua variabel dan implikasi praktis.',
    },
    {
      indicator: 'membuat_hipotesis', order: 2, questionType: 'complex_multiple_choice',
      stem: 'Pilihlah SEMUA hipotesis yang tepat, logis, dan dapat diuji secara ilmiah!',
      options: {
        A: 'Jika tekanan dinaikkan di atas 125 atm pada suhu dan konsentrasi tetap, maka mol CH₃OH akan meningkat karena kesetimbangan bergeser ke arah produk.',
        B: 'Jika suhu dinaikkan di atas 300°C pada tekanan dan konsentrasi tetap, maka mol CH₃OH akan berkurang karena reaksi eksoterm bergeser ke reaktan.',
        C: 'Jika konsentrasi awal CO ditingkatkan pada tekanan dan suhu tetap, maka mol CH₃OH akan meningkat karena penambahan reaktan menggeser kesetimbangan ke arah produk.',
        D: 'Jika suhu diturunkan dari 260°C ke 200°C, maka laju reaksi akan meningkat sehingga mol CH₃OH yang terbentuk akan lebih besar.',
        E: 'Jika tekanan dinaikkan dari 125 atm ke 200 atm, maka mol CH₃OH pasti meningkat dua kali lipat karena hubungan tekanan dan hasil bersifat linier.',
      },
      correctAnswers: ['A', 'B', 'C'],
      partialCredit: true,
      explanation: 'Hipotesis harus logis, dapat diuji, dan sesuai dengan Azas Le Chatelier.',
    },
    {
      indicator: 'mengontrol_variabel', order: 3, questionType: 'matching',
      stem: 'Jodohkan setiap pernyataan dengan fungsi yang paling tepat berdasarkan rancangan percobaan Pak Darmawan!',
      premises: [
        { id: 'p1', text: 'Pak Darmawan menjaga jenis katalis, volume reaktor, dan waktu reaksi tetap sama di setiap percobaan. Fungsi utama perlakuan ini…' },
        { id: 'p2', text: 'Apabila volume reaktor tidak dijaga konstan antarpercobaan B dan D, maka kesimpulan mengenai pengaruh konsentrasi awal CO…' },
        { id: 'p3', text: 'Jika waktu reaksi berbeda-beda di setiap percobaan, maka data mol CH₃OH kemungkinan mencerminkan kondisi yang belum setimbang…' },
      ],
      matchingOptions: [
        { id: 'o1', text: 'Memastikan perbedaan mol CH₃OH benar-benar disebabkan oleh perubahan tekanan, suhu, atau konsentrasi CO.' },
        { id: 'o2', text: 'Tidak dapat dipercaya karena perubahan mol CH₃OH bisa disebabkan oleh perbedaan volume reaktor.' },
        { id: 'o3', text: 'Perbedaan waktu reaksi dapat menyebabkan sistem belum mencapai kesetimbangan, sehingga perbandingan tidak valid.' },
      ],
      correctMatches: { p1: 'o1', p2: 'o2', p3: 'o3' },
      explanation: 'Variabel kontrol memastikan validitas perbandingan antar percobaan.',
    },
    {
      indicator: 'merancang_investigasi', order: 4, questionType: 'complex_multiple_choice',
      stem: 'Pilihlah DUA pernyataan yang menunjukkan rancangan investigasi yang paling tepat secara ilmiah!',
      options: {
        A: 'Memvariasikan tekanan pada tiga tingkatan dengan suhu, konsentrasi awal CO, jenis katalis, dan volume reaktor dijaga konstan, kemudian mengulangi prosedur yang sama untuk memvariasikan konsentrasi awal CO.',
        B: 'Memvariasikan tekanan dan konsentrasi awal CO secara bersamaan pada setiap percobaan untuk memperoleh lebih banyak kombinasi data.',
        C: 'Menggunakan hanya dua tingkatan tekanan karena perbedaan hasilnya sudah cukup membuktikan adanya pengaruh tekanan.',
        D: 'Menambahkan katalis baru dengan aktivitas lebih tinggi pada percobaan lanjutan agar sistem mencapai kesetimbangan lebih cepat.',
        E: 'Mengulangi setiap kondisi percobaan minimal tiga kali secara independen dan menggunakan nilai rata-rata sebagai data.',
      },
      correctAnswers: ['A', 'E'],
      partialCredit: true,
      explanation: 'Rancangan yang baik harus memisahkan pengaruh setiap variabel dan menggunakan replikasi.',
    },
    {
      indicator: 'mengumpulkan_mencatat_data', order: 5, questionType: 'complex_true_false',
      stem: 'Tentukan apakah setiap pernyataan berikut BENAR atau SALAH terkait kualitas pengumpulan dan pencatatan data!',
      statements: [
        { id: 's1', text: 'Pada suhu dan konsentrasi awal CO yang sama, kenaikan tekanan dari 75 atm ke 100 atm diikuti oleh peningkatan jumlah CH₃OH yang terbentuk.', correctAnswer: true },
        { id: 's2', text: 'Pada tekanan dan konsentrasi awal CO yang sama, kenaikan suhu dari 260°C ke 300°C menyebabkan penurunan jumlah CH₃OH yang terbentuk.', correctAnswer: true },
        { id: 's3', text: 'Data menunjukkan bahwa setiap kenaikan tekanan selalu menghasilkan peningkatan jumlah CH₃OH yang sama besar pada semua kondisi percobaan.', correctAnswer: false },
        { id: 's4', text: 'Perbandingan percobaan B dan D dapat digunakan secara langsung untuk menyimpulkan pengaruh konsentrasi awal CO tanpa mempertimbangkan variabel lain.', correctAnswer: false },
        { id: 's5', text: 'Data hanya mencatat mol CH₃OH yang terbentuk tanpa mencantumkan jumlah reaktan yang tersisa, sehingga data tersebut belum cukup lengkap untuk perhitungan Kc.', correctAnswer: true },
      ],
      requireAll: true,
      explanation: 'Data harus lengkap dan objektif untuk analisis yang valid.',
    },
    {
      indicator: 'menganalisis_menginterpretasi_data', order: 6, questionType: 'complex_multiple_choice',
      stem: 'Berdasarkan data percobaan serta konsep kesetimbangan kimia, pilihlah SEMUA pernyataan yang benar!',
      options: {
        A: 'Perbandingan percobaan A, B, dan D menunjukkan bahwa setiap kenaikan tekanan 25 atm menghasilkan peningkatan mol CH₃OH yang sebanding (linier).',
        B: 'Percobaan D menghasilkan mol CH₃OH tertinggi (1,30) karena hanya konsentrasi awal CO yang lebih tinggi dari percobaan B.',
        C: 'Perbandingan percobaan A dan B menunjukkan bahwa kenaikan tekanan dari 75 ke 100 atm meningkatkan mol CH₃OH, konsisten dengan pergeseran kesetimbangan ke sisi produk.',
        D: 'Perbandingan percobaan B dan C menunjukkan bahwa kenaikan suhu dari 260°C ke 300°C menyebabkan penurunan mol CH₃OH, konsisten dengan sifat reaksi eksoterm.',
        E: 'Data percobaan B dan C secara langsung membuktikan klaim Insinyur A bahwa menaikkan suhu selalu meningkatkan hasil metanol.',
      },
      correctAnswers: ['C', 'D'],
      partialCredit: true,
      explanation: 'Analisis data harus konsisten dengan Azas Le Chatelier dan sifat reaksi.',
    },
    {
      indicator: 'membuat_kesimpulan', order: 7, questionType: 'complex_multiple_choice',
      stem: 'Berdasarkan seluruh data percobaan dan informasi dalam stimulus, pilihlah DUA pernyataan yang paling tepat sebagai kesimpulan ilmiah!',
      options: {
        A: 'Kondisi terbaik produksi metanol adalah tekanan setinggi mungkin dan suhu serendah mungkin.',
        B: 'Dalam rentang percobaan yang diuji, tekanan memberikan peningkatan hasil paling besar, namun penerapannya perlu mempertimbangkan biaya energi dan efisiensi proses.',
        C: 'Percobaan D menunjukkan hasil tertinggi, sehingga kondisi tersebut dapat langsung ditetapkan sebagai kondisi optimal untuk semua skala produksi.',
        D: 'Kondisi dengan hasil metanol tertinggi belum tentu merupakan kondisi yang paling efisien secara industri.',
        E: 'Karena pengaruh suhu lebih kecil dibandingkan tekanan, maka suhu dapat diabaikan dalam penentuan kondisi operasi reaktor.',
      },
      correctAnswers: ['B', 'D'],
      partialCredit: true,
      explanation: 'Kesimpulan harus mempertimbangkan aspek ilmiah dan praktis (efisiensi industri).',
    },
  ],

  // ── MENENGAH LEBIH RENDAH (Stage 3 - Low/High Path) ──
  menengah_lebih_rendah: [
    {
      indicator: 'merumuskan_masalah', order: 1, questionType: 'multiple_choice',
      stem: 'Berdasarkan stimulus proses Haber-Bosch, seorang insinyur kimia ingin memahami mengapa pemilihan suhu harus mempertimbangkan dua faktor yang saling bertentangan. Rumusan masalah yang paling tepat adalah…',
      options: {
        A: 'Mengapa amonia digunakan sebagai bahan baku utama pupuk nitrogen di seluruh dunia?',
        B: 'Bagaimana pengaruh perubahan suhu terhadap laju reaksi dan posisi kesetimbangan pada pembentukan NH₃?',
        C: 'Berapa biaya operasional reaktor Haber-Bosch pada tekanan 300 atm dibandingkan 150 atm?',
        D: 'Apakah katalis besi oksida dapat digantikan oleh katalis platinum untuk meningkatkan yield NH₃?',
      },
      correctAnswer: 'B',
      explanation: 'Rumusan masalah harus mencerminkan konflik antara laju reaksi dan posisi kesetimbangan.',
    },
    {
      indicator: 'membuat_hipotesis', order: 2, questionType: 'multiple_choice',
      stem: 'Berdasarkan asas Le Chatelier dan sifat reaksi N₂(g) + 3H₂(g) ⇌ 2NH₃(g) yang eksoterm, hipotesis yang paling tepat mengenai pengaruh penurunan suhu terhadap kesetimbangan adalah…',
      options: {
        A: 'Jika suhu diturunkan, kesetimbangan bergeser ke kanan sehingga yield NH₃ meningkat, karena reaksi ke kanan melepas kalor.',
        B: 'Jika suhu diturunkan, laju reaksi meningkat sehingga kesetimbangan lebih cepat tercapai dan yield NH₃ bertambah.',
        C: 'Jika suhu diturunkan, katalis besi oksida menjadi lebih aktif sehingga nilai K meningkat.',
        D: 'Jika suhu diturunkan, tekanan parsial gas reaktan meningkat sehingga kesetimbangan otomatis bergeser ke arah produk.',
      },
      correctAnswer: 'A',
      explanation: 'Penurunan suhu pada reaksi eksoterm menggeser kesetimbangan ke arah produk (kanan).',
    },
    {
      indicator: 'mengontrol_variabel', order: 3, questionType: 'complex_multiple_choice',
      stem: 'Dalam melakukan percobaan untuk mengetahui pengaruh tekanan terhadap hasil amonia, peneliti harus mengontrol variabel tertentu. Pernyataan yang benar adalah:',
      options: {
        A: 'Suhu harus dibuat tetap.',
        B: 'Tekanan dibuat bervariasi.',
        C: 'Jenis katalis harus diubah-ubah.',
        D: 'Konsentrasi awal reaktan dijaga tetap.',
        E: 'Tekanan dan suhu harus dibuat tetap secara bersamaan.',
      },
      correctAnswers: ['A', 'B', 'D'],
      partialCredit: true,
      explanation: 'Untuk menguji pengaruh tekanan, suhu dan konsentrasi harus dikontrol.',
    },
    {
      indicator: 'merancang_investigasi', order: 4, questionType: 'matching',
      stem: 'Jodohkan setiap komponen rancangan percobaan dengan tujuan yang tepat!',
      premises: [
        { id: 'p1', text: 'Menggunakan perbandingan mol N₂ : H₂ = 1 : 3 di setiap percobaan' },
        { id: 'p2', text: 'Melakukan percobaan pada tiga tekanan berbeda (100, 200, 350 atm)' },
        { id: 'p3', text: 'Mengukur yield NH₃ setelah sistem mencapai kesetimbangan' },
        { id: 'p4', text: 'Mengulangi setiap percobaan sebanyak tiga kali pengulangan' },
      ],
      matchingOptions: [
        { id: 'o1', text: 'Memastikan pengukuran dilakukan pada kondisi yang stabil' },
        { id: 'o2', text: 'Memastikan komposisi reaktan sesuai stoikiometri reaksi' },
        { id: 'o3', text: 'Meningkatkan keandalan data dan meminimalkan kesalahan acak' },
        { id: 'o4', text: 'Mendapatkan data pada beberapa nilai variabel bebas' },
      ],
      correctMatches: { p1: 'o2', p2: 'o4', p3: 'o1', p4: 'o3' },
      explanation: 'Setiap langkah rancangan percobaan memiliki tujuan ilmiah yang spesifik.',
    },
    {
      indicator: 'mengumpulkan_mencatat_data', order: 5, questionType: 'matching',
      stem: 'Berdasarkan grafik hubungan tekanan, suhu, dan hasil amonia pada proses Haber, pasangkan setiap kondisi dengan tingkat produksi amonia!',
      premises: [
        { id: 'p1', text: 'Suhu 350°C dan tekanan tinggi (~400 atm)' },
        { id: 'p2', text: 'Suhu 550°C dan tekanan rendah (~100 atm)' },
        { id: 'p3', text: 'Suhu 400°C dan tekanan tinggi (~400 atm)' },
        { id: 'p4', text: 'Suhu 500°C dan tekanan sedang (~200 atm)' },
      ],
      matchingOptions: [
        { id: 'o1', text: 'Produksi amonia paling tinggi' },
        { id: 'o2', text: 'Produksi amonia paling rendah' },
        { id: 'o3', text: 'Produksi amonia tinggi' },
        { id: 'o4', text: 'Produksi amonia sedang' },
      ],
      correctMatches: { p1: 'o1', p2: 'o2', p3: 'o3', p4: 'o4' },
      explanation: 'Suhu rendah + tekanan tinggi = yield tertinggi (reaksi eksoterm, penurunan mol gas).',
    },
    {
      indicator: 'menganalisis_menginterpretasi_data', order: 6, questionType: 'complex_multiple_choice',
      stem: 'Berikut pernyataan yang benar terkait produksi amonia adalah…',
      options: {
        A: 'Pada tekanan yang sama, penggunaan suhu yang lebih rendah cenderung menghasilkan amonia lebih banyak.',
        B: 'Peningkatan tekanan memberikan dampak berupa peningkatan hasil amonia pada berbagai variasi suhu.',
        C: 'Suhu yang lebih tinggi menyebabkan kesetimbangan bergeser ke arah pembentukan amonia sehingga hasilnya meningkat.',
        D: 'Grafik menunjukkan adanya hubungan searah antara tekanan dan hasil amonia.',
        E: 'Perubahan tekanan tidak memberikan pengaruh yang berarti terhadap hasil amonia.',
      },
      correctAnswers: ['A', 'B', 'D'],
      partialCredit: true,
      explanation: 'Data grafik menunjukkan suhu rendah + tekanan tinggi = yield tinggi.',
    },
    {
      indicator: 'membuat_kesimpulan', order: 7, questionType: 'complex_true_false',
      stem: 'Berdasarkan perlakuan atau kompromi yang diberikan pada proses Haber-Bosch, tentukan pernyataan berikut benar atau salah!',
      statements: [
        { id: 's1', text: 'Kenaikan tekanan dari 10 atm ke 400 atm secara konsisten meningkatkan yield NH₃, sesuai asas Le Chatelier karena jumlah mol gas produk lebih sedikit dari reaktan.', correctAnswer: true },
        { id: 's2', text: 'Pada tekanan yang sama, suhu yang lebih rendah menghasilkan yield NH₃ yang lebih tinggi karena reaksi bersifat eksoterm.', correctAnswer: true },
        { id: 's3', text: 'Penambahan katalis besi oksida menyebabkan nilai K meningkat sehingga yield NH₃ menjadi lebih besar.', correctAnswer: false },
        { id: 's4', text: 'Industri lebih memilih tekanan 150–250 atm karena tekanan sangat tinggi memerlukan biaya yang jauh lebih besar.', correctAnswer: true },
        { id: 's5', text: 'Suhu tinggi dipilih dalam proses Haber-Bosch semata-mata untuk meningkatkan yield NH₃.', correctAnswer: false },
      ],
      requireAll: true,
      explanation: 'Kesimpulan harus mempertimbangkan aspek ilmiah dan industri.',
    },
  ],

  // ── TETAP RENDAH (Stage 3 - Low/Low Path) ──
  tetap_rendah: [
    {
      indicator: 'merumuskan_masalah', order: 1, questionType: 'multiple_choice',
      stem: 'Rumusan masalah yang sesuai berdasarkan stimulus tentang keracunan CO adalah…',
      options: {
        A: 'Bagaimana pengaruh peningkatan konsentrasi CO terhadap kesetimbangan Hb dan O₂?',
        B: 'Apa warna gas CO?',
        C: 'Berapa massa hemoglobin?',
        D: 'Apa jenis reaksi yang terjadi antara CO dan Hb?',
        E: 'Bagaimana bentuk molekul CO?',
      },
      correctAnswer: 'A',
      explanation: 'Rumusan masalah harus mengaitkan variabel bebas (konsentrasi CO) dengan variabel terikat (kesetimbangan Hb/O₂).',
    },
    {
      indicator: 'membuat_hipotesis', order: 2, questionType: 'true_false',
      stem: 'Berdasarkan konsep kesetimbangan, tentukan kebenaran pernyataan berikut:',
      statement: 'Jika konsentrasi CO ditingkatkan, maka jumlah HbCO akan bertambah.',
      correctAnswer: true,
      explanation: 'Peningkatan konsentrasi reaktan (CO) menggeser kesetimbangan ke arah produk (HbCO) sesuai Azas Le Chatelier.',
    },
    {
      indicator: 'mengontrol_variabel', order: 3, questionType: 'multiple_choice',
      stem: 'Variabel yang harus dijaga tetap pada percobaan pengaruh CO terhadap hemoglobin adalah…',
      options: {
        A: 'Konsentrasi CO',
        B: 'Jumlah HbCO',
        C: 'Suhu',
        D: 'Kadar O₂',
        E: 'Waktu pengamatan',
      },
      correctAnswer: 'C',
      explanation: 'Suhu harus dijaga tetap (kontrol) karena yang diteliti adalah pengaruh konsentrasi CO.',
    },
    {
      indicator: 'merancang_investigasi', order: 4, questionType: 'complex_multiple_choice',
      stem: 'Langkah yang tepat untuk menyelidiki pengaruh CO terhadap hemoglobin adalah…',
      options: {
        A: 'Menentukan tujuan percobaan.',
        B: 'Mengubah konsentrasi CO.',
        C: 'Mengamati perubahan HbCO dan O₂.',
        D: 'Mengabaikan suhu.',
        E: 'Menentukan alat dan bahan.',
      },
      correctAnswers: ['A', 'B', 'C', 'E'],
      partialCredit: true,
      explanation: 'Langkah investigasi harus sistematis dan mempertimbangkan semua variabel.',
    },
    {
      indicator: 'mengumpulkan_mencatat_data', order: 5, questionType: 'complex_multiple_choice',
      stem: 'Data yang perlu dicatat dalam percobaan pengaruh CO terhadap hemoglobin adalah…',
      options: {
        A: 'Jumlah HbCO',
        B: 'Kadar O₂',
        C: 'Waktu pengamatan',
        D: 'Perubahan sistem',
        E: 'Nama zat',
      },
      correctAnswers: ['A', 'B', 'C', 'D'],
      partialCredit: true,
      explanation: 'Data yang dicatat harus relevan dengan variabel yang diteliti dan dapat diamati.',
    },
    {
      indicator: 'menganalisis_menginterpretasi_data', order: 6, questionType: 'multiple_choice',
      stem: 'Pernyataan: Kesetimbangan bergeser ke kanan. Alasan: Jumlah HbCO meningkat. Hubungan yang tepat adalah…',
      options: {
        A: 'Pernyataan benar, alasan benar, dan berhubungan.',
        B: 'Pernyataan benar, alasan benar, tetapi tidak berhubungan.',
        C: 'Pernyataan benar, alasan salah.',
        D: 'Pernyataan salah, alasan benar.',
        E: 'Pernyataan dan alasan salah.',
      },
      correctAnswer: 'A',
      explanation: 'Peningkatan HbCO adalah bukti bahwa kesetimbangan bergeser ke kanan.',
    },
    {
      indicator: 'membuat_kesimpulan', order: 7, questionType: 'complex_multiple_choice',
      stem: 'Kesimpulan yang tepat berdasarkan percobaan pengaruh CO terhadap hemoglobin adalah…',
      options: {
        A: 'Peningkatan CO memengaruhi kesetimbangan.',
        B: 'Sistem menyesuaikan perubahan konsentrasi.',
        C: 'Reaksi berhenti saat setimbang.',
        D: 'Kadar O₂ menurun.',
        E: 'Kesetimbangan bersifat dinamis.',
      },
      correctAnswers: ['A', 'B', 'D', 'E'],
      partialCredit: true,
      explanation: 'Kesimpulan harus mencakup pengaruh CO, mekanisme pergeseran, dan dampak pada kadar O₂.',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// SEED FUNCTION
// ═══════════════════════════════════════════════════════════════════

async function seed() {
  console.log('🌱 Starting KPS questions seed...\n');

  // 1. Seed stimuli
  console.log('📝 Seeding stimuli...');
  const stimulusIds: Record<string, string> = {};

  for (const stim of stimuli) {
    const docRef = db.collection('kps_stimuli').doc();
    await docRef.set({
      ...stim,
      topic: 'kesetimbangan_kimia',
      status: 'active',
      createdBy: 'system',
      createdAt: FieldValue.serverTimestamp(),
    });
    stimulusIds[stim.level] = docRef.id;
    console.log(`  ✅ Stimulus: ${stim.level} (stage ${stim.stage}) → ${docRef.id}`);
  }

  // 2. Seed questions
  console.log('\n📝 Seeding questions...');
  let totalQuestions = 0;

  for (const [level, questions] of Object.entries(questionsByLevel)) {
    const stimulusId = stimulusIds[level];
    if (!stimulusId) {
      console.log(`  ⚠️ No stimulus found for level: ${level}, skipping questions`);
      continue;
    }

    const stageInfo = LEVEL_STAGE_MAP[level as KPSDifficultyLevel];
    if (!stageInfo) {
      console.log(`  ⚠️ No stage mapping for level: ${level}, skipping`);
      continue;
    }

    for (const q of questions) {
      const docRef = db.collection('kps_questions').doc();
      const baseData = {
        stimulusId,
        indicator: q.indicator,
        stage: stageInfo.stage,
        difficultyLevel: level,
        questionType: q.questionType,
        stem: q.stem,
        explanation: q.explanation,
        order: q.order,
        status: 'active',
        createdBy: 'system',
        createdAt: FieldValue.serverTimestamp(),
        usageCount: 0,
        avgCorrectRate: 0,
      };

      // Add type-specific fields
      let typeData: Record<string, unknown> = {};
      switch (q.questionType) {
        case 'multiple_choice':
          typeData = { options: q.options, correctAnswer: q.correctAnswer };
          break;
        case 'complex_multiple_choice':
          typeData = { options: q.options, correctAnswers: q.correctAnswers, partialCredit: q.partialCredit ?? true };
          break;
        case 'true_false':
          typeData = { statement: q.statement, correctAnswer: q.correctAnswer };
          break;
        case 'complex_true_false':
          typeData = { statements: q.statements, requireAll: q.requireAll ?? true };
          break;
        case 'matching':
          typeData = { premises: q.premises, matchingOptions: q.matchingOptions, correctMatches: q.correctMatches };
          break;
      }

      await docRef.set({ ...baseData, ...typeData });
      totalQuestions++;
      console.log(`  ✅ Q${q.order} [${q.indicator}] (${q.questionType}) → ${docRef.id}`);
    }
  }

  console.log(`\n🎉 Seed complete!`);
  console.log(`   - ${stimuli.length} stimuli`);
  console.log(`   - ${totalQuestions} questions`);
  console.log(`   - ${Object.keys(questionsByLevel).length} levels`);
}

seed().catch(console.error);
