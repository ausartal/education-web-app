import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/msat/questions/[id] — update a question
 * DELETE /api/admin/msat/questions/[id] — delete a question
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let decoded;
  try { decoded = await adminAuth.verifyIdToken(authHeader.slice(7)); } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { id } = params;

  try {
    const docRef = adminDb.collection('msat_question').doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Soal tidak ditemukan' }, { status: 404 });
    }

    // Allowed fields for update
    const allowedFields = [
      'module', 'topic', 'stage', 'difficulty', 'tierPath', 'categoryLabel',
      'cognitiveDomain', 'cognitiveLevel', 'stem', 'options', 'correctAnswer',
      'subElement', 'competency', 'status', 'stageWeight',
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Tidak ada data yang diubah' }, { status: 400 });
    }

    // Recalculate derived fields if difficulty changed
    if (updates.difficulty) {
      const diffToTier: Record<string, string> = {
        sangat_mudah: 'sangat_mudah', mudah: 'mudah', sedang: 'medium', sukar: 'sukar', sangat_sukar: 'sangat_sukar',
      };
      const diffToCategory: Record<string, string> = {
        sangat_mudah: 'Sangat Rendah', mudah: 'Rendah', sedang: 'Medium', sukar: 'Tinggi', sangat_sukar: 'Lebih Tinggi',
      };
      const diffToWeight: Record<string, number> = {
        sangat_mudah: 0.5, mudah: 0.7, sedang: 1.0, sukar: 1.3, sangat_sukar: 1.5,
      };
      if (!updates.tierPath) updates.tierPath = diffToTier[updates.difficulty as string] || 'medium';
      if (!updates.categoryLabel) updates.categoryLabel = diffToCategory[updates.difficulty as string] || 'Medium';
      if (!updates.stageWeight) updates.stageWeight = diffToWeight[updates.difficulty as string] || 1.0;
    }

    await docRef.update(updates);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('MSAT question update error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let decoded;
  try { decoded = await adminAuth.verifyIdToken(authHeader.slice(7)); } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = params;

  try {
    const docRef = adminDb.collection('msat_question').doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Soal tidak ditemukan' }, { status: 404 });
    }

    await docRef.delete();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('MSAT question delete error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
