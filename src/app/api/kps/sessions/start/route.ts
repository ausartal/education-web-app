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

  // Check per-account attempt limit (not total usage)
  const maxAttemptsPerAccount = codeData.maxAttemptsPerAccount || 1; // default 1 attempt per account
  const allUserSessionsSnap = await adminDb.collection('kps_exam_sessions')
    .where('studentId', '==', decoded.uid)
    .get();
  const userSessionsWithCode = allUserSessionsSnap.docs.filter(d => d.data().accessCodeId === codeDoc.id);
  const completedWithCode = userSessionsWithCode.filter(d => d.data().status === 'completed' || d.data().status === 'flagged');

  if (maxAttemptsPerAccount > 0 && completedWithCode.length >= maxAttemptsPerAccount) {
    return NextResponse.json({
      error: `Kamu sudah menggunakan kode ini ${completedWithCode.length}x. Batas: ${maxAttemptsPerAccount}x per akun.`,
      completed: true,
      sessionId: completedWithCode[0].id,
    }, { status: 409 });
  }

  // Check if student already has an in-progress session with this code
  // Use single-field query + in-memory filter (no composite index needed)
  const existingSnap = await adminDb.collection('kps_exam_sessions')
    .where('studentId', '==', decoded.uid)
    .where('status', '==', 'in_progress')
    .get();

  const existingDoc = existingSnap.docs.find(d => d.data().accessCodeId === codeDoc.id);

  if (existingDoc) {
    const existingData = existingDoc.data();

    // Fetch current stage questions for resume
    const queryStage = existingData.currentStage === 3 ? 2 : existingData.currentStage;
    const level = existingData.currentStage === 1 ? 'menengah'
      : existingData.stage2Path === 'tinggi' ? 'tinggi' : 'rendah';

    // Find a stimulus for this level+stage (pick from session's stimulusIds or random)
    const sessionStimulusIds: string[] = existingData.stimulusIds || [];
    let stimulusDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined;

    // Try to find stimulus from session's saved stimulusIds
    for (const sid of sessionStimulusIds) {
      const doc = await adminDb.collection('kps_stimuli').doc(sid).get();
      if (doc.exists && doc.data()?.level === level && doc.data()?.stage === queryStage) {
        stimulusDoc = doc as unknown as FirebaseFirestore.QueryDocumentSnapshot;
        break;
      }
    }

    // Fallback: pick random stimulus
    if (!stimulusDoc) {
      const stimulusSnap = await adminDb.collection('kps_stimuli')
        .where('level', '==', level)
        .where('stage', '==', queryStage)
        .get();
      const activeStimuli = stimulusSnap.docs.filter(d => d.data().status === 'active');
      if (activeStimuli.length > 0) {
        stimulusDoc = activeStimuli[Math.floor(Math.random() * activeStimuli.length)];
      }
    }

    const stimulus = stimulusDoc ? { id: stimulusDoc.id, ...stimulusDoc.data() } : null;

    // Fetch questions for this stimulus only
    const questionsSnap = stimulusDoc
      ? await adminDb.collection('kps_questions').where('stimulusId', '==', stimulusDoc.id).get()
      : await adminDb.collection('kps_questions').where('difficultyLevel', '==', level).where('stage', '==', queryStage).get();

    const questions = questionsSnap.docs
      .map(d => ({ id: d.id, ...d.data() } as Record<string, unknown>))
      .filter(d => d.status === 'active')
      .sort((a, b) => ((a.order as number) || 0) - ((b.order as number) || 0))
      .map(d => {
        const { correctAnswer, correctAnswers, correctMatches, statements, ...safe } = d;
        if (d.questionType === 'complex_true_false' && statements) {
          return { ...safe, statements: (statements as Array<{ id: string; text: string }>).map(s => ({ id: s.id, text: s.text })) };
        }
        return safe;
      });

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
    .where('studentId', '==', decoded.uid)
    .where('status', '==', 'completed')
    .get();

  const completedDoc = completedSnap.docs.find(d => d.data().accessCodeId === codeDoc.id);
  if (completedDoc) {
    return NextResponse.json({
      error: 'Kamu sudah menyelesaikan ujian dengan kode ini',
      completed: true,
      sessionId: completedDoc.id,
    }, { status: 409 });
  }

  // Fetch stage 1 stimulus (menengah level) — pick one topic randomly
  const stimulusSnap = await adminDb.collection('kps_stimuli')
    .where('level', '==', 'menengah')
    .where('stage', '==', 1)
    .get();

  const activeStimuli = stimulusSnap.docs.filter(d => d.data().status === 'active');
  if (activeStimuli.length === 0) {
    return NextResponse.json({ error: 'Soal ujian belum tersedia' }, { status: 503 });
  }

  const stimulusDoc = activeStimuli[Math.floor(Math.random() * activeStimuli.length)];
  const stimulus = { id: stimulusDoc.id, ...stimulusDoc.data() };
  const stimulusIds = [stimulusDoc.id];

  // Fetch questions for this specific stimulus only
  const questionsSnap = await adminDb.collection('kps_questions')
    .where('stimulusId', '==', stimulusDoc.id)
    .get();

  const questions = questionsSnap.docs
    .map(d => ({ id: d.id, ...d.data() } as Record<string, unknown>))
    .filter(d => d.status === 'active')
    .sort((a, b) => ((a.order as number) || 0) - ((b.order as number) || 0))
    .map(d => {
      const { correctAnswer, correctAnswers, correctMatches, statements, ...safe } = d;
      if (d.questionType === 'complex_true_false' && statements) {
        return { ...safe, statements: (statements as Array<{ id: string; text: string }>).map(s => ({ id: s.id, text: s.text })) };
      }
      return safe;
    });

  if (questions.length === 0) {
    return NextResponse.json({ error: 'Soal ujian belum tersedia' }, { status: 503 });
  }

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
