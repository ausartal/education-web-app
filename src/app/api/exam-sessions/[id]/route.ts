import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { toMillis } from '@/lib/msat-session';
import {
  assembleAdaptiveQuestions,
  sessionDeadlineMs,
  stripCustomQuestions,
  type CustomQuestionLike,
} from '@/lib/class-exam';

export const dynamic = 'force-dynamic';

/**
 * GET /api/exam-sessions/[id]
 * Everything the exam screen needs to continue a running session: questions
 * (without answer keys), progress, saved draft and the server deadline.
 * Opening the exam from another tab or after a refresh uses this, not browser storage.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const header = req.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let uid: string;
  try {
    uid = (await adminAuth.verifyIdToken(header.slice(7))).uid;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const snap = await adminDb.collection('exam_sessions').doc(params.id).get();
    if (!snap.exists()) return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
    const session = snap.data()!;

    if (session.studentId !== uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (session.status !== 'in_progress') {
      return NextResponse.json({ error: 'Sesi tidak sedang berjalan', status: session.status }, { status: 409 });
    }

    const scheduleSnap = await adminDb.collection('exam_schedules').doc(session.examScheduleId as string).get();
    if (!scheduleSnap.exists()) return NextResponse.json({ error: 'Jadwal ujian tidak ditemukan' }, { status: 404 });
    const schedule = scheduleSnap.data()!;

    const mode = (session.examType as string) || (schedule.examType as string) || 'tp';
    const durationMinutes = (session.durationMinutes as number) || (schedule.durationMinutes as number) || 50;
    const startedAtMs = toMillis(session.startedAt) ?? Date.now();
    const base = {
      sessionId: snap.id,
      mode,
      schedule: {
        title: schedule.title,
        durationMinutes,
        domainIds: (schedule.domainIds as string[]) ?? [],
      },
      endsAt: sessionDeadlineMs(startedAtMs, durationMinutes),
      serverNow: Date.now(),
    };

    if (mode === 'custom' || mode === 'manual') {
      const questions = (schedule.customQuestions as CustomQuestionLike[]) ?? [];
      return NextResponse.json({
        ...base,
        customQuestions: stripCustomQuestions(questions),
        customAnswers: (session.draftAnswers as Record<string, string>) ?? {},
      });
    }

    const domainIds = (schedule.domainIds as string[]) ?? [];
    const questionDocs: Array<{ id: string; data: Record<string, unknown> }> = [];
    for (let i = 0; i < domainIds.length; i += 10) {
      const chunk = domainIds.slice(i, i + 10);
      const qs = await adminDb.collection('exam_questions')
        .where('domainId', 'in', chunk)
        .where('status', '==', 'active')
        .get();
      qs.docs.forEach((d) => questionDocs.push({ id: d.id, data: d.data() as Record<string, unknown> }));
    }

    const pinnedIds = (session.questionIds as string[] | undefined) ?? [];
    const sessionDocs = pinnedIds.length > 0 ? questionDocs.filter((q) => pinnedIds.includes(q.id)) : questionDocs;
    const { questionsByDomain, missingDomains, missingNames } = assembleAdaptiveQuestions(
      sessionDocs,
      schedule.teacherId as string,
      domainIds,
    );
    if (missingDomains.length > 0) {
      return NextResponse.json({
        error: `Bank soal belum lengkap untuk: ${missingNames.join(', ')}`,
      }, { status: 422 });
    }

    return NextResponse.json({
      ...base,
      questions: questionsByDomain,
      completedDomains: ((session.domainResponses as unknown[]) ?? []).length,
    });
  } catch (err) {
    console.error('[exam-sessions GET]', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
