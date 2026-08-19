import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { KPSQuestion, KPSQuestionResponse, KPSIndicator, KPSQuestionType, KPS_CONFIG } from '@/types/kps';
import { scoreQuestion, isResponseCorrect, getNextStagePath, getStage3Level, countCorrect, calculateStageScore } from '@/lib/kps-engine';

export const dynamic = 'force-dynamic';

// Strip undefined/null values — Firestore rejects them
function clean<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => clean(item)) as T;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (value !== undefined && value !== null) {
      result[key] = typeof value === 'object' ? clean(value) : value;
    }
  }
  return result as T;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    let decoded;
    try { decoded = await adminAuth.verifyIdToken(authHeader.slice(7)); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

    // Session
    const { id: sessionId } = await params;
    const sessionDoc = await adminDb.collection('kps_exam_sessions').doc(sessionId).get();
    if (!sessionDoc.exists) return NextResponse.json({ error: 'Session tidak ditemukan' }, { status: 404 });
    const session = sessionDoc.data()!;
    if (session.studentId !== decoded.uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (session.status !== 'in_progress') return NextResponse.json({ error: 'Session sudah selesai' }, { status: 400 });

    // Time check (with 10 min grace for old sessions)
    const startedAt = session.startedAt?.toDate?.() ?? new Date();
    const durationMin = session.durationMinutes || KPS_CONFIG.totalDurationMinutes;
    const deadlineMs = startedAt.getTime() + durationMin * 60 * 1000;
    const gracePeriod = 10 * 60 * 1000; // 10 min grace
    if (Date.now() > deadlineMs + gracePeriod) {
      return NextResponse.json({ error: 'Waktu ujian telah habis' }, { status: 408 });
    }

    // Body
    let body: { stage: 1 | 2 | 3; responses: Array<{ questionId: string; answer: Partial<KPSQuestionResponse>; timeSpentMs: number }> };
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

    const { stage, responses: rawResponses } = body;
    const actualCount = rawResponses?.length ?? 0;
    if (!stage || actualCount !== KPS_CONFIG.questionsPerStage) {
      return NextResponse.json({ error: `Diperlukan ${KPS_CONFIG.questionsPerStage} jawaban, diterima ${actualCount}` }, { status: 400 });
    }

    // Score answers server-side
    const scoredResponses: KPSQuestionResponse[] = [];
    for (const raw of rawResponses) {
      try {
        const questionDoc = await adminDb.collection('kps_questions').doc(raw.questionId).get();
        if (!questionDoc.exists) continue;
        const questionData = questionDoc.data()!;
        const question = { id: questionDoc.id, ...questionData } as KPSQuestion;

        const response: KPSQuestionResponse = {
          questionId: raw.questionId,
          indicator: questionData.indicator as KPSIndicator,
          questionType: questionData.questionType as KPSQuestionType,
          selectedAnswer: raw.answer?.selectedAnswer,
          selectedAnswers: raw.answer?.selectedAnswers,
          booleanAnswer: raw.answer?.booleanAnswer,
          booleanAnswers: raw.answer?.booleanAnswers,
          matchedPairs: raw.answer?.matchedPairs,
          isCorrect: false,
          score: 0,
          timeSpentMs: raw.timeSpentMs || 0,
        };

        const score = scoreQuestion(question, response);
        response.score = score;
        response.isCorrect = isResponseCorrect(score);
        scoredResponses.push(clean(response));
      } catch (e) {
        console.error(`Error scoring question ${raw.questionId}:`, e);
      }
    }

    const correctCount = countCorrect(scoredResponses);
    const stageScore = calculateStageScore(scoredResponses);

    // Path
    const stage2Path = session.stage2Path;
    let currentPath: 'tinggi' | 'rendah' | null = null;
    if (stage === 1) currentPath = getNextStagePath(1, null, correctCount);
    else if (stage === 2) currentPath = getNextStagePath(2, stage2Path, correctCount);
    else currentPath = getNextStagePath(3, stage2Path, correctCount);

    // Save stage response (plain object, no FieldValue sentinels)
    const stageResponse = {
      stage,
      path: stage === 1 ? null : currentPath,
      questions: scoredResponses,
      correctCount,
      score: stageScore,
      submittedAt: new Date().toISOString(),
    };

    const currentResponses = session.stageResponses || [];
    const updateData: Record<string, unknown> = {
      stageResponses: [...currentResponses, stageResponse],
    };
    if (stage === 1) { updateData.stage2Path = currentPath; updateData.currentStage = 2; }
    else if (stage === 2) { updateData.stage3Path = currentPath; updateData.currentStage = 3; }
    else { updateData.currentStage = 3; }

    await sessionDoc.ref.update(updateData);

    // Stage 3 → done
    if (stage === 3) {
      return NextResponse.json({ stageCompleted: 3, correctCount, stageScore, completed: true });
    }

    // Fetch next stage questions
    const nextStage = stage + 1;
    const queryStage = nextStage === 3 ? 2 : nextStage;
    let nextLevel: string;
    if (nextStage === 2) {
      nextLevel = currentPath === 'tinggi' ? 'tinggi' : 'rendah';
    } else {
      nextLevel = getStage3Level(stage2Path!, currentPath!);
    }

    const stimulusSnap = await adminDb.collection('kps_stimuli').where('level', '==', nextLevel).where('stage', '==', queryStage).get();
    const activeStimuli = stimulusSnap.docs.filter(d => d.data().status === 'active');
    const stimulusDoc = activeStimuli.length > 0 ? activeStimuli[Math.floor(Math.random() * activeStimuli.length)] : null;
    const stimulus = stimulusDoc ? { id: stimulusDoc.id, ...stimulusDoc.data() } : null;

    const questionsSnap = stimulusDoc
      ? await adminDb.collection('kps_questions').where('stimulusId', '==', stimulusDoc.id).get()
      : await adminDb.collection('kps_questions').where('difficultyLevel', '==', nextLevel).where('stage', '==', queryStage).get();

    const questions = questionsSnap.docs
      .map(d => ({ id: d.id, ...d.data() } as Record<string, unknown>))
      .filter(d => d.status === 'active')
      .sort((a, b) => ((a.order as number) || 0) - ((b.order as number) || 0))
      .map(d => {
        const { correctAnswer, correctAnswers, correctMatches, statements, ...safe } = d;
        if (d.questionType === 'complex_true_false' && statements) {
          return { ...safe, statements: (statements as Array<{ id: string; text: string }>).map(s => ({ id: s.id, text: s.text })) };
        }
        return safe;
      });

    if (stimulusDoc) {
      await sessionDoc.ref.update({ stimulusIds: FieldValue.arrayUnion(stimulusDoc.id) });
    }

    return NextResponse.json({ stageCompleted: stage, correctCount, stageScore, nextStage, nextPath: currentPath, stimulus, questions });

  } catch (err) {
    console.error('Stage route error:', err);
    return NextResponse.json({ error: `Server error: ${err instanceof Error ? err.message : 'Unknown'}` }, { status: 500 });
  }
}
