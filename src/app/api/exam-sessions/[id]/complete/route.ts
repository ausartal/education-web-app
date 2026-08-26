import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { MSATTierPath, CRIResponse, ComprehensionCategory, MSATDifficulty } from '@/types/firestore';

// ── Inline MSAT helpers (formerly in msat-engine.ts) ──
function encodePattern(t1: boolean, t2: boolean, t3: boolean): string {
  return `${t1 ? 'B' : 'S'}${t2 ? 'B' : 'S'}${t3 ? 'B' : 'S'}`;
}

function getComprehensionCategory(pattern: string, cri: CRIResponse): ComprehensionCategory {
  switch (pattern) {
    case 'BBB': return 'paham_konsep';
    case 'SBB': return 'paham_sebagian';
    case 'BBS': return 'paham_sebagian';
    case 'BSB': return 'paham_sebagian';
    case 'SBS': return 'tidak_paham';
    case 'SSB': return 'tidak_paham';
    case 'SSS': return cri === 'yakin' ? 'miskonsepsi' : 'tidak_paham';
    case 'BSS': return 'hasil_nebak';
    default: return 'tidak_paham';
  }
}

const DIFFICULTY_WEIGHTS: Record<MSATDifficulty, number> = {
  sangat_mudah: 1, mudah: 2, sedang: 3, sukar: 4, sangat_sukar: 5,
};
const TIER_PATH_DIFFICULTY: Record<MSATTierPath, MSATDifficulty> = {
  anchor: 'sedang', mudah: 'mudah', sukar: 'sukar',
  sangat_mudah: 'sangat_mudah', sedang_a: 'sedang', sedang_b: 'sedang', sangat_sukar: 'sangat_sukar',
};

function getDomainScore(
  t1Path: MSATTierPath, t1Correct: boolean,
  t2Path: MSATTierPath, t2Correct: boolean,
  t3Path: MSATTierPath, t3Correct: boolean,
): number {
  const pairs: [MSATTierPath, boolean][] = [[t1Path, t1Correct], [t2Path, t2Correct], [t3Path, t3Correct]];
  let earned = 0;
  let maxPossible = 0;
  for (const [path, correct] of pairs) {
    const w = DIFFICULTY_WEIGHTS[TIER_PATH_DIFFICULTY[path]];
    maxPossible += w;
    if (correct) earned += w;
  }
  return maxPossible > 0 ? Math.round((earned / maxPossible) * 100) : 0;
}

function getNumericScore(domainScores: number[]): number {
  if (domainScores.length === 0) return 0;
  const avg = domainScores.reduce((a, b) => a + b, 0) / domainScores.length;
  return Math.round((avg / 100) * 120);
}

function detectAnomalies(responses: { timeSpentMs: number; isCorrect: boolean }[]): string[] {
  const flags: string[] = [];
  const tooFast = responses.filter((r) => r.timeSpentMs < 3000);
  if (tooFast.length >= 5) flags.push('TOO_FAST_MULTIPLE');
  const fastCorrect = responses.filter((r) => r.timeSpentMs < 5000 && r.isCorrect);
  if (fastCorrect.length >= 5) flags.push('ALL_FAST_CORRECT');
  let consecutiveRight = 0;
  let consecutiveWrong = 0;
  for (const r of responses) {
    if (r.isCorrect) { consecutiveRight++; consecutiveWrong = 0; }
    else { consecutiveWrong++; consecutiveRight = 0; }
    if (consecutiveWrong >= 3 && consecutiveRight === 0) { flags.push('SUDDEN_DROP'); break; }
  }
  return flags;
}

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

  // Server-side time validation: reject if past durationMinutes + 5 min grace
  const startedAt = session.startedAt?.toDate?.();
  if (startedAt) {
    const elapsedMs = Date.now() - startedAt.getTime();
    const maxMs = ((session.durationMinutes || 50) + 5) * 60 * 1000;
    if (elapsedMs > maxMs) {
      await ref.update({ status: 'timed_out', completedAt: FieldValue.serverTimestamp() });
      return NextResponse.json({ error: 'Waktu ujian telah berakhir' }, { status: 410 });
    }
  }

  const scheduleSnap = await adminDb.collection('exam_schedules').doc(session.examScheduleId).get();
  const scheduleData = scheduleSnap.data() ?? {};

  // ── Custom & Manual exam completion ───────────────────────────────
  if (session.examType === 'custom' || session.examType === 'manual') {
    let body2: Record<string, unknown> = {};
    try { body2 = await req.json(); } catch { /* optional body */ }
    const customAnswers = (body2.customAnswers ?? []) as Array<{ questionId: string; selectedAnswer: string; isCorrect: boolean; timeSpentMs?: number }>;

    const customQuestions = (scheduleData.customQuestions as Array<{ id: string; correctAnswer: string }>) || [];
    const totalQ = customQuestions.length;
    // Server-side verification: never trust client-sent isCorrect
    const correctCount = customAnswers.filter(a => {
      const q = customQuestions.find(cq => cq.id === a.questionId);
      return q && a.selectedAnswer === q.correctAnswer;
    }).length;
    const numericScore = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;

    await ref.update({
      customAnswers,
      numericScore,
      anomalyFlags: [],
      status: 'completed',
      completedAt: FieldValue.serverTimestamp(),
    });

    await adminDb.collection('audit_logs').add({
      actorId: decoded.uid, actorRole: 'student', action: 'complete_exam',
      targetId: params.id, targetType: 'exam_session',
      details: { numericScore, totalQ, correctCount, examType: 'custom' }, timestamp: new Date(),
    });

    return NextResponse.json({ numericScore, correctCount, totalQ, customAnswers });
  }

  // ── Standard MSAT completion ──────────────────────────────────────
  const requiredDomainCount = (scheduleData.domainIds || []).length;
  const domainResponses = session.domainResponses || [];
  if (domainResponses.length < requiredDomainCount) {
    return NextResponse.json({
      error: `Semua domain harus diselesaikan terlebih dahulu (${domainResponses.length}/${requiredDomainCount})`,
    }, { status: 400 });
  }

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
