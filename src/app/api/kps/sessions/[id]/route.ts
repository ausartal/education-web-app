import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: sessionId } = await params;
  const sessionDoc = await adminDb.collection('kps_exam_sessions').doc(sessionId).get();
  if (!sessionDoc.exists) return NextResponse.json({ error: 'Session tidak ditemukan' }, { status: 404 });

  const session = sessionDoc.data()!;
  const isAdmin = (await adminDb.collection('users').doc(decoded.uid).get()).data()?.role === 'admin';

  if (session.studentId !== decoded.uid && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const base = {
    id: sessionDoc.id,
    studentId: session.studentId,
    startedAt: session.startedAt?.toDate?.()?.toISOString() ?? null,
    completedAt: session.completedAt?.toDate?.()?.toISOString() ?? null,
    durationMinutes: session.durationMinutes,
    status: session.status,
    currentStage: session.currentStage,
    stage2Path: session.stage2Path,
    stage3Path: session.stage3Path,
    finalLevel: session.finalLevel,
    numericScore: session.numericScore,
    indicatorScores: session.indicatorScores,
    anomalyFlags: session.anomalyFlags || [],
    tabSwitchCount: session.tabSwitchCount || 0,
  };

  // For in-progress sessions: strip per-question correctness (H1 fix)
  if (session.status === 'in_progress' && !isAdmin) {
    return NextResponse.json(base);
  }

  // For completed/flagged sessions or admin: include summary stageResponses
  const stageResponses = (session.stageResponses || []).map((sr: Record<string, unknown>) => ({
    stage: sr.stage,
    path: sr.path,
    correctCount: sr.correctCount,
    score: sr.score,
    // Strip per-question detail for non-admin
    ...(isAdmin ? { questions: sr.questions } : {}),
  }));

  return NextResponse.json({ ...base, stageResponses });
}
