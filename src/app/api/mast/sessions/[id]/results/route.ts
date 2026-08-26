import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyStudent } from '@/lib/auth-helpers';
import type { MASTSession } from '@/types/mast';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // ── Auth ────────────────────────────────────────────────────────────
  const student = await verifyStudent(req);
  if (!student) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // ── Fetch session ───────────────────────────────────────────────────
  const sessionSnap = await adminDb.collection('mast_sessions').doc(params.id).get();
  if (!sessionSnap.exists) {
    return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });
  }

  const session = sessionSnap.data() as MASTSession;

  // ── Ownership check ─────────────────────────────────────────────────
  if (session.studentId !== student.uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ── Must be completed ───────────────────────────────────────────────
  if (session.status !== 'completed' && session.status !== 'flagged') {
    return NextResponse.json({ error: 'Hasil ujian belum tersedia. Ujian belum selesai.' }, { status: 409 });
  }

  // ── Return results ──────────────────────────────────────────────────
  return NextResponse.json({
    sessionId: sessionSnap.id,
    finalScore: session.finalScore,
    predikat: session.predikat,
    conclusions: session.conclusions,
    stageResponses: session.stageResponses,
    stagePath: session.stagePath,
    completedAt: session.completedAt,
    anomalyFlags: session.anomalyFlags,
  });
}
