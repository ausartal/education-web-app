import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyStudent } from '@/lib/auth-helpers';
import type { MASTExam, MASTQuestionForStudent, MASTSession } from '@/types/mast';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // ── Auth ────────────────────────────────────────────────────────────
  const student = await verifyStudent(req);
  if (!student) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // ── Fetch session ───────────────────────────────────────────────────
  const sessionSnap = await adminDb.collection('mast_sessions').doc(params.id).get();
  if (!sessionSnap.exists) {
    return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
  }

  const session = sessionSnap.data() as MASTSession;

  // ── Ownership check ─────────────────────────────────────────────────
  if (session.studentId !== student.uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ── Fetch exam ──────────────────────────────────────────────────────
  const examSnap = await adminDb.collection('mast_exams').doc(session.examId).get();
  if (!examSnap.exists) {
    return NextResponse.json({ error: 'Ujian tidak ditemukan' }, { status: 404 });
  }
  const exam = { id: examSnap.id, ...examSnap.data() } as MASTExam;

  // ── Determine question IDs for current stage ────────────────────────
  let questionIds: string[];
  if (session.currentStage === 1) {
    questionIds = exam.stage1QuestionIds;
  } else if (session.currentStage === 2) {
    questionIds =
      session.currentStageDifficulty === 'high'
        ? exam.stage2QuestionIds.high
        : exam.stage2QuestionIds.low;
  } else {
    // Stage 3
    questionIds =
      session.currentStageDifficulty === 'high'
        ? exam.stage3QuestionIds.high
        : session.currentStageDifficulty === 'medium'
          ? exam.stage3QuestionIds.medium
          : exam.stage3QuestionIds.low;
  }

  // ── Fetch questions (strip correctAnswer + explanation) ─────────────
  const questions: MASTQuestionForStudent[] = [];

  if (questionIds.length > 0) {
    // Firestore 'in' limit is 10 — fetch in chunks
    const chunks: string[][] = [];
    for (let i = 0; i < questionIds.length; i += 10) {
      chunks.push(questionIds.slice(i, i + 10));
    }
    for (const chunk of chunks) {
      const qSnap = await adminDb
        .collection('mast_questions')
        .where('__name__', 'in', chunk)
        .get();
      for (const qDoc of qSnap.docs) {
        const data = qDoc.data();
        const { correctAnswer: _ca, explanation: _exp, ...safeData } = data;
        questions.push({ id: qDoc.id, ...safeData } as MASTQuestionForStudent);
      }
    }
    // Preserve original order
    const orderMap = new Map(questionIds.map((id, idx) => [id, idx]));
    questions.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
  }

  return NextResponse.json({
    exam: {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      durationPerStage: exam.durationPerStage,
      breakDuration: exam.breakDuration,
      totalStages: exam.totalStages,
      mode: exam.mode,
    },
    questions,
    currentStage: session.currentStage,
    currentStageDifficulty: session.currentStageDifficulty,
  });
}
