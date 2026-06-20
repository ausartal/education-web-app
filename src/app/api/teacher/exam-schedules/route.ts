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
    return decoded;
  } catch { return null; }
}

function generateExamToken(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function GET(req: NextRequest) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const classId = searchParams.get('classId');

  let query: FirebaseFirestore.Query = adminDb.collection('exam_schedules')
    .where('teacherId', '==', teacher.uid);
  if (classId) query = query.where('classId', '==', classId);

  const snap = await query.get();

  // For each schedule, count sessions
  const schedules = await Promise.all(snap.docs.map(async (d) => {
    const sessionsSnap = await adminDb.collection('exam_sessions')
      .where('examScheduleId', '==', d.id).get();
    const completedSessions = sessionsSnap.docs.filter(s => s.data().status === 'completed');
    const avgScore = completedSessions.length > 0
      ? Math.round(completedSessions.reduce((acc, s) => acc + (s.data().numericScore || 0), 0) / completedSessions.length)
      : null;
    return {
      id: d.id,
      ...d.data(),
      sessionCount: sessionsSnap.size,
      completedCount: completedSessions.length,
      avgScore,
    };
  }));

  const getSeconds = (ts: unknown) => (ts as { _seconds?: number })?._seconds ?? 0;
  (schedules as Array<Record<string, unknown>>).sort((a, b) => getSeconds(b.createdAt) - getSeconds(a.createdAt));

  return NextResponse.json({ schedules });
}

export async function POST(req: NextRequest) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { classId, title, module = 'stoikiometri', domainIds, scheduledAt, durationMinutes = 50 } = body;

  if (!classId || !title || !domainIds?.length) {
    return NextResponse.json({ error: 'classId, title, and domainIds required' }, { status: 400 });
  }

  // Verify class belongs to teacher
  const classSnap = await adminDb.collection('classes').doc(classId).get();
  if (!classSnap.exists || classSnap.data()!.teacherId !== teacher.uid) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 });
  }

  // Generate unique exam token
  let examToken = generateExamToken();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await adminDb.collection('exam_schedules')
      .where('examToken', '==', examToken)
      .where('status', '==', 'active')
      .get();
    if (existing.empty) break;
    examToken = generateExamToken();
    attempts++;
  }

  const docRef = adminDb.collection('exam_schedules').doc();
  const schedule = {
    teacherId: teacher.uid,
    classId,
    title,
    module,
    domainIds,
    examToken,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
    durationMinutes,
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
  };
  await docRef.set(schedule);

  await adminDb.collection('audit_logs').add({
    actorId: teacher.uid, actorRole: 'teacher', action: 'create_exam_schedule',
    targetId: docRef.id, targetType: 'exam_schedule',
    details: { title, classId, examToken, domainCount: domainIds.length }, timestamp: new Date(),
  });

  return NextResponse.json({ schedule: { id: docRef.id, ...schedule } }, { status: 201 });
}
