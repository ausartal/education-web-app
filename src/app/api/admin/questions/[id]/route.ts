import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const ref = adminDb.collection('question_bank').doc(params.id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const allowed = ['topic', 'subtopic', 'difficulty', 'stem', 'options', 'correctAnswer',
    'explanation', 'baseTime', 'status', 'misconceptions'];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  await ref.update(update);

  await adminDb.collection('audit_logs').add({
    actorId: admin.uid, actorRole: 'admin', action: 'update_question',
    targetId: params.id, targetType: 'question',
    details: { fields: Object.keys(update) }, timestamp: new Date(),
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const ref = adminDb.collection('question_bank').doc(params.id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await ref.delete();

  await adminDb.collection('audit_logs').add({
    actorId: admin.uid, actorRole: 'admin', action: 'delete_question',
    targetId: params.id, targetType: 'question',
    details: {}, timestamp: new Date(),
  });

  return NextResponse.json({ success: true });
}
