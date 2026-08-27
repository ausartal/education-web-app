import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  calculateFinalScore,
  getPredikatFromStageResults,
  generateConclusions,
  detectAnomalies,
} from '@/lib/msat-engine';
import type { MSATStageResponse } from '@/types/msat';

export const dynamic = 'force-dynamic';

/**
 * POST /api/msat/sessions/[id]/complete
 * Finalize exam: calculate final score, predikat, 4 conclusions.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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

    if (session.studentId !== decoded.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (session.status !== 'completed') {
      return NextResponse.json({ error: 'Ujian belum selesai' }, { status: 409 });
    }

    const stageResponses = (session.stageResponses ?? []) as MSATStageResponse[];

    if (stageResponses.length === 0) {
      return NextResponse.json({ error: 'Tidak ada jawaban yang tercatat' }, { status: 422 });
    }

    // Always recalculate predikat from stage pass/fail (stage-based logic)
    const finalScore = calculateFinalScore(stageResponses);
    const { name: predikat, peringkat, description: predikatDesc } = getPredikatFromStageResults(stageResponses);

    // Generate or update conclusions with stage-based predikat
    let conclusions = session.conclusions ?? null;
    if (!conclusions) {
      conclusions = generateConclusions(stageResponses);
    } else {
      // Update existing conclusions to use stage-based predikat
      conclusions = {
        ...conclusions,
        overall: {
          ...conclusions.overall,
          predikat,
          description: predikatDesc,
        },
      };
    }

    const anomalyFlags = session.anomalyFlags ?? detectAnomalies(stageResponses);

    // Update session with recalculated results
    await sessionDoc.ref.update({
      finalScore,
      predikat,
      peringkat,
      conclusions,
      anomalyFlags,
    });

    // Log completion
    await adminDb.collection('audit_logs').add({
      actorId: decoded.uid,
      actorRole: 'student',
      action: 'complete_msat_exam',
      targetId: id,
      targetType: 'msat_session',
      details: {
        examId: session.examId,
        finalScore,
        predikat,
        peringkat,
        stagePath: session.stagePath,
      },
      timestamp: new Date(),
    });

    return NextResponse.json({
      finalScore,
      predikat,
      peringkat,
      stagePath: session.stagePath,
      conclusions,
      stageResponses,
      anomalyFlags,
    });

  } catch (err) {
    console.error('MSAT complete error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
