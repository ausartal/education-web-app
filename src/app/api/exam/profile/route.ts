import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { sanitizeInput } from '@/lib/exam-validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/exam/profile — get own profile
 * PATCH /api/exam/profile — update editable fields
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    const userDoc = await adminDb.collection('exam_users').doc(decoded.uid).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Profil tidak ditemukan' }, { status: 404 });
    }

    const data = userDoc.data()!;
    // Omit verificationNotes from response
    const { verificationNotes: _, ...publicData } = data;
    return NextResponse.json({ profile: { ...publicData, uid: decoded.uid } });
  } catch {
    return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest) {
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

  // Only allow updating these fields
  const allowedFields = [
    'displayName', 'phoneNumber', 'gender', 'photoURL',
    'identityNumber', 'identityType', 'institution',
    'birthDate', 'birthPlace', 'address',
  ];

  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) {
      const val = body[key];
      if (typeof val === 'string') {
        updates[key] = sanitizeInput(val);
      } else {
        updates[key] = val;
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Tidak ada data yang diubah' }, { status: 400 });
  }

  try {
    const docRef = adminDb.collection('exam_users').doc(decoded.uid);
    const existing = await docRef.get();

    const base: Record<string, unknown> = {
      ...updates,
      updatedAt: new Date(),
    };

    // If document doesn't exist yet, set required baseline fields
    if (!existing.exists) {
      base.uid = decoded.uid;
      base.email = (decoded.email ?? '').toLowerCase();
      base.verificationStatus = 'unverified';
      base.verificationNotes = '';
      base.verifiedAt = null;
      base.tokenBalance = 0;
      base.isActive = true;
      base.createdAt = new Date();
      base.lastLoginAt = new Date();
    }

    await docRef.set(base, { merge: true });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Exam profile update error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}