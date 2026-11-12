import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyTeacher } from '@/lib/auth-helpers';
import { notifyUsers } from '@/lib/notify';
import { content } from '@/lib/notification-content';
import { consumeRateLimit } from '@/lib/rate-limit-server';

export const dynamic = 'force-dynamic';

const REMIND_WINDOW_MS = 6 * 60 * 60 * 1000;

/**
 * POST /api/teacher/assignments/[id]/remind
 * Reminds the students who have not submitted yet. Limited to once every
 * 6 hours per assignment.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const snap = await adminDb.collection('assignments').doc(params.id).get();
    if (!snap.exists()) return NextResponse.json({ error: 'Tugas tidak ditemukan' }, { status: 404 });

    const assignment = snap.data()!;
    if (assignment.teacherId !== teacher.uid && teacher.role !== 'admin') {
      return NextResponse.json({ error: 'Bukan tugas Anda' }, { status: 403 });
    }

    const dueDate = (assignment.dueDate as string | null) ?? null;
    if (dueDate && new Date(dueDate) < new Date() && assignment.allowLate !== true) {
      return NextResponse.json({ error: 'Batas waktu sudah lewat dan pengumpulan terlambat tidak diizinkan.' }, { status: 409 });
    }

    const classSnap = await adminDb.collection('classes').doc(assignment.classId as string).get();
    if (!classSnap.exists()) return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 });

    const submitted = new Set(Object.keys((assignment.submissions as Record<string, unknown>) ?? {}));
    const pending = ((classSnap.data()!.studentIds as string[]) ?? []).filter((uid) => !submitted.has(uid));
    if (pending.length === 0) {
      return NextResponse.json({ error: 'Semua siswa sudah mengumpulkan tugas ini.' }, { status: 409 });
    }

    const limit = await consumeRateLimit(`assignment_remind:${params.id}`, 1, REMIND_WINDOW_MS);
    if (!limit.allowed) {
      const hours = Math.ceil(limit.retryAfterSec / 3600);
      return NextResponse.json({ error: `Pengingat sudah dikirim. Coba lagi dalam ${hours} jam.` }, { status: 429 });
    }

    await notifyUsers(pending, content.assignmentReminder({
      title: (assignment.title as string) ?? 'Tugas',
      classId: assignment.classId as string,
      dueDate,
    }));

    return NextResponse.json({ success: true, reminded: pending.length });
  } catch (err) {
    console.error('[teacher/assignments/remind POST]', err);
    return NextResponse.json({ error: 'Gagal mengirim pengingat' }, { status: 500 });
  }
}
