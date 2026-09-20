import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  getUser: vi.fn(),
  setCustomUserClaims: vi.fn(),
  userGet: vi.fn(),
  userSet: vi.fn(),
  userUpdate: vi.fn(),
  duplicateGet: vi.fn(),
  auditAdd: vi.fn(),
}));

vi.mock('@/lib/firebase-admin', () => ({
  adminAuth: {
    verifyIdToken: mocks.verifyIdToken,
    getUser: mocks.getUser,
    setCustomUserClaims: mocks.setCustomUserClaims,
  },
  adminDb: {
    collection: (name: string) => {
      if (name === 'audit_logs') return { add: mocks.auditAdd };
      return {
        doc: () => ({
          get: mocks.userGet,
          set: mocks.userSet,
          update: mocks.userUpdate,
        }),
        where: () => ({ limit: () => ({ get: mocks.duplicateGet }) }),
      };
    },
  },
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
}));

import { POST } from '@/app/api/exam/auth/google/route';

function request(token = 'google-token') {
  return new NextRequest('http://localhost/api/exam/auth/google', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

describe('POST /api/exam/auth/google', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyIdToken.mockResolvedValue({
      uid: 'google-user',
      email: 'Peserta@Example.com',
      name: 'Peserta Baru',
      picture: 'https://example.com/avatar.jpg',
      firebase: { sign_in_provider: 'google.com' },
    });
    mocks.setCustomUserClaims.mockResolvedValue(undefined);
  });

  it('updates the last login for an existing active Exam user', async () => {
    mocks.userGet.mockResolvedValue({ exists: true, data: () => ({ isActive: true }) });
    mocks.userUpdate.mockResolvedValue(undefined);

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      needsProfileCompletion: false,
    });
    expect(mocks.userUpdate).toHaveBeenCalledWith({ lastLoginAt: 'SERVER_TIMESTAMP' });
    expect(mocks.setCustomUserClaims).toHaveBeenCalledWith('google-user', { role: 'exam_user' });
  });

  it('creates an unverified Exam profile for a first-time Google user', async () => {
    mocks.userGet.mockResolvedValue({ exists: false });
    mocks.getUser.mockResolvedValue({ email: 'Peserta@Example.com' });
    mocks.duplicateGet.mockResolvedValue({ empty: true });
    mocks.userSet.mockResolvedValue(undefined);
    mocks.auditAdd.mockResolvedValue({ id: 'audit-1' });

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      needsProfileCompletion: true,
    });
    expect(mocks.userSet).toHaveBeenCalledWith(expect.objectContaining({
      uid: 'google-user',
      email: 'peserta@example.com',
      displayName: 'Peserta Baru',
      verificationStatus: 'unverified',
      authProvider: 'google',
      isActive: true,
    }));
  });

  it('rejects a disabled Exam account', async () => {
    mocks.userGet.mockResolvedValue({ exists: true, data: () => ({ isActive: false }) });

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(mocks.setCustomUserClaims).not.toHaveBeenCalled();
  });
});
