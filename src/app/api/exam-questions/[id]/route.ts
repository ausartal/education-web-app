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

  const contentFields = ['stem', 'options', 'correctAnswer', 'explanation'];
  const hasContentChange = contentFields.some(f => f in body);

  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  // If teacher submits for global approval
  if (!isAdmin && body.submitForApproval === true) {
    update.visibility = 'global';
    update.approvalStatus = 'pending';
  }

  // Version tracking: bump version when content changes
  if (hasContentChange) {
    const currentVersion = (data.version as number) ?? 1;
    const newVersion = currentVersion + 1;
    update.version = newVersion;
    update.versionHistory = FieldValue.arrayUnion({
      version: currentVersion,
      stem: data.stem,
      options: data.options,
      correctAnswer: data.correctAnswer,
      explanation: data.explanation ?? '',
      editedAt: new Date().toISOString(),
      editedBy: teacher.uid,
    });
    update.lastEditedBy = teacher.uid;
    update.lastEditedAt = FieldValue.serverTimestamp();
  }

  await ref.update(update);
  return NextResponse.json({ success: true, version: update.version ?? (data.version ?? 1) });
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
