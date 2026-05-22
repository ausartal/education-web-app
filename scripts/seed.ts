/**
 * Seed script for AKURAT app config data.
 * Run: npx ts-node --project tsconfig.seed.json scripts/seed.ts
 *
 * Seeds: achievements, MSAT config, gamification config
 * Idempotent: safe to run multiple times (uses setDoc with merge)
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
);

initializeApp({
  credential: cert(serviceAccount),
  projectId: 'akurat-76834',
});

const db = getFirestore();

// ===== MSAT CONFIG =====
const msatConfig = {
  stagesCount: 3,
  questionsPerStage: 7,
  startDifficulty: 'moderate',
  thetaInitial: 0,
  thetaMin: -3,
  thetaMax: 3,
  promotionRule: 'correct',
  demotionRule: 'incorrect',
  timeThresholds: {
    easy: { fast: 15000, slow: 60000 },
    moderate: { fast: 20000, slow: 90000 },
    hard: { fast: 30000, slow: 120000 },
  },
  anomalyThresholds: {
    tooFastMs: 3000,
    allFastCorrectCount: 5,
    suddenDropThreshold: 3,
  },
};

// ===== GAMIFICATION CONFIG =====
const gamificationConfig = {
  xpPerLesson: 50,
  xpPerCorrectAnswer: 10,
  xpPerExam: 100,
  xpDailyLogin: 5,
  xpStreakBonus: 10,
  levelFormula: '100 * (level ^ 1.5)',
};

// ===== ACHIEVEMENTS =====
const achievements = [
  // Learning milestones
  {
    id: 'first_lesson',
    name: 'Langkah Pertama',
    description: 'Selesaikan materi pertama',
    icon: '📖',
    category: 'learning',
    tier: 'bronze',
    condition: { totalLessons: { gte: 1 } },
    xpReward: 25,
  },
  {
    id: 'ten_lessons',
    name: 'Pelajar Tekun',
    description: 'Selesaikan 10 materi',
    icon: '📚',
    category: 'learning',
    tier: 'silver',
    condition: { totalLessons: { gte: 10 } },
    xpReward: 100,
  },
  {
    id: 'all_lessons',
    name: 'Master Stoikiometri',
    description: 'Selesaikan semua materi',
    icon: '🎓',
    category: 'learning',
    tier: 'gold',
    condition: { totalLessons: { gte: 25 } },
    xpReward: 500,
  },
  // Performance
  {
    id: 'perfect_quiz',
    name: 'Sempurna!',
    description: 'Dapatkan skor 100% di quiz',
    icon: '💯',
    category: 'performance',
    tier: 'gold',
    condition: { quizScore: { eq: 100 } },
    xpReward: 200,
  },
  {
    id: 'first_exam',
    name: 'Penantang',
    description: 'Selesaikan ujian MSAT pertama',
    icon: '🎯',
    category: 'performance',
    tier: 'bronze',
    condition: { totalExams: { gte: 1 } },
    xpReward: 50,
  },
  {
    id: 'high_theta',
    name: 'Ahli Kimia',
    description: 'Capai theta ≥ 2.0 di ujian MSAT',
    icon: '⚗️',
    category: 'performance',
    tier: 'gold',
    condition: { theta: { gte: 2.0 } },
    xpReward: 300,
  },
  // Streak
  {
    id: 'streak_3',
    name: 'Konsisten',
    description: 'Pertahankan streak 3 hari',
    icon: '🔥',
    category: 'streak',
    tier: 'bronze',
    condition: { streak: { gte: 3 } },
    xpReward: 30,
  },
  {
    id: 'streak_7',
    name: 'Seminggu Penuh',
    description: 'Pertahankan streak 7 hari',
    icon: '🔥',
    category: 'streak',
    tier: 'silver',
    condition: { streak: { gte: 7 } },
    xpReward: 75,
  },
  {
    id: 'streak_30',
    name: 'Tak Terbendung',
    description: 'Pertahankan streak 30 hari',
    icon: '🔥',
    category: 'streak',
    tier: 'gold',
    condition: { streak: { gte: 30 } },
    xpReward: 500,
  },
  // Exploration
  {
    id: 'first_message',
    name: 'Komunikator',
    description: 'Kirim pesan pertama ke guru',
    icon: '💬',
    category: 'exploration',
    tier: 'bronze',
    condition: { messagesSent: { gte: 1 } },
    xpReward: 15,
  },
  {
    id: 'five_quizzes',
    name: 'Rajin Latihan',
    description: 'Selesaikan 5 quiz',
    icon: '✏️',
    category: 'exploration',
    tier: 'silver',
    condition: { totalQuizzes: { gte: 5 } },
    xpReward: 75,
  },
  // Special
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Belajar sebelum jam 6 pagi',
    icon: '🌅',
    category: 'special',
    tier: 'bronze',
    condition: { loginHour: { lt: 6 } },
    xpReward: 20,
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Belajar setelah jam 11 malam',
    icon: '🦉',
    category: 'special',
    tier: 'bronze',
    condition: { loginHour: { gte: 23 } },
    xpReward: 20,
  },
];

async function seed() {
  console.log('🌱 Seeding AKURAT database...\n');

  // Seed MSAT config
  await db.doc('app_config/msat').set(msatConfig, { merge: true });
  console.log('✅ MSAT config seeded');

  // Seed gamification config
  await db.doc('app_config/gamification').set(gamificationConfig, { merge: true });
  console.log('✅ Gamification config seeded');

  // Seed achievements
  const batch = db.batch();
  for (const achievement of achievements) {
    batch.set(db.doc(`achievements/${achievement.id}`), achievement, { merge: true });
  }
  await batch.commit();
  console.log(`✅ ${achievements.length} achievements seeded`);

  console.log('\n🎉 Seed complete!');
}

seed().catch(console.error);
