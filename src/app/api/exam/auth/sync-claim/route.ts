import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/exam/auth/sync-claim
 * Sync the custom claim for exam_user role.
 * Called after registration and on login to ensure the token has the correct role.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));

    // Verify user exists in exam_users
    const userDoc = await adminDb.collection('exam_users').doc(decoded.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    // Set custom claim
    await adminAuth.setCustomUserClaims(decoded.uid, { role: 'exam_user' });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 });
  }
}