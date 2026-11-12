import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * One-shot answer checker for MSAT adaptive flow.
 *
 * Anti-oracle protections:
 * 1. Each (sessionId, questionId) can only be checked ONCE — the first selectedAnswer
 *    is locked in and its correctness is stored. Re-probing with a different answer → 409.
 * 2. Same (questionId, selectedAnswer) re-submission is idempotent (returns stored result).
 * 3. questionId must belong to the session's question pool (questionIds).
 * 4. Time-window enforcement: reject if session is past the deadline.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.slice(7);

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const sessionSnap = await adminDb.collection('exam_sessions').doc(params.id).get();
  if (!sessionSnap.exists) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  const session = sessionSnap.data()!;
  if (session.studentId !== decoded.uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (session.status !== 'in_progress') return NextResponse.json({ error: 'Session is not in progress' }, { status: 409 });

  // Time-window enforcement
  const durationMs = ((session.durationMinutes as number) || 50) * 60 * 1000;
  const graceMs = 5 * 60 * 1000;
  const startedAt = session.startedAt as { seconds?: number; _seconds?: number } | null;
  if (startedAt) {
    const startMs = ((startedAt.seconds ?? startedAt._seconds ?? 0) * 1000);
    if (Date.now() - startMs > durationMs + graceMs) {
      return NextResponse.json({ error: 'Waktu ujian sudah habis' }, { status: 409 });
    }
  }

  let body: { questionId?: string; selectedAnswer?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }
  const { questionId, selectedAnswer } = body;
  if (!questionId || !selectedAnswer) return NextResponse.json({ error: 'questionId and selectedAnswer required' }, { status: 400 });

  // Validate questionId belongs to this session's question pool
  const allowedIds: string[] = session.questionIds || [];
  if (allowedIds.length === 0) {
    return NextResponse.json({ error: 'Session has no question pool' }, { status: 403 });
  }
  if (!allowedIds.includes(questionId)) {
    return NextResponse.json({ error: 'Question not part of this session' }, { status: 403 });
  }

  // ── One-shot lock: check if this question was already checked ──
  const checkedAnswers = (session.checkedAnswers as Record<string, { selectedAnswer: string; isCorrect: boolean; questionVersion?: number }>) || {};
  const prior = checkedAnswers[questionId];

  if (prior) {
    // Same answer re-submitted → idempotent, return stored result
    if (prior.selectedAnswer === selectedAnswer) {
      return NextResponse.json({ isCorrect: prior.isCorrect, questionVersion: prior.questionVersion ?? 1, locked: true });
    }
    // Different answer → reject oracle probing
    return NextResponse.json({ error: 'Jawaban untuk soal ini sudah dikunci' }, { status: 409 });
  }

  // ── First check: compute and lock ──
  const questionSnap = await adminDb.collection('exam_questions').doc(questionId).get();
  if (!questionSnap.exists) return NextResponse.json({ error: 'Question not found' }, { status: 404 });

  const qData = questionSnap.data()!;
  const isCorrect = selectedAnswer === qData.correctAnswer;
  const questionVersion = (qData.version as number) ?? 1;

  // Store the locked answer in the session (read-modify-write on checkedAnswers)
  const updatedChecked = { ...checkedAnswers, [questionId]: { selectedAnswer, isCorrect, questionVersion } };
  await adminDb.collection('exam_sessions').doc(params.id).update({ checkedAnswers: updatedChecked });

  return NextResponse.json({ isCorrect, questionVersion });
}
