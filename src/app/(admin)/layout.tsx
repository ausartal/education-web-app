'use client';

import { FC, ReactNode } from 'react';
import {
  LayoutDashboard, Users, FileText, Settings,
  GraduationCap, ClipboardList, BarChart3, BookOpen, Terminal, FlaskConical,
} from 'lucide-react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { AuthGuard } from '@/components/guards/AuthGuard';
import { RoleGuard } from '@/components/guards/RoleGuard';

const adminLinks = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/analytics', label: 'Analitik', icon: BarChart3 },
  { href: '/admin/users', label: 'Pengguna', icon: Users },
  { href: '/admin/teachers', label: 'Guru', icon: GraduationCap },
  { href: '/admin/questions', label: 'Bank Soal', icon: BookOpen },
  { href: '/admin/ujian', label: 'MSAT Ujian', icon: FlaskConical },
  { href: '/admin/content', label: 'Konten', icon: FileText },
  { href: '/admin/cli', label: 'CLI Terminal', icon: Terminal },
  { href: '/admin/config', label: 'Pengaturan', icon: Settings },
  { href: '/admin/logs', label: 'Audit Log', icon: ClipboardList },
];

const AdminLayout: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <AuthGuard>
      <RoleGuard allowedRoles={['admin']}>
        <div className="flex h-screen overflow-hidden bg-[#F7F5F2]">
          <AdminSidebar links={adminLinks} />
          <div className="flex flex-1 flex-col overflow-hidden">
            <AdminTopbar />
            <main className="flex-1 overflow-y-auto p-6">{children}</main>
          </div>
        </div>
      </RoleGuard>
    </AuthGuard>
  );
};

export default AdminLayout;
