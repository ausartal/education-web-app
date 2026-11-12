import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { toMillis } from '@/lib/msat-session';
import { consumeRateLimit } from '@/lib/rate-limit-server';
import { clientIpFrom, isValidCertificateNo, maskName, verifyStatusOf } from '@/lib/certificate-verify';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/certificates/[certificateNo]
 * Lets anyone check that a certificate is genuine. Only a masked name, the exam,
 * the grade and the issue date are returned. Requests are limited per address.
 */
export async function GET(req: NextRequest, { params }: { params: { certificateNo: string } }) {
  const limit = await consumeRateLimit(`verify_certificate:${clientIpFrom(req.headers)}`, 30, 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ valid: false, error: 'Terlalu banyak permintaan. Coba lagi sebentar lagi.' }, { status: 429 });
  }

  const certificateNo = decodeURIComponent(params.certificateNo).trim();
  if (!isValidCertificateNo(certificateNo)) {
    return NextResponse.json({ valid: false, status: 'unknown' }, { status: 404 });
  }

  try {
    const snap = await adminDb.collection('exam_certificates')
      .where('certificateNo', '==', certificateNo)
      .limit(1)
      .get();

    if (snap.empty) return NextResponse.json({ valid: false, status: 'unknown' }, { status: 404 });

    const cert = snap.docs[0].data();
    const status = verifyStatusOf(cert.status as string);
    if (status === 'pending' || status === 'unknown') {
      return NextResponse.json({ valid: false, status: 'unknown' }, { status: 404 });
    }

    const holder = await adminDb.collection('exam_users').doc(cert.userId as string).get();
    const issuedMs = toMillis(cert.approvedAt) ?? toMillis(cert.issuedAt);

    return NextResponse.json(
      {
        valid: status === 'valid',
        status,
        certificateNo: cert.certificateNo,
        examTitle: (cert.examTitle as string) ?? 'Ujian Kimia',
        predikat: (cert.predikat as string) ?? null,
        holder: maskName(holder.exists() ? (holder.data()?.displayName as string) : ''),
        issuedAt: issuedMs ? new Date(issuedMs).toISOString() : null,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    console.error('[public/certificates GET]', err);
    return NextResponse.json({ valid: false, error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
