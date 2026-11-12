import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyTeacher } from '@/lib/auth-helpers';
import { FieldValue } from '@/lib/pg-firestore';
import { notifyUsers } from '@/lib/notify';
import { content } from '@/lib/notification-content';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/teacher/classes/[id]/students/[studentId]
 * Removes a student from the teacher's class. Their submissions and exam
 * results are kept for the teacher's records.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; studentId: string } },
) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const ref = adminDb.collection('classes').doc(params.id);
    const snap = await ref.get();
    if (!snap.exists()) return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 });

    const cls = snap.data()!;
    if (cls.teacherId !== teacher.uid && teacher.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const studentIds: string[] = cls.studentIds ?? [];
    if (!studentIds.includes(params.studentId)) {
      return NextResponse.json({ error: 'Siswa tidak terdaftar di kelas ini' }, { status: 404 });
    }

    await ref.update({
      studentIds: FieldValue.arrayRemove(params.studentId),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await adminDb.collection('audit_logs').add({
      actorId: teacher.uid,
      actorRole: teacher.role,
      action: 'remove_student_from_class',
      targetId: params.id,
      targetType: 'class',
      details: { studentId: params.studentId, className: cls.name },
      timestamp: new Date(),
    });

    await notifyUsers([params.studentId], content.removedFromClass({ className: (cls.name as string) ?? 'kelas' }));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[teacher/classes/students DELETE]', err);
    return NextResponse.json({ error: 'Gagal mengeluarkan siswa' }, { status: 500 });
  }
}
