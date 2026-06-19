import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') return null;
    return decoded;
  } catch { return null; }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { uid: string } }
) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const allowed = ['role', 'isActive', 'displayName', 'profile'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  await adminDb.collection('users').doc(params.uid).update(updates);

  await adminDb.collection('audit_logs').add({
    actorId: admin.uid,
    actorRole: 'admin',
    action: 'update_user',
    targetId: params.uid,
    targetType: 'user',
    details: updates,
    timestamp: new Date(),
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { uid: string } }
) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const targetDoc = await adminDb.collection('users').doc(params.uid).get();
  // Prevent deleting another admin's account — log the action but allow it
  if (targetDoc.data()?.role === 'admin' && targetDoc.id !== admin.uid) {
    // Could add extra confirmation layer here if needed
  }

  await adminAuth.deleteUser(params.uid);
  await adminDb.collection('users').doc(params.uid).delete();

  await adminDb.collection('audit_logs').add({
    actorId: admin.uid,
    actorRole: 'admin',
    action: 'delete_user',
    targetId: params.uid,
    targetType: 'user',
    details: { deletedEmail: targetDoc.data()?.email },
    timestamp: new Date(),
  });

  return NextResponse.json({ success: true });
}
