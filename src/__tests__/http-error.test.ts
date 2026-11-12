import { describe, expect, it } from 'vitest';
import { describeHttpError, readHttpError } from '@/lib/http-error';

describe('describeHttpError', () => {
  it('prefers the message the server wrote', () => {
    expect(describeHttpError(409, 'Hanya sertifikat yang menunggu persetujuan yang dapat disetujui.'))
      .toBe('Hanya sertifikat yang menunggu persetujuan yang dapat disetujui.');
  });

  it('falls back to a plain explanation by status', () => {
    expect(describeHttpError(403)).toContain('izin');
    expect(describeHttpError(404)).toContain('tidak ditemukan');
    expect(describeHttpError(429)).toContain('Terlalu banyak');
    expect(describeHttpError(503)).toContain('server');
    expect(describeHttpError(418)).toBe('Tindakan gagal. Coba lagi.');
  });

  it('ignores empty, non-string and oversized server messages', () => {
    expect(describeHttpError(404, '   ')).toContain('tidak ditemukan');
    expect(describeHttpError(404, { error: 'x' })).toContain('tidak ditemukan');
    expect(describeHttpError(500, 'x'.repeat(301))).toContain('server');
  });
});

describe('readHttpError', () => {
  it('reads the error field of a JSON body', async () => {
    const res = { status: 409, json: async () => ({ error: 'Sudah dicabut' }) };
    expect(await readHttpError(res)).toBe('Sudah dicabut');
  });

  it('survives a body that is not JSON', async () => {
    const res = { status: 500, json: async () => { throw new Error('bad json'); } };
    expect(await readHttpError(res)).toContain('server');
  });

  it('survives a JSON body without an error field', async () => {
    expect(await readHttpError({ status: 403, json: async () => ({ ok: false }) })).toContain('izin');
    expect(await readHttpError({ status: 403, json: async () => null })).toContain('izin');
  });
});
