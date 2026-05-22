import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/types/firestore';

// XP values
const XP_LESSON_COMPLETE = 50;
const XP_QUIZ_CORRECT = 10;
const XP_EXAM_BASE = 100;
const XP_DAILY_LOGIN = 5;
const XP_STREAK_BONUS = 10;

// Level formula: XP needed = 100 * (level ^ 1.5)
export function xpForLevel(level: number): number {
  return Math.round(100 * Math.pow(level, 1.5));
}

export function getLevelFromXP(totalXP: number): number {
  let level = 1;
  let xpNeeded = 0;
  while (xpNeeded + xpForLevel(level) <= totalXP) {
    xpNeeded += xpForLevel(level);
    level++;
  }
  return level;
}

export function getXPProgress(totalXP: number): {
  level: number;
  currentXP: number;
  nextLevelXP: number;
  percentage: number;
} {
  let level = 1;
  let remaining = totalXP;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  const nextLevelXP = xpForLevel(level);
  return {
    level,
    currentXP: remaining,
    nextLevelXP,
    percentage: Math.round((remaining / nextLevelXP) * 100),
  };
}

// Award XP and update level
export async function awardXP(
  userId: string,
  amount: number
): Promise<{ newXP: number; leveledUp: boolean; newLevel: number }> {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  const data = snap.data() as UserProfile;

  const oldLevel = data.stats.level;
  const newXP = data.stats.xp + amount;
  const newLevel = getLevelFromXP(newXP);

  await updateDoc(userRef, {
    'stats.xp': increment(amount),
    'stats.level': newLevel,
  });

  return { newXP, leveledUp: newLevel > oldLevel, newLevel };
}

// Specific XP actions
export async function awardLessonXP(userId: string) {
  return awardXP(userId, XP_LESSON_COMPLETE);
}

export async function awardQuizXP(userId: string, correctCount: number) {
  return awardXP(userId, correctCount * XP_QUIZ_CORRECT);
}

export async function awardExamXP(userId: string, accuracy: number) {
  const bonus = Math.round(accuracy * 100);
  return awardXP(userId, XP_EXAM_BASE + bonus);
}

export async function awardDailyLoginXP(userId: string) {
  return awardXP(userId, XP_DAILY_LOGIN);
}

export async function awardStreakXP(userId: string) {
  return awardXP(userId, XP_STREAK_BONUS);
}

// Streak logic
export async function updateStreak(userId: string): Promise<number> {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  const data = snap.data() as UserProfile;

  const now = new Date();
  const lastLogin = data.lastLoginAt?.toDate?.() || new Date(0);
  const diffHours = (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60);

  let newStreak = data.stats.streak;

  if (diffHours < 24) {
    // Same day, no change
  } else if (diffHours < 48) {
    // Next day, increment streak
    newStreak += 1;
    await awardStreakXP(userId);
  } else {
    // Streak broken
    newStreak = 1;
  }

  const longestStreak = Math.max(data.stats.longestStreak, newStreak);

  await updateDoc(userRef, {
    'stats.streak': newStreak,
    'stats.longestStreak': longestStreak,
  });

  return newStreak;
}
