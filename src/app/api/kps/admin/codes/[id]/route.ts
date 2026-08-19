import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

async function verifyAdmin(token: string) {
  const decoded = await adminAuth.verifyIdToken(token);
  const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
    throw new Error('Forbidden');
  }
  return decoded;
}

// PATCH: Update access code
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await verifyAdmin(authHeader.slice(7));
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const docRef = adminDb.collection('kps_access_codes').doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return NextResponse.json({ error: 'Kode tidak ditemukan' }, { status: 404 });

  let body: { status?: string; title?: string; description?: string; maxUses?: number; expiresAt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.status) updates.status = body.status;
  if (body.title) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.maxUses !== undefined) updates.maxUses = body.maxUses;
  if (body.expiresAt) updates.expiresAt = new Date(body.expiresAt);

  await docRef.update(updates);

  return NextResponse.json({ id, ...updates });
}

// DELETE: Delete access code
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await verifyAdmin(authHeader.slice(7));
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const docRef = adminDb.collection('kps_access_codes').doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return NextResponse.json({ error: 'Kode tidak ditemukan' }, { status: 404 });

  await docRef.delete();

  return NextResponse.json({ success: true });
}
