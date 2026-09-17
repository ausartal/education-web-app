import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyTeacher } from '@/lib/auth-helpers';
import { FieldValue } from 'firebase-admin/firestore';
import { randomBytes } from 'crypto';
import {
  isExamQuestionAccessible,
  parseCreateExamSchedule,
  toStoredExamQuestion,
  type StoredExamQuestion,
} from '@/lib/exam-schedule-validation';

export const dynamic = 'force-dynamic';

function generateExamToken(): string {
  return randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
}

class ExamTokenCollisionError extends Error {}

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

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }
  const parsed = parseCreateExamSchedule(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const {
    classId, title, module, domainIds, scheduledAt, durationMinutes,
    maxAttempts, shuffleQuestions, examType, customQuestions, selectedQuestionIds,
  } = parsed.value;
  const isCustom = examType === 'custom';
  const isManual = examType === 'manual';

  try {
    // Never trust classId from the client: the authenticated teacher must own it.
    const classSnap = await adminDb.collection('classes').doc(classId).get();
    if (!classSnap.exists || classSnap.data()!.teacherId !== teacher.uid) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // For TP exams: verify every selected domain has an accessible, complete set.
    if (examType === 'tp') {
      const LEGACY_TIER_MAP: Record<string, string> = {
        K1: 'anchor', K2: 'mudah', K3: 'sukar',
        K4: 'sangat_mudah', K5: 'sedang_a', K6: 'sedang_b', K7: 'sangat_sukar',
      };
      const requiredPaths = ['anchor', 'mudah', 'sukar', 'sangat_mudah', 'sedang_a', 'sedang_b', 'sangat_sukar'];

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

      const domainTierPaths: Record<string, Set<string>> = {};
      const domainNameMap: Record<string, string> = {};
      allDocs.forEach(d => {
        const q = d.data();
        if (!isExamQuestionAccessible(q, teacher.uid, teacher.role === 'admin')) return;

        const tpId = q.domainId as string;
        const tierPath = LEGACY_TIER_MAP[q.tierPath as string] || q.tierPath;
        if (!domainTierPaths[tpId]) domainTierPaths[tpId] = new Set();
        domainTierPaths[tpId].add(tierPath);
        if (!domainNameMap[tpId]) domainNameMap[tpId] = (q.domainName as string) || tpId;
      });

      const incompleteDomains = domainIds.filter(id => {
        const paths = domainTierPaths[id];
        return !paths || requiredPaths.some(p => !paths.has(p));
      });

      if (incompleteDomains.length > 0) {
        const readableNames = incompleteDomains.map(id => domainNameMap[id] || id);
        return NextResponse.json({
          error: `Bank soal belum lengkap untuk: ${readableNames.join(', ')}. Pastikan setiap topik memiliki soal di semua tingkat.`,
          incompleteDomains,
        }, { status: 422 });
      }
    }

    // Manual exams must use every requested question, and every question must be
    // active and visible to this teacher. Silently dropping IDs changes the exam.
    let finalCustomQuestions: StoredExamQuestion[] = customQuestions;
    if (isManual) {
      const qDocs = await Promise.all(
        selectedQuestionIds.map(id => adminDb.collection('exam_questions').doc(id).get()),
      );
      if (qDocs.some(doc => !doc.exists)) {
        return NextResponse.json({ error: 'Ada soal yang tidak ditemukan atau tidak valid' }, { status: 422 });
      }

      if (qDocs.some(doc => !isExamQuestionAccessible(doc.data()!, teacher.uid, teacher.role === 'admin'))) {
        return NextResponse.json({ error: 'Ada soal yang tidak dapat digunakan' }, { status: 403 });
      }

      const storedQuestions = qDocs.map(doc => toStoredExamQuestion(doc.id, doc.data()!));
      if (storedQuestions.some(question => question === null)) {
        return NextResponse.json({ error: 'Ada soal yang tidak ditemukan atau tidak valid' }, { status: 422 });
      }
      finalCustomQuestions = storedQuestions as StoredExamQuestion[];
    }

    const docRef = adminDb.collection('exam_schedules').doc();
    const auditRef = adminDb.collection('audit_logs').doc();
    const scheduleBase: Record<string, unknown> = {
      teacherId: teacher.uid,
      classId,
      title,
      module,
      domainIds: (isCustom || isManual) ? [] : domainIds,
      scheduledAt: scheduledAt ?? new Date(),
      durationMinutes,
      maxAttempts,
      shuffleQuestions,
      examType,
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
    };
    if (isCustom || isManual) scheduleBase.customQuestions = finalCustomQuestions;

    let examToken = '';
    let storedSchedule: Record<string, unknown> | null = null;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = generateExamToken();
      const tokenRef = adminDb.collection('exam_schedule_tokens').doc(candidate);
      const legacyTokenQuery = adminDb.collection('exam_schedules')
        .where('examToken', '==', candidate)
        .where('status', '==', 'active');
      try {
        const schedule = { ...scheduleBase, examToken: candidate };
        await adminDb.runTransaction(async transaction => {
          const [reservation, legacySchedule] = await Promise.all([
            transaction.get(tokenRef),
            transaction.get(legacyTokenQuery),
          ]);
          if (reservation.exists || !legacySchedule.empty) throw new ExamTokenCollisionError();

          transaction.create(tokenRef, {
            scheduleId: docRef.id,
            teacherId: teacher.uid,
            createdAt: FieldValue.serverTimestamp(),
          });
          transaction.set(docRef, schedule);
          transaction.set(auditRef, {
            actorId: teacher.uid,
            actorRole: teacher.role,
            action: 'create_exam_schedule',
            targetId: docRef.id,
            targetType: 'exam_schedule',
            details: {
              title, classId, examToken: candidate, examType,
              questionCount: (isCustom || isManual) ? finalCustomQuestions.length : domainIds.length,
            },
            timestamp: FieldValue.serverTimestamp(),
          });
        });
        examToken = candidate;
        storedSchedule = schedule;
        break;
      } catch (error) {
        if (!(error instanceof ExamTokenCollisionError)) throw error;
      }
    }

    if (!storedSchedule) {
      return NextResponse.json({ error: 'Gagal membuat token ujian unik. Silakan coba lagi.' }, { status: 503 });
    }

    return NextResponse.json({
      schedule: {
        id: docRef.id,
        ...storedSchedule,
        examToken,
        scheduledAt: (storedSchedule.scheduledAt as Date).toISOString(),
        createdAt: new Date().toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create exam schedule:', error);
    return NextResponse.json({ error: 'Gagal membuat ujian' }, { status: 500 });
  }
}
