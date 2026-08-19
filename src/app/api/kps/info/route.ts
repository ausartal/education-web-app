import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try { await adminAuth.verifyIdToken(authHeader.slice(7)); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const announcementsSnap = await adminDb.collection('kps_announcements')
    .where('status', '==', 'active')
    .orderBy('publishedAt', 'desc')
    .limit(20)
    .get();

  const announcements = announcementsSnap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title,
      content: data.content,
      type: data.type,
      publishedAt: data.publishedAt?.toDate?.()?.toISOString() || null,
      expiresAt: data.expiresAt?.toDate?.()?.toISOString() || null,
    };
  });

  // Group by type
  const grouped = {
    announcements: announcements.filter(a => a.type === 'announcement'),
    schedules: announcements.filter(a => a.type === 'schedule'),
    policies: announcements.filter(a => a.type === 'policy'),
  };

  return NextResponse.json(grouped);
}
