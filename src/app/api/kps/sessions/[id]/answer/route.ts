import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { KPSQuestion, KPSQuestionResponse, KPSIndicator, KPSQuestionType } from '@/types/kps';
import { scoreQuestion, isResponseCorrect } from '@/lib/kps-engine';

export const dynamic = 'force-dynamic';

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

  let body: {
    questionId: string;
    answer: Partial<KPSQuestionResponse>;
    timeSpentMs: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { questionId, answer, timeSpentMs } = body;
  if (!questionId || !answer) return NextResponse.json({ error: 'questionId dan answer diperlukan' }, { status: 400 });

  // Fetch question from Firestore to get correct answer
  const questionDoc = await adminDb.collection('kps_questions').doc(questionId).get();
  if (!questionDoc.exists) return NextResponse.json({ error: 'Soal tidak ditemukan' }, { status: 404 });

  const questionData = questionDoc.data()!;
  const question = { id: questionDoc.id, ...questionData } as KPSQuestion;

  // Build response object
  const response: KPSQuestionResponse = {
    questionId,
    indicator: questionData.indicator as KPSIndicator,
    questionType: questionData.questionType as KPSQuestionType,
    selectedAnswer: answer.selectedAnswer,
    selectedAnswers: answer.selectedAnswers,
    booleanAnswer: answer.booleanAnswer,
    booleanAnswers: answer.booleanAnswers,
    matchedPairs: answer.matchedPairs,
    isCorrect: false,
    score: 0,
    timeSpentMs: timeSpentMs || 0,
  };

  // Score server-side
  const score = scoreQuestion(question, response);
  response.score = score;
  response.isCorrect = isResponseCorrect(score);

  return NextResponse.json({
    questionId,
    isCorrect: response.isCorrect,
    score: response.score,
  });
}
