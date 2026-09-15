'use client';

import { FC, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useExamAuth } from '@/context/ExamAuthContext';

interface ExamAuthGuardProps {
  children: ReactNode;
  requireVerification?: boolean;
}

/**
 * Guard component for exam pages.
 * - requireVerification=false: only requires login (for dashboard, profile)
 * - requireVerification=true: requires verified profile (for taking exams)
 */
export const ExamAuthGuard: FC<ExamAuthGuardProps> = ({
  children,
  requireVerification = false,
}) => {
  const { user, examUser, loading } = useExamAuth();
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

  if (requireVerification && examUser && examUser.verificationStatus !== 'verified') {
    router.push('/exam/profile');
    return null;
  }

  return <>{children}</>;
};