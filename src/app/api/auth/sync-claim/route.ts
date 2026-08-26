import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, setUserRoleClaim } from '@/lib/firebase-admin';

/**
 * Sync the authenticated user's Firestore role to their Firebase Auth custom claims.
 * Called after registration or role change so the token carries the role
 * without needing a Firestore read in security rules.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const role = userDoc.data()?.role as string;
    if (!role) {
      return NextResponse.json({ error: 'No role found' }, { status: 400 });
    }

    await setUserRoleClaim(decoded.uid, role);

    return NextResponse.json({ success: true, role });
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
