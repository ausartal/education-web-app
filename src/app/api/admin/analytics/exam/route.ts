import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

const scoreOf = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null;

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [examSnapshot, sessionSnapshot] = await Promise.all([
    adminDb.collection('msat_access_code').get(),
    adminDb.collection('msat_sessions').get(),
  ]);

  const exams = new Map(examSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() }]));
  const statusDistribution: Record<string, number> = {};
  const proficiencyDistribution: Record<string, number> = {};
  const domainTotals: Record<string, { score: number; count: number }> = {};
  const examTotals: Record<string, { title: string; sessions: number; completed: number; score: number; scoreCount: number; flagged: number }> = {};
  let completed = 0;
  let flagged = 0;
  let scoreTotal = 0;
  let scoreCount = 0;
  let durationTotal = 0;
  let durationCount = 0;

  sessionSnapshot.docs.forEach(document => {
    const session = document.data();
    const status = typeof session.status === 'string' ? session.status : 'unknown';
    statusDistribution[status] = (statusDistribution[status] ?? 0) + 1;
    if (status === 'completed') completed++;
    if ((session.anomalyFlags?.length ?? 0) > 0 || status === 'flagged') flagged++;

    const score = scoreOf(session.finalScore) ?? scoreOf(session.numericScore);
    if (score !== null) {
      scoreTotal += score;
      scoreCount++;
    }
    const startedSeconds = session.startedAt?._seconds ?? session.startedAt?.seconds;
    const completedSeconds = session.completedAt?._seconds ?? session.completedAt?.seconds;
    if (startedSeconds && completedSeconds && completedSeconds >= startedSeconds) {
      durationTotal += (completedSeconds - startedSeconds) / 60;
      durationCount++;
    }

    const proficiency = session.predikat ?? session.result?.proficiencyLevel;
    if (typeof proficiency === 'string' && proficiency) {
      proficiencyDistribution[proficiency] = (proficiencyDistribution[proficiency] ?? 0) + 1;
    }

    const responses = Array.isArray(session.stageResponses) ? session.stageResponses : [];
    responses.forEach((response: Record<string, unknown>) => {
      [
        ['Knowing', response.knowingCorrect],
        ['Applying', response.applyingCorrect],
        ['Reasoning', response.reasoningCorrect],
      ].forEach(([label, value]) => {
        if (typeof value !== 'number') return;
        const current = domainTotals[label as string] ?? { score: 0, count: 0 };
        current.score += value;
        current.count++;
        domainTotals[label as string] = current;
      });
    });

    const examId = typeof session.examId === 'string' ? session.examId : 'unknown';
    const exam = exams.get(examId) as Record<string, unknown> | undefined;
    const current = examTotals[examId] ?? {
      title: typeof exam?.title === 'string' ? exam.title : 'Ujian tanpa nama',
      sessions: 0, completed: 0, score: 0, scoreCount: 0, flagged: 0,
    };
    current.sessions++;
    if (status === 'completed') current.completed++;
    if ((session.anomalyFlags?.length ?? 0) > 0 || status === 'flagged') current.flagged++;
    if (score !== null) {
      current.score += score;
      current.scoreCount++;
    }
    examTotals[examId] = current;
  });

  const totalSessions = sessionSnapshot.size;
  const byExam = Object.entries(examTotals)
    .map(([id, value]) => ({
      id,
      title: value.title,
      sessions: value.sessions,
      completed: value.completed,
      completionRate: value.sessions ? Math.round((value.completed / value.sessions) * 100) : 0,
      averageScore: value.scoreCount ? Math.round(value.score / value.scoreCount) : 0,
      flagged: value.flagged,
    }))
    .sort((a, b) => b.sessions - a.sessions);

  return NextResponse.json({
    totals: {
      exams: examSnapshot.size,
      sessions: totalSessions,
      completed,
      flagged,
      completionRate: totalSessions ? Math.round((completed / totalSessions) * 100) : 0,
      anomalyRate: totalSessions ? Math.round((flagged / totalSessions) * 100) : 0,
      averageScore: scoreCount ? Math.round(scoreTotal / scoreCount) : 0,
      averageDurationMinutes: durationCount ? Math.round(durationTotal / durationCount) : 0,
    },
    statusDistribution,
    proficiencyDistribution,
    cognitivePerformance: Object.entries(domainTotals).map(([label, value]) => ({
      label,
      averageCorrect: value.count ? Number((value.score / value.count).toFixed(1)) : 0,
      observations: value.count,
    })),
    byExam,
  });
}
