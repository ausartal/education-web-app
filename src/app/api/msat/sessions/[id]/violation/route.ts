import { NextRequest, NextResponse } from 'next/server';
import { getUid, recordViolation, isServiceError } from '@/lib/msat-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/msat/sessions/[id]/violation
 * Records a tab/focus violation. The count lives on the session, so reloading
 * the page does not reset it. Past the limit the exam is ended server-side.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await recordViolation(params.id, uid);
    if (isServiceError(result)) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({
      violations: result.violations,
      max: result.max,
      terminated: result.terminated,
    });
  } catch (err) {
    console.error('MSAT violation error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
