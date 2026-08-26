import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyStudent } from '@/lib/auth-helpers';
import type { MASTExam, MASTQuestionForStudent, MASTSession } from '@/types/mast';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────
  const student = await verifyStudent(req);
  if (!student) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // ── Parse body ──────────────────────────────────────────────────────
  let body: { examCode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { examCode } = body;
  if (!examCode) return NextResponse.json({ error: 'examCode required' }, { status: 400 });

  // ── Find active exam by code ────────────────────────────────────────
  const examSnap = await adminDb
    .collection('mast_exams')
    .where('examCode', '==', examCode.toUpperCase())
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (examSnap.empty) {
    return NextResponse.json({ error: 'Kode ujian tidak valid atau ujian sudah ditutup' }, { status: 404 });
  }

  const examDoc = examSnap.docs[0];
  const exam = { id: examDoc.id, ...examDoc.data() } as MASTExam;

  // ── Enrollment check ────────────────────────────────────────────────
  if (exam.enrolledStudentIds && exam.enrolledStudentIds.length > 0) {
    if (!exam.enrolledStudentIds.includes(student.uid)) {
      return NextResponse.json({ error: 'Kamu tidak terdaftar pada ujian ini' }, { status: 403 });
    }
  }

  // ── Check for existing session ──────────────────────────────────────
  const existingSnap = await adminDb
    .collection('mast_sessions')
    .where('examId', '==', examDoc.id)
    .where('studentId', '==', student.uid)
    .where('status', 'in', ['in_progress', 'on_break', 'waiting'])
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    const existing = existingSnap.docs[0];
    return NextResponse.json({
      error: 'Kamu sudah memiliki sesi aktif untuk ujian ini',
      sessionId: existing.id,
    }, { status: 409 });
  }

  // ── Auto-start mode ────────────────────────────────────────────────
  if (exam.mode === 'auto_start') {
    const sessionRef = adminDb.collection('mast_sessions').doc();
    const sessionData: Omit<MASTSession, 'id'> = {
      studentId: student.uid,
      examId: examDoc.id,
      examCode: exam.examCode,
      status: 'in_progress',
      startedAt: FieldValue.serverTimestamp() as unknown as MASTSession['startedAt'],
      completedAt: null,
      currentStage: 1,
      currentStageDifficulty: 'medium',
      stagePath: ['medium'],
      stageResponses: [],
      breakStartedAt: null,
      breakSkippedBy: null,
      breakEndsAt: null,
      finalScore: null,
      predikat: null,
      conclusions: null,
      anomalyFlags: [],
      durationMinutes: exam.durationPerStage * exam.totalStages,
    };
    await sessionRef.set(sessionData);

    // Fetch stage 1 questions (strip correctAnswer + explanation for student)
    const questionIds = exam.stage1QuestionIds;
    const questions: MASTQuestionForStudent[] = [];

    if (questionIds.length > 0) {
      // Firestore 'in' limit is 10, stage 1 has 12 questions — fetch in chunks
      const chunks: string[][] = [];
      for (let i = 0; i < questionIds.length; i += 10) {
        chunks.push(questionIds.slice(i, i + 10));
      }
      for (const chunk of chunks) {
        const qSnap = await adminDb
          .collection('mast_questions')
          .where('__name__', 'in', chunk)
          .get();
        for (const qDoc of qSnap.docs) {
          const data = qDoc.data();
          // Strip correctAnswer and explanation
          const { correctAnswer: _ca, explanation: _exp, ...safeData } = data;
          questions.push({ id: qDoc.id, ...safeData } as MASTQuestionForStudent);
        }
      }
      // Preserve original order from stage1QuestionIds
      const orderMap = new Map(questionIds.map((id, idx) => [id, idx]));
      questions.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
    }

    return NextResponse.json({
      sessionId: sessionRef.id,
      mode: 'auto_start' as const,
      exam,
      questions,
    }, { status: 201 });
  }

  // ── Manual-start mode ──────────────────────────────────────────────
  const sessionRef = adminDb.collection('mast_sessions').doc();
  const sessionData: Omit<MASTSession, 'id'> = {
    studentId: student.uid,
    examId: examDoc.id,
    examCode: exam.examCode,
    status: 'waiting',
    startedAt: null,
    completedAt: null,
    currentStage: 1,
    currentStageDifficulty: 'medium',
    stagePath: ['medium'],
    stageResponses: [],
    breakStartedAt: null,
    breakSkippedBy: null,
    breakEndsAt: null,
    finalScore: null,
    predikat: null,
    conclusions: null,
    anomalyFlags: [],
    durationMinutes: exam.durationPerStage * exam.totalStages,
  };
  await sessionRef.set(sessionData);

  // Add student to waiting room
  const waitingRoomRef = adminDb.collection('mast_waiting_room').doc(examDoc.id);
  await waitingRoomRef.set(
    {
      examId: examDoc.id,
      status: 'waiting',
      [`students.${student.uid}`]: {
        joinedAt: FieldValue.serverTimestamp(),
        displayName: student.name ?? '',
        ready: false,
      },
    },
    { merge: true },
  );

  return NextResponse.json({
    sessionId: sessionRef.id,
    mode: 'manual_start' as const,
    waitingRoom: true,
  }, { status: 201 });
}
