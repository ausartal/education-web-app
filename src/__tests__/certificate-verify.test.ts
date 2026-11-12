import { describe, expect, it } from 'vitest';
import { clientIpFrom, isValidCertificateNo, maskName, verifyStatusOf } from '@/lib/certificate-verify';

describe('maskName', () => {
  it('keeps the first name and reduces the rest to initials', () => {
    expect(maskName('Ahmad Nabal Falah')).toBe('Ahmad N. F.');
    expect(maskName('  siti   aminah ')).toBe('siti A.');
  });

  it('handles single names and empty input', () => {
    expect(maskName('Budi')).toBe('Budi');
    expect(maskName('')).toBe('Peserta');
    expect(maskName(undefined)).toBe('Peserta');
  });
});

describe('verifyStatusOf', () => {
  it('only approved and sent certificates are valid', () => {
    expect(verifyStatusOf('approved')).toBe('valid');
    expect(verifyStatusOf('sent')).toBe('valid');
    expect(verifyStatusOf('revoked')).toBe('revoked');
    expect(verifyStatusOf('pending_approval')).toBe('pending');
    expect(verifyStatusOf('draft')).toBe('unknown');
    expect(verifyStatusOf(undefined)).toBe('unknown');
  });
});

describe('isValidCertificateNo', () => {
  it('accepts normal numbers and rejects odd input', () => {
    expect(isValidCertificateNo('AKR-2026-00012')).toBe(true);
    expect(isValidCertificateNo('ab')).toBe(false);
    expect(isValidCertificateNo('../etc/passwd')).toBe(false);
    expect(isValidCertificateNo('A B C D')).toBe(false);
    expect(isValidCertificateNo('x'.repeat(60))).toBe(false);
  });
});

describe('clientIpFrom', () => {
  const headers = (map: Record<string, string>) => ({ get: (name: string) => map[name] ?? null });

  it('uses the first forwarded address', () => {
    expect(clientIpFrom(headers({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' }))).toBe('203.0.113.9');
  });

  it('falls back to x-real-ip and then to unknown', () => {
    expect(clientIpFrom(headers({ 'x-real-ip': '198.51.100.4' }))).toBe('198.51.100.4');
    expect(clientIpFrom(headers({}))).toBe('unknown');
  });

  it('refuses values that are not an address', () => {
    expect(clientIpFrom(headers({ 'x-forwarded-for': '1.2.3.4<script>' }))).toBe('unknown');
  });
});
