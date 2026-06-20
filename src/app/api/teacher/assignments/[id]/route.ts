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
    return { ...decoded, role: role as string, displayName: (userDoc.data()?.displayName as string) ?? '' };
  } catch { return null; }
}

// PATCH /api/teacher/assignments/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const docRef = adminDb.collection('assignments').doc(params.id);
    const snap = await docRef.get();
    if (!snap.exists) return NextResponse.json({ error: 'Tugas tidak ditemukan' }, { status: 404 });

    const data = snap.data()!;
    if (data.teacherId !== teacher.uid && teacher.role !== 'admin') {
      return NextResponse.json({ error: 'Bukan tugas Anda' }, { status: 403 });
    }

    const body = await req.json() as Record<string, unknown>;
    const allowed = ['title', 'description', 'dueDate', 'maxScore', 'status'];
    const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }

    await docRef.update(update);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[teacher/assignments PATCH]', err);
    return NextResponse.json(
      { error: 'Gagal memperbarui tugas', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

// DELETE /api/teacher/assignments/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const docRef = adminDb.collection('assignments').doc(params.id);
    const snap = await docRef.get();
    if (!snap.exists) return NextResponse.json({ error: 'Tugas tidak ditemukan' }, { status: 404 });

    const data = snap.data()!;
    if (data.teacherId !== teacher.uid && teacher.role !== 'admin') {
      return NextResponse.json({ error: 'Bukan tugas Anda' }, { status: 403 });
    }

    await docRef.delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[teacher/assignments DELETE]', err);
    return NextResponse.json(
      { error: 'Gagal menghapus tugas', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
