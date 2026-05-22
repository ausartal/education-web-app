import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ExamSession, ExamResponse, Difficulty } from '@/types/firestore';

export async function createExamSession(
  userId: string,
  examId: string
): Promise<string> {
  const sessionId = `${userId}_${examId}_${Date.now()}`;
  await setDoc(doc(db, 'exam_sessions', sessionId), {
    id: sessionId,
    userId,
    examId,
    startedAt: serverTimestamp(),
    completedAt: null,
    currentStage: 1,
    currentDifficulty: 'moderate' as Difficulty,
    theta: 0,
    responses: [],
    result: null,
    anomalyFlags: [],
    status: 'in_progress',
  });
  return sessionId;
}

export async function saveResponse(
  sessionId: string,
  responses: ExamResponse[],
  theta: number,
  currentDifficulty: Difficulty,
  currentStage: number,
  anomalyFlags: string[]
): Promise<void> {
  await updateDoc(doc(db, 'exam_sessions', sessionId), {
    responses,
    theta,
    currentDifficulty,
    currentStage,
    anomalyFlags,
  });
}

export async function completeExamSession(
  sessionId: string,
  result: ExamSession['result'],
  anomalyFlags: string[]
): Promise<void> {
  await updateDoc(doc(db, 'exam_sessions', sessionId), {
    completedAt: serverTimestamp(),
    result,
    anomalyFlags,
    status: anomalyFlags.length > 0 ? 'flagged' : 'completed',
  });
}

export async function getExamSession(
  sessionId: string
): Promise<ExamSession | null> {
  const snap = await getDoc(doc(db, 'exam_sessions', sessionId));
  return snap.exists() ? (snap.data() as ExamSession) : null;
}
