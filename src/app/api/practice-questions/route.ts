import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyStudent } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await verifyStudent(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const topic = searchParams.get('topic');
  const difficulty = searchParams.get('difficulty');
  const count = parseInt(searchParams.get('count') || '10');

  if (!topic || !difficulty) {
    return NextResponse.json({ error: 'topic and difficulty required' }, { status: 400 });
  }

  const q = adminDb.collection('question_bank')
    .where('topic', '==', topic)
    .where('difficulty', '==', difficulty)
    .where('status', '==', 'active')
    .limit(count);

  const snap = await q.get();
  const questions = snap.docs.map(d => {
    // Strip sensitive fields before sending to client
    const { correctAnswer, misconceptions, ...rest } = d.data();
    return { id: d.id, ...rest };
  });

  return NextResponse.json({ questions });
}
