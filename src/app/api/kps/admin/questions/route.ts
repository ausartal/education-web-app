import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

async function verifyAdmin(token: string) {
  const decoded = await adminAuth.verifyIdToken(token);
  const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== 'admin') throw new Error('Forbidden');
  return decoded;
}

// GET: List all KPS questions with stimulus info
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { await verifyAdmin(authHeader.slice(7)); } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }

  const url = new URL(req.url);
  const level = url.searchParams.get('level');
  const topic = url.searchParams.get('topic');
  const status = url.searchParams.get('status');

  // Fetch all questions (simple query)
  const questionsSnap = await adminDb.collection('kps_questions').limit(500).get();
  let questions = questionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Record<string, unknown>));

  // Fetch all stimuli for reference
  const stimuliSnap = await adminDb.collection('kps_stimuli').limit(100).get();
  const stimuliMap: Record<string, Record<string, unknown>> = {};
  stimuliSnap.docs.forEach(d => { stimuliMap[d.id] = { id: d.id, ...d.data() }; });

  // Filter
  if (level) questions = questions.filter(q => q.difficultyLevel === level);
  if (status) questions = questions.filter(q => q.status === status);

  // Enrich with stimulus info
  const enriched = questions.map(q => {
    const stim = stimuliMap[q.stimulusId as string] || {};
    return {
      id: q.id,
      stem: q.stem,
      indicator: q.indicator,
      stage: q.stage,
      difficultyLevel: q.difficultyLevel,
      questionType: q.questionType,
      order: q.order,
      status: q.status,
      usageCount: q.usageCount || 0,
      avgCorrectRate: q.avgCorrectRate || 0,
      stimulusTopic: stim.topic || 'unknown',
      stimulusTitle: stim.title || '',
    };
  });

  // Sort by level, stage, order
  enriched.sort((a, b) => {
    const levelOrder = ['menengah', 'tinggi', 'rendah', 'tetap_tinggi', 'menengah_lebih_tinggi', 'menengah_lebih_rendah', 'tetap_rendah'];
    const lDiff = levelOrder.indexOf(a.difficultyLevel as string) - levelOrder.indexOf(b.difficultyLevel as string);
    if (lDiff !== 0) return lDiff;
    const sDiff = (a.stage as number) - (b.stage as number);
    if (sDiff !== 0) return sDiff;
    return (a.order as number) - (b.order as number);
  });

  return NextResponse.json({ questions: enriched, total: enriched.length });
}

// PATCH: Update question status (activate/deactivate)
export async function PATCH(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { await verifyAdmin(authHeader.slice(7)); } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }

  let body: { questionId?: string; status?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  if (!body.questionId || !body.status) return NextResponse.json({ error: 'questionId and status required' }, { status: 400 });

  await adminDb.collection('kps_questions').doc(body.questionId).update({ status: body.status });
  return NextResponse.json({ success: true });
}
