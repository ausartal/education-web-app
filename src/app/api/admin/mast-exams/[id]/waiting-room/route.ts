import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const waitingRoomDoc = await adminDb
      .collection('mast_waiting_room')
      .doc(params.id)
      .get();

    if (!waitingRoomDoc.exists) {
      return NextResponse.json({ error: 'Waiting room not found' }, { status: 404 });
    }

    return NextResponse.json({ id: waitingRoomDoc.id, ...waitingRoomDoc.data() });
  } catch (err) {
    console.error('[mast-exams/:id/waiting-room GET]', err);
    return NextResponse.json(
      { error: 'Internal server error', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
