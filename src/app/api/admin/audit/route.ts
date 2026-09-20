import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const requestedLimit = Number.parseInt(searchParams.get('limit') || '50', 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 200) : 50;

  const snap = await adminDb.collection('audit_logs')
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();

  const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return NextResponse.json(
    { logs },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  );
}
