import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { KPSQuestion, KPSQuestionResponse, KPSStageResponse, KPSIndicator, KPSQuestionType, KPS_CONFIG } from '@/types/kps';
import { scoreQuestion, isResponseCorrect, getNextStagePath, getStage3Level, countCorrect, calculateStageScore } from '@/lib/kps-engine';

export const dynamic = 'force-dynamic';

// POST: Submit completed stage OR record tab-switch event
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: sessionId } = await params;
  const sessionDoc = await adminDb.collection('kps_exam_sessions').doc(sessionId).get();
  if (!sessionDoc.exists) return NextResponse.json({ error: 'Session tidak ditemukan' }, { status: 404 });

  const session = sessionDoc.data()!;
  if (session.studentId !== decoded.uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (session.status !== 'in_progress') return NextResponse.json({ error: 'Session sudah selesai' }, { status: 400 });

  // H2 fix: Server-side time validation
  const startedAt = session.startedAt?.toDate?.() ?? new Date(session.startedAt);
  const deadlineMs = startedAt.getTime() + (session.durationMinutes || KPS_CONFIG.totalDurationMinutes) * 60 * 1000;
  if (Date.now() > deadlineMs + 60_000) { // 1 min grace period
    return NextResponse.json({ error: 'Waktu ujian telah habis' }, { status: 408 });
  }

  let body: {
    stage: 1 | 2 | 3;
    responses: Array<{
      questionId: string;
      answer: Partial<KPSQuestionResponse>;
      timeSpentMs: number;
    }>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { stage, responses: rawResponses } = body;
  if (!stage || !rawResponses || rawResponses.length !== KPS_CONFIG.questionsPerStage) {
    return NextResponse.json({ error: `Diperlukan ${KPS_CONFIG.questionsPerStage} jawaban untuk stage ${stage}` }, { status: 400 });
  }

  // Re-score all answers server-side
  const scoredResponses: KPSQuestionResponse[] = [];
  for (const raw of rawResponses) {
    const questionDoc = await adminDb.collection('kps_questions').doc(raw.questionId).get();
    if (!questionDoc.exists) continue;

    const questionData = questionDoc.data()!;
    const question = { id: questionDoc.id, ...questionData } as KPSQuestion;

    const response: KPSQuestionResponse = {
      questionId: raw.questionId,
      indicator: questionData.indicator as KPSIndicator,
      questionType: questionData.questionType as KPSQuestionType,
      selectedAnswer: raw.answer.selectedAnswer,
      selectedAnswers: raw.answer.selectedAnswers,
      booleanAnswer: raw.answer.booleanAnswer,
      booleanAnswers: raw.answer.booleanAnswers,
      matchedPairs: raw.answer.matchedPairs,
      isCorrect: false,
      score: 0,
      timeSpentMs: raw.timeSpentMs || 0,
    };

    const score = scoreQuestion(question, response);
    response.score = score;
    response.isCorrect = isResponseCorrect(score);
    scoredResponses.push(response);
  }

  const correctCount = countCorrect(scoredResponses);
  const stageScore = calculateStageScore(scoredResponses);

  // Determine path for this stage
  const stage2Path = session.stage2Path;
  let currentPath: 'tinggi' | 'rendah' | null = null;
  if (stage === 1) {
    currentPath = getNextStagePath(1, null, correctCount);
  } else if (stage === 2) {
    currentPath = getNextStagePath(2, stage2Path, correctCount);
  } else {
    currentPath = getNextStagePath(3, stage2Path, correctCount);
  }

  // Build stage response
  const stageResponse: KPSStageResponse = {
    stage,
    path: stage === 1 ? null : currentPath,
    questions: scoredResponses,
    correctCount,
    score: stageScore,
    submittedAt: FieldValue.serverTimestamp() as unknown as import('firebase/firestore').Timestamp,
  };

  // Update session
  const updateData: Record<string, unknown> = {
    stageResponses: FieldValue.arrayUnion(stageResponse),
  };

  if (stage === 1) {
    updateData.stage2Path = currentPath;
    updateData.currentStage = 2;
  } else if (stage === 2) {
    updateData.stage3Path = currentPath;
    updateData.currentStage = 3;
  } else {
    // Stage 3 submitted — don't update currentStage, let complete handle it
    updateData.currentStage = 3;
  }

  await sessionDoc.ref.update(updateData);

  // If stage 3, return completion signal
  if (stage === 3) {
    return NextResponse.json({
      stageCompleted: 3,
      correctCount,
      stageScore,
      completed: true,
    });
  }

  // Fetch next stage questions
  // Stage 3 reuses stage 2 questions (same difficulty pool, different scoring context)
  const nextStage = stage + 1;
  const queryStage = nextStage === 3 ? 2 : nextStage;
  let nextLevel: string;
  if (nextStage === 2) {
    nextLevel = currentPath === 'tinggi' ? 'tinggi' : 'rendah';
  } else {
    // Stage 3: use the combination of stage2Path and currentPath
    const s2Path = stage2Path!;
    const s3Path = currentPath!;
    const level = getStage3Level(s2Path, s3Path);
    nextLevel = level;
  }

  const questionsSnap = await adminDb.collection('kps_questions')
    .where('difficultyLevel', '==', nextLevel)
    .where('stage', '==', queryStage)
    .where('status', '==', 'active')
    .orderBy('order')
    .get();

  const stimulusSnap = await adminDb.collection('kps_stimuli')
    .where('level', '==', nextLevel)
    .where('stage', '==', queryStage)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  const questions = questionsSnap.docs.map((d) => {
    const data = d.data();
    const { correctAnswer, correctAnswers, correctMatches, statements, ...safe } = data;
    if (data.questionType === 'complex_true_false' && data.statements) {
      return { ...safe, id: d.id, statements: data.statements.map((s: { id: string; text: string }) => ({ id: s.id, text: s.text })) };
    }
    return { ...safe, id: d.id };
  });

  const stimulus = stimulusSnap.empty ? null : { id: stimulusSnap.docs[0].id, ...stimulusSnap.docs[0].data() };

  // Update stimulusIds
  if (!stimulusSnap.empty) {
    await sessionDoc.ref.update({
      stimulusIds: FieldValue.arrayUnion(stimulusSnap.docs[0].id),
    });
  }

  return NextResponse.json({
    stageCompleted: stage,
    correctCount,
    stageScore,
    nextStage,
    nextPath: currentPath,
    stimulus,
    questions,
  });
}
