import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.slice(7);

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const { examToken } = await req.json();
  if (!examToken) return NextResponse.json({ error: 'examToken required' }, { status: 400 });

  // Find active exam schedule with this token
  const scheduleSnap = await adminDb.collection('exam_schedules')
    .where('examToken', '==', examToken.toUpperCase())
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (scheduleSnap.empty) {
    return NextResponse.json({ error: 'Token tidak valid atau ujian sudah ditutup' }, { status: 404 });
  }

  const scheduleDoc = scheduleSnap.docs[0];
  const schedule = scheduleDoc.data();

  // Verify student is in the class
  const classSnap = await adminDb.collection('classes').doc(schedule.classId).get();
  if (!classSnap.exists) return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 });
  const classData = classSnap.data()!;

  if (!(classData.studentIds || []).includes(decoded.uid)) {
    return NextResponse.json({ error: 'Kamu tidak terdaftar di kelas ini. Minta gurumu untuk menambahkanmu atau bergabung lewat kode kelas.' }, { status: 403 });
  }

  // Check if student already has an in-progress session for this schedule
  const existingSnap = await adminDb.collection('exam_sessions')
    .where('examScheduleId', '==', scheduleDoc.id)
    .where('studentId', '==', decoded.uid)
    .where('status', '==', 'in_progress')
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    return NextResponse.json({ sessionId: existingSnap.docs[0].id, resumed: true });
  }

  // Check if already completed
  const completedSnap = await adminDb.collection('exam_sessions')
    .where('examScheduleId', '==', scheduleDoc.id)
    .where('studentId', '==', decoded.uid)
    .where('status', '==', 'completed')
    .limit(1)
    .get();

  if (!completedSnap.empty) {
    return NextResponse.json({ error: 'Kamu sudah mengerjakan ujian ini', completed: true, sessionId: completedSnap.docs[0].id }, { status: 409 });
  }

  // Load exam questions for all domains in this schedule
  const domainIds: string[] = schedule.domainIds || [];
  const questionsSnap = await adminDb.collection('exam_questions')
    .where('module', '==', schedule.module)
    .where('status', '==', 'active')
    .get();

  const questionsByDomain: Record<string, Record<string, unknown>> = {};
  questionsSnap.docs.forEach(d => {
    const q = d.data();
    if (!domainIds.includes(q.domainId)) return;
    if (!questionsByDomain[q.domainId]) questionsByDomain[q.domainId] = {};
    questionsByDomain[q.domainId][q.tierPath] = {
      id: d.id,
      stem: q.stem,
      options: q.options,
      correctAnswer: q.correctAnswer,
      tierPath: q.tierPath,
      difficulty: q.difficulty,
      cognitiveLevel: q.cognitiveLevel,
    };
  });

  // Validate all required tier paths exist for each domain
  const requiredPaths = ['anchor', 'mudah', 'sukar', 'sangat_mudah', 'sedang_a', 'sedang_b', 'sangat_sukar'];
  const missingDomains = domainIds.filter(id => {
    const dq = questionsByDomain[id];
    return !dq || requiredPaths.some(path => !dq[path]);
  });

  if (missingDomains.length > 0) {
    return NextResponse.json({
      error: `Bank soal ujian belum lengkap untuk domain: ${missingDomains.join(', ')}`,
      missingDomains,
    }, { status: 422 });
  }

  // Create session
  const docRef = adminDb.collection('exam_sessions').doc();
  const session = {
    studentId: decoded.uid,
    examScheduleId: scheduleDoc.id,
    classId: schedule.classId,
    teacherId: schedule.teacherId,
    startedAt: FieldValue.serverTimestamp(),
    completedAt: null,
    durationMinutes: schedule.durationMinutes || 50,
    status: 'in_progress',
    currentDomainIndex: 0,
    domainResponses: [],
    numericScore: null,
    anomalyFlags: [],
  };
  await docRef.set(session);

  await adminDb.collection('audit_logs').add({
    actorId: decoded.uid, actorRole: 'student', action: 'start_exam',
    targetId: docRef.id, targetType: 'exam_session',
    details: { scheduleId: scheduleDoc.id, title: schedule.title }, timestamp: new Date(),
  });

  return NextResponse.json({
    sessionId: docRef.id,
    schedule: { id: scheduleDoc.id, title: schedule.title, durationMinutes: schedule.durationMinutes, domainIds },
    questions: questionsByDomain,
    resumed: false,
  }, { status: 201 });
}
