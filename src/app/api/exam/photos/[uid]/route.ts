import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'exam_photos');

/**
 * GET /api/exam/photos/[uid] — serve exam profile photo from local storage.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { uid: string } }
) {
  const uid = params.uid;

  // Validate UID format (prevent path traversal)
  if (!/^[a-zA-Z0-9_-]+$/.test(uid)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  // Try both extensions
  const extensions = ['jpg', 'png'];
  for (const ext of extensions) {
    const filePath = path.join(UPLOAD_DIR, `${uid}.${ext}`);
    if (existsSync(filePath)) {
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
        break;
      }
    }
  }

  return NextResponse.json({ error: 'Foto tidak ditemukan' }, { status: 404 });
}
