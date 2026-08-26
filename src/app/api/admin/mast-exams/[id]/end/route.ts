import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/auth-helpers';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const examRef = adminDb.collection('mast_exams').doc(params.id);
    const examDoc = await examRef.get();

    if (!examDoc.exists) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    const examData = examDoc.data()!;
    if (examData.status !== 'active') {
      return NextResponse.json(
        { error: `Cannot end exam with status '${examData.status}'` },
        { status: 400 },
      );
    }

    // Update exam status to completed
    await examRef.update({
      status: 'completed',
      completedAt: FieldValue.serverTimestamp(),
    });

    // Update waiting room status
    const waitingRoomRef = adminDb.collection('mast_waiting_room').doc(params.id);
    await waitingRoomRef.update({ status: 'ended' });

    // Find all sessions still in_progress or on_break and mark them as timed_out
    const activeSessionsSnap = await adminDb
      .collection('mast_sessions')
      .where('examId', '==', params.id)
      .where('status', 'in', ['in_progress', 'on_break'])
      .get();

    const batch = adminDb.batch();
    activeSessionsSnap.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: 'timed_out',
        completedAt: FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();

    return NextResponse.json({
      success: true,
      status: 'completed',
      sessionsTimedOut: activeSessionsSnap.size,
    });
  } catch (err) {
    console.error('[mast-exams/:id/end POST]', err);
    return NextResponse.json(
      { error: 'Internal server error', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
