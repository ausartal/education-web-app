import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyTeacher } from '@/lib/auth-helpers';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const ref = adminDb.collection('exam_questions').doc(params.id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: 'Soal tidak ditemukan' }, { status: 404 });

  const data = snap.data()!;
  const isAdmin = teacher.role === 'admin';
  const isOwner = data.ownerId === teacher.uid || data.createdBy === teacher.uid;

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: 'Forbidden: bukan soal Anda' }, { status: 403 });
  }

  const body = await req.json();

  const teacherAllowed = ['stem', 'options', 'correctAnswer', 'explanation', 'status', 'difficulty', 'cognitiveLevel', 'domainId'];
  const adminAllowed = [...teacherAllowed, 'approvalStatus', 'visibility'];

  const allowed = isAdmin ? adminAllowed : teacherAllowed;
  const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };

  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  // If teacher submits for global approval
  if (!isAdmin && body.submitForApproval === true) {
    update.visibility = 'global';
    update.approvalStatus = 'pending';
  }

  await ref.update(update);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const ref = adminDb.collection('exam_questions').doc(params.id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: 'Soal tidak ditemukan' }, { status: 404 });

  const data = snap.data()!;
  const isAdmin = teacher.role === 'admin';
  const isOwner = data.ownerId === teacher.uid || data.createdBy === teacher.uid;

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: 'Forbidden: bukan soal Anda' }, { status: 403 });
  }

  await ref.delete();
  return NextResponse.json({ success: true });
}
