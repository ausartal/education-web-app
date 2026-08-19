import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { KPS_INDICATOR_LABELS, KPSIndicator } from '@/types/kps';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let decoded;
  try { decoded = await adminAuth.verifyIdToken(authHeader.slice(7)); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  // Fetch latest session
  const sessionsSnap = await adminDb.collection('kps_exam_sessions')
    .where('studentId', '==', decoded.uid)
    .where('status', 'in', ['completed', 'flagged'])
    .orderBy('completedAt', 'desc')
    .limit(1)
    .get();

  if (sessionsSnap.empty) {
    return NextResponse.json({
      weakCompetencies: [],
      recommendations: [],
      suggestedMaterials: [],
    });
  }

  const latestSession = sessionsSnap.docs[0].data();
  const indicatorScores = latestSession.indicatorScores || {};

  // Find weak competencies (below 70%)
  const weakCompetencies = Object.entries(indicatorScores)
    .filter(([_, score]) => (score as number) < 70)
    .sort(([_, a], [__, b]) => (a as number) - (b as number))
    .map(([key, score]) => ({
      indicator: key,
      label: KPS_INDICATOR_LABELS[key as KPSIndicator] || key,
      score: score as number,
      level: (score as number) >= 55 ? 'Perlu ditingkatkan' : 'Lemah',
    }));

  // Recommendations
  const recommendations = [];
  if (weakCompetencies.length > 0) {
    recommendations.push({
      type: 'practice',
      title: 'Latihan Fokus KPS',
      description: `Fokuskan latihan pada ${weakCompetencies[0]?.label || 'indikator terlemah'} untuk meningkatkan pemahaman.`,
      priority: 'high',
    });
    recommendations.push({
      type: 'assessment',
      title: 'Ujian Diagnostik',
      description: 'Ikuti ujian diagnostik untuk mengidentifikasi area yang perlu diperbaiki.',
      priority: 'medium',
    });
  }
  recommendations.push({
    type: 'material',
    title: 'Materi Kesetimbangan Kimia',
    description: 'Pelajari kembali konsep dasar kesetimbangan kimia dan Azas Le Chatelier.',
    priority: 'low',
  });

  // Suggested materials
  const suggestedMaterials = [
    { title: 'Azas Le Chatelier', topic: 'Kesetimbangan', url: '/materi/kesetimbangan' },
    { title: 'Konstanta Kesetimbangan (Kc)', topic: 'Kesetimbangan', url: '/materi/kesetimbangan' },
    { title: 'Pergeseran Kesetimbangan', topic: 'Kesetimbangan', url: '/materi/kesetimbangan' },
  ];

  return NextResponse.json({
    weakCompetencies,
    recommendations,
    suggestedMaterials,
  });
}
