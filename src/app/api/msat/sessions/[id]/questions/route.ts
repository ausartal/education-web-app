import { NextRequest, NextResponse } from 'next/server';
import { getStageQuestions, getUid, isServiceError } from '@/lib/msat-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/msat/sessions/[id]/questions
 * Returns the fixed question set and server deadline for the current stage.
 * The set is chosen once per stage, so refreshing never changes the questions.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await getStageQuestions(params.id, uid);
    if (isServiceError(result)) {
      return NextResponse.json({ error: result.error, status: result.sessionStatus }, { status: result.status });
    }
    return NextResponse.json({
      stage: result.stage,
      difficulty: result.difficulty,
      questions: result.questions,
      endsAt: result.endsAt,
      serverNow: result.serverNow,
      remainingSeconds: result.remainingSeconds,
      draft: result.draft,
    });
  } catch (err) {
    console.error('MSAT questions error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
