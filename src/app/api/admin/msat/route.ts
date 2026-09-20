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

  // Verify admin role
  const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Fetch all collections in parallel
    const [questionsSnap, accessCodesSnap, sessionsSnap] = await Promise.all([
      adminDb.collection('msat_question').get(),
      adminDb.collection('msat_access_code').get(),
      adminDb.collection('msat_sessions').get(),
    ]);

    // Process questions
    const questions: Record<string, unknown>[] = [];
    const difficultyCount: Record<string, number> = {};
    const categoryLabelCount: Record<string, number> = {};
    const domainCount: Record<string, number> = {};
    const stageCount: Record<number, number> = {};
    let totalQuestions = 0;

    questionsSnap.forEach(doc => {
      const d = doc.data();
      totalQuestions++;
      questions.push({ id: doc.id, ...d });

      if (d.difficulty) difficultyCount[d.difficulty] = (difficultyCount[d.difficulty] || 0) + 1;
      if (d.categoryLabel) categoryLabelCount[d.categoryLabel] = (categoryLabelCount[d.categoryLabel] || 0) + 1;
      if (d.cognitiveDomain) domainCount[d.cognitiveDomain] = (domainCount[d.cognitiveDomain] || 0) + 1;
      if (d.stage) stageCount[d.stage] = (stageCount[d.stage] || 0) + 1;
    });

    // Process access codes (exams)
    const exams: Record<string, unknown>[] = [];
    let activeExams = 0;
    let totalExams = 0;

    const sessionsByExam = new Map<string, { total: number; waiting: number; inProgress: number; onBreak: number; completed: number; flagged: number }>();
    sessionsSnap.forEach(doc => {
      const session = doc.data();
      const examId = String(session.examId ?? '');
      if (!examId) return;
      const summary = sessionsByExam.get(examId) ?? { total: 0, waiting: 0, inProgress: 0, onBreak: 0, completed: 0, flagged: 0 };
      summary.total++;
      if (session.status === 'waiting') summary.waiting++;
      if (session.status === 'in_progress') summary.inProgress++;
      if (session.status === 'on_break') summary.onBreak++;
      if (session.status === 'completed') summary.completed++;
      if (session.status === 'flagged' || (Array.isArray(session.anomalyFlags) && session.anomalyFlags.length > 0)) summary.flagged++;
      sessionsByExam.set(examId, summary);
    });

    let liveParticipants = 0;
    let flaggedSessions = 0;
    sessionsByExam.forEach(summary => {
      liveParticipants += summary.waiting + summary.inProgress + summary.onBreak;
      flaggedSessions += summary.flagged;
    });

    accessCodesSnap.forEach(doc => {
      const d = doc.data();
      totalExams++;
      if (d.status === 'active') activeExams++;
      exams.push({ id: doc.id, ...d, sessionSummary: sessionsByExam.get(doc.id) ?? { total: 0, waiting: 0, inProgress: 0, onBreak: 0, completed: 0, flagged: 0 } });
    });

    return NextResponse.json({
      stats: {
        totalQuestions,
        totalExams,
        activeExams,
        liveParticipants,
        flaggedSessions,
        difficultyCount,
        categoryLabelCount,
        domainCount,
        stageCount,
      },
      questions,
      exams,
    });
  } catch (err) {
    console.error('MSAT stats error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
