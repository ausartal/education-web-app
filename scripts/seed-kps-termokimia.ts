import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

// ═══════════════════════════════════════════════════════════════════
// KPS TERMOKIMIA — Stimulus + 7 Questions per Stage
// Converted from Soal Termokimia.docx to KPS format
// ═══════════════════════════════════════════════════════════════════

const stimuli = [
  {
    level: 'menengah', stage: 1, title: 'Reaksi Eksoterm dan Endoterm dalam Kehidupan',
    content: `Dalam kehidupan sehari-hari, banyak peristiwa yang melibatkan perubahan energi. Perhatikan beberapa peristiwa berikut:

1. Pembakaran kayu di perapian menghasilkan panas dan cahaya
2. Pelarutan NaOH dalam air menyebabkan suhu larutan naik signifikan
3. Pelarutan NH₄NO₃ dalam air menyebabkan suhu larutan turun drastis
4. Fotosintesis pada tumbuhan memerlukan energi matahari
5. Pembekuan air melepaskan energi ke lingkungan

Seorang siswa melakukan percobaan untuk mengklasifikasikan peristiwa-peristiwa tersebut sebagai reaksi eksoterm atau endoterm. Ia mengukur suhu sistem sebelum dan sesudah reaksi untuk menentukan arah perpindahan kalor.

Data percobaan:
| No | Peristiwa | Suhu Awal (°C) | Suhu Akhir (°C) | Perubahan Suhu |
|----|-----------|----------------|-----------------|----------------|
| 1 | Pembakaran Mg | 25 | 450 | +425 |
| 2 | Pelarutan CaCl₂ | 25 | 38 | +13 |
| 3 | Pelarutan NH₄NO₃ | 25 | 12 | −13 |
| 4 | Reaksi Ba(OH)₂ + NH₄Cl | 25 | 5 | −20 |
| 5 | Pembakaran C₃H₈ | 25 | 310 | +285 |

ΔH reaksi eksoterm < 0 (negatif), ΔH reaksi endoterm > 0 (positif).`,
  },
  {
    level: 'tinggi', stage: 2, title: 'Penentuan Entalpi Reaksi melalui Hukum Hess',
    content: `Seorang peneliti ingin menentukan entalpi pembentukan metana (CH₄) melalui pendekatan Hukum Hess. Data yang tersedia:

Reaksi 1: C(s) + O₂(g) → CO₂(g) ΔH₁ = −393,5 kJ/mol
Reaksi 2: H₂(g) + ½O₂(g) → H₂O(l) ΔH₂ = −285,8 kJ/mol
Reaksi 3: CH₄(g) + 2O₂(g) → CO₂(g) + 2H₂O(l) ΔH₃ = −890,4 kJ/mol

Reaksi target: C(s) + 2H₂(g) → CH₄(g) ΔH = ?

Hukum Hess menyatakan bahwa entalpi reaksi total sama dengan jumlah entalpi reaksi tahapan, terlepas dari jalur reaksi yang ditempuh.

Peneliti juga mempertimbangkan bahwa:
- Energi ikatan C−H = 413 kJ/mol
- Energi ikatan O=O = 498 kJ/mol
- Energi ikatan C=O (dalam CO₂) = 799 kJ/mol
- Energi ikatan O−H = 463 kJ/mol`,
  },
  {
    level: 'rendah', stage: 2, title: 'Konsep Sistem dan Lingkungan',
    content: `Dalam termokimia, setiap peristiwa kimia melibatkan sistem dan lingkungan. Sistem adalah bagian yang menjadi pusat pengamatan, sedangkan lingkungan adalah segala sesuatu di luar sistem yang berinteraksi dengannya.

Jenis sistem:
- Sistem terbuka: pertukaran energi DAN materi dengan lingkungan
- Sistem tertutup: pertukaran energi SAJA dengan lingkungan
- Sistem terisolasi: TIDAK ADA pertukaran energi maupun materi

Perhatikan situasi berikut:
1. Air mendidih dalam panci terbuka → sistem terbuka
2. Reaksi dalam tabung reaksi tertutup → sistem tertutup
3. Air dalam termos vakum → sistem terisolasi
4. Pembakaran lilin di udara terbuka → sistem terbuka
5. Reaksi dalam bomb kalorimeter → sistem tertutup (mendekati terisolasi)`,
  },
];

const questionsByLevel: Record<string, Array<{
  indicator: string; order: number; questionType: string;
  stem: string; explanation: string;
  options?: Record<string, string>;
  correctAnswer?: string | boolean;
  correctAnswers?: string[];
  partialCredit?: boolean;
  statement?: string;
  statements?: Array<{ id: string; text: string; correctAnswer: boolean }>;
  requireAll?: boolean;
  premises?: Array<{ id: string; text: string }>;
  matchingOptions?: Array<{ id: string; text: string }>;
  correctMatches?: Record<string, string>;
}>> = {
  // ── MENENGAH (Stage 1) — Eksoterm/Endoterm ──
  menengah: [
    {
      indicator: 'merumuskan_masalah', order: 1, questionType: 'multiple_choice',
      stem: 'Berdasarkan data percobaan tentang perubahan suhu pada berbagai reaksi, rumusan masalah yang paling tepat adalah…',
      options: {
        A: 'Mengapa suhu bisa berubah?',
        B: 'Bagaimana mengklasifikasikan reaksi sebagai eksoterm atau endoterm berdasarkan perubahan suhu sistem?',
        C: 'Berapa suhu tertinggi yang tercatat?',
        D: 'Apakah semua reaksi menghasilkan panas?',
        E: 'Siapa yang menemukan konsep entalpi?',
      },
      correctAnswer: 'B',
      explanation: 'Rumusan masalah harus mengaitkan data (perubahan suhu) dengan tujuan (klasifikasi reaksi).',
    },
    {
      indicator: 'membuat_hipotesis', order: 2, questionType: 'complex_true_false',
      stem: 'Tentukan kebenaran hipotesis berikut!',
      statements: [
        { id: 's1', text: 'Jika suhu sistem naik setelah reaksi, maka reaksi bersifat eksoterm karena kalor dilepaskan ke lingkungan.', correctAnswer: true },
        { id: 's2', text: 'Jika suhu sistem turun setelah reaksi, maka reaksi bersifat endoterm karena kalor diserap dari lingkungan.', correctAnswer: true },
        { id: 's3', text: 'Semua reaksi pembakaran bersifat endoterm karena memerlukan energi awal.', correctAnswer: false },
        { id: 's4', text: 'Reaksi yang menghasilkan suhu lebih tinggi selalu memiliki ΔH yang lebih negatif.', correctAnswer: false },
      ],
      requireAll: true,
      explanation: 'Hipotesis 1-2 benar. Hipotesis 3 salah (pembakaran eksoterm). Hipotesis 4 salah (ΔH tergantung mol zat).',
    },
    {
      indicator: 'mengontrol_variabel', order: 3, questionType: 'matching',
      stem: 'Jodohkan komponen percobaan dengan jenis variabelnya!',
      premises: [
        { id: 'p1', text: 'Perubahan suhu sistem (ΔT)' },
        { id: 'p2', text: 'Massa zat yang direaksikan' },
        { id: 'p3', text: 'Tekanan atmosfer (1 atm)' },
      ],
      matchingOptions: [
        { id: 'o1', text: 'Variabel terikat' },
        { id: 'o2', text: 'Variabel kontrol' },
        { id: 'o3', text: 'Variabel konstan' },
      ],
      correctMatches: { p1: 'o1', p2: 'o2', p3: 'o3' },
      explanation: 'ΔT adalah yang diukur, massa dikontrol, tekanan konstan.',
    },
    {
      indicator: 'merancang_investigasi', order: 4, questionType: 'complex_multiple_choice',
      stem: 'Langkah yang tepat untuk mengklasifikasikan reaksi eksoterm/endoterm adalah…',
      options: {
        A: 'Mengukur suhu sistem sebelum reaksi.',
        B: 'Melakukan reaksi dan mengukur suhu sistem setelah reaksi.',
        C: 'Menghitung perubahan suhu (ΔT = Takhir − Tawal).',
        D: 'Menentukan arah perpindahan kalor berdasarkan tanda ΔT.',
        E: 'Mengabaikan perubahan suhu yang kecil (< 1°C).',
      },
      correctAnswers: ['A', 'B', 'C', 'D'],
      partialCredit: true,
      explanation: 'Langkah yang benar: ukur suhu awal → reaksi → ukur suhu akhir → hitung ΔT → tentukan arah kalor.',
    },
    {
      indicator: 'mengumpulkan_mencatat_data', order: 5, questionType: 'complex_true_false',
      stem: 'Tentukan kebenaran pernyataan tentang pencatatan data!',
      statements: [
        { id: 's1', text: 'Suhu awal dan suhu akhir harus dicatat untuk setiap percobaan.', correctAnswer: true },
        { id: 's2', text: 'Perubahan suhu (ΔT) harus dihitung dan dicatat.', correctAnswer: true },
        { id: 's3', text: 'Data kualitatif seperti "tabung terasa panas" tidak perlu dicatat.', correctAnswer: false },
        { id: 's4', text: 'Pengamatan visual (perubahan warna, gas) juga harus dicatat.', correctAnswer: true },
      ],
      requireAll: true,
      explanation: 'Semua data (kuantitatif dan kualitatif) harus dicatat untuk analisis lengkap.',
    },
    {
      indicator: 'menganalisis_menginterpretasi_data', order: 6, questionType: 'multiple_choice',
      stem: 'Berdasarkan data percobaan, peristiwa No. 4 (reaksi Ba(OH)₂ + NH₄Cl) menunjukkan ΔT = −20°C. Interpretasi yang tepat adalah…',
      options: {
        A: 'Reaksi bersifat endoterm karena suhu turun, kalor berpindah dari lingkungan ke sistem.',
        B: 'Reaksi bersifat eksoterm karena suhu turun.',
        C: 'Suhu turun menunjukkan reaksi tidak berlangsung.',
        D: 'Kalor hilang dari sistem sehingga suhu turun.',
        E: 'Reaksi ini tidak melibatkan perubahan energi.',
      },
      correctAnswer: 'A',
      explanation: 'ΔT negatif berarti suhu sistem turun → sistem menyerap kalor dari lingkungan → endoterm.',
    },
    {
      indicator: 'membuat_kesimpulan', order: 7, questionType: 'complex_multiple_choice',
      stem: 'Kesimpulan yang valid berdasarkan data percobaan adalah…',
      options: {
        A: 'Reaksi dengan ΔT positif bersifat eksoterm (No. 1, 2, 5).',
        B: 'Reaksi dengan ΔT negatif bersifat endoterm (No. 3, 4).',
        C: 'Pada reaksi eksoterm, kalor berpindah dari sistem ke lingkungan.',
        D: 'Pada reaksi endoterm, kalor berpindah dari lingkungan ke sistem.',
        E: 'Semua reaksi kimia bersifat eksoterm.',
      },
      correctAnswers: ['A', 'B', 'C', 'D'],
      partialCredit: true,
      explanation: 'A-D didukung oleh data. E salah karena ada reaksi endoterm.',
    },
  ],

  // ── TINGGI (Stage 2) — Hukum Hess ──
  tinggi: [
    {
      indicator: 'merumuskan_masalah', order: 1, questionType: 'multiple_choice',
      stem: 'Berdasarkan data entalpi reaksi yang tersedia, rumusan masalah yang tepat untuk menentukan entalpi pembentukan CH₄ adalah…',
      options: {
        A: 'Berapa massa CH₄ yang terbentuk?',
        B: 'Bagaimana menentukan ΔH pembentukan CH₄ dari data entalpi reaksi pembakaran menggunakan Hukum Hess?',
        C: 'Apakah CH₄ bersifat eksoterm atau endoterm?',
        D: 'Berapa energi ikatan C−H dalam molekul CH₄?',
        E: 'Mengapa CH₄ digunakan sebagai bahan bakar?',
      },
      correctAnswer: 'B',
      explanation: 'Rumusan masalah harus fokus pada metode Hukum Hess untuk menentukan ΔH target.',
    },
    {
      indicator: 'membuat_hipotesis', order: 2, questionType: 'true_false',
      stem: 'Berdasarkan Hukum Hess, tentukan kebenaran hipotesis berikut:',
      statement: 'Jika ΔH pembentukan CO₂ = −393,5 kJ/mol dan ΔH pembentukan H₂O = −285,8 kJ/mol, maka ΔH pembentukan CH₄ dapat ditentukan dari selisih antara ΔH pembakaran CH₄ dan jumlah ΔH pembentukan produk.',
      correctAnswer: true,
      explanation: 'Hukum Hess: ΔHreaksi = ΣΔHproduk − ΣΔHreaktan. Dengan memanipulasi persamaan, ΔH pembentukan CH₄ dapat ditentukan.',
    },
    {
      indicator: 'mengontrol_variabel', order: 3, questionType: 'complex_multiple_choice',
      stem: 'Dalam penerapan Hukum Hess, kondisi yang harus dikontrol adalah…',
      options: {
        A: 'Suhu reaksi harus sama untuk semua data entalpi.',
        B: 'Tekanan reaksi harus konstan (biasanya 1 atm).',
        C: 'Semua reaksi harus dalam fase yang sama (aq, g, l, s).',
        D: 'Katalis yang digunakan harus sama.',
        E: 'Volume reaksi harus identik.',
      },
      correctAnswers: ['A', 'B'],
      partialCredit: true,
      explanation: 'Hukum Hess berlaku pada kondisi T dan P konstan. Fase dan volume tidak harus sama.',
    },
    {
      indicator: 'merancang_investigasi', order: 4, questionType: 'complex_multiple_choice',
      stem: 'Langkah yang tepat untuk menentukan ΔH pembentukan CH₄ menggunakan Hukum Hess adalah…',
      options: {
        A: 'Menuliskan reaksi target: C(s) + 2H₂(g) → CH₄(g).',
        B: 'Menuliskan reaksi pembakaran CH₄ dan membaliknya.',
        C: 'Menjumlahkan ΔH reaksi tahapan sesuai Hukum Hess.',
        D: 'Menggunakan energi ikatan untuk menghitung ΔH langsung.',
        E: 'Memverifikasi hasil dengan data eksperimen jika tersedia.',
      },
      correctAnswers: ['A', 'B', 'C', 'E'],
      partialCredit: true,
      explanation: 'Langkah: tulis target → manipulasi reaksi data → jumlahkan ΔH → verifikasi.',
    },
    {
      indicator: 'mengumpulkan_mencatat_data', order: 5, questionType: 'matching',
      stem: 'Jodohkan data entalpi dengan sumber reaksinya!',
      premises: [
        { id: 'p1', text: 'ΔH₁ = −393,5 kJ/mol' },
        { id: 'p2', text: 'ΔH₂ = −285,8 kJ/mol' },
        { id: 'p3', text: 'ΔH₃ = −890,4 kJ/mol' },
      ],
      matchingOptions: [
        { id: 'o1', text: 'Pembakaran C → CO₂' },
        { id: 'o2', text: 'Pembentukan H₂O dari H₂' },
        { id: 'o3', text: 'Pembakaran CH₄' },
      ],
      correctMatches: { p1: 'o1', p2: 'o2', p3: 'o3' },
      explanation: 'Setiap ΔH sesuai dengan reaksi pembakaran/pembentukan yang diberikan.',
    },
    {
      indicator: 'menganalisis_menginterpretasi_data', order: 6, questionType: 'multiple_choice',
      stem: 'Dari data Hukum Hess, ΔH pembentukan CH₄ = ΔH₁ + 2ΔH₂ − ΔH₃. Hasil perhitungan menunjukkan…',
      options: {
        A: 'ΔH = (−393,5) + 2(−285,8) − (−890,4) = −74,7 kJ/mol. Reaksi bersifat eksoterm.',
        B: 'ΔH = (−393,5) + (−285,8) + (−890,4) = −1569,7 kJ/mol.',
        C: 'ΔH = 393,5 + 285,8 + 890,4 = +1569,7 kJ/mol.',
        D: 'Tidak dapat dihitung dari data yang tersedia.',
        E: 'ΔH = 0 karena reaksi target adalah reaksi kesetimbangan.',
      },
      correctAnswer: 'A',
      explanation: 'ΔH = −393,5 + 2(−285,8) − (−890,4) = −393,5 − 571,6 + 890,4 = −74,7 kJ/mol.',
    },
    {
      indicator: 'membuat_kesimpulan', order: 7, questionType: 'complex_multiple_choice',
      stem: 'Kesimpulan yang valid dari penerapan Hukum Hess adalah…',
      options: {
        A: 'ΔH pembentukan CH₄ = −74,7 kJ/mol, menunjukkan reaksi eksoterm.',
        B: 'Hukum Hess memungkinkan penentuan ΔH reaksi tanpa melakukan eksperimen langsung.',
        C: 'Energi ikatan C−H dalam CH₄ = 413 kJ/mol, sehingga ΔH pembentukan seharusnya −4 × 413 = −1652 kJ/mol.',
        D: 'Energi ikatan memberikan estimasi ΔH yang berbeda dari Hukum Hess karena ada faktor lain (energi sublimasi, disosiasi).',
        E: 'Hukum Hess hanya berlaku untuk reaksi pembakaran.',
      },
      correctAnswers: ['A', 'B', 'D'],
      partialCredit: true,
      explanation: 'A, B, D valid. C salah karena perhitungan energi ikatan perlu mempertimbangkan sublimasi C dan disosiasi H₂. E salah karena Hess berlaku umum.',
    },
  ],

  // ── RENDAH (Stage 2) — Sistem dan Lingkungan ──
  rendah: [
    {
      indicator: 'merumuskan_masalah', order: 1, questionType: 'multiple_choice',
      stem: 'Berdasarkan konsep sistem dan lingkungan dalam termokimia, rumusan masalah yang tepat adalah…',
      options: {
        A: 'Apa perbedaan antara sistem terbuka, tertutup, dan terisolasi?',
        B: 'Bagaimana mengklasifikasikan suatu sistem berdasarkan kemampuannya bertukar energi dan materi dengan lingkungan?',
        C: 'Mengapa termos bisa menjaga air tetap panas?',
        D: 'Berapa suhu air dalam termos?',
        E: 'Siapa yang menemukan termos?',
      },
      correctAnswer: 'B',
      explanation: 'Rumusan masalah harus mengarah pada klasifikasi sistem berdasarkan pertukaran energi/materi.',
    },
    {
      indicator: 'membuat_hipotesis', order: 2, questionType: 'complex_true_false',
      stem: 'Tentukan kebenaran hipotesis tentang jenis sistem!',
      statements: [
        { id: 's1', text: 'Jika air mendidih dalam panci terbuka, sistem tersebut terbuka karena air (materi) dan panas (energi) berpindah ke lingkungan.', correctAnswer: true },
        { id: 's2', text: 'Reaksi dalam tabung reaksi tertutup adalah sistem tertutup karena hanya energi yang dapat berpindah.', correctAnswer: true },
        { id: 's3', text: 'Termos vakum adalah sistem terbuka karena dapat dibuka.', correctAnswer: false },
        { id: 's4', text: 'Sistem terisolasi tidak mungkin ada dalam kehidupan nyata, tetapi termos mendekati konsep tersebut.', correctAnswer: true },
      ],
      requireAll: true,
      explanation: 'Hipotesis 1-2 benar. Hipotesis 3 salah (termos tertutup rapat = terisolasi). Hipotesis 4 benar (ideal vs nyata).',
    },
    {
      indicator: 'mengontrol_variabel', order: 3, questionType: 'matching',
      stem: 'Jodohkan situasi dengan jenis sistem yang tepat!',
      premises: [
        { id: 'p1', text: 'Air mendidih dalam panci terbuka' },
        { id: 'p2', text: 'Reaksi dalam tabung reaksi tertutup' },
        { id: 'p3', text: 'Air dalam termos vakum' },
        { id: 'p4', text: 'Pembakaran lilin di udara terbuka' },
      ],
      matchingOptions: [
        { id: 'o1', text: 'Sistem terbuka' },
        { id: 'o2', text: 'Sistem tertutup' },
        { id: 'o3', text: 'Sistem terisolasi' },
      ],
      correctMatches: { p1: 'o1', p2: 'o2', p3: 'o3', p4: 'o1' },
      explanation: 'Panci terbuka dan lilin = terbuka. Tabung tertutup = tertutup. Termos = terisolasi.',
    },
    {
      indicator: 'merancang_investigasi', order: 4, questionType: 'complex_multiple_choice',
      stem: 'Untuk membuktikan bahwa termos vakum adalah sistem terisolasi, langkah yang tepat adalah…',
      options: {
        A: 'Mengukur suhu air panas dalam termos setiap 30 menit selama 4 jam.',
        B: 'Membandingkan laju penurunan suhu air dalam termos dengan air dalam wadah terbuka.',
        C: 'Mencatat apakah ada perubahan massa air dalam termos selama pengamatan.',
        D: 'Menggoyangkan termos untuk melihat apakah ada pertukaran udara.',
        E: 'Menyimpulkan bahwa jika suhu turun sangat lambat, maka sistem mendekati terisolasi.',
      },
      correctAnswers: ['A', 'B', 'C', 'E'],
      partialCredit: true,
      explanation: 'Langkah: ukur suhu berkala → bandingkan dengan kontrol → cek massa → evaluasi laju penurunan suhu.',
    },
    {
      indicator: 'mengumpulkan_mencatat_data', order: 5, questionType: 'complex_true_false',
      stem: 'Tentukan kebenaran pernyataan tentang pencatatan data percobaan sistem!',
      statements: [
        { id: 's1', text: 'Suhu air dalam termos harus dicatat pada interval waktu yang tetap.', correctAnswer: true },
        { id: 's2', text: 'Massa air sebelum dan sesudah percobaan harus dicatat untuk mendeteksi kehilangan materi.', correctAnswer: true },
        { id: 's3', text: 'Data suhu lingkungan tidak perlu dicatat.', correctAnswer: false },
        { id: 's4', text: 'Grafik suhu vs waktu harus dibuat untuk visualisasi laju perubahan.', correctAnswer: true },
      ],
      requireAll: true,
      explanation: 'Data lingkungan penting sebagai referensi. Grafik membantu analisis laju perubahan.',
    },
    {
      indicator: 'menganalisis_menginterpretasi_data', order: 6, questionType: 'multiple_choice',
      stem: 'Data menunjukkan suhu air dalam termos turun dari 80°C menjadi 75°C dalam 4 jam, sedangkan dalam wadah terbuka turun dari 80°C menjadi 30°C dalam waktu yang sama. Interpretasi yang tepat adalah…',
      options: {
        A: 'Termos berhasil memperlambat perpindahan kalor secara signifikan, mendekati sistem terisolasi.',
        B: 'Kedua sistem menunjukkan perilaku yang sama.',
        C: 'Wadah terbuka lebih baik dalam menjaga suhu.',
        D: 'Penurunan suhu dalam termos menunjukkan adanya kebocoran materi.',
        E: 'Suhu lingkungan tidak mempengaruhi laju pendinginan.',
      },
      correctAnswer: 'A',
      explanation: 'Penurunan suhu yang sangat kecil dalam termos (5°C vs 50°C) menunjukkan kemampuan isolasi yang baik.',
    },
    {
      indicator: 'membuat_kesimpulan', order: 7, questionType: 'complex_multiple_choice',
      stem: 'Kesimpulan yang valid dari percobaan adalah…',
      options: {
        A: 'Termos vakum mendekati konsep sistem terisolasi karena meminimalkan pertukaran energi.',
        B: 'Sistem terbuka memungkinkan pertukaran energi dan materi dengan lingkungan.',
        C: 'Sistem tertutup hanya memungkinkan pertukaran energi.',
        D: 'Tidak ada sistem yang benar-benar terisolasi dalam kehidupan nyata.',
        E: 'Semua sistem dalam kehidupan nyata adalah sistem terbuka.',
      },
      correctAnswers: ['A', 'B', 'C', 'D'],
      partialCredit: true,
      explanation: 'A-D valid. E salah karena ada sistem tertutup dan mendekati terisolasi.',
    },
  ],
};

const LEVEL_STAGE_MAP: Record<string, number> = {
  menengah: 1, tinggi: 2, rendah: 2,
};

async function seed() {
  console.log('🌱 Seeding KPS Termokimia questions...\n');

  const stimulusIds: Record<string, string> = {};

  for (const stim of stimuli) {
    const docRef = db.collection('kps_stimuli').doc();
    await docRef.set({
      ...stim,
      topic: 'termokimia',
      status: 'active',
      createdBy: 'system',
      createdAt: FieldValue.serverTimestamp(),
    });
    stimulusIds[stim.level] = docRef.id;
    console.log(`  ✅ Stimulus: ${stim.level} (stage ${stim.stage}) → ${docRef.id}`);
  }

  let total = 0;
  for (const [level, questions] of Object.entries(questionsByLevel)) {
    const stimulusId = stimulusIds[level];
    if (!stimulusId) continue;
    const stage = LEVEL_STAGE_MAP[level] || 1;

    for (const q of questions) {
      const docRef = db.collection('kps_questions').doc();
      const base = {
        stimulusId, indicator: q.indicator, stage, difficultyLevel: level,
        questionType: q.questionType, stem: q.stem, explanation: q.explanation,
        order: q.order, status: 'active', createdBy: 'system',
        createdAt: FieldValue.serverTimestamp(), usageCount: 0, avgCorrectRate: 0,
      };

      let typeData: Record<string, unknown> = {};
      if (q.questionType === 'multiple_choice') typeData = { options: q.options, correctAnswer: q.correctAnswer };
      else if (q.questionType === 'complex_multiple_choice') typeData = { options: q.options, correctAnswers: q.correctAnswers, partialCredit: q.partialCredit ?? true };
      else if (q.questionType === 'true_false') typeData = { statement: q.statement, correctAnswer: q.correctAnswer };
      else if (q.questionType === 'complex_true_false') typeData = { statements: q.statements, requireAll: q.requireAll ?? true };
      else if (q.questionType === 'matching') typeData = { premises: q.premises, matchingOptions: q.matchingOptions, correctMatches: q.correctMatches };

      await docRef.set({ ...base, ...typeData });
      total++;
      console.log(`  ✅ Q${q.order} [${q.indicator}] → ${docRef.id}`);
    }
  }

  console.log(`\n🎉 Done! ${stimuli.length} stimuli, ${total} questions.`);
}

seed().catch(console.error);
