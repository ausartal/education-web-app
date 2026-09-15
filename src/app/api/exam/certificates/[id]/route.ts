import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/exam/certificates/[id] — get certificate detail
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    const certDoc = await adminDb.collection('exam_certificates').doc(params.id).get();

    if (!certDoc.exists) {
      return NextResponse.json({ error: 'Sertifikat tidak ditemukan' }, { status: 404 });
    }

    const certData = certDoc.data()!;

    // Only owner or admin can view
    if (certData.userId !== decoded.uid) {
      // Check if admin
      const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
      if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
      }
    }

    return NextResponse.json({ certificate: { id: certDoc.id, ...certData } });
  } catch {
    return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 });
  }
}