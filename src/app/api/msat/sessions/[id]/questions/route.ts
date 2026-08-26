import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/msat/sessions/[id]/questions
 * Fetch questions for the current stage based on session's stage and difficulty.
 * Returns 12 questions: 4 knowing + 4 applying + 4 reasoning.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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

    const currentStage = session.currentStage as number;
    const currentDifficulty = session.currentStageDifficulty as string;

    // Map stage difficulty to Firestore difficulty values
    const difficultyMap: Record<string, string[]> = {
      rendah: ['sangat_mudah', 'mudah'],
      medium: ['sedang'],
      tinggi: ['sukar', 'sangat_sukar'],
    };
    const difficulties = difficultyMap[currentDifficulty] ?? ['sedang'];

    // Fetch questions for this stage + difficulty
    const allQuestions: Record<string, unknown>[] = [];
    for (const diff of difficulties) {
      const snap = await adminDb.collection('msat_question')
        .where('stage', '==', currentStage)
        .where('difficulty', '==', diff)
        .where('status', '==', 'active')
        .get();
      snap.forEach(doc => {
        allQuestions.push({ id: doc.id, ...doc.data() });
      });
    }

    // Group by cognitive domain
    const byDomain: Record<string, Record<string, unknown>[]> = { knowing: [], applying: [], reasoning: [] };
    for (const q of allQuestions) {
      const domain = (q as Record<string, unknown>).cognitiveDomain as string;
      if (domain in byDomain) byDomain[domain].push(q);
    }

    // Select 4 from each domain (shuffle for randomness)
    const selected: Record<string, unknown>[] = [];
    for (const domain of ['knowing', 'applying', 'reasoning']) {
      const pool = byDomain[domain];
      // Fisher-Yates shuffle
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      selected.push(...pool.slice(0, 4));
    }

    // Strip correctAnswer for client
    const safeQuestions = selected.map(q => {
      const { correctAnswer, ...rest } = q as Record<string, unknown>;
      return rest;
    });

    return NextResponse.json({
      stage: currentStage,
      difficulty: currentDifficulty,
      questions: safeQuestions,
    });

  } catch (err) {
    console.error('MSAT questions error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
