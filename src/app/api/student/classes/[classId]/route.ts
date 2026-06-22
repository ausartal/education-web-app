import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

function tsToIso(ts: unknown): string | null {
  if (!ts) return null;
  if (typeof ts === 'object' && ts !== null) {
    const t = ts as Record<string, unknown>;
    const secs = (t['_seconds'] ?? t['seconds']) as number | undefined;
    if (typeof secs === 'number') return new Date(secs * 1000).toISOString();
    if (ts instanceof Date) return ts.toISOString();
  }
  if (typeof ts === 'string') return ts;
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { classId: string } },
) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer '))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { classId } = params;

  // Fetch class directly then check enrollment in JS — no composite index needed
  const classDoc = await adminDb.collection('classes').doc(classId).get();
  if (!classDoc.exists) {
    return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 });
  }
  const classData = classDoc.data()!;
  const studentIds: string[] = classData.studentIds || [];
  if (!studentIds.includes(decoded.uid)) {
    return NextResponse.json({ error: 'Anda tidak terdaftar di kelas ini' }, { status: 403 });
  }

  // Teacher name
  const teacherSnap = await adminDb.collection('users').doc(classData.teacherId).get();
  const teacherName = teacherSnap.data()?.displayName || 'Guru';

  // Pinned materials — fetch in parallel with field projection
  const materialIds: string[] = classData.materialIds || [];
  const materials = (
    await Promise.all(
      materialIds.map(async (mid) => {
        const snap = await adminDb.collection('materials').doc(mid).get();
        if (!snap.exists) return null;
        const m = snap.data()!;
        return {
          id: snap.id,
          title: m.title as string,
          description: (m.description as string) ?? '',
          topic: (m.topic as string) ?? '',
          subtopic: (m.subtopic as string) ?? '',
          estimatedTime: (m.estimatedTime as number) ?? 0,
          status: (m.status as string) ?? 'draft',
          createdByName: (m.createdByName as string) ?? '',
        };
      }),
    )
  ).filter(Boolean);

  // All exams for this class
  const examSnap = await adminDb
    .collection('exam_schedules')
    .where('classId', '==', classId)
    .get();

  // Check completed exams by this student
  const sessionSnap = await adminDb
    .collection('exam_sessions')
    .where('studentId', '==', decoded.uid)
    .get();
  const completedExamIds = new Set(
    sessionSnap.docs
      .filter(d => d.data().status === 'completed')
      .map(d => d.data().examScheduleId as string),
  );

  const exams = examSnap.docs
    .map(d => {
      const e = d.data();
      const sessionDoc = sessionSnap.docs.find(s => s.data().examScheduleId === d.id);
      return {
        id: d.id,
        title: e.title as string,
        examToken: e.examToken as string,
        durationMinutes: e.durationMinutes as number,
        domainIds: (e.domainIds as string[]) ?? [],
        status: e.status as string,
        scheduledAt: tsToIso(e.scheduledAt),
        startTime: tsToIso(e.startTime),
        endTime: tsToIso(e.endTime),
        isCompleted: completedExamIds.has(d.id),
        sessionId: sessionDoc?.id ?? null,
      };
    })
    .sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (b.status === 'active' && a.status !== 'active') return 1;
      return 0;
    });

  // Assignments — no orderBy to avoid requiring composite index
  const asgnSnap = await adminDb
    .collection('assignments')
    .where('classId', '==', classId)
    .get();

  const assignments = asgnSnap.docs
    .map(d => {
      const a = d.data();
      const subs = (a.submissions as Record<string, Record<string, unknown>>) ?? {};
      const mySub = subs[decoded.uid];
      return {
        id: d.id,
        title: a.title as string,
        description: (a.description as string) ?? '',
        dueDate: (a.dueDate as string) ?? null,
        maxScore: (a.maxScore as number) ?? 100,
        status: (a.status as string) ?? 'published',
        createdAt: tsToIso(a.createdAt),
        submissionCount: Object.keys(subs).length,
        mySubmission: mySub
          ? { text: (mySub.text as string) ?? '', submittedAt: tsToIso(mySub.submittedAt) }
          : null,
      };
    })
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));

  return NextResponse.json({
    class: {
      id: classId,
      name: classData.name as string,
      subject: classData.subject as string,
      joinCode: classData.joinCode as string,
      teacherName,
      teacherId: classData.teacherId as string,
      studentCount: ((classData.studentIds as string[]) || []).length,
    },
    materials,
    exams,
    assignments,
  });
}
