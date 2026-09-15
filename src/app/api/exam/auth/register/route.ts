import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { validateRegistration, sanitizeInput } from '@/lib/exam-validation';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

/**
 * POST /api/exam/auth/register
 * Create a new exam user account. Client creates the Firebase Auth user first
 * (via client SDK), then calls this endpoint to create the exam_users document
 * and sync the custom claim.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
  } catch {
    return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Request body tidak valid' }, { status: 400 });
  }

  // Validate
  const errors = validateRegistration(body as Parameters<typeof validateRegistration>[0]);
  if (errors.length > 0) {
    return NextResponse.json({ error: 'Data tidak valid', details: errors }, { status: 400 });
  }

  // Check if already exists
  const existingDoc = await adminDb.collection('exam_users').doc(decoded.uid).get();
  if (existingDoc.exists) {
    return NextResponse.json({ error: 'Akun sudah terdaftar' }, { status: 409 });
  }

  // Check email uniqueness across exam_users
  const emailSnap = await adminDb.collection('exam_users')
    .where('email', '==', (body.email as string).toLowerCase().trim())
    .limit(1)
    .get();
  if (!emailSnap.empty) {
    return NextResponse.json({ error: 'Email sudah digunakan' }, { status: 409 });
  }

  // Sanitize inputs
  const data = {
    uid: decoded.uid,
    email: sanitizeInput(body.email as string).toLowerCase(),
    displayName: sanitizeInput(body.displayName as string),
    phoneNumber: sanitizeInput(body.phoneNumber as string),
    gender: body.gender as string,
    photoURL: null,
    identityNumber: sanitizeInput(body.identityNumber as string),
    identityType: body.identityType as string,
    institution: sanitizeInput(body.institution as string),
    birthDate: body.birthDate as string,
    birthPlace: sanitizeInput(body.birthPlace as string),
    address: sanitizeInput(body.address as string),
    verificationStatus: 'unverified',
    verificationNotes: '',
    verifiedAt: null,
    tokenBalance: 0,
    createdAt: FieldValue.serverTimestamp(),
    lastLoginAt: FieldValue.serverTimestamp(),
    isActive: true,
  };

  try {
    await adminDb.collection('exam_users').doc(decoded.uid).set(data);

    // Sync custom claim: role = 'exam_user'
    await adminAuth.setCustomUserClaims(decoded.uid, { role: 'exam_user' });

    // Audit log
    await adminDb.collection('audit_logs').add({
      actorId: decoded.uid,
      actorRole: 'exam_user',
      action: 'create_user',
      targetId: decoded.uid,
      targetType: 'exam_user',
      details: { email: data.email, displayName: data.displayName },
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true, uid: decoded.uid }, { status: 201 });
  } catch (err) {
    console.error('Exam registration error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}