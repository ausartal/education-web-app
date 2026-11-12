import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { verifyTeacher } from '@/lib/auth-helpers';
import { checkImage } from '@/lib/image-validate';

export const dynamic = 'force-dynamic';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'content');

/**
 * POST /api/upload/image — image upload for the content editor (teachers and admins).
 * Accepts JPG, PNG, GIF and WebP judged by their real content. SVG is refused
 * because it can carry scripts and would be served from the app's own origin.
 * Returns a URL served via /api/files/content/<filename>.
 */
export async function POST(req: NextRequest) {
  const staff = await verifyTeacher(req);
  if (!staff) {
    return NextResponse.json({ error: 'Hanya guru dan admin yang dapat mengunggah gambar' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'File gambar tidak ditemukan' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Ukuran gambar maksimal 5MB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const image = checkImage(buffer, ['jpeg', 'png', 'gif', 'webp'], 'Gambar');
    if (image.ok === false) {
      return NextResponse.json({ error: image.error }, { status: 400 });
    }

    const fileName = `${Date.now()}-${randomBytes(6).toString('hex')}.${image.extension}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    await writeFile(filePath, buffer);

    const url = `/api/files/content/${fileName}`;
    return NextResponse.json({ url, fileName, contentType: image.mime });
  } catch (err) {
    console.error('Image upload error:', err);
    return NextResponse.json({ error: 'Gagal mengunggah gambar' }, { status: 500 });
  }
}
