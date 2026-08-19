'use client';

import { FC, ReactNode } from 'react';
import { AuthGuard } from '@/components/guards/AuthGuard';

const KPSLayout: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#f8f8fc]">{children}</div>
    </AuthGuard>
  );
};

export default KPSLayout;
