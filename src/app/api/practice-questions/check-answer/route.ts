import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyStudent } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const user = await verifyStudent(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { questionId?: string; selectedAnswer?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

  const { questionId, selectedAnswer } = body;
  if (!questionId || !selectedAnswer) {
    return NextResponse.json({ error: 'questionId and selectedAnswer required' }, { status: 400 });
  }

  const questionSnap = await adminDb.collection('question_bank').doc(questionId).get();
  if (!questionSnap.exists) return NextResponse.json({ error: 'Question not found' }, { status: 404 });

  const qData = questionSnap.data()!;
  const isCorrect = selectedAnswer === qData.correctAnswer;

  return NextResponse.json({ isCorrect });
}
