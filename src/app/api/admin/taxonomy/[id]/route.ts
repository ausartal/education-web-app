import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const reference = adminDb.collection('taxonomy_nodes').doc(params.id);
  const current = await reference.get();
  if (!current.exists) return NextResponse.json({ error: 'Taxonomy tidak ditemukan.' }, { status: 404 });

  const body = await req.json() as Record<string, unknown>;
  const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };

  if (typeof body.name === 'string' && body.name.trim()) {
    update.name = body.name.trim();
    update.slug = slugify(body.name);
  }
  if (typeof body.description === 'string') update.description = body.description.trim();
  if (typeof body.order === 'number') update.order = body.order;
  if (Array.isArray(body.aliases)) update.aliases = body.aliases.filter(item => typeof item === 'string');
  if (body.status === 'active' || body.status === 'archived') update.status = body.status;

  if (body.parentId !== undefined) {
    const parentId = typeof body.parentId === 'string' && body.parentId ? body.parentId : null;
    if (parentId === params.id) return NextResponse.json({ error: 'Kategori tidak dapat menjadi parent dirinya sendiri.' }, { status: 400 });
    let ancestorIds: string[] = [];
    if (parentId) {
      const parent = await adminDb.collection('taxonomy_nodes').doc(parentId).get();
      if (!parent.exists || (parent.data()?.ancestorIds ?? []).includes(params.id)) {
        return NextResponse.json({ error: 'Pemindahan akan membuat struktur kategori berputar.' }, { status: 400 });
      }
      ancestorIds = [...(parent.data()?.ancestorIds ?? []), parentId];
    }
    update.parentId = parentId;
    update.ancestorIds = ancestorIds;
  }

  await reference.update(update);
  await adminDb.collection('audit_logs').add({
    actorId: admin.uid,
    actorRole: 'admin',
    action: body.status === 'archived' ? 'archive_taxonomy' : 'update_taxonomy',
    targetId: params.id,
    targetType: 'taxonomy',
    details: { changedFields: Object.keys(update).filter(key => key !== 'updatedAt') },
    timestamp: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ success: true });
}
