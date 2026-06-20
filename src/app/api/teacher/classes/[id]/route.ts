import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

async function verifyTeacher(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    const role = userDoc.data()?.role;
    if (!userDoc.exists || (role !== 'teacher' && role !== 'admin')) return null;
    return decoded;
  } catch { return null; }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const snap = await adminDb.collection('classes').doc(params.id).get();
  if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const data = snap.data()!;
  if (data.teacherId !== teacher.uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Get student details
  const studentIds: string[] = data.studentIds || [];
  const students = await Promise.all(studentIds.map(async (uid) => {
    const userSnap = await adminDb.collection('users').doc(uid).get();
    if (!userSnap.exists) return null;
    const u = userSnap.data()!;
    return { uid, displayName: u.displayName, email: u.email, xp: u.stats?.xp || 0 };
  }));

  // Get exam schedules for this class
  const examSnap = await adminDb.collection('exam_schedules')
    .where('classId', '==', params.id)
    .get();
  const getSeconds = (ts: unknown) => (ts as { _seconds?: number })?._seconds ?? 0;
  const exams = (examSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Array<Record<string, unknown>>)
    .sort((a, b) => getSeconds(b.createdAt) - getSeconds(a.createdAt));

  return NextResponse.json({
    class: { id: snap.id, ...data },
    students: students.filter(Boolean),
    exams,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const ref = adminDb.collection('classes').doc(params.id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (snap.data()!.teacherId !== teacher.uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const allowed = ['name', 'subject', 'status', 'materialIds'];
  const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }
  await ref.update(update);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const ref = adminDb.collection('classes').doc(params.id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (snap.data()!.teacherId !== teacher.uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await ref.delete();
  return NextResponse.json({ success: true });
}
