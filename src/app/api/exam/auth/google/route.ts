import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    if (decoded.firebase?.sign_in_provider !== 'google.com') {
      return NextResponse.json(
        { error: 'Gunakan akun Google untuk melanjutkan.' },
        { status: 400 },
      );
    }

    const userRef = adminDb.collection('exam_users').doc(decoded.uid);
    const existing = await userRef.get();
    let needsProfileCompletion = false;

    if (existing.exists) {
      if (existing.data()?.isActive === false) {
        return NextResponse.json(
          { error: 'Akun Exam dinonaktifkan. Hubungi administrator.' },
          { status: 403 },
        );
      }
      await userRef.update({ lastLoginAt: FieldValue.serverTimestamp() });
    } else {
      const authUser = await adminAuth.getUser(decoded.uid);
      const email = (decoded.email || authUser.email || '').toLowerCase().trim();
      if (!email) {
        return NextResponse.json(
          { error: 'Email akun Google tidak tersedia.' },
          { status: 400 },
        );
      }

      const duplicate = await adminDb.collection('exam_users')
        .where('email', '==', email)
        .limit(1)
        .get();
      if (!duplicate.empty) {
        return NextResponse.json(
          { error: 'Email ini sudah terhubung ke akun Exam lain.' },
          { status: 409 },
        );
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
        authProvider: 'google',
      });
      needsProfileCompletion = true;

      await adminDb.collection('audit_logs').add({
        actorId: decoded.uid,
        actorRole: 'exam_user',
        action: 'create_user_google',
        targetId: decoded.uid,
        targetType: 'exam_user',
        details: { email, displayName, provider: 'google' },
        timestamp: FieldValue.serverTimestamp(),
      });
    }

    await adminAuth.setCustomUserClaims(decoded.uid, { role: 'exam_user' });
    return NextResponse.json({ success: true, needsProfileCompletion });
  } catch (error) {
    console.error('Exam Google sign-in error:', error);
    return NextResponse.json(
      { error: 'Google Sign-In gagal. Silakan coba lagi.' },
      { status: 500 },
    );
  }
}
