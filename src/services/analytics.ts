import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type AnalyticsEvent =
  | 'page_view'
  | 'session_start'
  | 'lesson_start'
  | 'lesson_complete'
  | 'quiz_start'
  | 'quiz_complete'
  | 'exam_start'
  | 'exam_complete'
  | 'achievement_unlock'
  | 'streak_update'
  | 'xp_earned'
  | 'level_up';

interface EventData {
  event: AnalyticsEvent;
  userId?: string;
  properties?: Record<string, unknown>;
}

export async function trackEvent(data: EventData): Promise<void> {
  try {
    await addDoc(collection(db, 'analytics_events'), {
      ...data,
      timestamp: serverTimestamp(),
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : '',
    });
  } catch {
    // Silent fail — analytics should never break the app
  }
}

// Convenience functions
export const trackPageView = (userId: string, page: string) =>
  trackEvent({ event: 'page_view', userId, properties: { page } });

export const trackLessonComplete = (userId: string, materialId: string) =>
  trackEvent({ event: 'lesson_complete', userId, properties: { materialId } });

export const trackQuizComplete = (
  userId: string,
  difficulty: string,
  score: number
) =>
  trackEvent({
    event: 'quiz_complete',
    userId,
    properties: { difficulty, score },
  });

export const trackExamComplete = (
  userId: string,
  theta: number,
  accuracy: number
) =>
  trackEvent({
    event: 'exam_complete',
    userId,
    properties: { theta, accuracy },
  });

export const trackXPEarned = (userId: string, amount: number, source: string) =>
  trackEvent({ event: 'xp_earned', userId, properties: { amount, source } });
