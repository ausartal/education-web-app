import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.slice(7);

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const ref = adminDb.collection('exam_sessions').doc(params.id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  const session = snap.data()!;

  if (session.studentId !== decoded.uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (session.status !== 'in_progress') return NextResponse.json({ error: 'Session is not in progress' }, { status: 409 });

  const { domainResponse } = await req.json();
  if (!domainResponse) return NextResponse.json({ error: 'domainResponse required' }, { status: 400 });

  const qIds = [
    domainResponse.tier1?.questionId,
    domainResponse.tier2?.questionId,
    domainResponse.tier3?.questionId,
  ].filter(Boolean) as string[];

  // Fetch questions to recompute isCorrect server-side (never trust client)
  const qSnaps = await Promise.all(qIds.map(id => adminDb.collection('exam_questions').doc(id).get()));
  const qMap = Object.fromEntries(qSnaps.filter(s => s.exists).map(s => [s.id, s.data()!.correctAnswer]));

  const recompute = (tier: { questionId?: string; selectedAnswer?: string; isCorrect?: boolean; [k: string]: unknown } | undefined) => {
    if (!tier?.questionId) return tier;
    return { ...tier, isCorrect: tier.selectedAnswer === qMap[tier.questionId] };
  };

  const sanitizedResponse = {
    ...domainResponse,
    tier1: recompute(domainResponse.tier1),
    tier2: recompute(domainResponse.tier2),
    tier3: recompute(domainResponse.tier3),
  };

  const usageBatch = adminDb.batch();
  for (const qId of qIds) {
    usageBatch.update(adminDb.collection('exam_questions').doc(qId), {
      usageCount: FieldValue.increment(1),
    });
  }
  await usageBatch.commit().catch(() => { /* ignore if question doesn't exist */ });

  // Append domain response
  const existingResponses: unknown[] = session.domainResponses || [];
  const updatedResponses = [...existingResponses, sanitizedResponse];

  await ref.update({
    domainResponses: updatedResponses,
    currentDomainIndex: updatedResponses.length,
  });

  return NextResponse.json({ success: true, domainIndex: updatedResponses.length });
}
