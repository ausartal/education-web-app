import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/msat/sessions/[id]
 * Get session status — used for polling (waiting room, break state, etc.)
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const sessionDoc = await adminDb.collection('msat_sessions').doc(id).get();
    if (!sessionDoc.exists) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
    }

    const session = sessionDoc.data()!;

    // Verify ownership (student) or admin
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    const userRole = userDoc.data()?.role;
    if (session.studentId !== decoded.uid && userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get exam info
    const examDoc = await adminDb.collection('msat_access_code').doc(session.examId).get();
    const exam = examDoc.exists ? examDoc.data() : null;

    // Count waiting students
    let waitingCount = 0;
    if (session.status === 'waiting') {
      const waitingRoomDoc = await adminDb.collection('msat_waiting_room').doc(session.examId).get();
      if (waitingRoomDoc.exists) {
        const students = waitingRoomDoc.data()?.students ?? {};
        waitingCount = Object.keys(students).length;
      }
    }

    // Check if exam has been started by admin
    let examStarted = false;
    if (exam && exam.status === 'in_progress') {
      examStarted = true;
    }

    return NextResponse.json({
      sessionId: id,
      status: session.status,
      currentStage: session.currentStage,
      currentStageDifficulty: session.currentStageDifficulty,
      stagePath: session.stagePath,
      stageResponses: session.stageResponses ?? [],
      breakStartedAt: session.breakStartedAt?._seconds ?? null,
      breakEndsAt: session.breakEndsAt?._seconds ?? null,
      finalScore: session.finalScore,
      predikat: session.predikat,
      conclusions: session.conclusions,
      waitingCount,
      examStarted,
      exam: exam ? {
        id: examDoc.id,
        title: exam.title,
        code: exam.code,
        totalStages: exam.totalStages,
        questionsPerStage: exam.questionsPerStage,
        durationPerStage: exam.durationPerStage ?? 30,
        breakDuration: exam.breakDuration ?? 10,
        stageWeights: exam.stageWeights,
        predicates: exam.predicates,
      } : null,
    });

  } catch (err) {
    console.error('MSAT session status error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
