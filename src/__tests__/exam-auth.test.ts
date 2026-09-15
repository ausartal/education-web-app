import { describe, it, expect } from 'vitest';
import {
  validateRegistration,
  sanitizeInput,
  generateCertificateNo,
} from '@/lib/exam-validation';
import type { ExamRegistrationData } from '@/types/exam-user';

// ── Helpers ──
const validData: ExamRegistrationData = {
  displayName: 'Ahmad Fauzi',
  email: 'ahmad@example.com',
  password: 'securePass123',
  phoneNumber: '081234567890',
  gender: 'L',
  birthPlace: 'Jakarta',
  birthDate: '2000-05-15',
  identityType: 'NIM',
  identityNumber: '1234567890',
  institution: 'Universitas Indonesia',
  address: 'Jl. Margonda Raya No. 1, Depok',
};

// ══════════════════════════════════════════════════
// validateRegistration
// ══════════════════════════════════════════════════
describe('validateRegistration', () => {
  it('returns no errors for valid data', () => {
    expect(validateRegistration(validData)).toEqual([]);
  });

  // ── displayName ──
  it('rejects empty displayName', () => {
    const errors = validateRegistration({ ...validData, displayName: '' });
    expect(errors).toContainEqual(expect.objectContaining({ field: 'displayName' }));
  });

  it('rejects displayName shorter than 2 chars', () => {
    const errors = validateRegistration({ ...validData, displayName: 'A' });
    expect(errors).toContainEqual(expect.objectContaining({ field: 'displayName' }));
  });

  // ── email ──
  it('rejects invalid email', () => {
    const errors = validateRegistration({ ...validData, email: 'not-an-email' });
    expect(errors).toContainEqual(expect.objectContaining({ field: 'email' }));
  });

  it('rejects empty email', () => {
    const errors = validateRegistration({ ...validData, email: '' });
    expect(errors).toContainEqual(expect.objectContaining({ field: 'email' }));
  });

  // ── password ──
  it('rejects password shorter than 8 chars', () => {
    const errors = validateRegistration({ ...validData, password: 'short' });
    expect(errors).toContainEqual(expect.objectContaining({ field: 'password' }));
  });

  it('rejects empty password', () => {
    const errors = validateRegistration({ ...validData, password: '' });
    expect(errors).toContainEqual(expect.objectContaining({ field: 'password' }));
  });

  // ── phoneNumber ──
  it('rejects empty phoneNumber', () => {
    const errors = validateRegistration({ ...validData, phoneNumber: '' });
    expect(errors).toContainEqual(expect.objectContaining({ field: 'phoneNumber' }));
  });

  it('rejects phoneNumber with letters', () => {
    const errors = validateRegistration({ ...validData, phoneNumber: 'abc123' });
    expect(errors).toContainEqual(expect.objectContaining({ field: 'phoneNumber' }));
  });

  it('accepts phone with +62 prefix', () => {
    const errors = validateRegistration({ ...validData, phoneNumber: '+62 812-3456-7890' });
    expect(errors.filter(e => e.field === 'phoneNumber')).toHaveLength(0);
  });

  // ── gender ──
  it('rejects empty gender', () => {
    const errors = validateRegistration({ ...validData, gender: '' as ExamRegistrationData['gender'] });
    expect(errors).toContainEqual(expect.objectContaining({ field: 'gender' }));
  });

  it('rejects invalid gender', () => {
    const errors = validateRegistration({ ...validData, gender: 'X' as ExamRegistrationData['gender'] });
    expect(errors).toContainEqual(expect.objectContaining({ field: 'gender' }));
  });

  // ── birthPlace ──
  it('rejects empty birthPlace', () => {
    const errors = validateRegistration({ ...validData, birthPlace: '' });
    expect(errors).toContainEqual(expect.objectContaining({ field: 'birthPlace' }));
  });

  // ── birthDate ──
  it('rejects empty birthDate', () => {
    const errors = validateRegistration({ ...validData, birthDate: '' });
    expect(errors).toContainEqual(expect.objectContaining({ field: 'birthDate' }));
  });

  it('rejects malformed birthDate', () => {
    const errors = validateRegistration({ ...validData, birthDate: '15-05-2000' });
    expect(errors).toContainEqual(expect.objectContaining({ field: 'birthDate' }));
  });

  it('rejects future birthDate', () => {
    const errors = validateRegistration({ ...validData, birthDate: '2030-01-01' });
    expect(errors).toContainEqual(expect.objectContaining({ field: 'birthDate' }));
  });

  // ── identityType ──
  it('rejects empty identityType', () => {
    const errors = validateRegistration({ ...validData, identityType: '' as ExamRegistrationData['identityType'] });
    expect(errors).toContainEqual(expect.objectContaining({ field: 'identityType' }));
  });

  // ── identityNumber ──
  it('rejects short identityNumber', () => {
    const errors = validateRegistration({ ...validData, identityNumber: '123' });
    expect(errors).toContainEqual(expect.objectContaining({ field: 'identityNumber' }));
  });

  // ── institution ──
  it('rejects empty institution', () => {
    const errors = validateRegistration({ ...validData, institution: '' });
    expect(errors).toContainEqual(expect.objectContaining({ field: 'institution' }));
  });

  // ── address ──
  it('rejects short address', () => {
    const errors = validateRegistration({ ...validData, address: 'Jl' });
    expect(errors).toContainEqual(expect.objectContaining({ field: 'address' }));
  });

  // ── multiple errors ──
  it('returns multiple errors when several fields are invalid', () => {
    const errors = validateRegistration({});
    expect(errors.length).toBeGreaterThanOrEqual(8);
  });
});

// ══════════════════════════════════════════════════
// sanitizeInput
// ══════════════════════════════════════════════════
describe('sanitizeInput', () => {
  it('trims leading and trailing whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello');
  });

  it('collapses internal whitespace to single space', () => {
    expect(sanitizeInput('hello    world')).toBe('hello world');
  });

  it('handles empty string', () => {
    expect(sanitizeInput('')).toBe('');
  });

  it('handles tabs and newlines', () => {
    expect(sanitizeInput("hello\t\n  world")).toBe('hello world');
  });
});

// ══════════════════════════════════════════════════
// generateCertificateNo
// ══════════════════════════════════════════════════
describe('generateCertificateNo', () => {
  it('generates correct format with default year', () => {
    const year = new Date().getFullYear();
    expect(generateCertificateNo(1)).toBe(`AKR-${year}-00001`);
  });

  it('pads sequence to 5 digits', () => {
    expect(generateCertificateNo(42, 2026)).toBe('AKR-2026-00042');
  });

  it('handles large sequence', () => {
    expect(generateCertificateNo(12345, 2026)).toBe('AKR-2026-12345');
  });

  it('accepts custom year', () => {
    expect(generateCertificateNo(1, 2025)).toBe('AKR-2025-00001');
  });
});