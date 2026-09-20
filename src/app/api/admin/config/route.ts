import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

const CONFIG_COLLECTION = 'app_config';
const CONFIG_DOC = 'platform';

const defaultConfig = {
  platformName: 'AKURAT',
  platformTagline: 'Platform Pembelajaran & Asesmen',
  timezone: 'Asia/Jakarta',
  language: 'id',
  maintenanceMode: false,
  registrationOpen: true,
  maxExamAttempts: 3,
  sessionTimeoutMinutes: 60,
  emailNotifications: true,
  certificateAutoGenerate: true,
};

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const doc = await adminDb.collection(CONFIG_COLLECTION).doc(CONFIG_DOC).get();
    const config = doc.exists ? { ...defaultConfig, ...doc.data() } : defaultConfig;
    return NextResponse.json({ config });
  } catch (err) {
    console.error('[admin/config GET]', err);
    return NextResponse.json(
      { error: 'Internal server error', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const allowed = Object.keys(defaultConfig);
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    if (typeof updates.platformName === 'string') updates.platformName = updates.platformName.trim().slice(0, 60);
    if (typeof updates.platformTagline === 'string') updates.platformTagline = updates.platformTagline.trim().slice(0, 120);
    if (updates.platformName === '') return NextResponse.json({ error: 'Nama platform wajib diisi.' }, { status: 400 });
    if (updates.language !== undefined && !['id', 'en'].includes(String(updates.language))) return NextResponse.json({ error: 'Bahasa tidak valid.' }, { status: 400 });
    if (updates.timezone !== undefined && !['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'].includes(String(updates.timezone))) return NextResponse.json({ error: 'Zona waktu tidak valid.' }, { status: 400 });
    for (const key of ['maintenanceMode', 'registrationOpen', 'emailNotifications', 'certificateAutoGenerate']) {
      if (updates[key] !== undefined && typeof updates[key] !== 'boolean') return NextResponse.json({ error: `${key} harus berupa boolean.` }, { status: 400 });
    }
    if (updates.maxExamAttempts !== undefined) {
      const value = Number(updates.maxExamAttempts);
      if (!Number.isInteger(value) || value < 1 || value > 20) return NextResponse.json({ error: 'Maksimum percobaan harus 1-20.' }, { status: 400 });
      updates.maxExamAttempts = value;
    }
    if (updates.sessionTimeoutMinutes !== undefined) {
      const value = Number(updates.sessionTimeoutMinutes);
      if (!Number.isInteger(value) || value < 5 || value > 1440) return NextResponse.json({ error: 'Batas waktu sesi harus 5-1440 menit.' }, { status: 400 });
      updates.sessionTimeoutMinutes = value;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    await adminDb.collection(CONFIG_COLLECTION).doc(CONFIG_DOC).set(updates, { merge: true });

    // Audit log
    await adminDb.collection('audit_logs').add({
      actorId: admin.uid,
      actorRole: 'admin',
      action: 'update_config',
      targetId: CONFIG_DOC,
      targetType: 'config',
      details: updates,
      timestamp: new Date(),
    });

    // Return merged config
    const doc = await adminDb.collection(CONFIG_COLLECTION).doc(CONFIG_DOC).get();
    const config = doc.exists ? { ...defaultConfig, ...doc.data() } : defaultConfig;

    return NextResponse.json({ config });
  } catch (err) {
    console.error('[admin/config PATCH]', err);
    return NextResponse.json(
      { error: 'Internal server error', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
