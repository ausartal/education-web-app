import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from '@/lib/pg-firestore';
import { MSATTierPath } from '@/types/firestore';

// ── Inline MSAT helpers (formerly in msat-engine.ts) ──
function getT2Path(t1Correct: boolean): 'mudah' | 'sukar' {
  return t1Correct ? 'sukar' : 'mudah';
}

function getT3Path(t1Correct: boolean, t2Correct: boolean): MSATTierPath {
  if (!t1Correct && !t2Correct) return 'sangat_mudah';
  if (!t1Correct && t2Correct) return 'sedang_a';
  if (t1Correct && !t2Correct) return 'sedang_b';
  return 'sangat_sukar';
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
  if (session.status !== 'in_progress') return NextResponse.json({ error: 'Session is not in progress' }, { status: 409 });

  // Time-window enforcement
  const durationMs = ((session.durationMinutes as number) || 50) * 60 * 1000;
  const graceMs = 5 * 60 * 1000;
  const startedAt = session.startedAt as { seconds?: number; _seconds?: number } | null;
  if (startedAt) {
    const startMs = ((startedAt.seconds ?? startedAt._seconds ?? 0) * 1000);
    if (Date.now() - startMs > durationMs + graceMs) {
      return NextResponse.json({ error: 'Waktu ujian sudah habis' }, { status: 409 });
    }
  }

  const { domainResponse } = await req.json();
  if (!domainResponse) return NextResponse.json({ error: 'domainResponse required' }, { status: 400 });

  // Validate domainId belongs to this exam schedule
  const scheduleSnap = await adminDb.collection('exam_schedules').doc(session.examScheduleId).get();
  if (!scheduleSnap.exists) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
  const validDomainIds: string[] = scheduleSnap.data()!.domainIds || [];
  if (!validDomainIds.includes(domainResponse.domainId)) {
    return NextResponse.json({ error: 'Domain tidak valid untuk ujian ini' }, { status: 400 });
  }

  // Check for duplicate domain submission
  const existingResponses: Array<{ domainId: string }> = session.domainResponses || [];
  if (existingResponses.some((r) => r.domainId === domainResponse.domainId)) {
    return NextResponse.json({ error: 'Domain ini sudah dikerjakan' }, { status: 409 });
  }

  const qIds = [
    domainResponse.tier1?.questionId,
    domainResponse.tier2?.questionId,
    domainResponse.tier3?.questionId,
  ].filter(Boolean) as string[];

  // ── Validate question IDs belong to this session's pool ──
  const sessionQuestionIds: string[] = session.questionIds || [];
  if (sessionQuestionIds.length > 0) {
    const invalidIds = qIds.filter(id => !sessionQuestionIds.includes(id));
    if (invalidIds.length > 0) {
      return NextResponse.json({ error: 'Soal tidak termasuk dalam sesi ujian ini' }, { status: 403 });
    }
  }

  // ── Check for duplicate questionIds across tiers ──
  const uniqueQIds = new Set(qIds);
  if (uniqueQIds.size !== qIds.length) {
    return NextResponse.json({ error: 'Soal tidak boleh duplikat dalam satu domain' }, { status: 400 });
  }

  // Fetch questions to recompute isCorrect server-side (never trust client)
  const qSnaps = await Promise.all(qIds.map(id => adminDb.collection('exam_questions').doc(id).get()));
  const qMap = Object.fromEntries(qSnaps.filter(s => s.exists).map(s => [s.id, s.data()!.correctAnswer]));

  // ── Validate question domainId matches submission domainId ──
  const LEGACY_TIER_MAP: Record<string, string> = {
    K1: 'anchor', K2: 'mudah', K3: 'sukar',
    K4: 'sangat_mudah', K5: 'sedang_a', K6: 'sedang_b', K7: 'sangat_sukar',
  };

  interface TierInput { questionId?: string; selectedAnswer?: string; path?: string; isCorrect?: boolean; [k: string]: unknown }
  const tiers: Array<{ tier: TierInput | undefined; expectedPaths: string[] }> = [
    { tier: domainResponse.tier1, expectedPaths: ['anchor'] },
    { tier: domainResponse.tier2, expectedPaths: ['mudah', 'sukar'] },
    { tier: domainResponse.tier3, expectedPaths: ['sangat_mudah', 'sedang_a', 'sedang_b', 'sangat_sukar'] },
  ];

  for (const { tier, expectedPaths } of tiers) {
    if (!tier?.questionId) continue;
    const qSnap = qSnaps.find(s => s.id === tier.questionId);
    if (!qSnap?.exists) {
      return NextResponse.json({ error: `Soal ${tier.questionId} tidak ditemukan` }, { status: 404 });
    }
    const qData = qSnap.data()!;

    // Validate domainId matches
    if (qData.domainId && qData.domainId !== domainResponse.domainId) {
      return NextResponse.json({ error: `Soal ${tier.questionId} tidak sesuai dengan domain ini` }, { status: 400 });
    }

    // Validate tierPath matches the claimed tier slot
    const qTierPath = LEGACY_TIER_MAP[qData.tierPath] ?? qData.tierPath;
    const claimedPath = (tier.path as string) || (tier.tierPath as string) || '';
    const normalizedClaimed = LEGACY_TIER_MAP[claimedPath] ?? claimedPath;
    if (expectedPaths.length > 0 && !expectedPaths.includes(qTierPath)) {
      return NextResponse.json({ error: `Soal ${tier.questionId} tidak sesuai dengan tingkat kesulitan yang diklaim` }, { status: 400 });
    }
  }

  const recompute = (tier: { questionId?: string; selectedAnswer?: string; isCorrect?: boolean; [k: string]: unknown } | undefined) => {
    if (!tier?.questionId) return tier;
    return { ...tier, isCorrect: tier.selectedAnswer === qMap[tier.questionId] };
  };

  const sanitizedResponse = {
    ...domainResponse,
    tier1: recompute(domainResponse.tier1),
    tier2: recompute(domainResponse.tier2),
    tier3: recompute(domainResponse.tier3),
  };

  // Validate adaptive branch paths match server-computed isCorrect values
  if (sanitizedResponse.tier2) {
    const expectedT2Path = getT2Path(sanitizedResponse.tier1?.isCorrect ?? false);
    if (sanitizedResponse.tier2.path !== expectedT2Path) {
      return NextResponse.json({ error: 'Jalur tier 2 tidak valid' }, { status: 400 });
    }
  }
  if (sanitizedResponse.tier3 && sanitizedResponse.tier2) {
    const expectedT3Path = getT3Path(
      sanitizedResponse.tier1?.isCorrect ?? false,
      sanitizedResponse.tier2?.isCorrect ?? false,
    );
    if (sanitizedResponse.tier3.path !== expectedT3Path) {
      return NextResponse.json({ error: 'Jalur tier 3 tidak valid' }, { status: 400 });
    }
  }

  const usageBatch = adminDb.batch();
  for (const qId of qIds) {
    usageBatch.update(adminDb.collection('exam_questions').doc(qId), {
      usageCount: FieldValue.increment(1),
    });
  }
  await usageBatch.commit().catch(() => { /* ignore if question doesn't exist */ });

  // Append domain response (no duplicate check needed — already validated above)
  const updatedResponses = [...existingResponses, sanitizedResponse];

  await ref.update({
    domainResponses: updatedResponses,
    currentDomainIndex: updatedResponses.length,
  });

  return NextResponse.json({ success: true, domainIndex: updatedResponses.length });
}
