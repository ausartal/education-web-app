import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from '@/lib/pg-firestore';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

const RECENT_LOGIN_SECONDS = 5 * 60;

/**
 * DELETE /api/user/account
 * Lets a student delete their own school account. The sign-in must be recent
 * (re-authenticated just before). Teachers, admins and accounts that also have
 * an Exam profile must go through an administrator.
 */
export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));

    const authTime = typeof decoded.auth_time === 'number' ? decoded.auth_time : 0;
    if (Date.now() / 1000 - authTime > RECENT_LOGIN_SECONDS) {
      return NextResponse.json(
        { error: 'Masuk ulang terlebih dahulu untuk menghapus akun.', code: 'reauth-required' },
        { status: 401 },
      );
    }

    const userRef = adminDb.collection('users').doc(decoded.uid);
    const userDoc = await userRef.get();
    const role = (userDoc.exists() ? userDoc.data()?.role : undefined) ?? 'student';
    if (role !== 'student') {
      return NextResponse.json(
        { error: 'Akun guru dan admin hanya dapat dihapus oleh administrator.' },
        { status: 403 },
      );
    }

    const examProfile = await adminDb.collection('exam_users').doc(decoded.uid).get();
    if (examProfile.exists()) {
      return NextResponse.json(
        { error: 'Akun ini juga terdaftar di AKURAT Exam. Hubungi administrator untuk menghapusnya.' },
        { status: 409 },
      );
    }

    const classes = await adminDb.collection('classes').where('studentIds', 'array-contains', decoded.uid).get();
    for (const cls of classes.docs) {
      await cls.ref.update({ studentIds: FieldValue.arrayRemove(decoded.uid) });
    }

    const notifications = await adminDb.collection('notifications').where('userId', '==', decoded.uid).get();
    for (const n of notifications.docs) await n.ref.delete();

    await adminDb.collection('audit_logs').add({
      actorId: decoded.uid,
      actorRole: 'student',
      action: 'delete_own_account',
      targetId: decoded.uid,
      targetType: 'user',
      details: { classesLeft: classes.docs.length },
      timestamp: new Date(),
    });

    if (userDoc.exists()) await userRef.delete();
    await adminAuth.deleteUser(decoded.uid);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json({ error: 'Gagal menghapus akun. Coba lagi.' }, { status: 500 });
  }
}
