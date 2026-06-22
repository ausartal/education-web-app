import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/auth-helpers';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const difficulty = searchParams.get('difficulty');
  const status = searchParams.get('status');

  let query: FirebaseFirestore.Query = adminDb.collection('question_bank');
  if (difficulty) query = query.where('difficulty', '==', difficulty);
  if (status) query = query.where('status', '==', status);

  const snap = await query.orderBy('createdAt', 'desc').get();
  const questions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ questions });
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { topic, subtopic, difficulty, stem, options, correctAnswer, explanation, baseTime } = body;

  if (!topic || !difficulty || !stem || !correctAnswer) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const docRef = adminDb.collection('question_bank').doc();
  const question = {
    topic, subtopic: subtopic || '',
    difficulty, stem,
    options: options || {},
    correctAnswer,
    misconceptions: {},
    explanation: explanation || '',
    baseTime: baseTime || 60,
    usageCount: 0,
    avgCorrectRate: 0,
    avgTimeSpent: 0,
    createdBy: admin.uid,
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
  };

  await docRef.set(question);

  await adminDb.collection('audit_logs').add({
    actorId: admin.uid, actorRole: 'admin', action: 'create_question',
    targetId: docRef.id, targetType: 'question',
    details: { topic, difficulty }, timestamp: new Date(),
  });

  return NextResponse.json({ question: { id: docRef.id, ...question } }, { status: 201 });
}
