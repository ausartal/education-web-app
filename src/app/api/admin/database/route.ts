import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const startedAt = Date.now();
  try {
    const collections = ['users', 'classes', 'materials', 'question_bank', 'exam_sessions', 'msat_sessions', 'audit_logs', 'taxonomy_nodes'];
    const results = await Promise.all(collections.map(async name => {
      const result = await adminDb.collection(name).count().get();
      return { name, count: result.data().count };
    }));

    return NextResponse.json({
      status: 'connected', provider: 'Cloud Firestore', latencyMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(), collections: results,
      backup: { available: false, reason: 'Status backup belum terhubung ke provider infrastructure.' },
      migrations: { available: false, reason: 'Registry migrasi belum tersedia.' },
    });
  } catch {
    return NextResponse.json({ status: 'error', checkedAt: new Date().toISOString(), error: 'Pemeriksaan database gagal.' }, { status: 503 });
  }
}
