import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Achievement, UserAchievement } from '@/types/firestore';

export async function getAchievements(): Promise<Achievement[]> {
  const snap = await getDocs(collection(db, 'achievements'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Achievement);
}

export async function getUserAchievements(
  userId: string
): Promise<UserAchievement[]> {
  if (!userId) return [];
  const q = query(
    collection(db, 'user_achievements'),
    where('userId', '==', userId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserAchievement);
}

export async function unlockAchievement(
  userId: string,
  achievementId: string
): Promise<void> {
  const id = `${userId}_${achievementId}`;
  await setDoc(doc(db, 'user_achievements', id), {
    userId,
    achievementId,
    unlockedAt: serverTimestamp(),
  });
}
