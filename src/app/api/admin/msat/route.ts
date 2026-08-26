import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify admin role
  const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Fetch all collections in parallel
    const [questionsSnap, accessCodesSnap] = await Promise.all([
      adminDb.collection('msat_question').get(),
      adminDb.collection('msat_access_code').get(),
    ]);

    // Process questions
    const questions: Record<string, unknown>[] = [];
    const difficultyCount: Record<string, number> = {};
    const domainCount: Record<string, number> = {};
    const stageCount: Record<number, number> = {};
    let totalQuestions = 0;

    questionsSnap.forEach(doc => {
      const d = doc.data();
      totalQuestions++;
      questions.push({ id: doc.id, ...d });

      if (d.difficulty) difficultyCount[d.difficulty] = (difficultyCount[d.difficulty] || 0) + 1;
      if (d.cognitiveDomain) domainCount[d.cognitiveDomain] = (domainCount[d.cognitiveDomain] || 0) + 1;
      if (d.stage) stageCount[d.stage] = (stageCount[d.stage] || 0) + 1;
    });

    // Process access codes (exams)
    const exams: Record<string, unknown>[] = [];
    let activeExams = 0;
    let totalExams = 0;

    accessCodesSnap.forEach(doc => {
      const d = doc.data();
      totalExams++;
      if (d.status === 'active') activeExams++;
      exams.push({ id: doc.id, ...d });
    });

    return NextResponse.json({
      stats: {
        totalQuestions,
        totalExams,
        activeExams,
        difficultyCount,
        domainCount,
        stageCount,
      },
      questions,
      exams,
    });
  } catch (err) {
    console.error('MSAT stats error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
