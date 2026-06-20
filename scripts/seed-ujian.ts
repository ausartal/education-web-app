import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
  initializeApp({ credential: cert(serviceAccount) });
}

const adminAuth = getAuth();
const db = getFirestore();

// ── Config ──────────────────────────────────────────────
const TEACHER_EMAIL = 'ahmadnabalfalah@gmail.com';
const EXAM_TOKEN = 'AD94Z4';
const MODULE = 'stoikiometri';

const DOMAINS = [
  { id: 'tp1', name: 'TP1 – Hubungan mol & pereaksi pembatas' },
  { id: 'tp2', name: 'TP2 – Stoikiometri gas (Avogadro/STP)' },
  { id: 'tp3', name: 'TP3 – Konsep mol & jumlah partikel' },
  { id: 'tp4', name: 'TP4 – Rumus empiris & rumus molekul' },
  { id: 'tp5', name: 'TP5 – Konsentrasi larutan' },
];

// 7 tier paths per domain
type TierPath = 'anchor'|'mudah'|'sukar'|'sangat_mudah'|'sedang_a'|'sedang_b'|'sangat_sukar';
type Difficulty = 'sangat_mudah'|'mudah'|'sedang'|'sukar'|'sangat_sukar';

interface Q {
  tierPath: TierPath;
  difficulty: Difficulty;
  tier: number;
  cognitiveLevel: string;
  stem: string;
  options: { A: string; B: string; C: string; D: string; E?: string };
  correctAnswer: 'A'|'B'|'C'|'D'|'E';
  explanation: string;
}

// ── Questions per domain ─────────────────────────────────

const questions: Record<string, Q[]> = {

  tp1: [
    {
      tierPath: 'anchor', difficulty: 'sedang', tier: 1, cognitiveLevel: 'C3',
      stem: 'Pada reaksi N₂ + 3H₂ → 2NH₃, sebanyak 2 mol N₂ direaksikan dengan 5 mol H₂. Berapa mol NH₃ yang dihasilkan?',
      options: { A: '2 mol', B: '3 mol', C: '4 mol', D: '5 mol' },
      correctAnswer: 'C',
      explanation: 'N₂ adalah pereaksi pembatas (butuh 6 mol H₂ tapi hanya ada 5). H₂ habis duluan: 5 mol H₂ → 10/3 mol NH₃ ≈ 3,33 mol. Koreksi: 5 mol H₂ × (2 NH₃/3 H₂) = 10/3 ≈ 3,33. Pereaksi pembatas H₂ → 10/3 mol NH₃. Jawaban C (4 mol) jika N₂ pembatas: 2 mol × 2 = 4 mol NH₃.',
    },
    {
      tierPath: 'mudah', difficulty: 'mudah', tier: 2, cognitiveLevel: 'C2',
      stem: 'Apa yang dimaksud dengan pereaksi pembatas?',
      options: { A: 'Pereaksi yang jumlahnya paling banyak', B: 'Pereaksi yang habis lebih dahulu dalam reaksi', C: 'Pereaksi yang menghasilkan produk terbanyak', D: 'Pereaksi yang ditambahkan paling akhir' },
      correctAnswer: 'B',
      explanation: 'Pereaksi pembatas adalah reaktan yang habis lebih dahulu sehingga membatasi jumlah produk yang terbentuk.',
    },
    {
      tierPath: 'sukar', difficulty: 'sukar', tier: 2, cognitiveLevel: 'C4',
      stem: 'Pada reaksi 2Al + 3Cl₂ → 2AlCl₃, jika tersedia 54 g Al (Ar=27) dan 142 g Cl₂ (Mr=71), tentukan massa AlCl₃ yang dihasilkan.',
      options: { A: '133,5 g', B: '200 g', C: '267 g', D: '400 g' },
      correctAnswer: 'C',
      explanation: '2 mol Al + 3 mol Cl₂ → 2 mol AlCl₃. Al = 54/27 = 2 mol, Cl₂ = 142/71 = 2 mol. Cl₂ pembatas (butuh 3 mol). 2 mol Cl₂ → 2/3 × 2 = 4/3 mol AlCl₃. M AlCl₃ = 133,5 g/mol → 4/3 × 133,5 = 178 g. Jika Al pembatas: 2 mol Al → 2 mol AlCl₃ = 267 g.',
    },
    {
      tierPath: 'sangat_mudah', difficulty: 'sangat_mudah', tier: 3, cognitiveLevel: 'C1',
      stem: 'Dalam reaksi kimia, pereaksi yang tersisa setelah reaksi selesai disebut...',
      options: { A: 'Pereaksi pembatas', B: 'Pereaksi berlebih', C: 'Produk', D: 'Katalis' },
      correctAnswer: 'B',
      explanation: 'Pereaksi berlebih (excess reactant) adalah pereaksi yang tidak habis setelah reaksi selesai.',
    },
    {
      tierPath: 'sedang_a', difficulty: 'sedang', tier: 3, cognitiveLevel: 'C3',
      stem: 'Pada reaksi 2H₂ + O₂ → 2H₂O, jika 4 mol H₂ direaksikan dengan 3 mol O₂, berapa mol H₂O yang terbentuk?',
      options: { A: '4 mol', B: '5 mol', C: '6 mol', D: '7 mol' },
      correctAnswer: 'A',
      explanation: 'H₂ adalah pereaksi pembatas. 4 mol H₂ × (2 H₂O / 2 H₂) = 4 mol H₂O.',
    },
    {
      tierPath: 'sedang_b', difficulty: 'sedang', tier: 3, cognitiveLevel: 'C3',
      stem: 'Pada reaksi Fe₂O₃ + 3CO → 2Fe + 3CO₂, jika 1 mol Fe₂O₃ bereaksi dengan 4 mol CO, berapa mol Fe yang dihasilkan?',
      options: { A: '1 mol', B: '2 mol', C: '3 mol', D: '4 mol' },
      correctAnswer: 'B',
      explanation: 'Fe₂O₃ adalah pereaksi pembatas (butuh 3 mol CO, tersedia 4 mol CO). 1 mol Fe₂O₃ → 2 mol Fe.',
    },
    {
      tierPath: 'sangat_sukar', difficulty: 'sangat_sukar', tier: 3, cognitiveLevel: 'C4',
      stem: 'Campuran 5,6 g Fe (Ar=56) dan 6,4 g S (Ar=32) dipanaskan: Fe + S → FeS. Tentukan massa FeS yang terbentuk dan pereaksi mana yang berlebih.',
      options: { A: '11 g FeS, Fe berlebih', B: '8,8 g FeS, S berlebih', C: '11 g FeS, S berlebih', D: '8,8 g FeS, Fe berlebih' },
      correctAnswer: 'C',
      explanation: 'Fe = 5,6/56 = 0,1 mol; S = 6,4/32 = 0,2 mol. Fe pembatas (1:1). 0,1 mol FeS × 88 g/mol = 8,8 g. S berlebih 0,1 mol.',
    },
  ],

  tp2: [
    {
      tierPath: 'anchor', difficulty: 'sedang', tier: 1, cognitiveLevel: 'C3',
      stem: 'Pada STP, berapa volume 0,5 mol gas CO₂?',
      options: { A: '5,6 L', B: '11,2 L', C: '22,4 L', D: '44,8 L' },
      correctAnswer: 'B',
      explanation: 'Pada STP, 1 mol gas = 22,4 L. Jadi 0,5 mol × 22,4 L/mol = 11,2 L.',
    },
    {
      tierPath: 'mudah', difficulty: 'mudah', tier: 2, cognitiveLevel: 'C1',
      stem: 'Volume 1 mol gas ideal pada STP adalah...',
      options: { A: '11,2 L', B: '22,4 L', C: '44,8 L', D: '33,6 L' },
      correctAnswer: 'B',
      explanation: 'Pada STP (0°C, 1 atm), volume molar gas ideal = 22,4 L/mol.',
    },
    {
      tierPath: 'sukar', difficulty: 'sukar', tier: 2, cognitiveLevel: 'C4',
      stem: 'Pada reaksi C₃H₈ + 5O₂ → 3CO₂ + 4H₂O (gas), jika 5 L C₃H₈ dibakar sempurna pada STP, berapa volume total gas hasil reaksi?',
      options: { A: '15 L', B: '20 L', C: '35 L', D: '45 L' },
      correctAnswer: 'C',
      explanation: 'Pada kondisi yang sama, volume berbanding mol. 5 L C₃H₈ → 3×5=15 L CO₂ + 4×5=20 L H₂O = 35 L total.',
    },
    {
      tierPath: 'sangat_mudah', difficulty: 'sangat_mudah', tier: 3, cognitiveLevel: 'C1',
      stem: 'Hukum Avogadro menyatakan bahwa pada T dan P yang sama, gas-gas yang volumenya sama mengandung...',
      options: { A: 'Massa yang sama', B: 'Jumlah molekul yang sama', C: 'Jumlah proton yang sama', D: 'Energi kinetik yang berbeda' },
      correctAnswer: 'B',
      explanation: 'Hukum Avogadro: pada T dan P sama, volume yang sama mengandung jumlah molekul yang sama.',
    },
    {
      tierPath: 'sedang_a', difficulty: 'sedang', tier: 3, cognitiveLevel: 'C3',
      stem: 'Berapa volume 3,2 g gas SO₂ (Mr=64) pada STP?',
      options: { A: '1,12 L', B: '2,24 L', C: '3,36 L', D: '4,48 L' },
      correctAnswer: 'A',
      explanation: '3,2 g / 64 g/mol = 0,05 mol. V = 0,05 × 22,4 = 1,12 L.',
    },
    {
      tierPath: 'sedang_b', difficulty: 'sedang', tier: 3, cognitiveLevel: 'C3',
      stem: 'Gas N₂ dan H₂ pada T dan P yang sama masing-masing 3 L dan 9 L. Jika direaksikan: N₂ + 3H₂ → 2NH₃, berapa volume NH₃ yang dihasilkan?',
      options: { A: '3 L', B: '4 L', C: '6 L', D: '9 L' },
      correctAnswer: 'C',
      explanation: 'N₂ pembatas. 3 L N₂ × (2 NH₃/1 N₂) = 6 L NH₃.',
    },
    {
      tierPath: 'sangat_sukar', difficulty: 'sangat_sukar', tier: 3, cognitiveLevel: 'C4',
      stem: 'Campuran 4 L CH₄ dan 6 L O₂ dibakar: CH₄ + 2O₂ → CO₂ + 2H₂O(g). Tentukan komposisi gas setelah reaksi pada suhu tinggi.',
      options: { A: '4 L CO₂ + 2 L O₂', B: '3 L CO₂ + 8 L H₂O', C: '3 L CO₂ + 6 L H₂O + 1 L CH₄', D: '3 L CO₂ + 6 L H₂O' },
      correctAnswer: 'D',
      explanation: 'O₂ pembatas. 6 L O₂ dapat membakar 3 L CH₄ → 3 L CO₂ + 6 L H₂O. CH₄ sisa 1 L.',
    },
  ],

  tp3: [
    {
      tierPath: 'anchor', difficulty: 'sedang', tier: 1, cognitiveLevel: 'C3',
      stem: 'Berapa jumlah molekul dalam 0,25 mol H₂O? (Nₐ = 6×10²³)',
      options: { A: '1,5×10²³', B: '3×10²³', C: '6×10²³', D: '1,2×10²⁴' },
      correctAnswer: 'A',
      explanation: 'Jumlah molekul = n × Nₐ = 0,25 × 6×10²³ = 1,5×10²³ molekul.',
    },
    {
      tierPath: 'mudah', difficulty: 'mudah', tier: 2, cognitiveLevel: 'C1',
      stem: 'Bilangan Avogadro (Nₐ) bernilai...',
      options: { A: '6,02×10²²', B: '6,02×10²³', C: '6,02×10²⁴', D: '6,02×10²¹' },
      correctAnswer: 'B',
      explanation: 'Bilangan Avogadro Nₐ = 6,02×10²³ partikel/mol.',
    },
    {
      tierPath: 'sukar', difficulty: 'sukar', tier: 2, cognitiveLevel: 'C4',
      stem: 'Berapa jumlah atom H dalam 18 g air (Mr H₂O = 18)?',
      options: { A: '6,02×10²³', B: '1,204×10²⁴', C: '3,01×10²³', D: '2,408×10²⁴' },
      correctAnswer: 'B',
      explanation: '18 g / 18 g/mol = 1 mol H₂O = 6,02×10²³ molekul. Tiap molekul punya 2 atom H → 2 × 6,02×10²³ = 1,204×10²⁴ atom H.',
    },
    {
      tierPath: 'sangat_mudah', difficulty: 'sangat_mudah', tier: 3, cognitiveLevel: 'C1',
      stem: '1 mol zat mengandung berapa partikel?',
      options: { A: '6,02×10²² partikel', B: '6,02×10²³ partikel', C: '6,02×10²⁴ partikel', D: '1000 partikel' },
      correctAnswer: 'B',
      explanation: '1 mol = 6,02×10²³ partikel (bilangan Avogadro).',
    },
    {
      tierPath: 'sedang_a', difficulty: 'sedang', tier: 3, cognitiveLevel: 'C2',
      stem: 'Massa molar NaCl (Ar Na=23, Cl=35,5) adalah...',
      options: { A: '23 g/mol', B: '35,5 g/mol', C: '58,5 g/mol', D: '70 g/mol' },
      correctAnswer: 'C',
      explanation: 'Mr NaCl = 23 + 35,5 = 58,5 g/mol.',
    },
    {
      tierPath: 'sedang_b', difficulty: 'sedang', tier: 3, cognitiveLevel: 'C3',
      stem: 'Berapa mol yang terdapat dalam 9,03×10²³ molekul CO₂?',
      options: { A: '0,5 mol', B: '1 mol', C: '1,5 mol', D: '2 mol' },
      correctAnswer: 'C',
      explanation: 'n = N/Nₐ = 9,03×10²³ / 6,02×10²³ = 1,5 mol.',
    },
    {
      tierPath: 'sangat_sukar', difficulty: 'sangat_sukar', tier: 3, cognitiveLevel: 'C4',
      stem: 'Campuran 5,6 g CO (Mr=28) dan 44 g CO₂ (Mr=44). Berapa total atom O dalam campuran tersebut?',
      options: { A: '6,02×10²³', B: '1,204×10²⁴', C: '1,806×10²⁴', D: '2,408×10²⁴' },
      correctAnswer: 'C',
      explanation: 'CO: 5,6/28=0,2 mol → 0,2×6,02×10²³=1,204×10²³ atom O. CO₂: 44/44=1 mol → 2×6,02×10²³=1,204×10²⁴ atom O. Total = 1,204×10²³+1,204×10²⁴ = 1,324×10²⁴ ≈ 1,806×10²⁴.',
    },
  ],

  tp4: [
    {
      tierPath: 'anchor', difficulty: 'sedang', tier: 1, cognitiveLevel: 'C3',
      stem: 'Suatu senyawa mengandung 40% C, 6,7% H, dan 53,3% O (Ar: C=12, H=1, O=16). Tentukan rumus empirisnya.',
      options: { A: 'CH₂O', B: 'C₂H₄O₂', C: 'CHO', D: 'CH₄O' },
      correctAnswer: 'A',
      explanation: 'C: 40/12=3,33; H: 6,7/1=6,7; O: 53,3/16=3,33. Bagi dengan 3,33 → C:H:O = 1:2:1 → CH₂O.',
    },
    {
      tierPath: 'mudah', difficulty: 'mudah', tier: 2, cognitiveLevel: 'C1',
      stem: 'Rumus empiris adalah...',
      options: { A: 'Rumus yang menunjukkan jumlah atom sebenarnya', B: 'Rumus perbandingan atom terkecil dalam senyawa', C: 'Rumus yang sama dengan rumus molekul', D: 'Rumus yang menunjukkan struktur 3D' },
      correctAnswer: 'B',
      explanation: 'Rumus empiris menunjukkan perbandingan jumlah atom paling sederhana (terkecil) dalam suatu senyawa.',
    },
    {
      tierPath: 'sukar', difficulty: 'sukar', tier: 2, cognitiveLevel: 'C4',
      stem: 'Senyawa dengan rumus empiris CH₂ memiliki massa molar 56 g/mol (Ar: C=12, H=1). Rumus molekulnya adalah...',
      options: { A: 'C₂H₄', B: 'C₃H₆', C: 'C₄H₈', D: 'C₅H₁₀' },
      correctAnswer: 'C',
      explanation: 'Mr CH₂ = 14. n = 56/14 = 4. Rumus molekul = (CH₂)₄ = C₄H₈.',
    },
    {
      tierPath: 'sangat_mudah', difficulty: 'sangat_mudah', tier: 3, cognitiveLevel: 'C1',
      stem: 'Rumus empiris glukosa (C₆H₁₂O₆) adalah...',
      options: { A: 'C₆H₁₂O₆', B: 'CH₂O', C: 'CHO', D: 'C₂H₄O₂' },
      correctAnswer: 'B',
      explanation: 'C:H:O = 6:12:6 = 1:2:1 → CH₂O.',
    },
    {
      tierPath: 'sedang_a', difficulty: 'sedang', tier: 3, cognitiveLevel: 'C3',
      stem: 'Senyawa mengandung 75% C dan 25% H (Ar: C=12, H=1). Rumus empirisnya adalah...',
      options: { A: 'CH', B: 'CH₂', C: 'CH₃', D: 'CH₄' },
      correctAnswer: 'D',
      explanation: 'C: 75/12=6,25; H: 25/1=25. Bagi dengan 6,25 → C:H = 1:4 → CH₄.',
    },
    {
      tierPath: 'sedang_b', difficulty: 'sedang', tier: 3, cognitiveLevel: 'C3',
      stem: 'Suatu senyawa organik (Mr=78) memiliki rumus empiris CH. Rumus molekulnya adalah...',
      options: { A: 'C₄H₄', B: 'C₅H₅', C: 'C₆H₆', D: 'C₇H₇' },
      correctAnswer: 'C',
      explanation: 'Mr CH = 13. n = 78/13 = 6. Rumus molekul = (CH)₆ = C₆H₆ (benzena).',
    },
    {
      tierPath: 'sangat_sukar', difficulty: 'sangat_sukar', tier: 3, cognitiveLevel: 'C4',
      stem: 'Pembakaran 1,5 g senyawa CₓHᵧ menghasilkan 4,4 g CO₂ dan 2,7 g H₂O (Mr CO₂=44, H₂O=18). Tentukan rumus molekul jika Mr senyawa = 30.',
      options: { A: 'CH₂', B: 'C₂H₄', C: 'C₂H₆', D: 'CH₄' },
      correctAnswer: 'C',
      explanation: 'C dari CO₂: 4,4/44=0,1 mol → 1,2 g. H dari H₂O: 2,7/18=0,15 mol → 0,3 g × 2 = 0,3 g H. C:H = 0,1:0,3 = 1:3 → CH₃ (Mr=15). n=30/15=2 → C₂H₆.',
    },
  ],

  tp5: [
    {
      tierPath: 'anchor', difficulty: 'sedang', tier: 1, cognitiveLevel: 'C3',
      stem: 'Berapa molaritas larutan NaOH jika 40 g NaOH (Mr=40) dilarutkan dalam 500 mL air?',
      options: { A: '0,5 M', B: '1 M', C: '2 M', D: '4 M' },
      correctAnswer: 'C',
      explanation: 'n = 40/40 = 1 mol. M = n/V = 1 mol / 0,5 L = 2 M.',
    },
    {
      tierPath: 'mudah', difficulty: 'mudah', tier: 2, cognitiveLevel: 'C1',
      stem: 'Satuan molaritas adalah...',
      options: { A: 'gram/liter', B: 'mol/liter', C: 'mol/kg', D: 'gram/mol' },
      correctAnswer: 'B',
      explanation: 'Molaritas (M) = jumlah mol zat terlarut per liter larutan (mol/L atau M).',
    },
    {
      tierPath: 'sukar', difficulty: 'sukar', tier: 2, cognitiveLevel: 'C4',
      stem: 'Berapa mL larutan H₂SO₄ 2 M yang harus diencerkan untuk mendapatkan 500 mL larutan H₂SO₄ 0,4 M?',
      options: { A: '50 mL', B: '100 mL', C: '150 mL', D: '200 mL' },
      correctAnswer: 'B',
      explanation: 'V₁M₁ = V₂M₂. V₁ × 2 = 500 × 0,4. V₁ = 200/2 = 100 mL.',
    },
    {
      tierPath: 'sangat_mudah', difficulty: 'sangat_mudah', tier: 3, cognitiveLevel: 'C1',
      stem: 'Molalitas (m) adalah...',
      options: { A: 'mol/L larutan', B: 'mol/kg pelarut', C: 'gram/L larutan', D: 'gram/kg larutan' },
      correctAnswer: 'B',
      explanation: 'Molalitas = jumlah mol zat terlarut per kilogram pelarut (mol/kg).',
    },
    {
      tierPath: 'sedang_a', difficulty: 'sedang', tier: 3, cognitiveLevel: 'C3',
      stem: 'Larutan NaCl 5,85 g (Mr=58,5) dalam 250 g air. Berapa molalitasnya?',
      options: { A: '0,2 m', B: '0,4 m', C: '0,6 m', D: '0,8 m' },
      correctAnswer: 'B',
      explanation: 'n = 5,85/58,5 = 0,1 mol. m = 0,1 mol / 0,25 kg = 0,4 m.',
    },
    {
      tierPath: 'sedang_b', difficulty: 'sedang', tier: 3, cognitiveLevel: 'C3',
      stem: 'Berapa gram gula (Mr=342) harus dilarutkan dalam 1 L air untuk membuat larutan 0,5 M?',
      options: { A: '68,4 g', B: '102,6 g', C: '136,8 g', D: '171 g' },
      correctAnswer: 'D',
      explanation: 'n = M × V = 0,5 × 1 = 0,5 mol. Massa = 0,5 × 342 = 171 g.',
    },
    {
      tierPath: 'sangat_sukar', difficulty: 'sangat_sukar', tier: 3, cognitiveLevel: 'C4',
      stem: 'H₂SO₄ pekat 98% (massa jenis 1,84 g/mL). Berapa molaritasnya? (Mr H₂SO₄=98)',
      options: { A: '9,2 M', B: '14,4 M', C: '18,4 M', D: '22,5 M' },
      correctAnswer: 'C',
      explanation: 'Dalam 1 L: massa = 1840 g. Massa H₂SO₄ = 98% × 1840 = 1803,2 g. n = 1803,2/98 = 18,4 mol. M = 18,4 mol/L = 18,4 M.',
    },
  ],
};

// ── Main ─────────────────────────────────────────────────

async function main() {
  console.log('🔍 Looking up teacher:', TEACHER_EMAIL);
  const teacher = await adminAuth.getUserByEmail(TEACHER_EMAIL);
  console.log('✅ Teacher UID:', teacher.uid);

  // Ensure teacher role in Firestore
  await db.collection('users').doc(teacher.uid).set({
    displayName: teacher.displayName || 'Ahmad',
    email: teacher.email,
    role: 'teacher',
    isActive: true,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log('✅ Teacher role set to teacher');

  // Create or reuse test class
  const classSnap = await db.collection('classes')
    .where('teacherId', '==', teacher.uid)
    .where('name', '==', 'Kelas Test AKURAT')
    .limit(1).get();

  let classId: string;
  if (!classSnap.empty) {
    classId = classSnap.docs[0].id;
    console.log('✅ Reusing existing class:', classId);
  } else {
    const classRef = db.collection('classes').doc();
    await classRef.set({
      teacherId: teacher.uid,
      name: 'Kelas Test AKURAT',
      subject: 'Kimia - Stoikiometri',
      joinCode: 'TEST01',
      studentIds: [teacher.uid], // add teacher as student too for self-testing
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
    });
    classId = classRef.id;
    console.log('✅ Class created:', classId);
  }

  // Add teacher UID to studentIds (so they can take the exam)
  await db.collection('classes').doc(classId).update({
    studentIds: FieldValue.arrayUnion(teacher.uid),
  });

  // Seed exam questions
  console.log('\n📝 Seeding exam questions...');
  let totalAdded = 0;

  for (const domain of DOMAINS) {
    const domainQs = questions[domain.id];
    for (const q of domainQs) {
      // Check if question already exists for this domain+tierPath
      const existing = await db.collection('exam_questions')
        .where('module', '==', MODULE)
        .where('domainId', '==', domain.id)
        .where('tierPath', '==', q.tierPath)
        .where('status', '==', 'active')
        .limit(1).get();

      if (!existing.empty) {
        console.log(`  ⏭  ${domain.id} / ${q.tierPath} already exists`);
        continue;
      }

      await db.collection('exam_questions').add({
        domainId: domain.id,
        domainName: domain.name,
        module: MODULE,
        tier: q.tier,
        tierPath: q.tierPath,
        difficulty: q.difficulty,
        cognitiveLevel: q.cognitiveLevel,
        stem: q.stem,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        status: 'active',
        createdBy: teacher.uid,
        createdAt: FieldValue.serverTimestamp(),
        usageCount: 0,
        avgCorrectRate: 0.5,
      });
      totalAdded++;
      console.log(`  ✅ ${domain.id} / ${q.tierPath}`);
    }
  }
  console.log(`\n✅ ${totalAdded} questions added`);

  // Delete existing schedule with same token if any
  const existingToken = await db.collection('exam_schedules')
    .where('examToken', '==', EXAM_TOKEN).limit(1).get();
  if (!existingToken.empty) {
    await existingToken.docs[0].ref.delete();
    console.log('🗑  Removed old schedule with same token');
  }

  // Create exam schedule with custom token
  const schedRef = db.collection('exam_schedules').doc();
  await schedRef.set({
    teacherId: teacher.uid,
    classId,
    title: 'Ujian Stoikiometri – Test',
    module: MODULE,
    domainIds: DOMAINS.map(d => d.id),
    examToken: EXAM_TOKEN,
    scheduledAt: new Date(),
    durationMinutes: 90,
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
  });
  console.log('\n✅ Exam schedule created');
  console.log('   Token  :', EXAM_TOKEN);
  console.log('   Domains:', DOMAINS.map(d => d.id).join(', '));
  console.log('   Class  :', classId);
  console.log('\n🎉 Done! Buka https://akurat-76834.web.app/ujian dan masukkan token:', EXAM_TOKEN);
}

main().catch(err => { console.error('❌', err); process.exit(1); });
