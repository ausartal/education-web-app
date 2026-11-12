import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { filterDraftAnswers, type CustomQuestionLike } from '@/lib/class-exam';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/exam-sessions/[id]/progress
 * Saves the answers a student has chosen so far in a custom/manual exam, so a
 * refresh or another device continues where they left off.
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const header = req.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let uid: string;
  try {
    uid = (await adminAuth.verifyIdToken(header.slice(7))).uid;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { answers?: unknown };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const ref = adminDb.collection('exam_sessions').doc(params.id);
    const snap = await ref.get();
    if (!snap.exists()) return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
    const session = snap.data()!;

    if (session.studentId !== uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (session.status !== 'in_progress') {
      return NextResponse.json({ error: 'Sesi tidak sedang berjalan', status: session.status }, { status: 409 });
    }
    if (session.examType !== 'custom' && session.examType !== 'manual') {
      return NextResponse.json({ error: 'Hanya untuk ujian soal kustom' }, { status: 400 });
    }

    const scheduleSnap = await adminDb.collection('exam_schedules').doc(session.examScheduleId as string).get();
    const questions = ((scheduleSnap.data()?.customQuestions as CustomQuestionLike[]) ?? []).map((q) => q.id);

    await ref.update({ draftAnswers: filterDraftAnswers(body.answers, questions) });
    return NextResponse.json({ saved: true });
  } catch (err) {
    console.error('[exam-sessions progress PUT]', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
