import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyTeacher } from '@/lib/auth-helpers';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// PATCH /api/teacher/assignments/[id]/grade — grade a student's submission
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
    const { studentId, grade, gradeNote } = body;

    if (!studentId || typeof studentId !== 'string') {
      return NextResponse.json({ error: 'studentId wajib diisi' }, { status: 400 });
    }
    if (typeof grade !== 'number' || grade < 0) {
      return NextResponse.json({ error: 'grade harus berupa angka >= 0' }, { status: 400 });
    }

    const submissions = (data.submissions as Record<string, unknown>) ?? {};
    if (!submissions[studentId]) {
      return NextResponse.json({ error: 'Siswa belum mengumpulkan tugas' }, { status: 404 });
    }

    await docRef.update({
      [`submissions.${studentId}.grade`]: grade,
      [`submissions.${studentId}.gradeNote`]: gradeNote ?? '',
      [`submissions.${studentId}.gradedAt`]: FieldValue.serverTimestamp(),
      [`submissions.${studentId}.gradedBy`]: teacher.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[teacher/assignments/grade PATCH]', err);
    return NextResponse.json(
      { error: 'Gagal memberi nilai', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
