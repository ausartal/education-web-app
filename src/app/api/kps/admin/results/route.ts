import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

async function verifyAdmin(token: string) {
  const decoded = await adminAuth.verifyIdToken(token);
  const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== 'admin') throw new Error('Forbidden');
  return decoded;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { await verifyAdmin(authHeader.slice(7)); } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '100');
  const statusFilter = url.searchParams.get('status'); // completed, in_progress, flagged
  const levelFilter = url.searchParams.get('level');
  const codeFilter = url.searchParams.get('codeId');

  // Simple query — no composite index needed
  const snap = await adminDb.collection('kps_exam_sessions').limit(500).get();

  let sessions = snap.docs.map(d => ({ id: d.id, ...d.data() } as Record<string, unknown>));

  // Filter in memory
  if (statusFilter) {
    sessions = sessions.filter(s => s.status === statusFilter);
  } else {
    sessions = sessions.filter(s => s.status === 'completed' || s.status === 'flagged');
  }
  if (levelFilter) sessions = sessions.filter(s => s.finalLevel === levelFilter);
  if (codeFilter) sessions = sessions.filter(s => s.accessCodeId === codeFilter);

  // Sort by completedAt desc
  sessions.sort((a, b) => {
    const aTime = (a.completedAt as { toDate?: () => Date })?.toDate?.()?.getTime() ?? 0;
    const bTime = (b.completedAt as { toDate?: () => Date })?.toDate?.()?.getTime() ?? 0;
    return bTime - aTime;
  });

  sessions = sessions.slice(0, limit);

  // Fetch student profiles
  const studentIds = [...new Set(sessions.map(s => s.studentId as string))];
  const studentMap: Record<string, { displayName: string; email: string }> = {};
  for (const sid of studentIds) {
    try {
      const doc = await adminDb.collection('users').doc(sid).get();
      if (doc.exists) studentMap[sid] = { displayName: doc.data()?.displayName || 'Unknown', email: doc.data()?.email || '' };
    } catch { studentMap[sid] = { displayName: 'Unknown', email: '' }; }
  }

  const results = sessions.map(s => {
    const student = studentMap[s.studentId as string] || { displayName: 'Unknown', email: '' };
    const stageResponses = (s.stageResponses as Array<Record<string, unknown>>) || [];
    return {
      id: s.id,
      studentId: s.studentId,
      studentName: student.displayName,
      studentEmail: student.email,
      startedAt: (s.startedAt as { toDate?: () => Date })?.toDate?.()?.toISOString() ?? null,
      completedAt: (s.completedAt as { toDate?: () => Date })?.toDate?.()?.toISOString() ?? null,
      status: s.status,
      finalLevel: s.finalLevel,
      numericScore: s.numericScore,
      indicatorScores: s.indicatorScores,
      totalCorrect: stageResponses.reduce((sum, sr) => sum + ((sr.correctCount as number) || 0), 0),
      totalQuestions: 21,
      anomalyFlags: s.anomalyFlags || [],
      tabSwitchCount: s.tabSwitchCount || 0,
      accessCodeId: s.accessCodeId,
      stageResponses: stageResponses.map(sr => ({
        stage: sr.stage,
        path: sr.path,
        correctCount: sr.correctCount,
        score: sr.score,
      })),
    };
  });

  return NextResponse.json({ results, total: results.length });
}
