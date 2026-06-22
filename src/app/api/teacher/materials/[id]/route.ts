import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyTeacher } from '@/lib/auth-helpers';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// PATCH /api/teacher/materials/[id] — update material (with permission check + audit log)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const docRef = adminDb.collection('materials').doc(params.id);
    const snap = await docRef.get();
    if (!snap.exists) return NextResponse.json({ error: 'Materi tidak ditemukan' }, { status: 404 });

    const data = snap.data()!;
    // Admin-created materials cannot be edited by teachers
    if (data.createdByRole === 'admin' && teacher.role !== 'admin') {
      return NextResponse.json(
        { error: 'Materi yang dibuat admin tidak dapat diedit oleh guru' },
        { status: 403 },
      );
    }

    const body = await req.json();
    const allowed = ['title', 'description', 'topic', 'subtopic', 'content', 'estimatedTime', 'learningObjectives', 'prerequisites', 'order', 'status'];
    const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    for (const key of allowed) {
      if (key in body) update[key] = (body as Record<string, unknown>)[key];
    }

    // Append to audit log
    const logEntry = {
      editedByUid: teacher.uid,
      editedByName: teacher.displayName,
      editedAt: new Date().toISOString(),
      note: (body as Record<string, unknown>).editNote ?? '',
    };
    update['editLog'] = FieldValue.arrayUnion(logEntry);

    await docRef.update(update);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[teacher/materials PATCH]', err);
    return NextResponse.json(
      { error: 'Gagal memperbarui materi', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

// DELETE /api/teacher/materials/[id] — delete material (only creator or admin)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const docRef = adminDb.collection('materials').doc(params.id);
    const snap = await docRef.get();
    if (!snap.exists) return NextResponse.json({ error: 'Materi tidak ditemukan' }, { status: 404 });

    const data = snap.data()!;
    const isCreator = data.createdByUid === teacher.uid;
    const isAdmin = teacher.role === 'admin';

    if (!isCreator && !isAdmin) {
      return NextResponse.json(
        { error: 'Hanya pembuat atau admin yang dapat menghapus materi ini' },
        { status: 403 },
      );
    }

    await docRef.delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[teacher/materials DELETE]', err);
    return NextResponse.json(
      { error: 'Gagal menghapus materi', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
