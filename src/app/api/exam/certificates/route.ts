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
      .limit(50)
      .get();

    // Only return approved or sent certificates to users
    const certificates = certsSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(cert => {
        const status = (cert as Record<string, unknown>).status;
        // Include 'sent', 'approved', or legacy certs without status field
        return status === 'approved' || status === 'sent' || !status;
      });

    // Sort by issuedAt descending in memory
    certificates.sort((a, b) => {
      const aTime = ((a as Record<string, unknown>).issuedAt as { _seconds?: number })?._seconds ?? 0;
      const bTime = ((b as Record<string, unknown>).issuedAt as { _seconds?: number })?._seconds ?? 0;
      return bTime - aTime;
    });

    return NextResponse.json({ certificates });
  } catch {
    return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 });
  }
}