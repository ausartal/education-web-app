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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const ref = adminDb.collection('exam_questions').doc(params.id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const allowed = ['stem', 'options', 'correctAnswer', 'explanation', 'status', 'difficulty', 'cognitiveLevel'];
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

  const ref = adminDb.collection('exam_questions').doc(params.id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await ref.delete();
  return NextResponse.json({ success: true });
}
