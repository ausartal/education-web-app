'use client';

import { FC, ReactNode, useEffect, useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';
import { ConfirmProvider } from './ConfirmProvider';

type AdminSection = React.ComponentProps<typeof AdminSidebar>['sections'];

interface AdminShellProps {
  children: ReactNode;
  sections: AdminSection;
}

const SIDEBAR_STORAGE_KEY = 'akurat-admin-sidebar-collapsed';

export const AdminShell: FC<AdminShellProps> = ({ children, sections }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true');
  }, []);

  const toggleSidebar = () => {
    setCollapsed(current => {
      const next = !current;
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  };

  return (
    <ConfirmProvider>
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <AdminSidebar
        sections={sections}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggle={toggleSidebar}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminTopbar onOpenNavigation={() => setMobileOpen(true)} />
        <main id="admin-main-content" className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
    </ConfirmProvider>
  );
};
