import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

async function verifyAdmin(token: string) {
  const decoded = await adminAuth.verifyIdToken(token);
  const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== 'admin') throw new Error('Forbidden');
  return decoded;
}

// GET: All sessions with detailed logs
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { await verifyAdmin(authHeader.slice(7)); } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }

  const snap = await adminDb.collection('kps_exam_sessions').limit(200).get();

  const studentIds = [...new Set(snap.docs.map(d => d.data().studentId))];
  const studentMap: Record<string, { displayName: string; email: string }> = {};
  for (const sid of studentIds) {
    try {
      const doc = await adminDb.collection('users').doc(sid).get();
      if (doc.exists) studentMap[sid] = { displayName: doc.data()?.displayName || 'Unknown', email: doc.data()?.email || '' };
    } catch { studentMap[sid] = { displayName: 'Unknown', email: '' }; }
  }

  const sessions = snap.docs.map(doc => {
    const d = doc.data();
    const student = studentMap[d.studentId] || { displayName: 'Unknown', email: '' };
    const stageResponses = d.stageResponses || [];

    // Calculate speed stats
    const allQuestions = stageResponses.flatMap((sr: { questions?: Array<{ timeSpentMs?: number }> }) => sr.questions || []);
    const avgTimePerQuestion = allQuestions.length > 0
      ? Math.round(allQuestions.reduce((sum: number, q: { timeSpentMs?: number }) => sum + (q.timeSpentMs || 0), 0) / allQuestions.length / 1000)
      : 0;
    const fastAnswers = allQuestions.filter((q: { timeSpentMs?: number }) => (q.timeSpentMs || 0) < 5000).length;

    return {
      id: doc.id,
      studentId: d.studentId,
      studentName: student.displayName,
      studentEmail: student.email,
      startedAt: d.startedAt?.toDate?.()?.toISOString() ?? null,
      completedAt: d.completedAt?.toDate?.()?.toISOString() ?? null,
      status: d.status,
      currentStage: d.currentStage,
      finalLevel: d.finalLevel,
      numericScore: d.numericScore,
      indicatorScores: d.indicatorScores,
      anomalyFlags: d.anomalyFlags || [],
      tabSwitchCount: d.tabSwitchCount || 0,
      accessCodeId: d.accessCodeId,
      totalCorrect: stageResponses.reduce((sum: number, sr: { correctCount?: number }) => sum + (sr.correctCount || 0), 0),
      totalQuestions: 21,
      avgTimePerQuestion,
      fastAnswers,
      stageResponses: stageResponses.map((sr: Record<string, unknown>) => ({
        stage: sr.stage,
        path: sr.path,
        correctCount: sr.correctCount,
        score: sr.score,
        questions: sr.questions,
      })),
    };
  });

  // Sort by startedAt desc
  sessions.sort((a, b) => new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime());

  return NextResponse.json({ sessions, total: sessions.length });
}

// POST: Skip break timer for a session
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { await verifyAdmin(authHeader.slice(7)); } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }

  let body: { sessionId?: string; action?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  if (!body.sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  const sessionDoc = await adminDb.collection('kps_exam_sessions').doc(body.sessionId).get();
  if (!sessionDoc.exists) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  if (body.action === 'skip_break') {
    // Mark break as skipped — student can proceed immediately
    await sessionDoc.ref.update({ breakSkipped: true });
    return NextResponse.json({ success: true, message: 'Break timer skipped' });
  }

  if (body.action === 'extend_time') {
    // Add 10 minutes to the session
    const current = sessionDoc.data()?.durationMinutes || 80;
    await sessionDoc.ref.update({ durationMinutes: current + 10 });
    return NextResponse.json({ success: true, message: 'Time extended by 10 minutes' });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
