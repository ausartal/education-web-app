import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyTeacher } from '@/lib/auth-helpers';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

function tsToIso(ts: unknown): string | null {
  if (!ts) return null;
  if (typeof ts === 'object' && ts !== null) {
    const t = ts as Record<string, unknown>;
    const secs = (t['_seconds'] ?? t['seconds']) as number | undefined;
    if (typeof secs === 'number') return new Date(secs * 1000).toISOString();
    if (ts instanceof Date) return ts.toISOString();
  }
  if (typeof ts === 'string') return ts;
  return null;
}

// GET /api/teacher/materials — fetch all materials with creator info
export async function GET(req: NextRequest) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const snap = await adminDb.collection('materials').orderBy('createdAt', 'desc').get();

    // Collect unique creator UIDs to batch-fetch names
    const creatorIds = new Set<string>();
    snap.docs.forEach(d => {
      const uid = d.data().createdByUid as string | undefined;
      if (uid) creatorIds.add(uid);
    });
    const creatorMap: Record<string, string> = {};
    await Promise.all(
      Array.from(creatorIds).map(async uid => {
        const u = await adminDb.collection('users').doc(uid).get();
        creatorMap[uid] = (u.data()?.displayName as string) ?? uid.slice(0, 8);
      }),
    );

    const materials = snap.docs.map(d => {
      const data = d.data();
      const uid = (data.createdByUid as string) ?? '';
      return {
        id: d.id,
        title: (data.title as string) ?? '',
        description: (data.description as string) ?? '',
        topic: (data.topic as string) ?? '',
        subtopic: (data.subtopic as string) ?? '',
        order: (data.order as number) ?? 0,
        content: (data.content as string) ?? '',
        estimatedTime: (data.estimatedTime as number) ?? 0,
        prerequisites: (data.prerequisites as string[]) ?? [],
        learningObjectives: (data.learningObjectives as string[]) ?? [],
        status: (data.status as string) ?? 'draft',
        createdByUid: uid,
        createdByName: (data.createdByName as string) ?? creatorMap[uid] ?? 'Unknown',
        createdByRole: (data.createdByRole as string) ?? 'teacher',
        createdAt: tsToIso(data.createdAt),
        updatedAt: tsToIso(data.updatedAt),
        editLog: ((data.editLog as unknown[]) ?? []).map((e: unknown) => {
          const entry = e as Record<string, unknown>;
          return {
            editedByUid: (entry.editedByUid as string) ?? '',
            editedByName: (entry.editedByName as string) ?? '',
            editedAt: (entry.editedAt as string) ?? '',
            note: (entry.note as string) ?? '',
          };
        }),
      };
    });

    return NextResponse.json({ materials });
  } catch (err) {
    console.error('[teacher/materials GET]', err);
    return NextResponse.json(
      { error: 'Internal server error', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

// POST /api/teacher/materials — create new material
export async function POST(req: NextRequest) {
  const teacher = await verifyTeacher(req);
  if (!teacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const { title, description, topic, subtopic, content, estimatedTime, learningObjectives, prerequisites, order } =
      body as Record<string, unknown>;

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'title wajib diisi' }, { status: 400 });
    }

    const docRef = await adminDb.collection('materials').add({
      title,
      description: description ?? '',
      topic: topic ?? 'stoikiometri',
      subtopic: subtopic ?? '',
      content: content ?? '',
      estimatedTime: estimatedTime ?? 15,
      learningObjectives: learningObjectives ?? [],
      prerequisites: prerequisites ?? [],
      order: order ?? 0,
      status: 'draft',
      createdByUid: teacher.uid,
      createdByName: teacher.displayName,
      createdByRole: teacher.role,
      editLog: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (err) {
    console.error('[teacher/materials POST]', err);
    return NextResponse.json(
      { error: 'Gagal membuat materi', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
