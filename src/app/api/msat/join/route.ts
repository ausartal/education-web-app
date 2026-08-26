import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

/**
 * POST /api/msat/join
 * Student enters exam code → validate → create session or enter waiting room.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { code?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { code } = body;
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Kode ujian diperlukan' }, { status: 400 });
  }

  try {
    // 1. Find access code (allow both active and in_progress exams)
    const codeSnap = await adminDb.collection('msat_access_code')
      .where('code', '==', code.toUpperCase().trim())
      .where('status', 'in', ['active', 'in_progress'])
      .limit(1)
      .get();

    if (codeSnap.empty) {
      return NextResponse.json({ error: 'Kode ujian tidak valid atau sudah tidak aktif' }, { status: 404 });
    }

    const examDoc = codeSnap.docs[0];
    const exam = examDoc.data();

    // 2. Check expiry
    if (exam.expiresAt) {
      const expiresAt = exam.expiresAt._seconds ? new Date(exam.expiresAt._seconds * 1000) : exam.expiresAt.toDate();
      if (expiresAt < new Date()) {
        return NextResponse.json({ error: 'Kode ujian sudah kedaluwarsa' }, { status: 410 });
      }
    }

    // 3. Check max uses
    if (exam.maxUses > 0 && exam.currentUses >= exam.maxUses) {
      return NextResponse.json({ error: 'Kode ujian sudah mencapai batas maksimal penggunaan' }, { status: 429 });
    }

    // 4. Check if student already has an active session for this exam
    const existingSnap = await adminDb.collection('msat_sessions')
      .where('examId', '==', examDoc.id)
      .where('studentId', '==', decoded.uid)
      .where('status', 'in', ['waiting', 'in_progress', 'on_break'])
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      const existing = existingSnap.docs[0];
      return NextResponse.json({
        sessionId: existing.id,
        status: existing.data().status,
        resumed: true,
        exam: {
          id: examDoc.id,
          title: exam.title,
          code: exam.code,
          totalStages: exam.totalStages,
          questionsPerStage: exam.questionsPerStage,
          durationPerStage: exam.durationPerStage ?? 30,
          breakDuration: exam.breakDuration ?? 10,
        },
      });
    }

    // 5. Get student name
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    const studentName = userDoc.data()?.displayName ?? 'Siswa';

    // 6. Determine initial status based on exam status
    const examIsActive = exam.status === 'in_progress';
    const initialStatus = examIsActive ? 'in_progress' : 'waiting';

    // 7. Create session
    const sessionRef = adminDb.collection('msat_sessions').doc();
    const sessionData = {
      studentId: decoded.uid,
      studentName,
      examId: examDoc.id,
      examCode: exam.code.toUpperCase(),
      status: initialStatus,
      startedAt: examIsActive ? FieldValue.serverTimestamp() : null,
      completedAt: null,
      currentStage: 1,
      currentStageDifficulty: 'medium',
      stagePath: ['medium'],
      stageResponses: [],
      breakStartedAt: null,
      breakEndsAt: null,
      breakSkippedBy: null,
      finalScore: null,
      predikat: null,
      peringkat: null,
      conclusions: null,
      anomalyFlags: [],
      durationMinutes: exam.durationPerStage ?? 30,
      createdAt: FieldValue.serverTimestamp(),
    };
    await sessionRef.set(sessionData);

    // 8. Increment use count
    await examDoc.ref.update({ currentUses: FieldValue.increment(1) });

    // 9. Add to waiting room (only if exam is not yet started)
    if (!examIsActive) {
      await adminDb.collection('msat_waiting_room').doc(examDoc.id).set({
        examId: examDoc.id,
        [`students.${decoded.uid}`]: {
          joinedAt: FieldValue.serverTimestamp(),
          displayName: studentName,
          sessionId: sessionRef.id,
          ready: true,
        },
      }, { merge: true });
    }

    // 10. Log
    await adminDb.collection('audit_logs').add({
      actorId: decoded.uid,
      actorRole: 'student',
      action: 'join_msat_exam',
      targetId: sessionRef.id,
      targetType: 'msat_session',
      details: { examId: examDoc.id, code: exam.code, initialStatus },
      timestamp: new Date(),
    });

    return NextResponse.json({
      sessionId: sessionRef.id,
      status: initialStatus,
      resumed: false,
      exam: {
        id: examDoc.id,
        title: exam.title,
        code: exam.code,
        totalStages: exam.totalStages,
        questionsPerStage: exam.questionsPerStage,
        durationPerStage: exam.durationPerStage ?? 30,
        breakDuration: exam.breakDuration ?? 10,
      },
    }, { status: 201 });

  } catch (err) {
    console.error('MSAT join error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
