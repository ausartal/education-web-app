import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  calculateFinalScore,
  getPredikat,
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

    // If already scored, return cached results
    if (session.conclusions) {
      return NextResponse.json({
        finalScore: session.finalScore,
        predikat: session.predikat,
        peringkat: session.peringkat,
        stagePath: session.stagePath,
        conclusions: session.conclusions,
        stageResponses: session.stageResponses,
        anomalyFlags: session.anomalyFlags,
      });
    }

    // Get exam predicates config
    const examDoc = await adminDb.collection('msat_access_code').doc(session.examId).get();
    const exam = examDoc.exists ? examDoc.data() : null;
    const predicates = exam?.predicates ?? {
      istimewa: { min: 81, max: 100, label: 'Istimewa', description: '' },
      unggul: { min: 61, max: 80, label: 'Unggul', description: '' },
      madya: { min: 41, max: 60, label: 'Madya', description: '' },
      semenjana: { min: 21, max: 40, label: 'Semenjana', description: '' },
      terbatas: { min: 0, max: 20, label: 'Terbatas', description: '' },
    };

    const stageResponses = (session.stageResponses ?? []) as MSATStageResponse[];

    if (stageResponses.length === 0) {
      return NextResponse.json({ error: 'Tidak ada jawaban yang tercatat' }, { status: 422 });
    }

    // Calculate final score
    const finalScore = calculateFinalScore(stageResponses);

    // Get predikat
    const { name: predikat, peringkat, description } = getPredikat(finalScore, predicates);

    // Generate 4 conclusions
    const conclusions = generateConclusions(stageResponses, predicates);

    // Final anomaly detection
    const anomalyFlags = detectAnomalies(stageResponses);

    // Update session with results
    await sessionDoc.ref.update({
      finalScore,
      predikat,
      peringkat,
      conclusions,
      anomalyFlags,
      completedAt: FieldValue.serverTimestamp(),
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
