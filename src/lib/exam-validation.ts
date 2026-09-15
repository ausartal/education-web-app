import type { ExamRegistrationData, ExamUserGender, ExamUserIdentityType } from '@/types/exam-user';

// ===== Registration Validation =====

export interface ValidationError {
  field: string;
  message: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s-]{8,20}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const VALID_GENDER: ExamUserGender[] = ['L', 'P'];
const VALID_IDENTITY: ExamUserIdentityType[] = ['NIM', 'NIK', 'NISN', 'Lainnya'];

/**
 * Validate registration data. Returns an array of errors (empty = valid).
 * Pure function — no side effects, no Firebase dependency.
 */
export function validateRegistration(data: Partial<ExamRegistrationData>): ValidationError[] {
  const errors: ValidationError[] = [];

  // Step 1: Akun
  if (!data.displayName || data.displayName.trim().length < 2) {
    errors.push({ field: 'displayName', message: 'Nama lengkap minimal 2 karakter.' });
  }
  if (!data.email || !EMAIL_RE.test(data.email)) {
    errors.push({ field: 'email', message: 'Format email tidak valid.' });
  }
  if (!data.password || data.password.length < 8) {
    errors.push({ field: 'password', message: 'Kata sandi minimal 8 karakter.' });
  }

  // Step 2: Identitas
  if (!data.phoneNumber || !PHONE_RE.test(data.phoneNumber)) {
    errors.push({ field: 'phoneNumber', message: 'Nomor HP tidak valid.' });
  }
  if (!data.gender || !VALID_GENDER.includes(data.gender)) {
    errors.push({ field: 'gender', message: 'Jenis kelamin wajib dipilih.' });
  }
  if (!data.birthPlace || data.birthPlace.trim().length < 2) {
    errors.push({ field: 'birthPlace', message: 'Tempat lahir wajib diisi.' });
  }
  if (!data.birthDate || !DATE_RE.test(data.birthDate)) {
    errors.push({ field: 'birthDate', message: 'Tanggal lahir wajib diisi (YYYY-MM-DD).' });
  } else {
    const d = new Date(data.birthDate);
    if (isNaN(d.getTime()) || d > new Date()) {
      errors.push({ field: 'birthDate', message: 'Tanggal lahir tidak valid.' });
    }
  }

  // Step 3: Institusi
  if (!data.identityType || !VALID_IDENTITY.includes(data.identityType)) {
    errors.push({ field: 'identityType', message: 'Tipe identitas wajib dipilih.' });
  }
  if (!data.identityNumber || data.identityNumber.trim().length < 4) {
    errors.push({ field: 'identityNumber', message: 'Nomor identitas minimal 4 karakter.' });
  }
  if (!data.institution || data.institution.trim().length < 2) {
    errors.push({ field: 'institution', message: 'Institusi wajib diisi.' });
  }
  if (!data.address || data.address.trim().length < 5) {
    errors.push({ field: 'address', message: 'Alamat wajib diisi (minimal 5 karakter).' });
  }

  return errors;
}

/**
 * Sanitize string input: trim and collapse whitespace.
 */
export function sanitizeInput(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * Generate a unique certificate number.
 * Format: AKR-YYYY-NNNNN
 */
export function generateCertificateNo(sequence: number, year?: number): string {
  const y = year ?? new Date().getFullYear();
  return `AKR-${y}-${String(sequence).padStart(5, '0')}`;
}