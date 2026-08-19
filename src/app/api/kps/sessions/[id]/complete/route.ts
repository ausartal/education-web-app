import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { KPSStageResponse } from '@/types/kps';
import {
  calculateNumericScore,
  calculateIndicatorScores,
  determineFinalLevel,
  detectKPSAnomalies,
} from '@/lib/kps-engine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: sessionId } = await params;
  const sessionDoc = await adminDb.collection('kps_exam_sessions').doc(sessionId).get();
  if (!sessionDoc.exists) return NextResponse.json({ error: 'Session tidak ditemukan' }, { status: 404 });

  const session = sessionDoc.data()!;
  if (session.studentId !== decoded.uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (session.status !== 'in_progress') {
    return NextResponse.json({
      error: 'Session sudah selesai',
      sessionId,
      finalLevel: session.finalLevel,
      numericScore: session.numericScore,
    });
  }

  const stageResponses = (session.stageResponses || []) as KPSStageResponse[];
  if (stageResponses.length < 3) {
    return NextResponse.json({ error: 'Semua stage harus diselesaikan terlebih dahulu' }, { status: 400 });
  }

  const stage2Path = session.stage2Path;
  const stage3Path = session.stage3Path;

  if (!stage2Path || !stage3Path) {
    return NextResponse.json({ error: 'Data stage path tidak lengkap' }, { status: 400 });
  }

  // Compute final scores
  const allResponses = stageResponses.flatMap((sr) => sr.questions);
  const indicatorScores = calculateIndicatorScores(allResponses);
  const numericScore = calculateNumericScore(stageResponses);
  const finalLevel = determineFinalLevel(stage2Path, stage3Path, numericScore);
  const anomalyFlags = detectKPSAnomalies(allResponses);

  const totalCorrect = stageResponses.reduce((sum, sr) => sum + sr.correctCount, 0);

  // Update session
  await sessionDoc.ref.update({
    status: anomalyFlags.length > 0 ? 'flagged' : 'completed',
    completedAt: FieldValue.serverTimestamp(),
    finalLevel,
    numericScore,
    indicatorScores,
    anomalyFlags,
  });

  // Update question usage stats
  for (const response of allResponses) {
    try {
      const qRef = adminDb.collection('kps_questions').doc(response.questionId);
      await qRef.update({
        usageCount: FieldValue.increment(1),
        avgCorrectRate: response.isCorrect
          ? FieldValue.increment(0.01)
          : FieldValue.increment(-0.01),
      });
    } catch {
      // Ignore if question doesn't exist
    }
  }

  // Audit log
  await adminDb.collection('audit_logs').add({
    actorId: decoded.uid,
    actorRole: 'student',
    action: 'complete_kps_exam',
    targetId: sessionId,
    targetType: 'kps_exam_session',
    details: { finalLevel, numericScore, totalCorrect, anomalyFlags },
    timestamp: new Date(),
  });

  return NextResponse.json({
    sessionId,
    finalLevel,
    numericScore,
    indicatorScores,
    totalCorrect,
    totalQuestions: 21,
    stageResponses: stageResponses.map((sr) => ({
      stage: sr.stage,
      path: sr.path,
      correctCount: sr.correctCount,
      score: sr.score,
    })),
    anomalyFlags,
  });
}
