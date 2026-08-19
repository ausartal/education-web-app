import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

// GET: Fetch questions for current stage (used when refreshing the exam page)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let decoded;
  try { decoded = await adminAuth.verifyIdToken(authHeader.slice(7)); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const { id: sessionId } = await params;
  const sessionDoc = await adminDb.collection('kps_exam_sessions').doc(sessionId).get();
  if (!sessionDoc.exists) return NextResponse.json({ error: 'Session tidak ditemukan' }, { status: 404 });

  const session = sessionDoc.data()!;
  if (session.studentId !== decoded.uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (session.status !== 'in_progress') return NextResponse.json({ error: 'Session sudah selesai' }, { status: 400 });

  const currentStage = session.currentStage || 1;
  const queryStage = currentStage === 3 ? 2 : currentStage;
  const level = currentStage === 1 ? 'menengah'
    : session.stage2Path === 'tinggi' ? 'tinggi' : 'rendah';

  // Find stimulus from session's saved stimulusIds
  const sessionStimulusIds: string[] = session.stimulusIds || [];
  let stimulusDoc: FirebaseFirestore.DocumentSnapshot | null = null;

  for (const sid of sessionStimulusIds) {
    const doc = await adminDb.collection('kps_stimuli').doc(sid).get();
    if (doc.exists && doc.data()?.level === level && doc.data()?.stage === queryStage) {
      stimulusDoc = doc;
      break;
    }
  }

  // Fallback: pick random
  if (!stimulusDoc) {
    const stimulusSnap = await adminDb.collection('kps_stimuli')
      .where('level', '==', level)
      .where('stage', '==', queryStage)
      .get();
    const active = stimulusSnap.docs.filter(d => d.data().status === 'active');
    if (active.length > 0) stimulusDoc = active[Math.floor(Math.random() * active.length)];
  }

  const stimulus = stimulusDoc ? { id: stimulusDoc.id, ...stimulusDoc.data() } : null;

  // Fetch questions for this stimulus
  const questionsSnap = stimulusDoc
    ? await adminDb.collection('kps_questions').where('stimulusId', '==', stimulusDoc.id).get()
    : await adminDb.collection('kps_questions').where('difficultyLevel', '==', level).where('stage', '==', queryStage).get();

  const questions = questionsSnap.docs
    .map(d => ({ id: d.id, ...d.data() } as Record<string, unknown>))
    .filter(d => d.status === 'active')
    .sort((a, b) => ((a.order as number) || 0) - ((b.order as number) || 0))
    .map(d => {
      const { correctAnswer, correctAnswers, correctMatches, statements, ...safe } = d;
      if (d.questionType === 'complex_true_false' && statements) {
        return { ...safe, statements: (statements as Array<{ id: string; text: string }>).map(s => ({ id: s.id, text: s.text })) };
      }
      return safe;
    });

  // Calculate time left
  const startedAt = session.startedAt?.toDate?.() ?? new Date();
  const durationMs = (session.durationMinutes || 80) * 60 * 1000;
  const timeLeftMs = Math.max(0, startedAt.getTime() + durationMs - Date.now());

  return NextResponse.json({
    currentStage,
    stage2Path: session.stage2Path,
    stimulus,
    questions,
    timeLeftMs,
  });
}
