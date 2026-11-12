import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth-helpers';
import { getDatabaseStats } from '@/lib/pg-firestore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const startedAt = Date.now();
  try {
    const stats = await getDatabaseStats();

    return NextResponse.json({
      status: 'connected',
      provider: stats.version || 'PostgreSQL',
      latencyMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
      sizeBytes: stats.sizeBytes,
      pool: stats.pool,
      collections: stats.collections,
      backup: { available: false, reason: 'Backup dikelola oleh penyedia database dan statusnya belum bisa dibaca dari aplikasi. Pastikan backup terjadwal aktif di dashboard penyedia.' },
      migrations: { available: false, reason: 'Aplikasi memakai penyimpanan dokumen tanpa skema, jadi tidak ada registry migrasi. Skrip perubahan data ada di folder scripts.' },
    });
  } catch (err) {
    console.error('[admin/database GET]', err);
    return NextResponse.json({ status: 'error', checkedAt: new Date().toISOString(), error: 'Pemeriksaan database gagal.' }, { status: 503 });
  }
}
