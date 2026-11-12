export type ImageKind = 'jpeg' | 'png' | 'gif' | 'webp';

export const IMAGE_MIME: Record<ImageKind, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};

const EXTENSION: Record<ImageKind, string> = { jpeg: 'jpg', png: 'png', gif: 'gif', webp: 'webp' };

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((value, i) => bytes[offset + i] === value);
}

/**
 * Identifies an image from its first bytes. The type sent by the browser is
 * only a claim, so uploads are accepted by what the file really is.
 * SVG is deliberately not recognised: it can carry scripts.
 */
export function detectImageKind(bytes: Uint8Array): ImageKind | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) || startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])) return 'gif';
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return 'webp';
  return null;
}

export function extensionFor(kind: ImageKind): string {
  return EXTENSION[kind];
}

export type ImageCheck =
  | { ok: true; kind: ImageKind; extension: string; mime: string }
  | { ok: false; error: string };

/** Checks real content against the formats an endpoint allows. */
export function checkImage(bytes: Uint8Array, allowed: ImageKind[], label: string): ImageCheck {
  const kind = detectImageKind(bytes);
  if (!kind || !allowed.includes(kind)) {
    return { ok: false, error: `${label} tidak valid. Gunakan file ${allowed.map((k) => EXTENSION[k].toUpperCase()).join(', ')} yang asli.` };
  }
  return { ok: true, kind, extension: EXTENSION[kind], mime: IMAGE_MIME[kind] };
}
