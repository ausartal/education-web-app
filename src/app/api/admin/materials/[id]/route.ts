import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/auth-helpers';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const ref = adminDb.collection('materials').doc(params.id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const allowed = ['title', 'description', 'topic', 'subtopic', 'content',
    'estimatedTime', 'status', 'order', 'learningObjectives', 'prerequisites'];
  const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  await ref.update(update);

  await adminDb.collection('audit_logs').add({
    actorId: admin.uid, actorRole: 'admin', action: 'update_material',
    targetId: params.id, targetType: 'material',
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

  const ref = adminDb.collection('materials').doc(params.id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const data = snap.data();
  await ref.delete();

  await adminDb.collection('audit_logs').add({
    actorId: admin.uid, actorRole: 'admin', action: 'delete_material',
    targetId: params.id, targetType: 'material',
    details: { title: data?.title }, timestamp: new Date(),
  });

  return NextResponse.json({ success: true });
}
