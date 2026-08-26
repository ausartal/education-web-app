import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyStudent } from '@/lib/auth-helpers';
import { scoreStage, getNextStageDifficulty } from '@/lib/mast-engine';
import type {
  MASTSession,
  MASTExam,
  MASTQuestion,
  MASTSubmitStageRequest,
  MASTSubmitStageResponse,
  MASTStageResult,
  MASTQuestionResponse,
} from '@/types/mast';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // ── Auth ────────────────────────────────────────────────────────────
  const student = await verifyStudent(req);
  if (!student) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // ── Fetch session ───────────────────────────────────────────────────
  const sessionRef = adminDb.collection('mast_sessions').doc(params.id);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) {
    return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
  }

  const session = sessionSnap.data() as MASTSession;

  // ── Ownership & status checks ───────────────────────────────────────
  if (session.studentId !== student.uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (session.status !== 'in_progress') {
    return NextResponse.json({ error: 'Sesi tidak dalam status in_progress' }, { status: 409 });
  }

  // ── Parse body ──────────────────────────────────────────────────────
  let body: MASTSubmitStageRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.answers || !Array.isArray(body.answers) || body.answers.length === 0) {
    return NextResponse.json({ error: 'answers array required' }, { status: 400 });
  }

  // ── Fetch exam to get question IDs for current stage ────────────────
  const examSnap = await adminDb.collection('mast_exams').doc(session.examId).get();
  if (!examSnap.exists) {
    return NextResponse.json({ error: 'Ujian tidak ditemukan' }, { status: 404 });
  }
  const exam = examSnap.data() as MASTExam;

  // Determine which question IDs belong to the current stage
  let stageQuestionIds: string[];
  if (session.currentStage === 1) {
    stageQuestionIds = exam.stage1QuestionIds;
  } else if (session.currentStage === 2) {
    stageQuestionIds =
      session.currentStageDifficulty === 'high'
        ? exam.stage2QuestionIds.high
        : exam.stage2QuestionIds.low;
  } else {
    // Stage 3
    stageQuestionIds =
      session.currentStageDifficulty === 'high'
        ? exam.stage3QuestionIds.high
        : session.currentStageDifficulty === 'medium'
          ? exam.stage3QuestionIds.medium
          : exam.stage3QuestionIds.low;
  }

  // Validate all submitted question IDs belong to this stage
  const allowedSet = new Set(stageQuestionIds);
  for (const a of body.answers) {
    if (!allowedSet.has(a.questionId)) {
      return NextResponse.json({ error: `Question ${a.questionId} tidak termasuk stage ini` }, { status: 400 });
    }
  }

  // ── Fetch questions from DB to verify answers server-side ───────────
  const questionMap = new Map<string, MASTQuestion>();
  const chunks: string[][] = [];
  for (let i = 0; i < stageQuestionIds.length; i += 10) {
    chunks.push(stageQuestionIds.slice(i, i + 10));
  }
  for (const chunk of chunks) {
    const qSnap = await adminDb
      .collection('mast_questions')
      .where('__name__', 'in', chunk)
      .get();
    for (const qDoc of qSnap.docs) {
      questionMap.set(qDoc.id, { id: qDoc.id, ...qDoc.data() } as MASTQuestion);
    }
  }

  // ── Build answers array with server-side correctness check ──────────
  const scoredAnswers: {
    questionId: string;
    cognitiveDomain: 'knowing' | 'applying' | 'reasoning';
    isCorrect: boolean;
  }[] = [];

  const questionResponses: MASTQuestionResponse[] = [];

  for (const answer of body.answers) {
    const question = questionMap.get(answer.questionId);
    if (!question) {
      return NextResponse.json({ error: `Soal ${answer.questionId} tidak ditemukan` }, { status: 404 });
    }

    const isCorrect = answer.selectedAnswer === question.correctAnswer;

    scoredAnswers.push({
      questionId: answer.questionId,
      cognitiveDomain: question.cognitiveDomain,
      isCorrect,
    });

    questionResponses.push({
      questionId: answer.questionId,
      cognitiveDomain: question.cognitiveDomain,
      selectedAnswer: answer.selectedAnswer,
      isCorrect,
      timeSpentMs: answer.timeSpentMs,
    });
  }

  // ── Score the stage ─────────────────────────────────────────────────
  const stageResult = scoreStage(
    session.currentStage as 1 | 2 | 3,
    session.currentStageDifficulty,
    scoredAnswers,
  );

  // Override the placeholder questions in stageResult with real responses
  stageResult.questions = questionResponses;

  // ── Determine next stage difficulty ─────────────────────────────────
  const nextDifficulty = getNextStageDifficulty(
    session.currentStage as 1 | 2 | 3,
    session.currentStageDifficulty,
    stageResult.passed,
  );

  const stageResultResponse: MASTStageResult = {
    stageNumber: stageResult.stageNumber,
    stageDifficulty: stageResult.stageDifficulty,
    knowingCorrect: stageResult.knowingCorrect,
    applyingCorrect: stageResult.applyingCorrect,
    reasoningCorrect: stageResult.reasoningCorrect,
    totalCorrect: stageResult.totalCorrect,
    passed: stageResult.passed,
    nextStageDifficulty: nextDifficulty,
  };

  // ── Update session ──────────────────────────────────────────────────
  const updatedStageResponses = [...(session.stageResponses || []), stageResult];
  const updatedStagePath = [...(session.stagePath || [])];

  const isLastStage = session.currentStage === 3;

  if (isLastStage) {
    // Stage 3 complete — stay in_progress, student calls /complete next
    await sessionRef.update({
      stageResponses: updatedStageResponses,
      stagePath: updatedStagePath,
      anomalyFlags: FieldValue.arrayUnion(...(stageResult.questions
        ? [] // anomaly detection can be added here
        : [])),
    });
  } else {
    // Not last stage — set on_break with timer
    const nextStage = (session.currentStage + 1) as 2 | 3;
    if (nextDifficulty) updatedStagePath.push(nextDifficulty);

    const breakDurationMs = (exam.breakDuration || 5) * 60 * 1000;
    const breakEndsAtDate = new Date(Date.now() + breakDurationMs);

    await sessionRef.update({
      stageResponses: updatedStageResponses,
      currentStage: nextStage,
      currentStageDifficulty: nextDifficulty,
      stagePath: updatedStagePath,
      status: 'on_break',
      breakStartedAt: FieldValue.serverTimestamp(),
      breakEndsAt: breakEndsAtDate,
    });
  }

  // ── Build response ──────────────────────────────────────────────────
  const breakDurationMin = exam.breakDuration || 5;
  const breakInfo = isLastStage
    ? null
    : {
        active: true,
        durationMinutes: breakDurationMin,
        endsAt: new Date(Date.now() + breakDurationMin * 60 * 1000).toISOString(),
      };

  const response: MASTSubmitStageResponse = {
    stageResult: stageResultResponse,
    break: breakInfo,
  };

  return NextResponse.json(response);
}
