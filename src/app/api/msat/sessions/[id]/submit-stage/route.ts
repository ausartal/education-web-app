import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { calculateStageResult, getNextStageDifficulty, detectAnomalies } from '@/lib/msat-engine';
import type { MSATStageAnswer, MSATCognitiveDomain, MSATStageDifficulty } from '@/types/msat';

export const dynamic = 'force-dynamic';

/**
 * POST /api/msat/sessions/[id]/submit-stage
 * Submit answers for current stage (12 questions).
 * Calculates scores, determines next branch, handles break.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  let body: {
    answers?: Array<{
      questionId: string;
      selectedAnswer: string;
      timeSpentMs: number;
    }>;
  };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.answers || !Array.isArray(body.answers) || body.answers.length !== 12) {
    return NextResponse.json({ error: 'Diperlukan tepat 12 jawaban' }, { status: 400 });
  }

  try {
    const sessionDoc = await adminDb.collection('msat_sessions').doc(id).get();
    if (!sessionDoc.exists) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
    }

    const session = sessionDoc.data()!;

    if (session.studentId !== decoded.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (session.status !== 'in_progress') {
      return NextResponse.json({ error: 'Sesi tidak dalam status ujian aktif' }, { status: 409 });
    }

    // Get exam config for stage weights and break duration
    const examDoc = await adminDb.collection('msat_access_code').doc(session.examId).get();
    const exam = examDoc.exists ? examDoc.data() : null;
    const breakDuration = exam?.breakDuration ?? 10;

    // Fetch all 12 questions to verify answers
    const questionIds = body.answers.map(a => a.questionId);
    const questionDocs = await Promise.all(
      questionIds.map(qid => adminDb.collection('msat_question').doc(qid).get())
    );

    // Build stage answers with correctness check
    const stageAnswers: MSATStageAnswer[] = body.answers.map((ans, i) => {
      const qDoc = questionDocs[i];
      if (!qDoc.exists) {
        return {
          questionId: ans.questionId,
          cognitiveDomain: 'knowing' as MSATCognitiveDomain,
          selectedAnswer: ans.selectedAnswer as MSATStageAnswer['selectedAnswer'],
          isCorrect: false,
          timeSpentMs: ans.timeSpentMs ?? 0,
        };
      }
      const qData = qDoc.data()!;
      return {
        questionId: ans.questionId,
        cognitiveDomain: (qData.cognitiveDomain ?? 'knowing') as MSATCognitiveDomain,
        selectedAnswer: ans.selectedAnswer as MSATStageAnswer['selectedAnswer'],
        isCorrect: ans.selectedAnswer === qData.correctAnswer,
        timeSpentMs: ans.timeSpentMs ?? 0,
      };
    });

    // Calculate stage result
    const currentStage = session.currentStage as 1 | 2 | 3;
    const currentDifficulty = session.currentStageDifficulty as MSATStageDifficulty;
    const stageResult = calculateStageResult(currentStage, currentDifficulty, stageAnswers);

    // Detect anomalies
    const existingFlags = session.anomalyFlags ?? [];
    const newFlags = detectAnomalies([...(session.stageResponses ?? []), stageResult]);
    const allFlags = [...new Set([...existingFlags, ...newFlags])];

    // Prepare stage response for storage
    const stageResponseDoc = {
      stageNumber: currentStage,
      stageDifficulty: currentDifficulty,
      questions: stageAnswers,
      knowingCorrect: stageResult.knowingCorrect,
      applyingCorrect: stageResult.applyingCorrect,
      reasoningCorrect: stageResult.reasoningCorrect,
      totalCorrect: stageResult.totalCorrect,
      passed: stageResult.passed,
      weightedScore: stageResult.weightedScore,
    };

    const updatedStageResponses = [...(session.stageResponses ?? []), stageResponseDoc];

    // Determine next step
    if (currentStage === 3) {
      // Final stage — mark as completed, score will be calculated in /complete
      await sessionDoc.ref.update({
        stageResponses: updatedStageResponses,
        anomalyFlags: allFlags,
        status: 'completed',
        completedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        stageResult: stageResponseDoc,
        nextStage: null,
        break: null,
        completed: true,
      });
    }

    // Not final stage — determine next difficulty and enter break
    const nextDifficulty = getNextStageDifficulty(
      currentStage as 1 | 2,
      currentDifficulty,
      stageResult.passed,
    );

    const now = new Date();
    const breakEndsAt = new Date(now.getTime() + breakDuration * 60 * 1000);

    await sessionDoc.ref.update({
      stageResponses: updatedStageResponses,
      anomalyFlags: allFlags,
      currentStage: currentStage + 1,
      currentStageDifficulty: nextDifficulty,
      stagePath: [...(session.stagePath ?? []), nextDifficulty],
      status: 'on_break',
      breakStartedAt: FieldValue.serverTimestamp(),
      breakEndsAt: breakEndsAt,
      breakSkippedBy: null,
    });

    // Update waiting room break state
    await adminDb.collection('msat_waiting_room').doc(session.examId).set({
      [`breakState`]: {
        active: true,
        stageNumber: currentStage,
        studentId: decoded.uid,
        startedAt: FieldValue.serverTimestamp(),
        endsAt: breakEndsAt,
      },
    }, { merge: true });

    return NextResponse.json({
      stageResult: stageResponseDoc,
      nextStage: {
        stageNumber: currentStage + 1,
        difficulty: nextDifficulty,
      },
      break: {
        active: true,
        durationMinutes: breakDuration,
        endsAt: breakEndsAt.toISOString(),
      },
      completed: false,
    });

  } catch (err) {
    console.error('MSAT submit-stage error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
