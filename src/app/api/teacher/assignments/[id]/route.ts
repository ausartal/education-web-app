import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyTeacher } from '@/lib/auth-helpers';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

function tsToIso(ts: unknown): string | null {
  if (!ts) return null;
  if (typeof ts === 'object' && ts !== null) {
    const t = ts as Record<string, unknown>;
    const secs = (t['_seconds'] ?? t['seconds']) as number | undefined;
    if (typeof secs === 'number') return new Date(secs * 1000).toISOString();
  }
  if (typeof ts === 'string') return ts;
  return null;
}

// GET /api/teacher/assignments/[id] — fetch assignment detail with submissions
export async function GET(
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

    const classDoc = await adminDb.collection('classes').doc(data.classId as string).get();
    const studentIds: string[] = classDoc.data()?.studentIds ?? [];

    const submissions = (data.submissions as Record<string, Record<string, unknown>>) ?? {};

    let studentNames: Record<string, string> = {};
    if (studentIds.length > 0) {
      const chunks: string[][] = [];
      for (let i = 0; i < studentIds.length; i += 30) chunks.push(studentIds.slice(i, i + 30));
      const snaps = await Promise.all(
        chunks.map(c => adminDb.collection('users').where('__name__', 'in', c).select('displayName', 'email').get()),
      );
      snaps.forEach(s => s.docs.forEach(d => {
        studentNames[d.id] = (d.data().displayName as string) ?? d.id;
      }));
    }

    const submitted = Object.entries(submissions).map(([uid, sub]) => ({
      studentId: uid,
      studentName: (sub.studentName as string) ?? studentNames[uid] ?? uid,
      text: (sub.text as string) ?? '',
      submittedAt: tsToIso(sub.submittedAt),
    }));

    const submittedIds = new Set(Object.keys(submissions));
    const notSubmitted = studentIds
      .filter(uid => !submittedIds.has(uid))
      .map(uid => ({ studentId: uid, studentName: studentNames[uid] ?? uid }));

    return NextResponse.json({ submitted, notSubmitted });
  } catch (err) {
    console.error('[teacher/assignments GET id]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
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
