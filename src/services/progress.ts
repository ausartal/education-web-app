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
import { UserProgress } from '@/types/firestore';

const COLLECTION = 'user_progress';

export async function getUserProgress(userId: string): Promise<UserProgress[]> {
  const q = query(collection(db, COLLECTION), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserProgress);
}

export async function updateProgress(
  userId: string,
  materialId: string,
  status: UserProgress['status'],
  timeSpent: number
): Promise<void> {
  const id = `${userId}_${materialId}`;
  await setDoc(
    doc(db, COLLECTION, id),
    {
      userId,
      materialId,
      status,
      timeSpent,
      lastAccessedAt: serverTimestamp(),
      ...(status === 'completed' ? { completedAt: serverTimestamp() } : {}),
    },
    { merge: true }
  );
}
