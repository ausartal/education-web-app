'use client';

import { FC, ReactNode } from 'react';
import {
  LayoutDashboard, Users, FileText, Settings,
  GraduationCap, ClipboardList, BarChart3, BookOpen, Terminal,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { AuthGuard } from '@/components/guards/AuthGuard';
import { RoleGuard } from '@/components/guards/RoleGuard';

const adminLinks = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/analytics', label: 'Analitik', icon: BarChart3 },
  { href: '/admin/users', label: 'Pengguna', icon: Users },
  { href: '/admin/teachers', label: 'Guru', icon: GraduationCap },
  { href: '/admin/questions', label: 'Bank Soal', icon: BookOpen },
  { href: '/admin/content', label: 'Konten', icon: FileText },
  { href: '/admin/cli', label: 'CLI Terminal', icon: Terminal },
  { href: '/admin/config', label: 'Pengaturan', icon: Settings },
  { href: '/admin/logs', label: 'Audit Log', icon: ClipboardList },
];

interface AdminLayoutProps { children: ReactNode; }

const AdminLayout: FC<AdminLayoutProps> = ({ children }) => {
  return (
    <AuthGuard>
      <RoleGuard allowedRoles={['admin']}>
        <Navbar />
        <div className="flex min-h-[calc(100vh-4rem)]">
          <Sidebar links={adminLinks} title="Admin Panel" />
          <main className="flex-1 overflow-x-hidden p-6">{children}</main>
        </div>
      </RoleGuard>
    </AuthGuard>
  );
};

export default AdminLayout;
