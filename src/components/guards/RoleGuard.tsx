'use client';

import { FC, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types/user';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: UserRole[];
}

export const RoleGuard: FC<RoleGuardProps> = ({ children, allowedRoles }) => {
  const { profile, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile || !allowedRoles.includes(profile.role)) {
    router.push('/');
    return null;
  }

  return <>{children}</>;
};
