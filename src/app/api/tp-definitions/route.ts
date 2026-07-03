import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyTeacher } from '@/lib/auth-helpers';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const subject = searchParams.get('subject');

  let globalQuery: FirebaseFirestore.Query = adminDb.collection('tp_definitions').where('scope', '==', 'global');
  let privateQuery: FirebaseFirestore.Query = adminDb.collection('tp_definitions')
    .where('scope', '==', 'private')
    .where('ownerId', '==', teacher.uid);

  if (subject) {
    globalQuery = globalQuery.where('subject', '==', subject);
    privateQuery = privateQuery.where('subject', '==', subject);
  }

  const [globalSnap, privateSnap] = await Promise.all([globalQuery.get(), privateQuery.get()]);

  const tps = [
    ...globalSnap.docs.map(d => ({ id: d.id, ...d.data(), scope: 'global' })),
    ...privateSnap.docs.map(d => ({ id: d.id, ...d.data(), scope: 'private' })),
  ].sort((a, b) => {
    const aOrder = (a as Record<string, unknown>).order as number ?? 99;
    const bOrder = (b as Record<string, unknown>).order as number ?? 99;
    return aOrder - bOrder;
  });

  // Count questions per TP
  const tpIds = tps.map(t => t.id);
  const questionCounts: Record<string, Record<string, number>> = {};
  if (tpIds.length > 0) {
    const chunks = [];
    for (let i = 0; i < tpIds.length; i += 10) chunks.push(tpIds.slice(i, i + 10));
    for (const chunk of chunks) {
      const qSnap = await adminDb.collection('exam_questions')
        .where('domainId', 'in', chunk)
        .where('status', '==', 'active')
        .get();
      qSnap.docs.forEach(d => {
        const data = d.data();
        const tpId = data.domainId as string;
        const tierPath = data.tierPath as string;
        if (!questionCounts[tpId]) questionCounts[tpId] = {};
        questionCounts[tpId][tierPath] = (questionCounts[tpId][tierPath] || 0) + 1;
      });
    }
  }

  const requiredPaths = ['anchor', 'mudah', 'sukar', 'sangat_mudah', 'sedang_a', 'sedang_b', 'sangat_sukar'];
  const enriched = tps.map(tp => {
    const counts = questionCounts[tp.id] || {};
    const totalQuestions = Object.values(counts).reduce((s, n) => s + n, 0);
    const isComplete = requiredPaths.every(p => (counts[p] || 0) >= 1);
    return { ...tp, questionCounts: counts, totalQuestions, isComplete };
  });

  return NextResponse.json({ tps: enriched });
}

export async function POST(req: NextRequest) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }
  const { code, name, subject, description, order } = body as { code?: string; name?: string; subject?: string; description?: string; order?: number };

  if (!code?.trim() || !name?.trim()) {
    return NextResponse.json({ error: 'Kode dan nama TP wajib diisi' }, { status: 400 });
  }

  const scope = teacher.role === 'admin' ? 'global' : 'private';

  const docRef = adminDb.collection('tp_definitions').doc();
  await docRef.set({
    code: code.trim().toUpperCase(),
    name: name.trim(),
    subject: (subject || '').trim(),
    description: (description || '').trim(),
    scope,
    ownerId: teacher.uid,
    ownerName: teacher.displayName || '',
    order: typeof order === 'number' ? order : 99,
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ tp: { id: docRef.id, code, name, subject, scope } }, { status: 201 });
}
