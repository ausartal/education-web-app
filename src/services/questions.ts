import {
  collection,
  getDocs,
  query,
  where,
  limit as firestoreLimit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Question, Difficulty } from '@/types/firestore';

const COLLECTION = 'question_bank';

export async function getQuestionsByDifficulty(
  topic: string,
  difficulty: Difficulty,
  count: number
): Promise<Question[]> {
  if (!topic || !difficulty) return [];
  const q = query(
    collection(db, COLLECTION),
    where('topic', '==', topic),
    where('difficulty', '==', difficulty),
    where('status', '==', 'active'),
    firestoreLimit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Question);
}

export async function getQuestionsByTopic(topic: string): Promise<Question[]> {
  if (!topic) return [];
  const q = query(
    collection(db, COLLECTION),
    where('topic', '==', topic),
    where('status', '==', 'active')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Question);
}
