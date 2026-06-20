import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.slice(7);

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  // Get classes the student is in
  const snap = await adminDb.collection('classes')
    .where('studentIds', 'array-contains', decoded.uid)
    .where('status', '==', 'active')
    .get();

  const classes = await Promise.all(snap.docs.map(async (d) => {
    const data = d.data();
    // Get teacher name
    const teacherSnap = await adminDb.collection('users').doc(data.teacherId).get();
    const teacherName = teacherSnap.data()?.displayName || 'Guru';

    // Get active exams for this class
    const examSnap = await adminDb.collection('exam_schedules')
      .where('classId', '==', d.id)
      .where('status', '==', 'active')
      .get();

    return {
      id: d.id,
      name: data.name,
      subject: data.subject,
      joinCode: data.joinCode,
      teacherName,
      teacherId: data.teacherId,
      studentCount: (data.studentIds || []).length,
      activeExamCount: examSnap.size,
    };
  }));

  return NextResponse.json({ classes });
}
