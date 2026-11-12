import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyStudent } from '@/lib/auth-helpers';
import { slugTopic, topicLabel } from '@/lib/learning';

export const dynamic = 'force-dynamic';

/**
 * GET /api/practice-questions/topics
 * Topics that have active practice questions, with the number of questions
 * per level, so students only see topics they can actually practise.
 */
export async function GET(req: NextRequest) {
  const user = await verifyStudent(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const snap = await adminDb.collection('question_bank').where('status', '==', 'active').get();

    const byTopic = new Map<string, { topic: string; counts: Record<string, number> }>();
    for (const doc of snap.docs) {
      const data = doc.data();
      const topic = typeof data.topic === 'string' ? data.topic.trim() : '';
      const difficulty = data.difficulty as string;
      if (!topic || !['easy', 'moderate', 'hard'].includes(difficulty)) continue;
      const entry = byTopic.get(topic) ?? { topic, counts: { easy: 0, moderate: 0, hard: 0 } };
      entry.counts[difficulty]++;
      byTopic.set(topic, entry);
    }

    const topics = [...byTopic.values()]
      .map((t) => ({ topic: t.topic, id: slugTopic(t.topic), label: topicLabel(t.topic), counts: t.counts }))
      .sort((a, b) => a.label.localeCompare(b.label, 'id'));

    return NextResponse.json({ topics });
  } catch (err) {
    console.error('[practice-questions/topics]', err);
    return NextResponse.json({ error: 'Gagal memuat topik' }, { status: 500 });
  }
}
