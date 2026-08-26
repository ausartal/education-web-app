import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/auth-helpers';
import type { MASTCognitiveDomain, MASTStageDifficulty } from '@/types/mast';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const doc = await adminDb.collection('mast_questions').doc(params.id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Soal tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error('[mast-questions/:id GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const allowedFields = [
      'stem', 'options', 'correctAnswer', 'explanation',
      'cognitiveDomain', 'stageDifficulty', 'topic', 'subtopic', 'status',
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) updates[key] = body[key];
    }

    if (updates.cognitiveDomain) {
      const valid: MASTCognitiveDomain[] = ['knowing', 'applying', 'reasoning'];
      if (!valid.includes(updates.cognitiveDomain as MASTCognitiveDomain)) {
        return NextResponse.json({ error: 'cognitiveDomain tidak valid' }, { status: 400 });
      }
    }
    if (updates.stageDifficulty) {
      const valid: MASTStageDifficulty[] = ['low', 'medium', 'high'];
      if (!valid.includes(updates.stageDifficulty as MASTStageDifficulty)) {
        return NextResponse.json({ error: 'stageDifficulty tidak valid' }, { status: 400 });
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Tidak ada field yang diupdate' }, { status: 400 });
    }

    await adminDb.collection('mast_questions').doc(params.id).update(updates);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[mast-questions/:id PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    await adminDb.collection('mast_questions').doc(params.id).delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[mast-questions/:id DELETE]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
