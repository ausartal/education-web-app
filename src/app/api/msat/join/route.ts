import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, runTransaction } from '@/lib/firebase-admin';
import { FieldValue } from '@/lib/pg-firestore';
import { advanceBreakIfDue } from '@/lib/msat-server';
import { ACTIVE_SESSION_STATUSES } from '@/lib/msat-session';
import { consumeRateLimit } from '@/lib/rate-limit-server';
import { rateLimitMessage } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

type Data = Record<string, unknown>;

function examPayload(id: string, exam: Data) {
  return {
    id,
    title: exam.title,
    code: exam.code,
    totalStages: exam.totalStages,
    questionsPerStage: exam.questionsPerStage,
    durationPerStage: (exam.durationPerStage as number | undefined) ?? 30,
    breakDuration: (exam.breakDuration as number | undefined) ?? 10,
  };
}

type JoinOutcome =
  | { kind: 'rejected'; status: number; error: string }
  | { kind: 'existing'; sessionId: string; status: string }
  | { kind: 'created'; sessionId: string; status: string; exam: Data };

/**
 * POST /api/msat/join
 * Student enters exam code → validate → create session or enter waiting room.
 * Joins for one exam are serialised so use limits and one-session-per-student
 * cannot be bypassed with concurrent requests.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { code?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { code } = body;
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Kode ujian diperlukan' }, { status: 400 });
  }

  const limit = await consumeRateLimit(`msat_join:${decoded.uid}`, 15, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: rateLimitMessage(limit.retryAfterSec) }, { status: 429 });
  }

  try {
    const codeSnap = await adminDb.collection('msat_access_code')
      .where('code', '==', code.toUpperCase().trim())
      .where('status', 'in', ['active', 'in_progress'])
      .limit(1)
      .get();

    if (codeSnap.empty) {
      return NextResponse.json({ error: 'Kode ujian tidak valid atau sudah tidak aktif' }, { status: 404 });
    }

    const examId = codeSnap.docs[0].id;
    const examRef = adminDb.collection('msat_access_code').doc(examId);

    const examUserDoc = await adminDb.collection('exam_users').doc(decoded.uid).get();
    const isExamUser = examUserDoc.exists() && examUserDoc.data()?.isActive === true;
    let studentName = 'Siswa';
    if (isExamUser) {
      studentName = examUserDoc.data()?.displayName ?? 'Peserta';
    } else {
      const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
      studentName = userDoc.data()?.displayName ?? 'Siswa';
    }

    const outcome = await runTransaction(async (tx): Promise<JoinOutcome> => {
      await tx.lock(`msat_join:${examId}`);

      const examSnap = await tx.get(examRef);
      const exam = examSnap.exists() ? (examSnap.data() as Data) : null;
      if (!exam || !['active', 'in_progress'].includes(exam.status as string)) {
        return { kind: 'rejected', status: 404, error: 'Kode ujian tidak valid atau sudah tidak aktif' };
      }

      const expiresAt = exam.expiresAt as { _seconds?: number; toDate?: () => Date } | null | undefined;
      if (expiresAt) {
        const expiry = expiresAt._seconds ? new Date(expiresAt._seconds * 1000) : expiresAt.toDate?.();
        if (expiry && expiry < new Date()) {
          return { kind: 'rejected', status: 410, error: 'Kode ujian sudah kedaluwarsa' };
        }
      }

      // One attempt per student and exam: resume an active session, or send
      // the student to the finished one instead of creating another.
      const sessionsSnap = await adminDb.collection('msat_sessions')
        .where('examId', '==', examId)
        .where('studentId', '==', decoded.uid)
        .get();

      const sessions: Array<Data & { id: string }> = sessionsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Data) }));
      const active = sessions.find((s) => (ACTIVE_SESSION_STATUSES as readonly string[]).includes(s.status as string));
      if (active) return { kind: 'existing', sessionId: active.id, status: active.status as string };
      const finished = sessions.filter((s) => s.status !== 'cancelled');
      if (finished.length > 0) return { kind: 'existing', sessionId: finished[0].id, status: 'completed' };

      const maxUses = (exam.maxUses as number | undefined) ?? 0;
      if (maxUses > 0 && ((exam.currentUses as number | undefined) ?? 0) >= maxUses) {
        return { kind: 'rejected', status: 429, error: 'Kode ujian sudah mencapai batas maksimal penggunaan' };
      }

      const examIsActive = exam.status === 'in_progress';
      const initialStatus = examIsActive ? 'in_progress' : 'waiting';
      const sessionRef = adminDb.collection('msat_sessions').doc();

      await tx.set(sessionRef, {
        studentId: decoded.uid,
        studentName,
        examId,
        examCode: String(exam.code).toUpperCase(),
        status: initialStatus,
        startedAt: examIsActive ? FieldValue.serverTimestamp() : null,
        completedAt: null,
        currentStage: 1,
        currentStageDifficulty: 'medium',
        stagePath: ['medium'],
        stageResponses: [],
        stageState: {},
        draft: null,
        violations: 0,
        breakStartedAt: null,
        breakEndsAt: null,
        breakSkippedBy: null,
        finalScore: null,
        predikat: null,
        peringkat: null,
        conclusions: null,
        resultsReleasedAt: null,
        resultsReleasedBy: null,
        anomalyFlags: [],
        durationMinutes: (exam.durationPerStage as number | undefined) ?? 30,
        createdAt: FieldValue.serverTimestamp(),
      });

      // Token decrement stays disabled until the payment flow exists.
      await tx.update(examRef, { currentUses: FieldValue.increment(1) });

      if (!examIsActive) {
        await tx.set(adminDb.collection('msat_waiting_room').doc(examId), {
          examId,
          [`students.${decoded.uid}`]: {
            joinedAt: FieldValue.serverTimestamp(),
            displayName: studentName,
            sessionId: sessionRef.id,
            ready: true,
          },
        }, { merge: true });
      }

      return { kind: 'created', sessionId: sessionRef.id, status: initialStatus, exam };
    });

    if (outcome.kind === 'rejected') {
      return NextResponse.json({ error: outcome.error }, { status: outcome.status });
    }

    if (outcome.kind === 'existing') {
      const status = (await advanceBreakIfDue(outcome.sessionId)) ?? outcome.status;
      const examSnap = await examRef.get();
      return NextResponse.json({
        sessionId: outcome.sessionId,
        status,
        resumed: true,
        exam: examPayload(examId, examSnap.data() as Data),
      });
    }

    await adminDb.collection('audit_logs').add({
      actorId: decoded.uid,
      actorRole: 'student',
      action: 'join_msat_exam',
      targetId: outcome.sessionId,
      targetType: 'msat_session',
      details: { examId, code: outcome.exam.code, initialStatus: outcome.status },
      timestamp: new Date(),
    });

    return NextResponse.json({
      sessionId: outcome.sessionId,
      status: outcome.status,
      resumed: false,
      exam: examPayload(examId, outcome.exam),
    }, { status: 201 });

  } catch (err) {
    console.error('MSAT join error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
