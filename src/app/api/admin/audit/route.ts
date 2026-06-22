import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/auth-helpers';

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '50');

  const snap = await adminDb.collection('audit_logs')
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();

  const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ logs });
}
