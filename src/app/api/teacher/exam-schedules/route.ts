import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyTeacher } from '@/lib/auth-helpers';
import { FieldValue } from 'firebase-admin/firestore';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

function generateExamToken(): string {
  return randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
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

  if (snap.empty) return NextResponse.json({ schedules: [] });

  // Kumpulkan semua session sekaligus — satu query per chunk 30 schedule IDs
  // Daripada N query (1 per schedule), jadi ceil(N/30) query.
  const scheduleIds = snap.docs.map((d) => d.id);
  const sessionsBySchedule: Record<string, Array<{ status: string; numericScore?: number }>> = {};
  const chunkSize = 30;
  for (let i = 0; i < scheduleIds.length; i += chunkSize) {
    const chunk = scheduleIds.slice(i, i + chunkSize);
    const sessSnap = await adminDb
      .collection('exam_sessions')
      .where('examScheduleId', 'in', chunk)
      .select('examScheduleId', 'status', 'numericScore')
      .get();
    sessSnap.docs.forEach((d) => {
      const sid = d.data().examScheduleId as string;
      if (!sessionsBySchedule[sid]) sessionsBySchedule[sid] = [];
      sessionsBySchedule[sid].push(d.data() as { status: string; numericScore?: number });
    });
  }

  const schedules = snap.docs.map((d) => {
    const sessions = sessionsBySchedule[d.id] ?? [];
    const completed = sessions.filter((s) => s.status === 'completed');
    const avgScore =
      completed.length > 0
        ? Math.round(completed.reduce((acc, s) => acc + (s.numericScore ?? 0), 0) / completed.length)
        : null;
    return {
      id: d.id,
      ...d.data(),
      sessionCount: sessions.length,
      completedCount: completed.length,
      avgScore,
    };
  });

  const getSeconds = (ts: unknown) => (ts as { _seconds?: number })?._seconds ?? 0;
  (schedules as Array<Record<string, unknown>>).sort((a, b) => getSeconds(b.createdAt) - getSeconds(a.createdAt));

  return NextResponse.json({ schedules });
}

export async function POST(req: NextRequest) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }
  const {
    classId, title, module = 'stoikiometri', domainIds, scheduledAt,
    durationMinutes = 50, maxAttempts = 1, shuffleQuestions = false,
    examType = 'tp', customQuestions = [], selectedQuestionIds = [],
  } = body as {
    classId?: string; title?: string; module?: string; domainIds?: string[];
    scheduledAt?: string; durationMinutes?: number; maxAttempts?: number;
    shuffleQuestions?: boolean; examType?: string; customQuestions?: unknown[];
    selectedQuestionIds?: string[];
  };

  const isCustom = examType === 'custom';
  const isManual = examType === 'manual';

  if (!classId || !title) {
    return NextResponse.json({ error: 'classId and title required' }, { status: 400 });
  }
  if (!isCustom && !isManual && !domainIds?.length) {
    return NextResponse.json({ error: 'domainIds required for TP exam' }, { status: 400 });
  }
  if (isCustom && (!Array.isArray(customQuestions) || customQuestions.length === 0)) {
    return NextResponse.json({ error: 'customQuestions required for custom exam' }, { status: 400 });
  }
  if (isManual && (!Array.isArray(selectedQuestionIds) || selectedQuestionIds.length === 0)) {
    return NextResponse.json({ error: 'selectedQuestionIds required for manual exam' }, { status: 400 });
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

  // For manual exams: fetch the selected questions from DB and store them as customQuestions
  let finalCustomQuestions: unknown[] = customQuestions;
  if (isManual) {
    const qDocs = await Promise.all(
      (selectedQuestionIds as string[]).map(id => adminDb.collection('exam_questions').doc(id).get()),
    );
    finalCustomQuestions = qDocs
      .filter(d => d.exists)
      .map(d => {
        const data = d.data()!;
        return {
          id: d.id,
          stem: data.stem,
          options: data.options,
          correctAnswer: data.correctAnswer,
          version: (data.version as number) ?? 1,
          domainId: data.domainId,
          domainName: data.domainName,
          tierPath: data.tierPath,
        };
      });
    if (finalCustomQuestions.length === 0) {
      return NextResponse.json({ error: 'Soal yang dipilih tidak ditemukan' }, { status: 400 });
    }
  }

  const docRef = adminDb.collection('exam_schedules').doc();
  const schedule: Record<string, unknown> = {
    teacherId: teacher.uid,
    classId,
    title,
    module,
    domainIds: (isCustom || isManual) ? [] : domainIds,
    examToken,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
    durationMinutes,
    maxAttempts,
    shuffleQuestions,
    examType,
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
  };
  if (isCustom) schedule.customQuestions = finalCustomQuestions;
  if (isManual) schedule.customQuestions = finalCustomQuestions;
  await docRef.set(schedule);

  await adminDb.collection('audit_logs').add({
    actorId: teacher.uid, actorRole: 'teacher', action: 'create_exam_schedule',
    targetId: docRef.id, targetType: 'exam_schedule',
    details: { title, classId, examToken, examType, questionCount: (isCustom || isManual) ? finalCustomQuestions.length : (domainIds?.length ?? 0) }, timestamp: new Date(),
  });

  return NextResponse.json({ schedule: { id: docRef.id, ...schedule } }, { status: 201 });
}
