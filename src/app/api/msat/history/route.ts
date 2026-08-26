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

      // If conclusions not calculated yet, calculate them
      let conclusions = session.conclusions ?? null;
      if (!conclusions && session.stageResponses?.length > 0) {
        try {
          const { generateConclusions } = await import('@/lib/msat-engine');
          const examDoc = await adminDb.collection('msat_access_code').doc(session.examId).get();
          const predicates = examDoc.data()?.predicates ?? {
            istimewa: { min: 81, max: 100, label: 'Istimewa', description: '' },
            unggul: { min: 61, max: 80, label: 'Unggul', description: '' },
            madya: { min: 41, max: 60, label: 'Madya', description: '' },
            semenjana: { min: 21, max: 40, label: 'Semenjana', description: '' },
            terbatas: { min: 0, max: 20, label: 'Terbatas', description: '' },
          };
          conclusions = generateConclusions(session.stageResponses, predicates);

          // Save back to Firestore
          await doc.ref.update({ conclusions });
        } catch { /* ignore */ }
      }

      history.push({
        sessionId: doc.id,
        examTitle,
        examCode,
        finalScore: session.finalScore ?? null,
        predikat: session.predikat ?? null,
        peringkat: session.peringkat ?? null,
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
