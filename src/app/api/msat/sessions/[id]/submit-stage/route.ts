import { NextRequest, NextResponse } from 'next/server';
import { getUid, submitStage, isServiceError } from '@/lib/msat-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/msat/sessions/[id]/submit-stage
 * Submit answers for the current stage. Answers are validated against the
 * question set served for that stage; unanswered questions count as wrong.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { answers?: unknown };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const result = await submitStage(params.id, uid, body.answers);
    if (isServiceError(result)) {
      return NextResponse.json({ error: result.error, status: result.sessionStatus }, { status: result.status });
    }
    const { ok: _ok, ...payload } = result;
    void _ok;
    return NextResponse.json(payload);
  } catch (err) {
    console.error('MSAT submit-stage error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
