import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/msat/history
 * Fetch all completed exam sessions for the current student.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all completed sessions for this student
    const sessionsSnap = await adminDb.collection('msat_sessions')
      .where('studentId', '==', decoded.uid)
      .where('status', '==', 'completed')
      .get();

    const history = [];

    for (const doc of sessionsSnap.docs) {
      const session = doc.data();

      // Get exam info
      let examTitle = 'Ujian MSAT';
      let examCode = '';
      try {
        const examDoc = await adminDb.collection('msat_access_code').doc(session.examId).get();
        if (examDoc.exists) {
          examTitle = examDoc.data()?.title ?? examTitle;
          examCode = examDoc.data()?.code ?? examCode;
        }
      } catch { /* ignore */ }

      // Always recalculate predikat from stage results (stage-based logic)
      let conclusions = session.conclusions ?? null;
      let predikat = session.predikat ?? null;
      let peringkat = session.peringkat ?? null;
      if (session.stageResponses?.length > 0) {
        try {
          const { generateConclusions, getPredikatFromStageResults } = await import('@/lib/msat-engine');

          // Recalculate conclusions if missing
          if (!conclusions) {
            conclusions = generateConclusions(session.stageResponses);
          }

          // Always recalculate predikat/peringkat from stage pass/fail
          const result = getPredikatFromStageResults(session.stageResponses);
          predikat = result.name;
          peringkat = result.peringkat;

          // Update conclusions.overall to use stage-based predikat
          if (conclusions) {
            conclusions = {
              ...conclusions,
              overall: {
                ...conclusions.overall,
                predikat: result.name,
                description: result.description,
              },
            };
          }

          // Save back to Firestore
          await doc.ref.update({ conclusions, predikat, peringkat });
        } catch { /* ignore */ }
      }

      history.push({
        sessionId: doc.id,
        examTitle,
        examCode,
        finalScore: session.finalScore ?? null,
        predikat,
        peringkat,
        stagePath: session.stagePath ?? [],
        stageResponses: session.stageResponses ?? [],
        conclusions,
        completedAt: session.completedAt ?? null,
      });
    }

    // Sort by completedAt descending
    history.sort((a, b) => {
      const aTime = a.completedAt?._seconds ?? 0;
      const bTime = b.completedAt?._seconds ?? 0;
      return bTime - aTime;
    });

    return NextResponse.json({ history });

  } catch (err) {
    console.error('MSAT history error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
