'use client';

import { FC, ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types/firestore';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: UserRole[];
}

function homeFor(role?: UserRole): string {
  if (role === 'admin') return '/admin';
  if (role === 'teacher') return '/teacher';
  return '/dashboard';
}

const Spinner: FC = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

export const RoleGuard: FC<RoleGuardProps> = ({ children, allowedRoles }) => {
  const { user, profile, loading, profileStatus, refreshProfile } = useAuth();
  const router = useRouter();

  const pending = loading || profileStatus === 'loading';
  // A student profile written by the data API has no role field yet.
  const role = (profile?.role ?? (profile ? 'student' : undefined)) as UserRole | undefined;
  const allowed = !!role && allowedRoles.includes(role);
  const denied = !pending && profileStatus !== 'error' && !!user && !allowed;

  useEffect(() => {
    if (denied) router.replace(homeFor(role));
  }, [denied, role, router]);

  if (pending) return <Spinner />;

  // A failed profile fetch must not look like "not allowed".
  if (profileStatus === 'error' && !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-gray-100">
          <h1 className="font-display text-lg font-extrabold text-gray-900">Profil belum bisa dimuat</h1>
          <p className="mt-2 text-sm text-gray-500">Server data sedang tidak bisa dihubungi. Periksa koneksimu atau coba lagi sebentar lagi.</p>
          <button onClick={() => refreshProfile()} className="mt-5 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white">
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  if (!allowed) return null;
  return <>{children}</>;
};
