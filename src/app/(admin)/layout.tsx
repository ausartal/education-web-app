'use client';

import { FC, ReactNode } from 'react';
import {
  LayoutDashboard, BarChart3, Users, School,
  BookOpen, CalendarCheck, Brain, Monitor,
  FileCheck, Award, Lock, Terminal, Settings,
  FileText, UserCog,
  Tags,
} from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { AuthGuard } from '@/components/guards/AuthGuard';
import { RoleGuard } from '@/components/guards/RoleGuard';

const adminSections = [
  {
    title: 'Umum',
    items: [
      { href: '/admin', label: 'Dashboard Overview', icon: LayoutDashboard },
      {
        label: 'Analitik', icon: BarChart3,
        children: [
          { href: '/admin/analytics', label: 'Analitik Umum' },
          { href: '/admin/analytics/exam', label: 'Analitik AKURAT Exam' },
        ],
      },
      {
        label: 'Data Civitas', icon: Users,
        children: [
          { href: '/admin/teachers', label: 'Data Guru' },
          { href: '/admin/users', label: 'Data Siswa' },
          { href: '/admin/exam-users', label: 'Data Exam User' },
        ],
      },
    ],
  },
  {
    title: 'Sekolah',
    items: [
      { href: '/admin/classes', label: 'Manajemen Kelas', icon: School },
      { href: '/admin/taxonomy', label: 'Struktur Pelajaran', icon: Tags },
      { href: '/admin/questions', label: 'Bank Soal Sekolah', icon: BookOpen },
      {
        label: 'Ujian Sekolah', icon: CalendarCheck,
        children: [
          { href: '/admin/ujian', label: 'Jadwal & Sesi' },
          { href: '/admin/ujian?view=stats', label: 'Analitik Hasil' },
        ],
      },
      { href: '/admin/content', label: 'Materi Belajar', icon: FileText },
    ],
  },
  {
    title: 'AKURAT Exam',
    items: [
      { href: '/admin/msat', label: 'Exam Live Monitor', icon: Monitor },
      { href: '/admin/msat/questions', label: 'Bank Soal MSAT', icon: FileCheck },
      { href: '/admin/msat/create', label: 'Buat Ujian MSAT', icon: Brain },
      {
        label: 'Hasil & Sertifikasi', icon: Award,
        children: [
          { href: '/admin/msat/results', label: 'Skor & Analisis' },
          { href: '/admin/certificates', label: 'Sertifikat Digital' },
        ],
      },
    ],
  },
  {
    title: 'Sistem & Pengaturan',
    items: [
      { href: '/admin/access', label: 'User & Permission', icon: UserCog },
      { href: '/admin/logs', label: 'Audit Trail', icon: Lock },
      {
        label: 'Developer Tools', icon: Terminal,
        children: [
          { href: '/admin/cli', label: 'CLI & Integrasi API' },
          { href: '/admin/database', label: 'Integrasi Database' },
        ],
      },
      { href: '/admin/config', label: 'Pengaturan Platform', icon: Settings },
    ],
  },
];

const AdminLayout: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <AuthGuard>
      <RoleGuard allowedRoles={['admin']}>
        <AdminShell sections={adminSections}>{children}</AdminShell>
      </RoleGuard>
    </AuthGuard>
  );
};

export default AdminLayout;
