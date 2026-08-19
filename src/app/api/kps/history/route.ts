import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  // Get completed sessions
  const sessionsSnap = await adminDb.collection('kps_exam_sessions')
    .where('studentId', '==', decoded.uid)
    .where('status', 'in', ['completed', 'flagged'])
    .orderBy('completedAt', 'desc')
    .limit(limit)
    .offset(offset)
    .get();

  const sessions = sessionsSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      completedAt: data.completedAt?.toDate?.()?.toISOString() ?? null,
      finalLevel: data.finalLevel,
      numericScore: data.numericScore,
      totalCorrect: (data.stageResponses || []).reduce(
        (sum: number, sr: { correctCount: number }) => sum + sr.correctCount,
        0,
      ),
      totalQuestions: 21,
      stageResponses: (data.stageResponses || []).map((sr: { stage: number; path: string; correctCount: number; score: number }) => ({
        stage: sr.stage,
        path: sr.path,
        correctCount: sr.correctCount,
        score: sr.score,
      })),
      indicatorScores: data.indicatorScores,
      anomalyFlags: data.anomalyFlags || [],
    };
  });

  // Get total count
  const totalSnap = await adminDb.collection('kps_exam_sessions')
    .where('studentId', '==', decoded.uid)
    .where('status', 'in', ['completed', 'flagged'])
    .count()
    .get();

  return NextResponse.json({
    sessions,
    total: totalSnap.data().count,
  });
}
