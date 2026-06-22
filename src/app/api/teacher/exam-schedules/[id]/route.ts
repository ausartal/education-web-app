import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyTeacher } from '@/lib/auth-helpers';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const ref = adminDb.collection('exam_schedules').doc(params.id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (snap.data()!.teacherId !== teacher.uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const allowed = ['title', 'status', 'domainIds', 'scheduledAt', 'durationMinutes'];
  const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }
  await ref.update(update);

  await adminDb.collection('audit_logs').add({
    actorId: teacher.uid, actorRole: 'teacher', action: 'update_exam_schedule',
    targetId: params.id, targetType: 'exam_schedule',
    details: { fields: Object.keys(body) }, timestamp: new Date(),
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const ref = adminDb.collection('exam_schedules').doc(params.id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (snap.data()!.teacherId !== teacher.uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await ref.delete();

  await adminDb.collection('audit_logs').add({
    actorId: teacher.uid, actorRole: 'teacher', action: 'delete_exam_schedule',
    targetId: params.id, targetType: 'exam_schedule',
    details: { title: snap.data()!.title }, timestamp: new Date(),
  });

  return NextResponse.json({ success: true });
}
