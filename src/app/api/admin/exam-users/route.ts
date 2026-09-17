import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/exam-users — list all exam users with pagination
 */
export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get('status'); // verification status filter
  const limitParam = parseInt(url.searchParams.get('limit') ?? '50', 10);
  const limit = Math.min(Math.max(limitParam, 1), 100);

  try {
    let query: FirebaseFirestore.Query = adminDb.collection('exam_users');

    if (status && ['unverified', 'pending', 'verified', 'rejected'].includes(status)) {
      query = query.where('verificationStatus', '==', status);
    }

    const snap = await query.limit(limit).get();

    const users = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort in memory to handle documents without createdAt
    users.sort((a, b) => {
      const aTime = (a.createdAt as { _seconds?: number })?._seconds ?? 0;
      const bTime = (b.createdAt as { _seconds?: number })?._seconds ?? 0;
      return bTime - aTime;
    });

    return NextResponse.json({ users, total: users.length });
  } catch (err) {
    console.error('Admin exam-users list error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}