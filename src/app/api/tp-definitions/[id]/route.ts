import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyTeacher } from '@/lib/auth-helpers';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const ref = adminDb.collection('tp_definitions').doc(params.id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: 'TP tidak ditemukan' }, { status: 404 });

  const data = snap.data()!;
  const isAdmin = teacher.role === 'admin';
  const isOwner = data.ownerId === teacher.uid;

  if (!isAdmin && !isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const allowed = isAdmin
    ? ['code', 'name', 'subject', 'description', 'order', 'scope']
    : ['code', 'name', 'subject', 'description', 'order'];

  const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  for (const key of allowed) {
    if (key in body) update[key] = typeof body[key] === 'string' ? body[key].trim() : body[key];
  }
  if (update.code) update.code = (update.code as string).toUpperCase();

  await ref.update(update);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const ref = adminDb.collection('tp_definitions').doc(params.id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: 'TP tidak ditemukan' }, { status: 404 });

  const data = snap.data()!;
  const isAdmin = teacher.role === 'admin';
  const isOwner = data.ownerId === teacher.uid;

  if (!isAdmin && !isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Check if any questions reference this TP
  const questionSnap = await adminDb.collection('exam_questions')
    .where('domainId', '==', params.id)
    .limit(1)
    .get();

  if (!questionSnap.empty) {
    return NextResponse.json({
      error: 'TP ini masih memiliki soal. Hapus semua soal terlebih dahulu.',
    }, { status: 409 });
  }

  await ref.delete();
  return NextResponse.json({ success: true });
}
