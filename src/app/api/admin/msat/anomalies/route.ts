import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/auth-helpers';
import { toMillis } from '@/lib/msat-session';
import { sortAnomalies, topSeverity, type AnomalyItem, type AnomalyReview } from '@/lib/anomaly';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/msat/anomalies
 * Every MSAT attempt that the system flagged, with its review state.
 */
export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const snap = await adminDb.collection('msat_sessions').limit(2000).get();

    const flagged = snap.docs.filter((d) => {
      const data = d.data();
      return data.status !== 'cancelled' && Array.isArray(data.anomalyFlags) && data.anomalyFlags.length > 0;
    });

    const examIds = [...new Set(flagged.map((d) => d.data().examId as string))];
    const examDocs = await Promise.all(examIds.map((id) => adminDb.collection('msat_access_code').doc(id).get()));
    const titles = new Map<string, string>();
    examDocs.forEach((d, i) => titles.set(examIds[i], d.exists() ? ((d.data()?.title as string) ?? 'Ujian') : 'Ujian dihapus'));

    const items: AnomalyItem[] = flagged.map((d) => {
      const data = d.data();
      const flags = data.anomalyFlags as string[];
      return {
        id: d.id,
        examId: data.examId as string,
        examTitle: titles.get(data.examId as string) ?? 'Ujian',
        studentName: (data.studentName as string) ?? 'Peserta',
        flags,
        severity: topSeverity(flags),
        review: (data.anomalyReview as AnomalyReview | null) ?? null,
        status: data.status as string,
        completedAtMs: toMillis(data.completedAt) ?? toMillis(data.createdAt),
      };
    });

    const exams = examIds.map((id) => ({ id, title: titles.get(id) ?? id }));
    return NextResponse.json({ items: sortAnomalies(items), exams });
  } catch (err) {
    console.error('[admin/msat/anomalies GET]', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
