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
// KPS STOIKIOMETRI — Stimulus + 7 Questions per Stage
// Converted from Soal Stoikiometri.docx to KPS format
// ═══════════════════════════════════════════════════════════════════

const stimuli = [
  {
    level: 'menengah', stage: 1, title: 'Analisis Campuran Logam',
    content: `Seorang teknisi laboratorium menerima sampel campuran logam besi (Fe) dan tembaga (Cu) dengan massa total 20 gram. Ia diminta menentukan komposisi campuran tersebut. Setelah melakukan literasi, ia menemukan bahwa Cu tidak bereaksi dengan HCl encer karena berada di bawah H dalam deret volta, sedangkan Fe bereaksi dengan HCl menghasilkan gas H₂.

Fe(s) + 2HCl(aq) → FeCl₂(aq) + H₂(g)

Ia melarutkan seluruh campuran dalam HCl encer berlebih dan mengumpulkan gas H₂ yang dihasilkan. Volume gas H₂ yang terukur pada STP adalah 5,6 liter. (Ar Fe = 56, Cu = 64, massa molar gas pada STP = 22,4 L/mol)`,
  },
  {
    level: 'tinggi', stage: 2, title: 'Penentuan Rumus Hidrat',
    content: `Seorang peneliti menerima sampel kristal natrium sulfat hidrat (Na₂SO₄·xH₂O) sebanyak 5,5 gram. Ia perlu menentukan jumlah molekul air kristal (x) dalam senyawa tersebut untuk keperluan standarisasi bahan kimia di laboratorium.

Prosedur yang dilakukan:
1. Sampel dipanaskan dalam crucible hingga berat tetap (dehidrasi sempurna)
2. Massa residu (Na₂SO₄ anhidrat) diukur setelah pendinginan
3. Data diperoleh: massa residu = 2,4255 gram

(Mr Na₂SO₄ = 142, Mr H₂O = 18)`,
  },
  {
    level: 'rendah', stage: 2, title: 'Stoikiometri Sederhana',
    content: `Dalam praktikum kimia dasar, siswa diminta menghitung massa atom relatif (Ar) dari suatu logam. Prosedur percobaan:

Logam L yang bervalensi 2 sebanyak 12 gram direaksikan dengan asam klorida encer berlebih. Gas hidrogen yang terbentuk dikumpulkan dan volumenya diukur pada keadaan standar (STP). Hasil pengukuran menunjukkan volume gas H₂ = 11,2 liter.

Reaksi: L + 2HCl → LCl₂ + H₂

Pada STP, 1 mol gas menempati volume 22,4 liter.`,
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
  // ── MENENGAH (Stage 1) — Campuran Logam ──
  menengah: [
    {
      indicator: 'merumuskan_masalah', order: 1, questionType: 'multiple_choice',
      stem: 'Berdasarkan data percobaan tentang campuran Fe dan Cu, rumusan masalah yang paling tepat untuk mengarahkan penyelidikan adalah…',
      options: {
        A: 'Berapa massa atom relatif besi dan tembaga?',
        B: 'Bagaimana menentukan komposisi massa Fe dan Cu dalam campuran berdasarkan volume gas H₂ yang dihasilkan dari reaksi dengan HCl?',
        C: 'Mengapa tembaga tidak bereaksi dengan asam klorida?',
        D: 'Berapa mol HCl yang diperlukan untuk melarutkan seluruh campuran?',
        E: 'Apakah besi lebih reaktif daripada tembaga?',
      },
      correctAnswer: 'B',
      explanation: 'Rumusan masalah harus mengaitkan variabel yang diukur (volume H₂) dengan tujuan (komposisi campuran).',
    },
    {
      indicator: 'membuat_hipotesis', order: 2, questionType: 'true_false',
      stem: 'Berdasarkan prinsip stoikiometri dan deret aktivitas logam, tentukan kebenaran hipotesis berikut:',
      statement: 'Jika seluruh gas H₂ yang dihasilkan berasal dari reaksi Fe dengan HCl, maka mol Fe sama dengan mol H₂ karena perbandingan koefisien reaksi 1:1.',
      correctAnswer: true,
      explanation: 'Dari reaksi Fe + 2HCl → FeCl₂ + H₂, koefisien Fe:H₂ = 1:1, sehingga mol Fe = mol H₂.',
    },
    {
      indicator: 'mengontrol_variabel', order: 3, questionType: 'matching',
      stem: 'Jodohkan setiap komponen dalam percobaan penentuan komposisi campuran Fe-Cu dengan jenis variabel yang tepat!',
      premises: [
        { id: 'p1', text: 'Volume gas H₂ yang diukur pada STP' },
        { id: 'p2', text: 'Suhu dan tekanan saat pengukuran gas (STP)' },
        { id: 'p3', text: 'Massa campuran logam awal (20 gram)' },
      ],
      matchingOptions: [
        { id: 'o1', text: 'Variabel terikat' },
        { id: 'o2', text: 'Variabel kontrol' },
        { id: 'o3', text: 'Variabel tetap (konstan)' },
      ],
      correctMatches: { p1: 'o1', p2: 'o2', p3: 'o3' },
      explanation: 'Volume H₂ adalah yang diukur (terikat), STP adalah kondisi tetap, massa awal adalah konstan.',
    },
    {
      indicator: 'merancang_investigasi', order: 4, questionType: 'complex_multiple_choice',
      stem: 'Langkah-langkah yang tepat untuk menyelidiki komposisi campuran Fe-Cu adalah…',
      options: {
        A: 'Menimbang massa campuran secara akurat menggunakan neraca analitik.',
        B: 'Melarutkan campuran dalam HCl encer berlebih dan mengumpulkan gas H₂.',
        C: 'Mengukur volume gas H₂ pada kondisi STP.',
        D: 'Menambahkan air raksa untuk mengamalgamasi tembaga.',
        E: 'Menggunakan persamaan stoikiometri untuk menghitung mol Fe dari volume H₂.',
      },
      correctAnswers: ['A', 'B', 'C', 'E'],
      partialCredit: true,
      explanation: 'Prosedur yang benar: timbang → larutkan dalam HCl → kumpulkan H₂ → hitung mol → tentukan massa Fe → massa Cu = total − massa Fe.',
    },
    {
      indicator: 'mengumpulkan_mencatat_data', order: 5, questionType: 'complex_true_false',
      stem: 'Perhatikan data percobaan. Tentukan kebenaran setiap pernyataan tentang pencatatan data!',
      statements: [
        { id: 's1', text: 'Volume gas H₂ = 5,6 L pada STP merupakan data kuantitatif yang harus dicatat dengan satuan yang jelas.', correctAnswer: true },
        { id: 's2', text: 'Massa campuran = 20 gram tidak perlu dicatat karena sudah diketahui sebelumnya.', correctAnswer: false },
        { id: 's3', text: 'Kondisi STP (0°C, 1 atm) harus dicatat sebagai parameter pengukuran.', correctAnswer: true },
        { id: 's4', text: 'Warna larutan setelah reaksi merupakan data kualitatif yang tidak relevan.', correctAnswer: false },
      ],
      requireAll: true,
      explanation: 'Semua data (kuantitatif dan kualitatif) harus dicatat. Data kualitatif seperti warna dapat memberikan informasi tambahan.',
    },
    {
      indicator: 'menganalisis_menginterpretasi_data', order: 6, questionType: 'multiple_choice',
      stem: 'Berdasarkan data: volume H₂ = 5,6 L pada STP, massa campuran = 20 gram. Hasil perhitungan menunjukkan mol H₂ = 0,25 mol. Interpretasi yang tepat adalah…',
      options: {
        A: 'Karena mol Fe = mol H₂ = 0,25 mol, maka massa Fe = 0,25 × 56 = 14 gram dan massa Cu = 20 − 14 = 6 gram.',
        B: 'Karena mol H₂ = 0,25 mol, maka seluruh campuran adalah besi.',
        C: 'Volume H₂ yang kecil menunjukkan campuran mengandung lebih banyak tembaga daripada besi.',
        D: 'Mol H₂ = 0,25 mol berarti massa campuran juga 0,25 mol.',
        E: 'Gas H₂ yang sedikit menunjukkan reaksi tidak berlangsung sempurna.',
      },
      correctAnswer: 'A',
      explanation: 'Dari reaksi Fe + 2HCl → FeCl₂ + H₂, mol Fe = mol H₂ = 0,25 mol. Massa Fe = 0,25 × 56 = 14 g. Massa Cu = 20 − 14 = 6 g.',
    },
    {
      indicator: 'membuat_kesimpulan', order: 7, questionType: 'complex_multiple_choice',
      stem: 'Kesimpulan yang valid berdasarkan data dan analisis adalah…',
      options: {
        A: 'Campuran mengandung 14 gram Fe (70%) dan 6 gram Cu (30%).',
        B: 'Tembaga tidak berkontribusi terhadap volume gas H₂ karena tidak bereaksi dengan HCl.',
        C: 'Semua gas H₂ berasal dari reaksi Fe dengan HCl.',
        D: 'Metode ini dapat digunakan untuk menentukan komposisi campuran logam yang salah satu komponennya tidak reaktif terhadap asam.',
        E: 'Jika campuran mengandung seng (Zn) sebagai pengganti Cu, hasilnya akan sama.',
      },
      correctAnswers: ['A', 'B', 'C', 'D'],
      partialCredit: true,
      explanation: 'Kesimpulan A-D didukung oleh data. E salah karena Zn juga bereaksi dengan HCl sehingga metode berbeda diperlukan.',
    },
  ],

  // ── TINGGI (Stage 2) — Rumus Hidrat ──
  tinggi: [
    {
      indicator: 'merumuskan_masalah', order: 1, questionType: 'multiple_choice',
      stem: 'Berdasarkan eksperimen dehidrasi Na₂SO₄·xH₂O, rumusan masalah yang tepat adalah…',
      options: {
        A: 'Berapa massa Na₂SO₄ yang dihasilkan setelah pemanasan?',
        B: 'Bagaimana menentukan nilai x (jumlah molekul air kristal) dalam Na₂SO₄·xH₂O berdasarkan massa sebelum dan sesudah pemanasan?',
        C: 'Apakah Na₂SO₄ merupakan senyawa yang stabil pada suhu tinggi?',
        D: 'Berapa suhu yang diperlukan untuk menghilangkan seluruh air kristal?',
        E: 'Mengapa kristal hidrat berubah warna setelah dipanaskan?',
      },
      correctAnswer: 'B',
      explanation: 'Rumusan masalah harus fokus pada penentuan nilai x melalui data massa.',
    },
    {
      indicator: 'membuat_hipotesis', order: 2, questionType: 'complex_true_false',
      stem: 'Tentukan kebenaran hipotesis berikut terkait eksperimen dehidrasi!',
      statements: [
        { id: 's1', text: 'Jika seluruh air kristal hilang saat pemanasan, maka selisih massa awal dan massa residu sama dengan massa air kristal.', correctAnswer: true },
        { id: 's2', text: 'Nilai x dapat ditentukan dari perbandingan mol Na₂SO₄ terhadap mol H₂O.', correctAnswer: true },
        { id: 's3', text: 'Semakin tinggi suhu pemanasan, semakin kecil nilai x yang diperoleh.', correctAnswer: false },
        { id: 's4', text: 'Massa residu Na₂SO₄ anhidrat selalu sama dengan massa awal kristal hidrat.', correctAnswer: false },
      ],
      requireAll: true,
      explanation: 'Hipotesis 1 dan 2 benar berdasarkan konsep hidrat. Hipotesis 3 salah karena x adalah tetapan. Hipotesis 4 salah karena ada massa air yang hilang.',
    },
    {
      indicator: 'mengontrol_variabel', order: 3, questionType: 'matching',
      stem: 'Jodohkan komponen eksperimen dengan jenis variabelnya!',
      premises: [
        { id: 'p1', text: 'Jumlah mol air kristal (x) yang ditentukan' },
        { id: 'p2', text: 'Massa sampel awal (5,5 gram)' },
        { id: 'p3', text: 'Suhu pemanasan (hingga berat tetap)' },
      ],
      matchingOptions: [
        { id: 'o1', text: 'Variabel terikat (yang dihitung)' },
        { id: 'o2', text: 'Variabel bebas (yang dimanipulasi)' },
        { id: 'o3', text: 'Variabel kontrol (kondisi tetap)' },
      ],
      correctMatches: { p1: 'o1', p2: 'o2', p3: 'o3' },
      explanation: 'Nilai x adalah yang dicari (terikat), massa sampel dimanipulasi, suhu pemanasan adalah kondisi tetap.',
    },
    {
      indicator: 'merancang_investigasi', order: 4, questionType: 'complex_multiple_choice',
      stem: 'Rancangan investigasi yang tepat untuk menentukan rumus hidrat adalah…',
      options: {
        A: 'Menimbang sampel kristal hidrat secara akurat.',
        B: 'Memanaskan sampel dalam crucible hingga berat tetap.',
        C: 'Menimbang residu setelah pendinginan dalam desikator.',
        D: 'Melarutkan sampel dalam air untuk mengukur pH.',
        E: 'Mengulangi pemanasan dan penimbangan hingga massa konstan (replikasi).',
      },
      correctAnswers: ['A', 'B', 'C', 'E'],
      partialCredit: true,
      explanation: 'Prosedur yang benar: timbang → panaskan → dinginkan di desikator → timbang → ulangi hingga konstan. D tidak relevan.',
    },
    {
      indicator: 'mengumpulkan_mencatat_data', order: 5, questionType: 'complex_true_false',
      stem: 'Tentukan kebenaran pernyataan tentang pencatatan data eksperimen hidrat!',
      statements: [
        { id: 's1', text: 'Massa sampel awal harus dicatat dengan presisi 4 angka desimal.', correctAnswer: true },
        { id: 's2', text: 'Massa residu setelah setiap pemanasan harus dicatat untuk memverifikasi berat tetap.', correctAnswer: true },
        { id: 's3', text: 'Warna sampel sebelum dan sesudah pemanasan tidak perlu dicatat.', correctAnswer: false },
        { id: 's4', text: 'Selisih massa (massa air) harus dihitung dan dicatat.', correctAnswer: true },
      ],
      requireAll: true,
      explanation: 'Data kualitatif (warna) juga penting. Semua data kuantitatif harus dicatat dengan presisi tinggi.',
    },
    {
      indicator: 'menganalisis_menginterpretasi_data', order: 6, questionType: 'multiple_choice',
      stem: 'Diketahui: massa sampel = 5,5 g, massa residu = 2,4255 g. Interpretasi yang tepat adalah…',
      options: {
        A: 'Massa air kristal = 5,5 − 2,4255 = 3,0745 g. Mol Na₂SO₄ = 2,4255/142 = 0,01708 mol. Mol H₂O = 3,0745/18 = 0,1708 mol. Perbandingan Na₂SO₄:H₂O = 1:10, sehingga x = 10.',
        B: 'Massa air = 5,5 gram sehingga x = 5,5/18.',
        C: 'Residu adalah Na₂SO₄ murni sehingga massa air = 0.',
        D: 'Nilai x selalu sama dengan massa sampel dibagi Mr Na₂SO₄.',
        E: 'Perbandingan mol tidak dapat ditentukan dari data massa.',
      },
      correctAnswer: 'A',
      explanation: 'Perhitungan menunjukkan perbandingan mol Na₂SO₄:H₂O = 0,01708:0,1708 = 1:10, sehingga rumus hidrat = Na₂SO₄·10H₂O.',
    },
    {
      indicator: 'membuat_kesimpulan', order: 7, questionType: 'complex_multiple_choice',
      stem: 'Kesimpulan yang valid dari eksperimen dehidrasi adalah…',
      options: {
        A: 'Rumus kristal hidrat adalah Na₂SO₄·10H₂O.',
        B: 'Persen massa air kristal = (3,0745/5,5) × 100% = 55,9%.',
        C: 'Metode dehidrasi termal dapat digunakan untuk menentukan rumus hidrat.',
        D: 'Semua kristal hidrat memiliki 10 molekul air per formula.',
        E: 'Nilai x bergantung pada massa sampel yang digunakan.',
      },
      correctAnswers: ['A', 'B', 'C'],
      partialCredit: true,
      explanation: 'A, B, C adalah kesimpulan valid. D salah karena x berbeda untuk setiap hidrat. E salah karena x adalah tetapan.',
    },
  ],

  // ── RENDAH (Stage 2) — Stoikiometri Sederhana ──
  rendah: [
    {
      indicator: 'merumuskan_masalah', order: 1, questionType: 'multiple_choice',
      stem: 'Berdasarkan percobaan reaksi logam L dengan HCl, rumusan masalah yang tepat adalah…',
      options: {
        A: 'Apa warna larutan yang terbentuk?',
        B: 'Bagaimana menentukan massa atom relatif (Ar) logam L dari volume gas H₂ yang dihasilkan?',
        C: 'Berapa harga logam L di pasaran?',
        D: 'Apakah HCl berbahaya bagi kesehatan?',
        E: 'Mengapa logam bereaksi dengan asam?',
      },
      correctAnswer: 'B',
      explanation: 'Rumusan masalah harus mengaitkan data yang diukur (volume H₂) dengan tujuan (menentukan Ar).',
    },
    {
      indicator: 'membuat_hipotesis', order: 2, questionType: 'true_false',
      stem: 'Tentukan kebenaran hipotesis berikut:',
      statement: 'Jika 12 gram logam L menghasilkan 0,5 mol H₂, maka mol L juga 0,5 mol karena perbandingan koefisien reaksi 1:1, sehingga Ar L = 12/0,5 = 24.',
      correctAnswer: true,
      explanation: 'Dari reaksi L + 2HCl → LCl₂ + H₂, koefisien L:H₂ = 1:1. Ar = massa/mol = 12/0,5 = 24.',
    },
    {
      indicator: 'mengontrol_variabel', order: 3, questionType: 'complex_multiple_choice',
      stem: 'Variabel yang harus dikontrol (dijaga tetap) dalam percobaan ini adalah…',
      options: {
        A: 'Suhu dan tekanan saat pengukuran volume gas (STP).',
        B: 'Konsentrasi HCl yang digunakan.',
        C: 'Volume HCl yang ditambahkan (berlebih).',
        D: 'Jenis logam L yang digunakan.',
        E: 'Volume gas H₂ yang dihasilkan.',
      },
      correctAnswers: ['A', 'B', 'C'],
      partialCredit: true,
      explanation: 'STP, konsentrasi HCl, dan volume HCl harus tetap. Jenis logam adalah yang diteliti. Volume H₂ adalah yang diukur.',
    },
    {
      indicator: 'merancang_investigasi', order: 4, questionType: 'complex_multiple_choice',
      stem: 'Langkah yang tepat dalam merancang percobaan adalah…',
      options: {
        A: 'Menimbang logam L secara akurat.',
        B: 'Menambahkan HCl encer berlebih ke dalam logam.',
        C: 'Mengumpulkan gas H₂ yang terbentuk dalam tabung eudiometer.',
        D: 'Mengukur volume gas pada kondisi STP.',
        E: 'Menghitung mol H₂ dari volume menggunakan rumus n = V/22,4.',
      },
      correctAnswers: ['A', 'B', 'C', 'D', 'E'],
      partialCredit: true,
      explanation: 'Semua langkah merupakan bagian dari rancangan percobaan yang sistematis.',
    },
    {
      indicator: 'mengumpulkan_mencatat_data', order: 5, questionType: 'matching',
      stem: 'Jodohkan data yang perlu dicatat dengan jenis datanya!',
      premises: [
        { id: 'p1', text: 'Massa logam L = 12 gram' },
        { id: 'p2', text: 'Volume gas H₂ = 11,2 L' },
        { id: 'p3', text: 'Kondisi STP (0°C, 1 atm)' },
      ],
      matchingOptions: [
        { id: 'o1', text: 'Data kuantitatif — massa' },
        { id: 'o2', text: 'Data kuantitatif — volume' },
        { id: 'o3', text: 'Data kondisi — parameter' },
      ],
      correctMatches: { p1: 'o1', p2: 'o2', p3: 'o3' },
      explanation: 'Setiap data memiliki jenis dan satuan yang berbeda dan harus dicatat dengan tepat.',
    },
    {
      indicator: 'menganalisis_menginterpretasi_data', order: 6, questionType: 'multiple_choice',
      stem: 'Diketahui: massa logam = 12 g, volume H₂ = 11,2 L pada STP. Analisis yang tepat adalah…',
      options: {
        A: 'Mol H₂ = 11,2/22,4 = 0,5 mol. Karena L:H₂ = 1:1, mol L = 0,5 mol. Ar L = 12/0,5 = 24.',
        B: 'Mol H₂ = 11,2 × 22,4 = 250,88 mol.',
        C: 'Ar L = 12/11,2 = 1,07.',
        D: 'Volume H₂ menunjukkan massa logam.',
        E: 'Semua gas yang dihasilkan adalah HCl.',
      },
      correctAnswer: 'A',
      explanation: 'Perhitungan stoikiometri: mol H₂ = V/22,4 = 0,5 mol. Mol L = mol H₂ = 0,5. Ar = 12/0,5 = 24.',
    },
    {
      indicator: 'membuat_kesimpulan', order: 7, questionType: 'complex_multiple_choice',
      stem: 'Kesimpulan yang valid dari percobaan adalah…',
      options: {
        A: 'Massa atom relatif logam L adalah 24, yang sesuai dengan magnesium (Mg).',
        B: 'Reaksi logam dengan HCl menghasilkan garam dan gas hidrogen.',
        C: 'Volume gas H₂ pada STP dapat digunakan untuk menghitung mol gas.',
        D: 'Metode ini dapat digunakan untuk menentukan Ar logam bervalensi 2 yang bereaksi dengan HCl.',
        E: 'Semua logam menghasilkan volume H₂ yang sama jika massanya sama.',
      },
      correctAnswers: ['A', 'B', 'C', 'D'],
      partialCredit: true,
      explanation: 'A-D adalah kesimpulan valid. E salah karena Ar berbeda menghasilkan mol berbeda.',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// SEED FUNCTION
// ═══════════════════════════════════════════════════════════════════

const LEVEL_STAGE_MAP: Record<string, number> = {
  menengah: 1, tinggi: 2, rendah: 2,
};

async function seed() {
  console.log('🌱 Seeding KPS Stoikiometri questions...\n');

  const stimulusIds: Record<string, string> = {};

  for (const stim of stimuli) {
    const docRef = db.collection('kps_stimuli').doc();
    await docRef.set({
      ...stim,
      topic: 'stoikiometri',
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
