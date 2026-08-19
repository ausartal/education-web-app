import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let decoded;
  try { decoded = await adminAuth.verifyIdToken(authHeader.slice(7)); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const certsSnap = await adminDb.collection('kps_certificates')
    .where('studentId', '==', decoded.uid)
    .orderBy('issuedAt', 'desc')
    .get();

  const certificates = certsSnap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      certificateNumber: data.certificateNumber,
      testId: data.testId,
      issuedAt: data.issuedAt?.toDate?.()?.toISOString() || null,
      expiresAt: data.expiresAt?.toDate?.()?.toISOString() || null,
      status: data.status,
      score: data.score || null,
      level: data.level || null,
    };
  });

  return NextResponse.json({ certificates });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let decoded;
  try { decoded = await adminAuth.verifyIdToken(authHeader.slice(7)); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  let body: { sessionId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  if (!body.sessionId) return NextResponse.json({ error: 'sessionId diperlukan' }, { status: 400 });

  const sessionDoc = await adminDb.collection('kps_exam_sessions').doc(body.sessionId).get();
  if (!sessionDoc.exists) return NextResponse.json({ error: 'Session tidak ditemukan' }, { status: 404 });

  const session = sessionDoc.data()!;
  if (session.studentId !== decoded.uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (session.status !== 'completed') return NextResponse.json({ error: 'Ujian belum selesai' }, { status: 400 });

  // Check if cert already exists
  const existingCert = await adminDb.collection('kps_certificates')
    .where('sessionId', '==', body.sessionId)
    .where('studentId', '==', decoded.uid)
    .limit(1)
    .get();

  if (!existingCert.empty) {
    const cert = existingCert.docs[0];
    return NextResponse.json({
      id: cert.id,
      ...cert.data(),
      issuedAt: cert.data().issuedAt?.toDate?.()?.toISOString() || null,
      expiresAt: cert.data().expiresAt?.toDate?.()?.toISOString() || null,
    });
  }

  // Generate certificate
  const year = new Date().getFullYear();
  const certCount = await adminDb.collection('kps_certificates').count().get();
  const certNumber = `KPS-CERT-${year}-${String(certCount.data().count + 1).padStart(5, '0')}`;

  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt);
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const certRef = adminDb.collection('kps_certificates').doc();
  await certRef.set({
    studentId: decoded.uid,
    sessionId: body.sessionId,
    testId: session.testId || `KPS-${year}-00001`,
    certificateNumber: certNumber,
    score: session.numericScore || 0,
    level: session.finalLevel || null,
    issuedAt: FieldValue.serverTimestamp(),
    expiresAt,
    status: 'active',
  });

  return NextResponse.json({
    id: certRef.id,
    certificateNumber: certNumber,
    score: session.numericScore || 0,
    level: session.finalLevel || null,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: 'active',
  }, { status: 201 });
}
