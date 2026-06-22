import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/auth-helpers';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  let query: FirebaseFirestore.Query = adminDb.collection('materials');
  if (status) query = query.where('status', '==', status);

  const snap = await query.orderBy('order', 'asc').get();
  const materials = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ materials });
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { title, description, topic, subtopic, content, estimatedTime, status = 'draft', order = 0, learningObjectives = [], prerequisites = [] } = body;

  if (!title || !topic) {
    return NextResponse.json({ error: 'title and topic are required' }, { status: 400 });
  }

  const docRef = adminDb.collection('materials').doc();
  const material = {
    title, description: description || '',
    topic, subtopic: subtopic || '',
    content: content || '',
    estimatedTime: estimatedTime || 30,
    status, order,
    learningObjectives,
    prerequisites,
    createdBy: admin.uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await docRef.set(material);

  await adminDb.collection('audit_logs').add({
    actorId: admin.uid, actorRole: 'admin', action: 'create_material',
    targetId: docRef.id, targetType: 'material',
    details: { title, topic, status }, timestamp: new Date(),
  });

  return NextResponse.json({ material: { id: docRef.id, ...material } }, { status: 201 });
}
