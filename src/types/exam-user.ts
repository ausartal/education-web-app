import { Timestamp } from 'firebase/firestore';

// ===== EXAM USER (separate from AKURAT users) =====
export type ExamUserVerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';
export type ExamUserGender = 'L' | 'P';
export type ExamUserIdentityType = 'NIM' | 'NIK' | 'NISN' | 'Lainnya';

export interface ExamUser {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber: string;
  gender: ExamUserGender | '';
  photoURL: string | null;

  // Identitas resmi
  identityNumber: string;
  identityType: ExamUserIdentityType | '';
  institution: string;
  birthDate: string;       // YYYY-MM-DD
  birthPlace: string;
  address: string;

  // Verifikasi
  verificationStatus: ExamUserVerificationStatus;
  verificationNotes: string;
  verifiedAt: Timestamp | null;

  // Token
  tokenBalance: number;

  // Metadata
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  isActive: boolean;
}

/** Subset returned to client — excludes sensitive fields. */
export type ExamUserPublic = Omit<ExamUser, 'verificationNotes'>;

/** Fields editable by the exam user themselves (not admin-only). */
export type ExamUserEditableFields = Pick<
  ExamUser,
  | 'displayName'
  | 'phoneNumber'
  | 'gender'
  | 'photoURL'
  | 'identityNumber'
  | 'identityType'
  | 'institution'
  | 'birthDate'
  | 'birthPlace'
  | 'address'
>;

/** Fields set only by admin. */
export type ExamUserAdminFields = Pick<
  ExamUser,
  'verificationStatus' | 'verificationNotes' | 'verifiedAt' | 'tokenBalance' | 'isActive'
>;

// ===== EXAM TOKEN =====
export type ExamTokenStatus = 'active' | 'used' | 'expired';

export interface ExamToken {
  id: string;
  userId: string;
  status: ExamTokenStatus;
  purchasedAt: Timestamp;
  usedAt: Timestamp | null;
  examSessionId: string | null;
  amount: number;
  paymentMethod: string | null;
  paymentRef: string | null;
}

// ===== EXAM CERTIFICATE =====
export interface ExamCertificate {
  id: string;
  userId: string;
  sessionId: string;
  examTitle: string;
  score: number;
  predikat: string;
  issuedAt: Timestamp;
  certificateNo: string;  // "AKR-2026-00142"
  pdfUrl: string | null;
}

// ===== REGISTRATION DATA =====
export interface ExamRegistrationData {
  // Step 1: Akun
  displayName: string;
  email: string;
  password: string;

  // Step 2: Identitas
  phoneNumber: string;
  gender: ExamUserGender;
  birthPlace: string;
  birthDate: string;

  // Step 3: Institusi
  identityType: ExamUserIdentityType;
  identityNumber: string;
  institution: string;
  address: string;
}

// ===== TOKEN PACKAGE =====
export interface TokenPackage {
  id: string;
  quantity: number;
  price: number;
  label: string;
  discount?: string;  // e.g. "Hemat 20%"
}