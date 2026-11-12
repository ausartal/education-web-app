import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from '@/lib/pg-firestore';
import { consumeRateLimit } from '@/lib/rate-limit-server';
import { rateLimitMessage } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const ATTEMPT_STATUSES = ['completed', 'flagged', 'timed_out', 'terminated'];

async function countAttempts(scheduleId: string, studentId: string): Promise<{ count: number; firstId: string | null }> {
  const snap = await adminDb.collection('exam_sessions')
    .where('examScheduleId', '==', scheduleId)
    .where('studentId', '==', studentId)
    .get();
  const finished = snap.docs.filter(d => ATTEMPT_STATUSES.includes(d.data().status as string));
  return { count: finished.length, firstId: finished[0]?.id ?? null };
}

async function expireStaleSession(doc: { data: () => any; ref: { update: (v: Record<string, unknown>) => Promise<unknown> } }): Promise<boolean> {
  const data = doc.data();
  const startedAt = data.startedAt?.toDate?.();
  if (!startedAt) return false;
  const maxMs = ((data.durationMinutes || 50) + 5) * 60 * 1000;
  if (Date.now() - startedAt.getTime() <= maxMs) return false;
  await doc.ref.update({ status: 'timed_out', completedAt: FieldValue.serverTimestamp() });
  return true;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.slice(7);

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  let body: { examToken?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }
  const { examToken } = body;
  if (!examToken) return NextResponse.json({ error: 'examToken required' }, { status: 400 });

  const limit = await consumeRateLimit(`exam_token:${decoded.uid}`, 15, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: rateLimitMessage(limit.retryAfterSec) }, { status: 429 });
  }

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

  if (classData.status === 'archived') {
    return NextResponse.json({ error: 'Kelas ini sudah diarsipkan.' }, { status: 403 });
  }

  const schedulePayload = {
    id: scheduleDoc.id,
    title: schedule.title,
    durationMinutes: schedule.durationMinutes,
    domainIds: schedule.domainIds || [],
    examType: schedule.examType || 'tp',
  };

  // ── Custom / Manual exam mode ───────────────────────────────────────
  if (schedule.examType === 'custom' || schedule.examType === 'manual') {
    const mode = schedule.examType as 'custom' | 'manual';
    const customQuestions = (schedule.customQuestions as unknown[]) || [];
    const maxAttempts = (schedule.maxAttempts as number) ?? 1;

    // Check existing in-progress session
    const existingSnap = await adminDb.collection('exam_sessions')
      .where('examScheduleId', '==', scheduleDoc.id)
      .where('studentId', '==', decoded.uid)
      .where('status', '==', 'in_progress')
      .limit(1).get();

    let activeDoc = existingSnap.docs[0];
    if (activeDoc && await expireStaleSession(activeDoc)) activeDoc = undefined as unknown as typeof activeDoc;

    if (activeDoc) {
      const ed = activeDoc;
      // Strip correctAnswer before sending to client
      const safeCustomQuestions = (customQuestions as Array<Record<string, unknown>>).map(({ correctAnswer, ...rest }) => rest);
      return NextResponse.json({
        sessionId: ed.id, resumed: true, mode,
        schedule: schedulePayload, customQuestions: safeCustomQuestions,
        completedDomains: 0,
      });
    }

    // Check attempts limit
    const attempts = await countAttempts(scheduleDoc.id, decoded.uid);
    if (maxAttempts > 0 && attempts.count >= maxAttempts) {
      return NextResponse.json({ error: 'Kamu sudah mencapai batas percobaan ujian ini', completed: true, sessionId: attempts.firstId }, { status: 409 });
    }

    const docRef = adminDb.collection('exam_sessions').doc();
    await docRef.set({
      studentId: decoded.uid,
      examScheduleId: scheduleDoc.id,
      classId: schedule.classId,
      teacherId: schedule.teacherId,
      startedAt: FieldValue.serverTimestamp(),
      completedAt: null,
      durationMinutes: schedule.durationMinutes || 50,
      examType: mode,
      examTitle: schedule.title ?? null,
      status: 'in_progress',
      domainResponses: [],
      customAnswers: [],
      numericScore: null,
      anomalyFlags: [],
    });

    await adminDb.collection('audit_logs').add({
      actorId: decoded.uid, actorRole: 'student', action: 'start_exam',
      targetId: docRef.id, targetType: 'exam_session',
      details: { scheduleId: scheduleDoc.id, title: schedule.title, examType: mode }, timestamp: new Date(),
    });

    // Strip correctAnswer before sending to client
    const safeCustomQuestions = (customQuestions as Array<Record<string, unknown>>).map(({ correctAnswer, ...rest }) => rest);

    return NextResponse.json({
      sessionId: docRef.id, mode,
      schedule: schedulePayload, customQuestions: safeCustomQuestions,
      resumed: false,
    }, { status: 201 });
  }

  // ── Standard MSAT adaptive mode ────────────────────────────────────
  const domainIds: string[] = schedule.domainIds || [];
  const teacherId: string = schedule.teacherId;

  // Query in chunks (Firestore 'in' limit = 10)
  const chunks: string[][] = [];
  for (let i = 0; i < domainIds.length; i += 10) chunks.push(domainIds.slice(i, i + 10));

  const allDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  for (const chunk of chunks) {
    const snap = await adminDb.collection('exam_questions')
      .where('domainId', 'in', chunk)
      .where('status', '==', 'active')
      .get();
    allDocs.push(...snap.docs);
  }

  // Filter: legacy (no visibility) = global, or global+approved, or teacher's private
  const accessibleDocs = allDocs.filter(d => {
    const q = d.data();
    if (!q.visibility) return true;
    if (q.visibility === 'global' && q.approvalStatus === 'approved') return true;
    if (q.visibility === 'private' && q.ownerId === teacherId) return true;
    return false;
  });

  const LEGACY_TIER_MAP: Record<string, string> = {
    K1: 'anchor', K2: 'mudah', K3: 'sukar',
    K4: 'sangat_mudah', K5: 'sedang_a', K6: 'sedang_b', K7: 'sangat_sukar',
  };

  accessibleDocs.sort((a, b) => a.id.localeCompare(b.id));
  const questionsByDomain: Record<string, Record<string, unknown>> = {};
  accessibleDocs.forEach(d => {
    const q = d.data();
    const tierPath = LEGACY_TIER_MAP[q.tierPath] ?? q.tierPath;
    if (!questionsByDomain[q.domainId]) questionsByDomain[q.domainId] = {};
    questionsByDomain[q.domainId][tierPath] = {
      id: d.id,
      domainName: q.domainName,
      stem: q.stem,
      options: q.options,
      tierPath,
      difficulty: q.difficulty,
      cognitiveLevel: q.cognitiveLevel,
    };
  });

  const requiredPaths = ['anchor', 'mudah', 'sukar', 'sangat_mudah', 'sedang_a', 'sedang_b', 'sangat_sukar'];
  const missingDomains = domainIds.filter(id => {
    const dq = questionsByDomain[id];
    return !dq || requiredPaths.some(path => !dq[path]);
  });

  if (missingDomains.length > 0) {
    // Get readable domain names for the error message
    const domainNameMap: Record<string, string> = {};
    missingDomains.forEach(id => {
      const firstQ = questionsByDomain[id];
      const firstPath = firstQ ? Object.values(firstQ)[0] as { domainName?: string } : null;
      domainNameMap[id] = firstPath?.domainName || id;
    });
    const readableNames = missingDomains.map(id => domainNameMap[id]);
    return NextResponse.json({
      error: `Bank soal belum lengkap. Topik berikut belum memiliki soal di semua tingkat: ${readableNames.join(', ')}`,
      missingDomains,
    }, { status: 422 });
  }

  const questionIds = Object.values(questionsByDomain).flatMap(
    (domain) => Object.values(domain as Record<string, { id: string }>).map((q) => (q as { id: string }).id),
  );

  // Check if student already has an in-progress session for this schedule
  const existingSnap = await adminDb.collection('exam_sessions')
    .where('examScheduleId', '==', scheduleDoc.id)
    .where('studentId', '==', decoded.uid)
    .where('status', '==', 'in_progress')
    .limit(1)
    .get();

  let activeDoc = existingSnap.docs[0];
  if (activeDoc && await expireStaleSession(activeDoc)) activeDoc = undefined as unknown as typeof activeDoc;

  if (activeDoc) {
    const existingDoc = activeDoc;
    const existingSession = existingDoc.data();
    if (!existingSession.questionIds) {
      await existingDoc.ref.update({ questionIds });
    }
    const completedDomains = (existingSession.domainResponses || []).length;
    const pinned = new Set<string>((existingSession.questionIds as string[] | undefined) ?? []);
    let resumeQuestions: Record<string, Record<string, unknown>> = questionsByDomain;
    if (pinned.size > 0) {
      resumeQuestions = {};
      accessibleDocs.filter(d => pinned.has(d.id)).forEach(d => {
        const q = d.data();
        const tierPath = LEGACY_TIER_MAP[q.tierPath] ?? q.tierPath;
        if (!resumeQuestions[q.domainId]) resumeQuestions[q.domainId] = {};
        resumeQuestions[q.domainId][tierPath] = {
          id: d.id, domainName: q.domainName, stem: q.stem, options: q.options,
          tierPath, difficulty: q.difficulty, cognitiveLevel: q.cognitiveLevel,
        };
      });
    }
    return NextResponse.json({
      sessionId: existingDoc.id,
      resumed: true,
      completedDomains,
      schedule: schedulePayload,
      questions: resumeQuestions,
    });
  }

  // Check attempts limit for MSAT
  const attemptsMsat = await countAttempts(scheduleDoc.id, decoded.uid);
  const maxAttemptsMsat = (schedule.maxAttempts as number) ?? 1;
  if (maxAttemptsMsat > 0 && attemptsMsat.count >= maxAttemptsMsat) {
    return NextResponse.json({ error: 'Kamu sudah mencapai batas percobaan ujian ini', completed: true, sessionId: attemptsMsat.firstId }, { status: 409 });
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
    examType: 'tp',
    examTitle: schedule.title ?? null,
    status: 'in_progress',
    currentDomainIndex: 0,
    domainResponses: [],
    numericScore: null,
    anomalyFlags: [],
    questionIds,
  };
  await docRef.set(session);

  await adminDb.collection('audit_logs').add({
    actorId: decoded.uid, actorRole: 'student', action: 'start_exam',
    targetId: docRef.id, targetType: 'exam_session',
    details: { scheduleId: scheduleDoc.id, title: schedule.title }, timestamp: new Date(),
  });

  return NextResponse.json({
    sessionId: docRef.id,
    schedule: schedulePayload,
    questions: questionsByDomain,
    resumed: false,
  }, { status: 201 });
}
