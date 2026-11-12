import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyTeacher } from '@/lib/auth-helpers';
import { FieldValue } from '@/lib/pg-firestore';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const ref = adminDb.collection('exam_schedules').doc(params.id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (snap.data()!.teacherId !== teacher.uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();

  const validStatuses = ['active', 'inactive', 'closed'];
  if (body.status && !validStatuses.includes(body.status)) {
    return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
  }

  if ('title' in body && (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 200)) {
    return NextResponse.json({ error: 'Judul ujian tidak valid' }, { status: 400 });
  }
  if ('durationMinutes' in body && (!Number.isInteger(body.durationMinutes) || body.durationMinutes < 5 || body.durationMinutes > 300)) {
    return NextResponse.json({ error: 'Durasi harus 5-300 menit' }, { status: 400 });
  }
  if ('domainIds' in body) {
    if (snap.data()!.examType !== 'tp') {
      return NextResponse.json({ error: 'Topik hanya bisa diubah pada ujian bank soal' }, { status: 400 });
    }
    if (!Array.isArray(body.domainIds) || body.domainIds.length === 0 || body.domainIds.some((d: unknown) => typeof d !== 'string')) {
      return NextResponse.json({ error: 'Topik ujian tidak valid' }, { status: 400 });
    }
    const started = await adminDb.collection('exam_sessions').where('examScheduleId', '==', params.id).limit(1).get();
    if (!started.empty) {
      return NextResponse.json({ error: 'Topik tidak bisa diubah karena sudah ada siswa yang mengerjakan' }, { status: 409 });
    }
  }

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

  const sessions = await adminDb.collection('exam_sessions').where('examScheduleId', '==', params.id).limit(1).get();
  if (!sessions.empty) {
    return NextResponse.json({ error: 'Ujian ini sudah dikerjakan siswa. Tutup ujian agar tidak bisa dimasuki lagi, hasilnya tetap tersimpan.' }, { status: 409 });
  }

  await ref.delete();

  await adminDb.collection('audit_logs').add({
    actorId: teacher.uid, actorRole: 'teacher', action: 'delete_exam_schedule',
    targetId: params.id, targetType: 'exam_schedule',
    details: { title: snap.data()!.title }, timestamp: new Date(),
  });

  return NextResponse.json({ success: true });
}
