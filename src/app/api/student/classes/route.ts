import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Single query for all classes the student is enrolled in
  const snap = await adminDb
    .collection('classes')
    .where('studentIds', 'array-contains', decoded.uid)
    .where('status', '==', 'active')
    .get();

  if (snap.empty) return NextResponse.json({ classes: [] });

  const classIds = snap.docs.map((d) => d.id);
  const classDataMap = Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]));

  // Batch fetch teacher names — one get() per unique teacher, not per class
  const uniqueTeacherIds = [...new Set(snap.docs.map((d) => d.data().teacherId as string))];
  const teacherDocs = await Promise.all(
    uniqueTeacherIds.map((tid) => adminDb.collection('users').doc(tid).get())
  );
  const teacherMap: Record<string, string> = Object.fromEntries(
    uniqueTeacherIds.map((tid, i) => [tid, teacherDocs[i].data()?.displayName ?? 'Guru'])
  );

  // Single query for all active exam schedules across every class
  // Firestore 'in' supports a maximum of 30 values
  const examCountMap: Record<string, number> = Object.fromEntries(classIds.map((id) => [id, 0]));
  const chunkSize = 30;
  for (let i = 0; i < classIds.length; i += chunkSize) {
    const chunk = classIds.slice(i, i + chunkSize);
    const examSnap = await adminDb
      .collection('exam_schedules')
      .where('classId', 'in', chunk)
      .where('status', '==', 'active')
      .get();
    examSnap.docs.forEach((d) => {
      const cid = d.data().classId as string;
      examCountMap[cid] = (examCountMap[cid] ?? 0) + 1;
    });
  }

  const classes = classIds.map((id) => {
    const data = classDataMap[id];
    return {
      id,
      name: data.name,
      subject: data.subject,
      joinCode: data.joinCode,
      teacherName: teacherMap[data.teacherId] ?? 'Guru',
      teacherId: data.teacherId,
      studentCount: (data.studentIds ?? []).length,
      activeExamCount: examCountMap[id] ?? 0,
    };
  });

  return NextResponse.json({ classes });
}
