import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyStudent } from '@/lib/auth-helpers';
import {
  calculateFinalScore,
  getPredikat,
  generateConclusions,
  detectMASTAnomalies,
} from '@/lib/mast-engine';
import type { MASTSession, MASTCompleteResponse } from '@/types/mast';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // ── Auth ────────────────────────────────────────────────────────────
  const student = await verifyStudent(req);
  if (!student) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // ── Fetch session ───────────────────────────────────────────────────
  const sessionRef = adminDb.collection('mast_sessions').doc(params.id);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) {
    return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
  }

  const session = sessionSnap.data() as MASTSession;

  // ── Ownership & status checks ───────────────────────────────────────
  if (session.studentId !== student.uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (session.status === 'completed') {
    return NextResponse.json({ error: 'Ujian sudah diselesaikan' }, { status: 409 });
  }
  if (session.status !== 'in_progress' && session.status !== 'on_break') {
    return NextResponse.json({ error: 'Sesi tidak dalam status yang valid untuk diselesaikan' }, { status: 409 });
  }

  // ── Validate all 3 stages are submitted ─────────────────────────────
  const stageResponses = session.stageResponses || [];
  if (stageResponses.length < 3) {
    return NextResponse.json({
      error: `Belum semua stage selesai (${stageResponses.length}/3). Selesaikan stage 3 terlebih dahulu.`,
    }, { status: 400 });
  }

  // ── Calculate final results ─────────────────────────────────────────
  const finalScore = calculateFinalScore(stageResponses);
  const { predikat, peringkat } = getPredikat(finalScore);
  const conclusions = generateConclusions(stageResponses);

  // ── Anomaly detection across all stages ─────────────────────────────
  const allResponses = stageResponses.flatMap((sr) =>
    sr.questions.map((q) => ({
      timeSpentMs: q.timeSpentMs,
      isCorrect: q.isCorrect,
    })),
  );
  const anomalyFlags = detectMASTAnomalies(allResponses);

  // ── Update session ──────────────────────────────────────────────────
  await sessionRef.update({
    status: anomalyFlags.length > 0 ? 'flagged' : 'completed',
    completedAt: FieldValue.serverTimestamp(),
    finalScore,
    predikat,
    conclusions,
    anomalyFlags,
    breakStartedAt: null,
    breakEndsAt: null,
    breakSkippedBy: null,
  });

  // ── Audit log ───────────────────────────────────────────────────────
  await adminDb.collection('audit_logs').add({
    actorId: student.uid,
    actorRole: 'student',
    action: 'complete_mast_exam',
    targetId: params.id,
    targetType: 'mast_session',
    details: { finalScore, predikat, peringkat, anomalyFlags },
    timestamp: new Date(),
  });

  // ── Response ────────────────────────────────────────────────────────
  const response: MASTCompleteResponse = {
    finalScore,
    predikat,
    peringkat,
    stagePath: session.stagePath,
    conclusions,
    stageResponses,
  };

  return NextResponse.json(response);
}
