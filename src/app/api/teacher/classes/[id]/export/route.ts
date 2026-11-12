import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyTeacher } from '@/lib/auth-helpers';
import { csvFileName, toCsv } from '@/lib/csv';
import { buildGradebook, type GradebookAssignment, type GradebookExam, type GradebookStudent } from '@/lib/gradebook';

export const dynamic = 'force-dynamic';

/**
 * GET /api/teacher/classes/[id]/export
 * Gradebook of one class as CSV: assignment grades, best exam scores and the
 * assignment average per student.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const classSnap = await adminDb.collection('classes').doc(params.id).get();
    if (!classSnap.exists()) return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 });
    const cls = classSnap.data()!;
    if (cls.teacherId !== teacher.uid && teacher.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const studentIds: string[] = cls.studentIds ?? [];
    const userDocs = await Promise.all(studentIds.map((uid) => adminDb.collection('users').doc(uid).get()));
    const students: GradebookStudent[] = userDocs.map((d, i) => ({
      uid: studentIds[i],
      displayName: d.exists() ? (d.data()!.displayName as string) || studentIds[i] : studentIds[i],
      email: d.exists() ? (d.data()!.email as string) || '' : '',
    }));

    const [assignmentSnap, scheduleSnap] = await Promise.all([
      adminDb.collection('assignments').where('classId', '==', params.id).get(),
      adminDb.collection('exam_schedules').where('classId', '==', params.id).get(),
    ]);

    const assignments: GradebookAssignment[] = assignmentSnap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: (data.title as string) ?? 'Tugas',
          maxScore: (data.maxScore as number) ?? 100,
          submissions: (data.submissions as GradebookAssignment['submissions']) ?? {},
          createdAt: (data.createdAt as { _seconds?: number; seconds?: number } | undefined),
        };
      })
      .sort((a, b) => (a.createdAt?._seconds ?? a.createdAt?.seconds ?? 0) - (b.createdAt?._seconds ?? b.createdAt?.seconds ?? 0))
      .map(({ createdAt: _createdAt, ...rest }) => {
        void _createdAt;
        return rest;
      });

    const exams: GradebookExam[] = await Promise.all(
      scheduleSnap.docs.map(async (d) => {
        const sessions = await adminDb.collection('exam_sessions').where('examScheduleId', '==', d.id).get();
        return {
          id: d.id,
          title: (d.data().title as string) ?? 'Ujian',
          examType: (d.data().examType as string) ?? 'tp',
          sessions: sessions.docs.map((s) => ({
            studentId: s.data().studentId as string,
            status: s.data().status as string,
            numericScore: (s.data().numericScore as number | null) ?? null,
          })),
        };
      }),
    );

    const { columns, rows } = buildGradebook(students, assignments, exams);
    return new NextResponse(toCsv(columns, rows), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${csvFileName(`nilai-${(cls.name as string) ?? 'kelas'}`)}"`,
      },
    });
  } catch (err) {
    console.error('[teacher/classes/export GET]', err);
    return NextResponse.json({ error: 'Gagal membuat ekspor' }, { status: 500 });
  }
}
