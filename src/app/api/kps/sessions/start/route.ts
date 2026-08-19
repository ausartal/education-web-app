import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { KPS_CONFIG } from '@/types/kps';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.slice(7);

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { code } = body;
  if (!code) return NextResponse.json({ error: 'Kode akses diperlukan' }, { status: 400 });

  const normalizedCode = code.toUpperCase().trim();

  // Find access code (single-field query — no composite index needed)
  const codeSnap = await adminDb.collection('kps_access_codes')
    .where('code', '==', normalizedCode)
    .limit(1)
    .get();

  if (codeSnap.empty) {
    return NextResponse.json({ error: 'Kode akses tidak ditemukan' }, { status: 404 });
  }

  const codeDoc = codeSnap.docs[0];
  const codeData = codeDoc.data();

  // Check status in memory
  if (codeData.status !== 'active') {
    return NextResponse.json({ error: 'Kode akses sudah tidak aktif' }, { status: 410 });
  }

  // Check expiry
  const expiresAt = codeData.expiresAt?.toDate?.() ?? new Date(codeData.expiresAt);
  if (expiresAt < new Date()) {
    await codeDoc.ref.update({ status: 'expired' });
    return NextResponse.json({ error: 'Kode akses sudah kedaluwarsa' }, { status: 410 });
  }

  // Check quota
  if (codeData.maxUses > 0 && codeData.currentUses >= codeData.maxUses) {
    return NextResponse.json({ error: 'Kode akses sudah mencapai batas penggunaan' }, { status: 410 });
  }

  // Check if student already has an in-progress session with this code
  const existingSnap = await adminDb.collection('kps_exam_sessions')
    .where('accessCodeId', '==', codeDoc.id)
    .where('studentId', '==', decoded.uid)
    .where('status', '==', 'in_progress')
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    const existingDoc = existingSnap.docs[0];
    const existingData = existingDoc.data();

    // Fetch current stage questions for resume
    // Stage 3 reuses stage 2 questions
    const queryStage = existingData.currentStage === 3 ? 2 : existingData.currentStage;
    const level = existingData.currentStage === 1 ? 'menengah'
      : existingData.stage2Path === 'tinggi' ? 'tinggi' : 'rendah';

    const questionsSnap = await adminDb.collection('kps_questions')
      .where('difficultyLevel', '==', level)
      .where('stage', '==', queryStage)
      .where('status', '==', 'active')
      .orderBy('order')
      .get();

    const stimulusSnap = await adminDb.collection('kps_stimuli')
      .where('level', '==', level)
      .where('stage', '==', queryStage)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    const questions = questionsSnap.docs.map((d) => {
      const data = d.data();
      const { correctAnswer, correctAnswers, correctMatches, statements, ...safe } = data;
      // For complex TF, strip correctAnswer from statements
      if (data.questionType === 'complex_true_false' && data.statements) {
        return { ...safe, id: d.id, statements: data.statements.map((s: { id: string; text: string }) => ({ id: s.id, text: s.text })) };
      }
      return { ...safe, id: d.id };
    });

    const stimulus = stimulusSnap.empty ? null : { id: stimulusSnap.docs[0].id, ...stimulusSnap.docs[0].data() };

    return NextResponse.json({
      sessionId: existingDoc.id,
      resumed: true,
      durationMinutes: existingData.durationMinutes,
      currentStage: existingData.currentStage,
      stage2Path: existingData.stage2Path,
      stimulus,
      questions,
      timeLeftMs: calculateTimeLeft(existingData.startedAt, existingData.durationMinutes),
    });
  }

  // Check if student already completed with this code
  const completedSnap = await adminDb.collection('kps_exam_sessions')
    .where('accessCodeId', '==', codeDoc.id)
    .where('studentId', '==', decoded.uid)
    .where('status', '==', 'completed')
    .limit(1)
    .get();

  if (!completedSnap.empty) {
    return NextResponse.json({
      error: 'Kamu sudah menyelesaikan ujian dengan kode ini',
      completed: true,
      sessionId: completedSnap.docs[0].id,
    }, { status: 409 });
  }

  // Fetch stage 1 questions (menengah level)
  const questionsSnap = await adminDb.collection('kps_questions')
    .where('difficultyLevel', '==', 'menengah')
    .where('stage', '==', 1)
    .where('status', '==', 'active')
    .orderBy('order')
    .get();

  const stimulusSnap = await adminDb.collection('kps_stimuli')
    .where('level', '==', 'menengah')
    .where('stage', '==', 1)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (questionsSnap.empty) {
    return NextResponse.json({ error: 'Soal ujian belum tersedia' }, { status: 503 });
  }

  const questions = questionsSnap.docs.map((d) => {
    const data = d.data();
    const { correctAnswer, correctAnswers, correctMatches, statements, ...safe } = data;
    if (data.questionType === 'complex_true_false' && data.statements) {
      return { ...safe, id: d.id, statements: data.statements.map((s: { id: string; text: string }) => ({ id: s.id, text: s.text })) };
    }
    return { ...safe, id: d.id };
  });

  const stimulus = stimulusSnap.empty ? null : { id: stimulusSnap.docs[0].id, ...stimulusSnap.docs[0].data() };
  const stimulusIds = stimulusSnap.empty ? [] : [stimulusSnap.docs[0].id];

  // Create session
  const docRef = adminDb.collection('kps_exam_sessions').doc();
  await docRef.set({
    studentId: decoded.uid,
    startedAt: FieldValue.serverTimestamp(),
    completedAt: null,
    durationMinutes: KPS_CONFIG.totalDurationMinutes,
    status: 'in_progress',
    currentStage: 1,
    stageResponses: [],
    stage2Path: null,
    stage3Path: null,
    finalLevel: null,
    numericScore: null,
    indicatorScores: null,
    anomalyFlags: [],
    tabSwitchCount: 0,
    stimulusIds,
    accessCodeId: codeDoc.id,
  });

  // Increment code usage
  await codeDoc.ref.update({ currentUses: FieldValue.increment(1) });

  // Audit log
  await adminDb.collection('audit_logs').add({
    actorId: decoded.uid,
    actorRole: 'student',
    action: 'start_kps_exam',
    targetId: docRef.id,
    targetType: 'kps_exam_session',
    details: { accessCodeId: codeDoc.id, title: codeData.title },
    timestamp: new Date(),
  });

  return NextResponse.json({
    sessionId: docRef.id,
    resumed: false,
    durationMinutes: KPS_CONFIG.totalDurationMinutes,
    currentStage: 1,
    stage2Path: null,
    stimulus,
    questions,
  }, { status: 201 });
}

function calculateTimeLeft(startedAt: { toDate?: () => Date } | Date, durationMinutes: number): number {
  const start = startedAt instanceof Date ? startedAt : (startedAt?.toDate?.() ?? new Date());
  const endMs = start.getTime() + durationMinutes * 60 * 1000;
  return Math.max(0, endMs - Date.now());
}
