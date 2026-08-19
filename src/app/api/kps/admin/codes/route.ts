import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { generateAccessCode } from '@/lib/kps-engine';

export const dynamic = 'force-dynamic';

async function verifyAdmin(token: string) {
  const decoded = await adminAuth.verifyIdToken(token);
  const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
    throw new Error('Forbidden');
  }
  return decoded;
}

// GET: List all access codes
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await verifyAdmin(authHeader.slice(7));
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const limit = parseInt(url.searchParams.get('limit') || '50');

  let query: FirebaseFirestore.Query = adminDb.collection('kps_access_codes').orderBy('createdAt', 'desc');
  if (status) query = query.where('status', '==', status);

  const snap = await query.limit(limit).get();

  const codes = snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      code: data.code,
      title: data.title,
      description: data.description,
      status: data.status,
      maxUses: data.maxUses,
      currentUses: data.currentUses,
      expiresAt: data.expiresAt?.toDate?.()?.toISOString() ?? null,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      createdBy: data.createdBy,
    };
  });

  return NextResponse.json({ codes });
}

// POST: Create new access code
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let decoded;
  try {
    decoded = await verifyAdmin(authHeader.slice(7));
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { title?: string; description?: string; maxAttemptsPerAccount?: number; expiresAt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { title, description, maxAttemptsPerAccount, expiresAt } = body;
  if (!title) return NextResponse.json({ error: 'Judul diperlukan' }, { status: 400 });

  // Generate unique code
  let code = '';
  let isUnique = false;
  let attempts = 0;
  while (!isUnique && attempts < 10) {
    code = generateAccessCode();
    const existing = await adminDb.collection('kps_access_codes').where('code', '==', code).limit(1).get();
    isUnique = existing.empty;
    attempts++;
  }

  if (!isUnique) {
    return NextResponse.json({ error: 'Gagal membuat kode unik, coba lagi' }, { status: 500 });
  }

  const docRef = adminDb.collection('kps_access_codes').doc();
  await docRef.set({
    code,
    title,
    description: description || '',
    maxAttemptsPerAccount: maxAttemptsPerAccount || 1,
    currentUses: 0,
    status: 'active',
    expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdAt: FieldValue.serverTimestamp(),
    createdBy: decoded.uid,
  });

  return NextResponse.json({
    id: docRef.id,
    code,
    title,
    description: description || '',
    maxAttemptsPerAccount: maxAttemptsPerAccount || 1,
    currentUses: 0,
    status: 'active',
    expiresAt: expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }, { status: 201 });
}
