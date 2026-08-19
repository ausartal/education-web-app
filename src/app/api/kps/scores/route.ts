import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let decoded;
  try { decoded = await adminAuth.verifyIdToken(authHeader.slice(7)); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '20');

  const sessionsSnap = await adminDb.collection('kps_exam_sessions')
    .where('studentId', '==', decoded.uid)
    .where('status', 'in', ['completed', 'flagged'])
    .orderBy('completedAt', 'desc')
    .limit(limit)
    .get();

  const scores = sessionsSnap.docs.map((doc, idx) => {
    const data = doc.data();
    const stageResponses = data.stageResponses || [];
    const totalCorrect = stageResponses.reduce((sum: number, sr: { correctCount: number }) => sum + sr.correctCount, 0);

    return {
      id: doc.id,
      testId: data.testId || `KPS-${new Date(data.completedAt?.toDate?.() || Date.now()).getFullYear()}-${String(idx + 1).padStart(5, '0')}`,
      score: data.numericScore || 0,
      level: data.finalLevel || null,
      indicatorScores: data.indicatorScores || null,
      totalCorrect,
      totalQuestions: 21,
      percentile: data.percentile || null,
      completedAt: data.completedAt?.toDate?.()?.toISOString() || null,
      validity: data.validity || null,
      status: data.status || 'completed',
      stageResponses: stageResponses.map((sr: { stage: number; path: string; correctCount: number; score: number }) => ({
        stage: sr.stage,
        path: sr.path,
        correctCount: sr.correctCount,
        score: sr.score,
      })),
    };
  });

  // Calculate percentiles if not already set
  const allScores = scores.map(s => s.score);
  const sortedScores = [...allScores].sort((a, b) => a - b);

  scores.forEach(s => {
    if (!s.percentile) {
      const rank = sortedScores.filter(sc => sc <= s.score).length;
      s.percentile = {
        national: Math.round((rank / sortedScores.length) * 100),
        institutional: Math.round((rank / sortedScores.length) * 100),
        global: Math.round((rank / sortedScores.length) * 100),
      };
    }
  });

  return NextResponse.json({ scores, total: scores.length });
}
