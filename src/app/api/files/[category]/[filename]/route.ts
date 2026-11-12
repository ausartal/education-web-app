import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const BASE_DIR = path.join(process.cwd(), 'uploads');

// Identity and profile photos have their own routes; only editor content is public here.
const PUBLIC_CATEGORIES = new Set(['content']);

const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

/**
 * GET /api/files/[category]/[filename] — serve uploaded files.
 * URL pattern: /api/files/content/<filename> or /api/files/exam_photos/<filename>
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { category: string; filename: string } }
) {
  const { category, filename } = params;

  if (!PUBLIC_CATEGORIES.has(category)) {
    return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 });
  }

  // Validate path segments (prevent path traversal)
  if (!/^[a-zA-Z0-9_-]+$/.test(category) || !/^[a-zA-Z0-9_.-]+$/.test(filename)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';

  const filePath = path.join(BASE_DIR, category, filename);
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 });
  }

  try {
    const buffer = await readFile(filePath);
    const fileStat = await stat(filePath);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileStat.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        // Older uploads may include SVG. The sandbox stops any script in them
        // from running if someone opens the file URL directly.
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Gagal membaca file' }, { status: 500 });
  }
}
