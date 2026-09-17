import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/exam/certificates — list user's certificates
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));

    const certsSnap = await adminDb.collection('exam_certificates')
      .where('userId', '==', decoded.uid)
      .orderBy('issuedAt', 'desc')
      .limit(50)
      .get();

    // Only return approved or sent certificates to users
    const certificates = certsSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(cert => {
        const status = (cert as Record<string, unknown>).status;
        return status === 'approved' || status === 'sent';
      });

    return NextResponse.json({ certificates });
  } catch {
    return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 });
  }
}