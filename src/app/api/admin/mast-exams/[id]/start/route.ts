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
    if (examData.status !== 'draft') {
      return NextResponse.json(
        { error: `Cannot start exam with status '${examData.status}'` },
        { status: 400 },
      );
    }

    // Update exam status to active
    await examRef.update({
      status: 'active',
      startedAt: FieldValue.serverTimestamp(),
    });

    // Create or update waiting room document
    const waitingRoomRef = adminDb.collection('mast_waiting_room').doc(params.id);
    await waitingRoomRef.set(
      {
        examId: params.id,
        status: 'waiting',
        students: {},
        startedAt: FieldValue.serverTimestamp(),
        breakState: null,
      },
      { merge: true },
    );

    return NextResponse.json({ success: true, status: 'active' });
  } catch (err) {
    console.error('[mast-exams/:id/start POST]', err);
    return NextResponse.json(
      { error: 'Internal server error', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
