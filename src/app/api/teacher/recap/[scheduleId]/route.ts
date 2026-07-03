import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyTeacher } from '@/lib/auth-helpers';

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

  return NextResponse.json({
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
