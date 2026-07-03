import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

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

  let body: { questionId?: string; selectedAnswer?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }
  const { questionId, selectedAnswer } = body;
  if (!questionId || !selectedAnswer) return NextResponse.json({ error: 'questionId and selectedAnswer required' }, { status: 400 });

  // Validate questionId belongs to this session's question pool
  const allowedIds: string[] = session.questionIds || [];
  if (allowedIds.length > 0 && !allowedIds.includes(questionId)) {
    return NextResponse.json({ error: 'Question not part of this session' }, { status: 403 });
  }

  const questionSnap = await adminDb.collection('exam_questions').doc(questionId).get();
  if (!questionSnap.exists) return NextResponse.json({ error: 'Question not found' }, { status: 404 });

  const isCorrect = selectedAnswer === questionSnap.data()!.correctAnswer;

  return NextResponse.json({ isCorrect });
}
