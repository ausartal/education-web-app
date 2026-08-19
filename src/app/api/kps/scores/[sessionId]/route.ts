import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let decoded;
  try { decoded = await adminAuth.verifyIdToken(authHeader.slice(7)); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const { sessionId } = await params;
  const sessionDoc = await adminDb.collection('kps_exam_sessions').doc(sessionId).get();
  if (!sessionDoc.exists) return NextResponse.json({ error: 'Session tidak ditemukan' }, { status: 404 });

  const data = sessionDoc.data()!;
  if (data.studentId !== decoded.uid) {
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const stageResponses = data.stageResponses || [];
  const totalCorrect = stageResponses.reduce((sum: number, sr: { correctCount: number }) => sum + sr.correctCount, 0);

  // Build section scores from indicator scores
  const sectionScores = data.indicatorScores ? Object.entries(data.indicatorScores).map(([key, score]) => ({
    indicator: key,
    score: score as number,
    level: getLevelForScore(score as number),
  })) : [];

  // Percentile (mock if not set — in production, query all scores)
  const percentile = data.percentile || {
    national: Math.min(99, Math.max(1, Math.round((data.numericScore || 0) * 0.95))),
    institutional: Math.min(99, Math.max(1, Math.round((data.numericScore || 0) * 0.98))),
    global: Math.min(99, Math.max(1, Math.round((data.numericScore || 0) * 0.92))),
  };

  return NextResponse.json({
    id: sessionDoc.id,
    testId: data.testId || `KPS-${new Date(data.completedAt?.toDate?.() || Date.now()).getFullYear()}-00001`,
    score: data.numericScore || 0,
    level: data.finalLevel || null,
    totalCorrect,
    totalQuestions: 21,
    sectionScores,
    percentile,
    stageResponses: stageResponses.map((sr: { stage: number; path: string; correctCount: number; score: number }) => ({
      stage: sr.stage,
      path: sr.path,
      correctCount: sr.correctCount,
      score: sr.score,
    })),
    completedAt: data.completedAt?.toDate?.()?.toISOString() || null,
    validity: data.validity || null,
    status: data.status || 'completed',
    anomalyFlags: data.anomalyFlags || [],
  });
}

function getLevelForScore(score: number): string {
  if (score >= 90) return 'Mastery';
  if (score >= 80) return 'Advanced';
  if (score >= 70) return 'Upper Intermediate';
  if (score >= 55) return 'Intermediate';
  if (score >= 40) return 'Elementary';
  if (score >= 25) return 'Basic';
  return 'Beginner';
}
