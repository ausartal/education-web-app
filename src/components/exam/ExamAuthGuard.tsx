'use client';

import { FC, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useExamAuth } from '@/context/ExamAuthContext';

interface ExamAuthGuardProps {
  children: ReactNode;
}

/**
 * Guard component for exam pages.
 * Only requires login — verification is not enforced as a hard block.
 * Dashboard shows an info banner if not verified.
 */
export const ExamAuthGuard: FC<ExamAuthGuardProps> = ({ children }) => {
  const { user, loading } = useExamAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#6320EE] border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    router.push('/exam/login');
    return null;
  }

  return <>{children}</>;
};