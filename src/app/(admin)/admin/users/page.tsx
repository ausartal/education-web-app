'use client';

import React, { FC, useState, useCallback, useMemo } from 'react';
import { useAuthSWR } from '@/hooks/useAuthSWR';
import { motion, AnimatePresence } from 'framer-motion';
import { UserRole } from '@/types/firestore';
import { useToast } from '@/hooks/useToast';
import { useAdminConfirm } from '@/components/admin/ConfirmProvider';
import { useAuth } from '@/context/AuthContext';
import { AdminPageHeader, AdminEmptyState } from '@/components/admin/AdminUI';
import { ExportMenu } from '@/components/ui/ExportMenu';
import {
  Search, Trash2, UserPlus, X,
  CheckSquare, Square, Users, ChevronDown, ChevronUp,
  ClipboardList, BookOpen, FileText, Pencil, Check,
  ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, Copy,
} from 'lucide-react';

interface UserRow {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  stats?: { totalLessons?: number; totalQuizzes?: number };
  createdAt?: string | null;
  lastLoginAt?: string | null;
  profile?: Record<string, string>;
  settings?: { notifications?: boolean; language?: string };
  examSessions: number;
  examCompleted: number;
  examAvgScore: number;
  quizCount: number;
}

const roleColors: Record<UserRole, string> = {
  student: 'bg-blue-50 text-blue-600',
  teacher: 'bg-emerald-50 text-emerald-700',
  admin: 'bg-violet-50 text-violet-700',
};

interface CreateUserForm { email: string; password: string; displayName: string; role: UserRole; }
const defaultForm: CreateUserForm = { email: '', password: '', displayName: '', role: 'student' };

function fmtDate(iso: unknown): string {
  if (!iso) return '—';
  const o = iso as Record<string, unknown>;
  const secs = (o._seconds ?? o.seconds) as number | undefined;
  const d = typeof secs === 'number' ? new Date(secs * 1000) : new Date(iso as string);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

const toMs = (v: unknown): number => {
  if (!v) return 0;
  const o = v as Record<string, unknown>;
  const secs = (o._seconds ?? o.seconds) as number | undefined;
  if (typeof secs === 'number') return secs * 1000;
  const t = new Date(v as string).getTime();
  return Number.isNaN(t) ? 0 : t;
};

type SortKey = 'name' | 'role' | 'exam' | 'quiz' | 'lessons' | 'login';
const PAGE_SIZES = [10, 25, 50, 100];

function EditableStat({
  label, value, onSave, color = 'text-slate-900',
}: {
  label: string; value: number; onSave: (v: number) => Promise<void>; color?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await onSave(val);
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className="rounded-xl bg-white p-3 shadow-sm">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      {editing ? (
        <div className="flex items-center gap-1">
          <input type="number" value={val} onChange={e => setVal(Number(e.target.value))}
            className="w-20 rounded border border-slate-300 px-2 py-0.5 text-sm font-bold outline-none focus:border-violet-400" />
          {saving
            ? <span className="text-[10px] text-slate-400">...</span>
            : <>
              <button aria-label="Simpan" title="Simpan" onClick={save} className="text-emerald-600 hover:text-emerald-700"><Check size={13} /></button>
              <button aria-label="Batal" title="Batal" onClick={() => { setEditing(false); setVal(value); }} className="text-slate-400 hover:text-slate-600"><X size={13} /></button>
            </>
          }
        </div>
      ) : (
        <div className="flex items-center gap-1 group cursor-pointer" onClick={() => setEditing(true)}>
          <p className={`text-lg font-black ${color}`}>{value}</p>
          <Pencil size={10} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}
    </div>
  );
}

function UserExpandedRow({
  u, onUpdateStats,
}: {
  u: UserRow;
  onUpdateStats: (uid: string, field: string, value: number) => Promise<void>;
}) {
  return (
    <tr className="bg-blue-50/30">
      <td colSpan={9} className="px-8 py-4">
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {/* Exam data */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Ujian MSAT</p>
            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Total Sesi</span>
                <span className="font-bold text-fuchsia-600">{u.examSessions}</span>
              </div>
              <div className="flex justify-between">
                <span>Selesai</span>
                <span className="font-bold text-emerald-600">{u.examCompleted}</span>
              </div>
              <div className="flex justify-between">
                <span>Skor Rata2</span>
                <span className="font-bold text-slate-900">{u.examAvgScore || '—'}</span>
              </div>
            </div>
          </div>
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Aktivitas</p>
            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Kuis Latihan</span>
                <span className="font-bold text-amber-600">{u.quizCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Login Terakhir</span>
                <span className="text-slate-500">{fmtDate(u.lastLoginAt)}</span>
              </div>
            </div>
          </div>
          {/* Editable stats */}
          <div className="col-span-2">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Statistik (klik untuk edit)</p>
            <div className="grid grid-cols-2 gap-2">
              <EditableStat label="Total Lessons" value={u.stats?.totalLessons ?? 0} color="text-blue-600"
                onSave={v => onUpdateStats(u.uid, 'totalLessons', v)} />
              <EditableStat label="Total Quizzes" value={u.stats?.totalQuizzes ?? 0} color="text-emerald-600"
                onSave={v => onUpdateStats(u.uid, 'totalQuizzes', v)} />
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

const AdminUsers: FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const confirmAction = useAdminConfirm();
  const { data, isLoading: loading, mutate } = useAuthSWR<{ users: UserRow[] }>('/api/admin/users', {
    dedupingInterval: 3_000,
  });
  const users = useMemo(() => data?.users ?? [], [data]);

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserForm>(defaultForm);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = users.filter(u => {
      const matchSearch = !q || u.displayName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
      const matchRole = filterRole === 'all' || u.role === filterRole;
      const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? u.isActive : !u.isActive);
      return matchSearch && matchRole && matchStatus;
    });
    const value = (u: UserRow): string | number => {
      switch (sortKey) {
        case 'name': return (u.displayName || '').toLowerCase();
        case 'role': return u.role;
        case 'exam': return u.examSessions ?? 0;
        case 'quiz': return u.quizCount ?? 0;
        case 'lessons': return u.stats?.totalLessons ?? 0;
        case 'login': return toMs(u.lastLoginAt);
      }
    };
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const x = value(a); const y = value(b);
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
      return String(x).localeCompare(String(y), 'id') * dir;
    });
  }, [users, search, filterRole, filterStatus, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir(key === 'name' || key === 'role' ? 'asc' : 'desc'); }
    setPage(1);
  };

  const copyEmail = async (email: string) => {
    try { await navigator.clipboard.writeText(email); addToast('success', 'Email disalin'); }
    catch { addToast('error', 'Gagal menyalin email'); }
  };

  const toggleSelect = (uid: string) => {
    setSelected(prev => { const n = new Set(prev); if (n.has(uid)) { n.delete(uid); } else { n.add(uid); } return n; });
  };
  const allSelected = pageRows.length > 0 && pageRows.every(u => selected.has(u.uid));

  const getToken = useCallback(async () => user!.getIdToken(), [user]);

  const handleChangeRole = async (uid: string, newRole: UserRole) => {
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/users/${uid}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error();
      mutate(d => d ? { users: d.users.map(u => u.uid === uid ? { ...u, role: newRole } : u) } : d, false);
      addToast('success', `Role diubah ke ${newRole}`);
    } catch { addToast('error', 'Gagal mengubah role'); }
  };

  const handleToggleActive = async (uid: string, current: boolean) => {
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/users/${uid}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !current }),
      });
      if (!res.ok) throw new Error();
      mutate(d => d ? { users: d.users.map(u => u.uid === uid ? { ...u, isActive: !current } : u) } : d, false);
      addToast('success', !current ? 'Pengguna diaktifkan' : 'Pengguna dinonaktifkan');
    } catch { addToast('error', 'Gagal mengubah status'); }
  };

  const handleUpdateStats = async (uid: string, field: string, value: number) => {
    const token = await getToken();
    const res = await fetch(`/api/admin/users/${uid}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ stats: { ...(users.find(u => u.uid === uid)?.stats ?? {}), [field]: value } }),
    });
    if (!res.ok) throw new Error();
    mutate(d => d ? { users: d.users.map(u => u.uid === uid ? { ...u, stats: { ...(u.stats ?? {}), [field]: value } } : u) } : d, false);
    addToast('success', `${field} diperbarui`);
  };

  const handleDelete = async (uid: string) => {
    if (!(await confirmAction({ title: 'Hapus pengguna?', description: 'Akun autentikasi dan profil pengguna akan dihapus permanen.', confirmLabel: 'Hapus pengguna', tone: 'danger' }))) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/users/${uid}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      mutate(d => d ? { users: d.users.filter(u => u.uid !== uid) } : d, false);
      addToast('success', 'Pengguna dihapus');
    } catch { addToast('error', 'Gagal menghapus pengguna'); }
  };

  const handleBulkAction = async (action: string, role?: UserRole) => {
    if (selected.size === 0) return;
    if (action === 'delete' && !(await confirmAction({ title: `Hapus ${selected.size} pengguna?`, description: 'Semua akun yang dipilih akan dihapus permanen. Administrator tidak dapat diproses melalui aksi massal.', confirmLabel: 'Hapus pengguna', tone: 'danger' }))) return;
    setBulkLoading(true);
    try {
      const token = await getToken();
      const body: Record<string, unknown> = { action, uids: Array.from(selected) };
      if (role) body.role = role;
      const res = await fetch('/api/admin/bulk', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const resData = await res.json();
      addToast('success', `${resData.affected} pengguna diperbarui`);
      setSelected(new Set());
      mutate();
    } catch { addToast('error', 'Bulk action gagal'); }
    finally { setBulkLoading(false); }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Create failed'); }
      setShowCreateModal(false);
      setCreateForm(defaultForm);
      addToast('success', 'Pengguna berhasil dibuat');
      mutate();
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Gagal membuat pengguna');
    } finally { setCreating(false); }
  };

  const handleExport = async (fmt: string) => {
    try {
      const token = await user!.getIdToken();
      const res = await fetch(`/api/admin/export?collection=users&format=${fmt}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `users-export.${fmt}`; a.click();
      URL.revokeObjectURL(url);
      addToast('success', `Export ${fmt.toUpperCase()} berhasil`);
    } catch { addToast('error', 'Gagal export'); }
  };

  const roleCount = { student: 0, teacher: 0, admin: 0 };
  users.forEach(u => { if (u.role in roleCount) roleCount[u.role as UserRole]++; });

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey !== k ? <ArrowUpDown size={11} className="text-slate-300" /> : sortDir === 'asc' ? <ArrowUp size={11} className="text-violet-600" /> : <ArrowDown size={11} className="text-violet-600" />;

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <AdminPageHeader
        icon={<Users size={22} />}
        eyebrow="Data civitas"
        title="Manajemen Pengguna"
        description={`${users.length} pengguna terdaftar`}
        actions={
          <>
            <div className="flex items-center gap-2">
              <ExportMenu label="Export" onExport={fmt => handleExport(fmt)} />
              <button onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4f6ef7] to-[#6366f1] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90">
                <UserPlus size={15} /> Buat Pengguna
              </button>
            </div>
          </>
        }
      />

      {/* Role stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: users.length, color: 'text-slate-900', bg: 'bg-slate-50' },
          { label: 'Siswa', value: roleCount.student, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Guru', value: roleCount.teacher, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Admin', value: roleCount.admin, color: 'text-violet-600', bg: 'bg-violet-50' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl ${s.bg} p-4`}>
            <p className={`font-display text-2xl font-extrabold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari nama atau email..."
            className="w-full rounded-xl border border-slate-100 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20" />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'student', 'teacher', 'admin'] as const).map(r => (
            <button key={r} onClick={() => { setFilterRole(r); setPage(1); }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${filterRole === r ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-100 hover:bg-slate-100'}`}>
              {r === 'all' ? 'Semua' : r === 'student' ? 'Siswa' : r === 'teacher' ? 'Guru' : 'Admin'}
            </button>
          ))}
        </div>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value as 'all' | 'active' | 'inactive'); setPage(1); }}
          aria-label="Filter status"
          className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm outline-none focus:border-violet-400">
          <option value="all">Semua status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </div>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between rounded-2xl bg-violet-50 border border-violet-100 px-4 py-3">
            <span className="text-sm font-semibold text-violet-600">{selected.size} dipilih</span>
            <div className="flex items-center gap-2">
              <button onClick={() => handleBulkAction('activate')} disabled={bulkLoading}
                className="rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">Aktifkan</button>
              <button onClick={() => handleBulkAction('deactivate')} disabled={bulkLoading}
                className="rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50">Nonaktifkan</button>
              <button onClick={() => handleBulkAction('delete')} disabled={bulkLoading}
                className="rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50">Hapus</button>
              <button onClick={() => setSelected(new Set())} className="text-xs text-slate-400 hover:text-slate-600">Batal</button>
              {bulkLoading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] text-slate-500">
              <th className="w-12 px-4 py-3.5">
                <button aria-label="Pilih semua di halaman ini" onClick={allSelected ? () => setSelected(prev => { const n = new Set(prev); pageRows.forEach(u => n.delete(u.uid)); return n; }) : () => setSelected(prev => { const n = new Set(prev); pageRows.forEach(u => n.add(u.uid)); return n; })}
                  className="text-slate-400 hover:text-slate-600">
                  {allSelected ? <CheckSquare size={15} className="text-violet-600" /> : <Square size={15} />}
                </button>
              </th>
              <th className="px-4 py-3.5 font-semibold" aria-sort={sortKey === 'name' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                <button onClick={() => toggleSort('name')} className="inline-flex items-center gap-1.5 uppercase tracking-wide hover:text-slate-800">
                  Pengguna <SortIcon k="name" />
                </button>
              </th>
              <th className="px-4 py-3.5 font-semibold" aria-sort={sortKey === 'role' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                <button onClick={() => toggleSort('role')} className="inline-flex items-center gap-1.5 uppercase tracking-wide hover:text-slate-800">
                  Role <SortIcon k="role" />
                </button>
              </th>
              <th className="px-4 py-3.5 font-semibold uppercase tracking-wide">Status</th>
              <th className="px-4 py-3.5 font-semibold" aria-sort={sortKey === 'exam' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                <button onClick={() => toggleSort('exam')} className="inline-flex items-center gap-1.5 uppercase tracking-wide hover:text-slate-800">
                  <ClipboardList size={12} />Ujian <SortIcon k="exam" />
                </button>
              </th>
              <th className="px-4 py-3.5 font-semibold" aria-sort={sortKey === 'quiz' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                <button onClick={() => toggleSort('quiz')} className="inline-flex items-center gap-1.5 uppercase tracking-wide hover:text-slate-800">
                  <BookOpen size={12} />Latihan <SortIcon k="quiz" />
                </button>
              </th>
              <th className="px-4 py-3.5 font-semibold" aria-sort={sortKey === 'lessons' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                <button onClick={() => toggleSort('lessons')} className="inline-flex items-center gap-1.5 uppercase tracking-wide hover:text-slate-800">
                  <FileText size={12} />Materi <SortIcon k="lessons" />
                </button>
              </th>
              <th className="px-4 py-3.5 font-semibold" aria-sort={sortKey === 'login' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                <button onClick={() => toggleSort('login')} className="inline-flex items-center gap-1.5 uppercase tracking-wide hover:text-slate-800">
                  Login terakhir <SortIcon k="login" />
                </button>
              </th>
              <th className="px-4 py-3.5 text-right font-semibold uppercase tracking-wide">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map(u => (
              <React.Fragment key={u.uid}>
                <tr
                  className={`cursor-pointer border-b border-slate-50 transition-colors hover:bg-slate-50 ${selected.has(u.uid) ? 'bg-violet-50/70' : ''} ${!u.isActive ? 'opacity-70' : ''}`}
                  onClick={() => setExpandedId(expandedId === u.uid ? null : u.uid)}>
                  <td className="px-4 py-3" onClick={e => { e.stopPropagation(); toggleSelect(u.uid); }}>
                    <button aria-label="Pilih pengguna" className="text-slate-400 hover:text-violet-600">
                      {selected.has(u.uid) ? <CheckSquare size={15} className="text-violet-600" /> : <Square size={15} />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-400 text-xs font-bold text-white">
                        {u.displayName?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{u.displayName || 'Tanpa nama'}</p>
                        <p className="truncate text-xs text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <select value={u.role} onChange={e => handleChangeRole(u.uid, e.target.value as UserRole)}
                      aria-label={`Role ${u.displayName}`}
                      className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold outline-none ${roleColors[u.role]}`}>
                      <option value="student">Siswa</option>
                      <option value="teacher">Guru</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleToggleActive(u.uid, u.isActive)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${u.isActive ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {u.isActive ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {u.examSessions > 0 ? (
                      <div>
                        <p className="font-bold text-fuchsia-600">{u.examSessions} <span className="text-[11px] font-medium text-slate-400">sesi</span></p>
                        <p className="text-[11px] text-slate-400">{u.examCompleted} selesai{u.examAvgScore ? ` · rata-rata ${u.examAvgScore}` : ''}</p>
                      </div>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 font-bold text-amber-500">{u.quizCount || <span className="font-normal text-slate-300">—</span>}</td>
                  <td className="px-4 py-3 font-bold text-blue-600">{u.stats?.totalLessons || <span className="font-normal text-slate-300">—</span>}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(u.lastLoginAt)}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-0.5">
                      <button aria-label="Salin email" title="Salin email" onClick={() => copyEmail(u.email)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <Copy size={14} />
                      </button>
                      <button aria-label={expandedId === u.uid ? 'Tutup detail' : 'Lihat detail'} title="Detail" onClick={() => setExpandedId(expandedId === u.uid ? null : u.uid)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        {expandedId === u.uid ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <button aria-label="Hapus" title="Hapus" onClick={() => handleDelete(u.uid)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedId === u.uid && (
                  <UserExpandedRow u={u} onUpdateStats={handleUpdateStats} />
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        </div>
        {filtered.length === 0 && (
          <AdminEmptyState icon={<Users size={24} />} title="Tidak ada pengguna ditemukan" description="Coba ubah filter peran, status, atau kata kunci pencarian." />
        )}
        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>Menampilkan {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} dari {filtered.length}</span>
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} aria-label="Jumlah baris per halaman"
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none">
                {PAGE_SIZES.map(n => <option key={n} value={n}>{n} / halaman</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage(safePage - 1)} disabled={safePage <= 1} aria-label="Halaman sebelumnya"
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={14} /></button>
              <span className="px-2 font-semibold text-slate-700">{safePage} / {totalPages}</span>
              <button onClick={() => setPage(safePage + 1)} disabled={safePage >= totalPages} aria-label="Halaman berikutnya"
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setShowCreateModal(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-display text-lg font-extrabold text-slate-900">Buat Pengguna Baru</h2>
                <button aria-label="Tutup" title="Tutup" onClick={() => setShowCreateModal(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleCreateUser} className="space-y-4">
                {[
                  { label: 'Nama Lengkap', key: 'displayName', type: 'text', placeholder: 'Nama lengkap' },
                  { label: 'Email', key: 'email', type: 'email', placeholder: 'email@contoh.com' },
                  { label: 'Password', key: 'password', type: 'password', placeholder: 'Minimal 8 karakter', minLength: 8 },
                ].map(f => (
                  <div key={f.key}>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">{f.label}</label>
                    <input type={f.type} required minLength={f.minLength}
                      value={createForm[f.key as keyof CreateUserForm]}
                      onChange={e => setCreateForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20" />
                  </div>
                ))}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">Role</label>
                  <select value={createForm.role} onChange={e => setCreateForm(p => ({ ...p, role: e.target.value as UserRole }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400">
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setShowCreateModal(false); setCreateForm(defaultForm); }}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Batal</button>
                  <button type="submit" disabled={creating}
                    className="flex-1 rounded-xl bg-gradient-to-r from-[#4f6ef7] to-[#6366f1] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
                    {creating ? 'Membuat...' : 'Buat Pengguna'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminUsers;
