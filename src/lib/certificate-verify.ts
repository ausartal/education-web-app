export type VerifyStatus = 'valid' | 'revoked' | 'pending' | 'unknown';

/** Certificate numbers look like AKR-2026-00012; anything else is rejected before a lookup. */
export function isValidCertificateNo(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9_-]{3,40}$/.test(value);
}

/**
 * Public verification shows as little personal data as possible:
 * the first name in full and only the initials of the rest ("Ahmad N.").
 */
export function maskName(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Peserta';
  const [first, ...rest] = parts;
  return [first, ...rest.map((p) => `${p.charAt(0).toUpperCase()}.`)].join(' ');
}

export function verifyStatusOf(status: string | null | undefined): VerifyStatus {
  if (status === 'approved' || status === 'sent') return 'valid';
  if (status === 'revoked') return 'revoked';
  if (status === 'pending_approval') return 'pending';
  return 'unknown';
}

export function clientIpFrom(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get('x-forwarded-for');
  const ip = (forwarded ? forwarded.split(',')[0] : headers.get('x-real-ip') ?? '').trim();
  return /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : 'unknown';
}
