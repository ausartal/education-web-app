import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyStudent } from '@/lib/auth-helpers';

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

  const session = sessionSnap.data()!;

  // ── Ownership check ─────────────────────────────────────────────────
  if (session.studentId !== student.uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ── Build break state ───────────────────────────────────────────────
  const breakState = session.status === 'on_break'
    ? {
        active: true,
        stageNumber: session.currentStage,
        startedAt: session.breakStartedAt ?? null,
        endsAt: session.breakEndsAt ?? null,
        skippedBy: session.breakSkippedBy ?? null,
      }
    : null;

  return NextResponse.json({
    id: sessionSnap.id,
    ...session,
    breakState,
  });
}
