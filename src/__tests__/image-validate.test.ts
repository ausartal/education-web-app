import { describe, expect, it } from 'vitest';
import { checkImage, detectImageKind, extensionFor } from '@/lib/image-validate';

const bytes = (...values: number[]) => new Uint8Array(values);
const text = (value: string) => new TextEncoder().encode(value);

const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00);
const GIF = text('GIF89a....');
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]);

describe('detectImageKind', () => {
  it('recognises the supported formats by their signature', () => {
    expect(detectImageKind(JPEG)).toBe('jpeg');
    expect(detectImageKind(PNG)).toBe('png');
    expect(detectImageKind(GIF)).toBe('gif');
    expect(detectImageKind(WEBP)).toBe('webp');
  });

  it('refuses SVG and other text that merely claims to be an image', () => {
    expect(detectImageKind(text('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))).toBeNull();
    expect(detectImageKind(text('<html><script>alert(1)</script></html>'))).toBeNull();
    expect(detectImageKind(text('<?xml version="1.0"?><svg/>'))).toBeNull();
  });

  it('does not mistake a RIFF file that is not WebP', () => {
    const wav = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45]);
    expect(detectImageKind(wav)).toBeNull();
  });

  it('copes with empty and very short input', () => {
    expect(detectImageKind(new Uint8Array())).toBeNull();
    expect(detectImageKind(bytes(0xff, 0xd8))).toBeNull();
  });
});

describe('checkImage', () => {
  it('accepts an allowed format and reports its real type', () => {
    expect(checkImage(PNG, ['jpeg', 'png'], 'Foto')).toEqual({ ok: true, kind: 'png', extension: 'png', mime: 'image/png' });
  });

  it('rejects a real image whose format is not allowed here', () => {
    const result = checkImage(GIF, ['jpeg', 'png'], 'Foto');
    expect(result).toMatchObject({ ok: false });
    expect(result.ok === false && result.error).toContain('JPG, PNG');
  });

  it('rejects scripts renamed as images', () => {
    expect(checkImage(text('<svg onload="x()"/>'), ['jpeg', 'png', 'gif', 'webp'], 'Gambar')).toMatchObject({ ok: false });
  });

  it('maps kinds to file extensions', () => {
    expect(extensionFor('jpeg')).toBe('jpg');
  });
});
