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

    // The data API strips `role` from client writes, so self-registered profiles
    // have none yet: they are students. Teachers and admins are set by an admin.
    let role = userDoc.data()?.role as string | undefined;
    if (!role) {
      role = 'student';
      await userDoc.ref.update({ role });
    }

    await setUserRoleClaim(decoded.uid, role);

    return NextResponse.json({ success: true, role });
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
