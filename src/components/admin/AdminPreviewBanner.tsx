'use client';

import { FC } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export const AdminPreviewBanner: FC = () => {
  const { profile } = useAuth();
  const router = useRouter();

  if (profile?.role !== 'admin') return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-2xl bg-gray-900/95 px-4 py-2.5 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Eye size={13} className="text-violet-400" />
          <span>Mode Preview Admin</span>
        </div>
        <div className="h-3.5 w-px bg-gray-700" />
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-500">
          <ArrowLeft size={12} /> Kembali ke Admin
        </button>
      </div>
    </div>
  );
};
