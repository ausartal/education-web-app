import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { checkImage } from '@/lib/image-validate';

export const dynamic = 'force-dynamic';

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'user_photos');

/**
 * POST /api/user/photo — server-side profile photo upload for students/teachers/admins.
 * Saves to /var/www/akurat/uploads/user_photos/<uid>.<ext>
 * Returns URL served via GET /api/user/photos/[uid]
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
  } catch {
    return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('photo') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'File foto tidak ditemukan' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Format foto harus JPG atau PNG' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Ukuran foto maksimal 2MB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const image = checkImage(buffer, ['jpeg', 'png'], 'Foto');
    if (image.ok === false) {
      return NextResponse.json({ error: image.error }, { status: 400 });
    }
    const ext = image.extension;
    const fileName = `${decoded.uid}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Delete old photo (any extension) before saving new one
    for (const oldExt of ['jpg', 'png']) {
      const oldPath = path.join(UPLOAD_DIR, `${decoded.uid}.${oldExt}`);
      if (oldPath !== filePath) {
        try { await unlink(oldPath); } catch { /* ignore */ }
      }
    }

    await writeFile(filePath, buffer);

    const photoURL = `/api/user/photos/${decoded.uid}?v=${Date.now()}`;

    return NextResponse.json({ photoURL, contentType: image.mime });
  } catch (err) {
    console.error('User photo upload error:', err);
    return NextResponse.json({ error: 'Gagal mengunggah foto' }, { status: 500 });
  }
}
