import { NextRequest, NextResponse } from 'next/server';
import { getUid, saveDraft, isServiceError } from '@/lib/msat-server';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/msat/sessions/[id]/progress
 * Saves the in-progress answers of the current stage so a refresh or a
 * device change can resume where the student left off.
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { answers?: unknown; timeSpent?: unknown };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const result = await saveDraft(params.id, uid, body);
    if (isServiceError(result)) {
      return NextResponse.json({ error: result.error, status: result.sessionStatus }, { status: result.status });
    }
    return NextResponse.json({ savedAtMs: result.savedAtMs });
  } catch (err) {
    console.error('MSAT progress error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
