import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from '@/lib/pg-firestore';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { shouldAssignExamClaim } from '@/lib/claims';

export const dynamic = 'force-dynamic';

/**
 * POST /api/exam/auth/activate
 * Creates the AKURAT Exam profile for an account that already exists in
 * Firebase Auth (for example a school account). The participant completes the
 * identity details afterwards on /exam/profile.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    const userRef = adminDb.collection('exam_users').doc(decoded.uid);
    const existing = await userRef.get();

    if (existing.exists()) {
      if (existing.data()?.isActive === false) {
        return NextResponse.json({ error: 'Akun Exam dinonaktifkan. Hubungi administrator.' }, { status: 403 });
      }
      return NextResponse.json({ success: true, needsProfileCompletion: false });
    }

    const authUser = await adminAuth.getUser(decoded.uid);
    const email = (decoded.email || authUser.email || '').toLowerCase().trim();
    if (!email) {
      return NextResponse.json({ error: 'Akun ini tidak memiliki email.' }, { status: 400 });
    }

    const duplicate = await adminDb.collection('exam_users').where('email', '==', email).limit(1).get();
    if (!duplicate.empty) {
      return NextResponse.json({ error: 'Email ini sudah terhubung ke akun Exam lain.' }, { status: 409 });
    }

    const displayName = (decoded.name || authUser.displayName || email.split('@')[0]).trim();
    await userRef.set({
      uid: decoded.uid,
      email,
      displayName,
      phoneNumber: '',
      gender: '',
      photoURL: decoded.picture || authUser.photoURL || null,
      identityNumber: '',
      identityType: '',
      institution: '',
      birthDate: '',
      birthPlace: '',
      address: '',
      verificationStatus: 'unverified',
      verificationNotes: '',
      verifiedAt: null,
      tokenBalance: 0,
      createdAt: FieldValue.serverTimestamp(),
      lastLoginAt: FieldValue.serverTimestamp(),
      isActive: true,
      authProvider: decoded.firebase?.sign_in_provider ?? 'password',
    });

    await adminDb.collection('audit_logs').add({
      actorId: decoded.uid,
      actorRole: 'exam_user',
      action: 'activate_exam_account',
      targetId: decoded.uid,
      targetType: 'exam_user',
      details: { email },
      timestamp: new Date(),
    });

    if (shouldAssignExamClaim(decoded)) {
      await adminAuth.setCustomUserClaims(decoded.uid, { role: 'exam_user' });
    }

    return NextResponse.json({ success: true, needsProfileCompletion: true });
  } catch (error) {
    console.error('Exam activate error:', error);
    return NextResponse.json({ error: 'Gagal mengaktifkan akun Exam. Coba lagi.' }, { status: 500 });
  }
}
