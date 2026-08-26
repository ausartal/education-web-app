import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/auth-helpers';
import { getNextStageDifficulty } from '@/lib/mast-engine';
import { FieldValue } from 'firebase-admin/firestore';
import type { MASTSession } from '@/types/mast';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const { sessionId } = body as { sessionId: string };

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const sessionRef = adminDb.collection('mast_sessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = sessionDoc.data() as MASTSession;

    if (session.examId !== params.id) {
      return NextResponse.json({ error: 'Session does not belong to this exam' }, { status: 400 });
    }

    if (session.status !== 'on_break') {
      return NextResponse.json(
        { error: `Cannot skip break for session with status '${session.status}'` },
        { status: 400 },
      );
    }

    // Determine the last stage result to compute next difficulty
    const lastStageResponse = session.stageResponses[session.stageResponses.length - 1];
    const nextDifficulty = getNextStageDifficulty(
      lastStageResponse.stageNumber,
      lastStageResponse.stageDifficulty,
      lastStageResponse.passed,
    );

    const nextStage = (session.currentStage + 1) as 1 | 2 | 3;

    await sessionRef.update({
      status: 'in_progress',
      currentStage: nextStage,
      currentStageDifficulty: nextDifficulty ?? session.currentStageDifficulty,
      breakStartedAt: null,
      breakEndsAt: null,
      breakSkippedBy: admin.uid,
    });

    return NextResponse.json({
      success: true,
      currentStage: nextStage,
      currentStageDifficulty: nextDifficulty,
    });
  } catch (err) {
    console.error('[mast-exams/:id/skip-break POST]', err);
    return NextResponse.json(
      { error: 'Internal server error', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
