import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'user_photos');

/**
 * GET /api/user/photos/[uid] — serve user profile photo from local storage.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { uid: string } }
) {
  const uid = params.uid;

  if (!/^[a-zA-Z0-9_-]+$/.test(uid)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  // Try both extensions
  const extensions = ['jpg', 'png'];
  for (const ext of extensions) {
    const filePath = path.join(UPLOAD_DIR, `${uid}.${ext}`);
    try {
      const buffer = await readFile(filePath);
      const fileStat = await stat(filePath);
      const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': contentType,
          'Content-Length': fileStat.size.toString(),
          'Cache-Control': 'no-cache, must-revalidate',
        },
      });
    } catch {
      // Try next extension
    }
  }

  return NextResponse.json({ error: 'Foto tidak ditemukan' }, { status: 404 });
}
