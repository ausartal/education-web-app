import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyTeacher } from '@/lib/auth-helpers';
import { toCsv, csvFileName } from '@/lib/csv';
import { buildRecapRows, RECAP_COLUMNS } from '@/lib/gradebook';
import { analyzeItems, type ItemAnswer, type ItemQuestion } from '@/lib/item-analysis';

export const dynamic = 'force-dynamic';

function tsToDate(ts: Record<string, number> | null | undefined): Date | null {
  if (!ts) return null;
  const secs = ts.seconds ?? ts._seconds;
  return secs ? new Date(secs * 1000) : null;
}

export async function GET(req: NextRequest, { params }: { params: { scheduleId: string } }) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const scheduleSnap = await adminDb.collection('exam_schedules').doc(params.scheduleId).get();
  if (!scheduleSnap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const schedule = scheduleSnap.data()!;
  if (schedule.teacherId !== teacher.uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Get all sessions for this schedule
  const sessionsSnap = await adminDb.collection('exam_sessions')
    .where('examScheduleId', '==', params.scheduleId)
    .get();

  // Get student names
  const studentIds = Array.from(new Set(sessionsSnap.docs.map(d => d.data().studentId)));
  const userDocs = await Promise.all(studentIds.map(uid => adminDb.collection('users').doc(uid).get()));
  const userMap: Record<string, string> = {};
  userDocs.forEach(d => { if (d.exists) userMap[d.id] = d.data()!.displayName || d.id.slice(0, 8); });

  const sortedDocs = [...sessionsSnap.docs].sort((a, b) => {
    const ta = tsToDate(a.data().startedAt as Record<string, number>)?.getTime() ?? 0;
    const tb = tsToDate(b.data().startedAt as Record<string, number>)?.getTime() ?? 0;
    return ta - tb; // ascending by start time to assign attempt numbers
  });

  // Assign attempt numbers per student
  const studentAttemptCount: Record<string, number> = {};
  const rawSessions = sortedDocs.map(d => {
    const data = d.data();
    const sid = data.studentId as string;
    studentAttemptCount[sid] = (studentAttemptCount[sid] ?? 0) + 1;
    const completedAt = tsToDate(data.completedAt as Record<string, number>);
    return {
      id: d.id,
      studentId: sid,
      studentName: userMap[sid] || sid?.slice(0, 8),
      status: data.status as string,
      numericScore: (data.numericScore as number) ?? null,
      domainResponses: (data.domainResponses as unknown[]) || [],
      anomalyFlags: (data.anomalyFlags as string[]) || [],
      completedAt: completedAt?.toISOString() ?? null,
      startedAt: tsToDate(data.startedAt as Record<string, number>)?.toISOString() ?? null,
      examType: (data.examType as string) || 'tp',
      customAnswers: (data.customAnswers as unknown[]) || [],
      attemptNumber: studentAttemptCount[sid],
    };
  });

  // Sort final list: completed first (by score desc), then in-progress
  const sessions = rawSessions.sort((a, b) => {
    if (a.studentId !== b.studentId) return a.studentName.localeCompare(b.studentName);
    return a.attemptNumber - b.attemptNumber;
  });

  // Compute total attempts per student
  const totalAttemptsMap: Record<string, number> = {};
  sessions.forEach(s => { totalAttemptsMap[s.studentId] = Math.max(totalAttemptsMap[s.studentId] ?? 0, s.attemptNumber); });

  const sessionsWithTotal = sessions.map(s => ({ ...s, totalAttempts: totalAttemptsMap[s.studentId] }));

  // Compute class-level stats using best score per student
  const completed = sessions.filter(s => s.status === 'completed');
  const uniqueStudentIds = Array.from(new Set(sessions.map(s => s.studentId)));
  const studentBestScore: Record<string, number> = {};
  completed.forEach(s => {
    if (s.numericScore !== null) {
      studentBestScore[s.studentId] = Math.max(studentBestScore[s.studentId] ?? 0, s.numericScore);
    }
  });
  const avgScore = Object.keys(studentBestScore).length > 0
    ? Math.round(Object.values(studentBestScore).reduce((a, b) => a + b, 0) / Object.keys(studentBestScore).length)
    : null;

  if (new URL(req.url).searchParams.get('format') === 'csv') {
    const csv = toCsv(RECAP_COLUMNS, buildRecapRows(sessionsWithTotal));
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${csvFileName(`rekap-${(schedule.title as string) ?? 'ujian'}`)}"`,
      },
    });
  }

  // Item analysis uses each student's best finished attempt.
  const bestByStudent = new Map<string, (typeof completed)[number]>();
  for (const s of completed) {
    const current = bestByStudent.get(s.studentId);
    if ((s.numericScore ?? -1) > (current?.numericScore ?? -1) || !current) bestByStudent.set(s.studentId, s);
  }

  const examType = (schedule.examType as string) || 'tp';
  const itemQuestions = new Map<string, ItemQuestion>();
  const itemAnswers: ItemAnswer[] = [];

  if (examType === 'custom' || examType === 'manual') {
    const customQuestions = (schedule.customQuestions as Array<{ id: string; stem: string; correctAnswer: string }>) ?? [];
    customQuestions.forEach((q) => itemQuestions.set(q.id, { id: q.id, stem: q.stem, correctAnswer: q.correctAnswer }));
    for (const s of bestByStudent.values()) {
      for (const a of (s.customAnswers as Array<{ questionId: string; selectedAnswer: string }>) ?? []) {
        const q = itemQuestions.get(a.questionId);
        if (!q) continue;
        itemAnswers.push({
          studentId: s.studentId,
          questionId: a.questionId,
          selectedAnswer: a.selectedAnswer ?? null,
          isCorrect: a.selectedAnswer === q.correctAnswer,
        });
      }
    }
  } else {
    const usedIds = new Set<string>();
    for (const s of bestByStudent.values()) {
      const raw = s.domainResponses as unknown;
      const domains = (Array.isArray(raw) ? raw : Object.values((raw as object) ?? {})) as Array<Record<string, { questionId?: string; selectedAnswer?: string; isCorrect?: boolean }>>;
      for (const domain of domains) {
        for (const tier of [domain.tier1, domain.tier2, domain.tier3]) {
          if (!tier?.questionId) continue;
          usedIds.add(tier.questionId);
          itemAnswers.push({
            studentId: s.studentId,
            questionId: tier.questionId,
            selectedAnswer: tier.selectedAnswer ?? null,
            isCorrect: tier.isCorrect === true,
          });
        }
      }
    }
    const docs = await Promise.all([...usedIds].map((qid) => adminDb.collection('exam_questions').doc(qid).get()));
    docs.forEach((d, i) => {
      if (!d.exists()) return;
      const q = d.data() as { stem?: string; correctAnswer?: string; domainName?: string; tierPath?: string };
      itemQuestions.set([...usedIds][i], {
        id: [...usedIds][i],
        stem: q.stem ?? '',
        correctAnswer: q.correctAnswer ?? null,
        label: [q.domainName, q.tierPath].filter(Boolean).join(' · '),
      });
    });
  }

  const items = analyzeItems([...itemQuestions.values()], itemAnswers);

  return NextResponse.json({
    items,
    respondents: bestByStudent.size,
    schedule: {
      id: scheduleSnap.id, ...schedule,
      examType: schedule.examType || 'tp',
      maxAttempts: schedule.maxAttempts ?? 1,
    },
    sessions: sessionsWithTotal,
    stats: {
      total: uniqueStudentIds.length,
      totalSessions: sessions.length,
      completed: Object.keys(studentBestScore).length,
      inProgress: sessions.filter(s => s.status === 'in_progress').length,
      avgScore,
    },
  });
}
