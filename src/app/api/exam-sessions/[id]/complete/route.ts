import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  encodePattern,
  getComprehensionCategory,
  getDomainScore,
  getNumericScore,
  detectAnomalies,
} from '@/lib/msat-engine';
import { MSATTierPath, CRIResponse } from '@/types/firestore';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.slice(7);

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const ref = adminDb.collection('exam_sessions').doc(params.id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  const session = snap.data()!;

  if (session.studentId !== decoded.uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (session.status !== 'in_progress') return NextResponse.json({ error: 'Already completed' }, { status: 409 });

  const domainResponses = session.domainResponses || [];

  // Compute comprehension categories and domain scores (server-side authoritative)
  const enrichedDomainResponses = domainResponses.map((dr: Record<string, unknown>) => {
    const t1 = dr.tier1 as { isCorrect: boolean; timeSpentMs: number; questionId: string; selectedAnswer: string };
    const t2 = dr.tier2 as { isCorrect: boolean; timeSpentMs: number; path: string; questionId: string; selectedAnswer: string };
    const t3 = dr.tier3 as { isCorrect: boolean; timeSpentMs: number; path: string; questionId: string; selectedAnswer: string };
    const cri = dr.cri as CRIResponse;

    const pattern = encodePattern(t1.isCorrect, t2.isCorrect, t3.isCorrect);
    const comprehensionCategory = getComprehensionCategory(pattern, cri);
    const domainScore = getDomainScore(
      'anchor' as MSATTierPath, t1.isCorrect,
      t2.path as MSATTierPath, t2.isCorrect,
      t3.path as MSATTierPath, t3.isCorrect,
    );

    return { ...dr, pattern, comprehensionCategory, domainScore };
  });

  const domainScores = enrichedDomainResponses.map((dr: Record<string, unknown>) => dr.domainScore as number);
  const numericScore = getNumericScore(domainScores);

  // Anomaly detection across all tier responses
  const allTierResponses = enrichedDomainResponses.flatMap((dr: Record<string, unknown>) => {
    const t1 = dr.tier1 as { isCorrect: boolean; timeSpentMs: number };
    const t2 = dr.tier2 as { isCorrect: boolean; timeSpentMs: number };
    const t3 = dr.tier3 as { isCorrect: boolean; timeSpentMs: number };
    return [
      { timeSpentMs: t1.timeSpentMs, isCorrect: t1.isCorrect },
      { timeSpentMs: t2.timeSpentMs, isCorrect: t2.isCorrect },
      { timeSpentMs: t3.timeSpentMs, isCorrect: t3.isCorrect },
    ];
  });
  const anomalyFlags = detectAnomalies(allTierResponses);

  // Update avgCorrectRate on questions
  const batch = adminDb.batch();
  for (const dr of enrichedDomainResponses as Record<string, unknown>[]) {
    const tiers = [
      { id: (dr.tier1 as Record<string, unknown>).questionId, correct: (dr.tier1 as Record<string, unknown>).isCorrect },
      { id: (dr.tier2 as Record<string, unknown>).questionId, correct: (dr.tier2 as Record<string, unknown>).isCorrect },
      { id: (dr.tier3 as Record<string, unknown>).questionId, correct: (dr.tier3 as Record<string, unknown>).isCorrect },
    ];
    for (const { id, correct } of tiers) {
      if (id) {
        const qRef = adminDb.collection('exam_questions').doc(id as string);
        // Simplified incremental avg update
        batch.update(qRef, {
          avgCorrectRate: correct ? FieldValue.increment(0.1) : FieldValue.increment(-0.05),
        });
      }
    }
  }
  await batch.commit().catch(() => {});

  await ref.update({
    domainResponses: enrichedDomainResponses,
    numericScore,
    anomalyFlags,
    status: anomalyFlags.length > 0 ? 'flagged' : 'completed',
    completedAt: FieldValue.serverTimestamp(),
  });

  await adminDb.collection('audit_logs').add({
    actorId: decoded.uid, actorRole: 'student', action: 'complete_exam',
    targetId: params.id, targetType: 'exam_session',
    details: { numericScore, domainCount: domainResponses.length, anomalyFlags }, timestamp: new Date(),
  });

  return NextResponse.json({ numericScore, anomalyFlags, domainResponses: enrichedDomainResponses });
}
