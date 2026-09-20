import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/auth-helpers';
import type { TaxonomyLevel } from '@/types/taxonomy';

export const dynamic = 'force-dynamic';

const levels: TaxonomyLevel[] = [
  'subject', 'curriculum', 'grade', 'unit', 'topic', 'subtopic', 'learning_objective',
];

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const level = searchParams.get('level');
  const parentId = searchParams.get('parentId');
  const includeArchived = searchParams.get('includeArchived') === 'true';

  let query: FirebaseFirestore.Query = adminDb.collection('taxonomy_nodes');
  if (level && levels.includes(level as TaxonomyLevel)) query = query.where('level', '==', level);
  if (parentId) query = query.where('parentId', '==', parentId === 'root' ? null : parentId);
  if (!includeArchived) query = query.where('status', '==', 'active');

  const snapshot = await query.get();
  const nodes = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => {
      const left = a as { order?: number; name?: string };
      const right = b as { order?: number; name?: string };
      return (left.order ?? 0) - (right.order ?? 0) || (left.name ?? '').localeCompare(right.name ?? '', 'id');
    });

  return NextResponse.json({ nodes });
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json() as Record<string, unknown>;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const level = body.level as TaxonomyLevel;
  const parentId = typeof body.parentId === 'string' && body.parentId ? body.parentId : null;

  if (!name || !levels.includes(level)) {
    return NextResponse.json({ error: 'Nama dan level taxonomy wajib diisi.' }, { status: 400 });
  }

  let ancestorIds: string[] = [];
  if (parentId) {
    const parent = await adminDb.collection('taxonomy_nodes').doc(parentId).get();
    if (!parent.exists || parent.data()?.status === 'archived') {
      return NextResponse.json({ error: 'Parent taxonomy tidak valid.' }, { status: 400 });
    }
    ancestorIds = [...(parent.data()?.ancestorIds ?? []), parentId];
  }

  const duplicate = await adminDb.collection('taxonomy_nodes')
    .where('parentId', '==', parentId)
    .where('slug', '==', slugify(name))
    .limit(1)
    .get();
  if (!duplicate.empty) {
    return NextResponse.json({ error: 'Kategori dengan nama tersebut sudah ada pada parent yang sama.' }, { status: 409 });
  }

  const reference = adminDb.collection('taxonomy_nodes').doc();
  const node = {
    name,
    slug: slugify(name),
    level,
    parentId,
    ancestorIds,
    description: typeof body.description === 'string' ? body.description.trim() : '',
    aliases: Array.isArray(body.aliases) ? body.aliases.filter(item => typeof item === 'string') : [],
    order: typeof body.order === 'number' ? body.order : 0,
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await reference.set(node);
  await adminDb.collection('audit_logs').add({
    actorId: admin.uid,
    actorRole: 'admin',
    action: 'create_taxonomy',
    targetId: reference.id,
    targetType: 'taxonomy',
    details: { name, level, parentId },
    timestamp: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ node: { id: reference.id, ...node } }, { status: 201 });
}
