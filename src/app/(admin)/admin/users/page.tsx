'use client';

import React, { FC, useState, useCallback } from 'react';
import { useAuthSWR } from '@/hooks/useAuthSWR';
import { motion, AnimatePresence } from 'framer-motion';
import { UserRole } from '@/types/firestore';
import { useToast } from '@/hooks/useToast';
import { useAdminConfirm } from '@/components/admin/ConfirmProvider';
import { useAuth } from '@/context/AuthContext';
import {
  Search, Trash2, UserPlus, X, Download,
  CheckSquare, Square, Users, ChevronDown, ChevronUp,
  Zap, ClipboardList, BookOpen, FileText, Pencil, Check,
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

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function EditableStat({
  label, value, onSave, color = 'text-stone-900',
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
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-stone-400">{label}</p>
      {editing ? (
        <div className="flex items-center gap-1">
          <input type="number" value={val} onChange={e => setVal(Number(e.target.value))}
            className="w-20 rounded border border-stone-300 px-2 py-0.5 text-sm font-bold outline-none focus:border-violet-400" />
          {saving
            ? <span className="text-[10px] text-stone-400">...</span>
            : <>
              <button onClick={save} className="text-emerald-600 hover:text-emerald-700"><Check size={13} /></button>
              <button onClick={() => { setEditing(false); setVal(value); }} className="text-stone-400 hover:text-stone-600"><X size={13} /></button>
            </>
          }
        </div>
      ) : (
        <div className="flex items-center gap-1 group cursor-pointer" onClick={() => setEditing(true)}>
          <p className={`text-lg font-black ${color}`}>{value}</p>
          <Pencil size={10} className="text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity" />
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
      <td colSpan={8} className="px-8 py-4">
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {/* Exam data */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-stone-500">Ujian MSAT</p>
            <div className="space-y-1 text-xs text-stone-600">
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
                <span className="font-bold text-stone-900">{u.examAvgScore || '—'}</span>
              </div>
            </div>
          </div>
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-stone-500">Aktivitas</p>
            <div className="space-y-1 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>Kuis Latihan</span>
                <span className="font-bold text-amber-600">{u.quizCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Login Terakhir</span>
                <span className="text-stone-500">{fmtDate(u.lastLoginAt)}</span>
              </div>
            </div>
          </div>
          {/* Editable stats */}
          <div className="col-span-2">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-stone-500">Statistik (klik untuk edit)</p>
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
    dedupingInterval: 120_000,
  });
  const users = data?.users ?? [];

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserForm>(defaultForm);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const toggleSelect = (uid: string) => {
    setSelected(prev => { const n = new Set(prev); if (n.has(uid)) { n.delete(uid); } else { n.add(uid); } return n; });
  };
  const allSelected = filtered.length > 0 && filtered.every(u => selected.has(u.uid));

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

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <Users size={18} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-stone-900">Manajemen Pengguna</h1>
            <p className="text-sm text-stone-500">{users.length} pengguna terdaftar</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative group">
            <button className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-medium text-stone-600 shadow-sm hover:bg-stone-50">
              <Download size={14} /> Export
            </button>
            <div className="absolute right-0 top-full z-10 mt-1 hidden flex-col gap-1 rounded-xl bg-white p-1.5 shadow-lg group-hover:flex min-w-[100px]">
              <button onClick={() => handleExport('csv')} className="rounded-lg px-3 py-1.5 text-left text-xs text-stone-700 hover:bg-stone-50">CSV</button>
              <button onClick={() => handleExport('json')} className="rounded-lg px-3 py-1.5 text-left text-xs text-stone-700 hover:bg-stone-50">JSON</button>
            </div>
          </div>
          <button onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4f6ef7] to-[#6366f1] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90">
            <UserPlus size={15} /> Buat Pengguna
          </button>
        </div>
      </div>

      {/* Role stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: users.length, color: 'text-stone-900', bg: 'bg-stone-50' },
          { label: 'Siswa', value: roleCount.student, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Guru', value: roleCount.teacher, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Admin', value: roleCount.admin, color: 'text-violet-600', bg: 'bg-violet-50' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl ${s.bg} p-4`}>
            <p className={`font-display text-2xl font-extrabold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-stone-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama atau email..."
            className="w-full rounded-xl border border-stone-100 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20" />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'student', 'teacher', 'admin'] as const).map(r => (
            <button key={r} onClick={() => setFilterRole(r)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${filterRole === r ? 'bg-violet-600 text-white' : 'bg-white text-stone-600 hover:bg-stone-100'}`}>
              {r === 'all' ? 'Semua' : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
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
              <button onClick={() => setSelected(new Set())} className="text-xs text-stone-400 hover:text-stone-600">Batal</button>
              {bulkLoading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-stone-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-100 text-xs text-stone-500">
              <th className="px-4 py-4 font-medium">
                <button onClick={allSelected ? () => setSelected(new Set()) : () => setSelected(new Set(filtered.map(u => u.uid)))}
                  className="text-stone-400 hover:text-stone-600">
                  {allSelected ? <CheckSquare size={15} className="text-violet-600" /> : <Square size={15} />}
                </button>
              </th>
              <th className="px-4 py-4 font-medium">Pengguna</th>
              <th className="px-4 py-4 font-medium">Role</th>
              <th className="px-4 py-4 font-medium">Status</th>
              <th className="px-4 py-4 font-medium"><Zap size={12} className="inline" /> XP</th>
              <th className="px-4 py-4 font-medium"><ClipboardList size={12} className="inline" /> Ujian</th>
              <th className="px-4 py-4 font-medium"><BookOpen size={12} className="inline" /> Kuis</th>
              <th className="px-4 py-4 font-medium"><FileText size={12} className="inline" /> Materi</th>
              <th className="px-4 py-4 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => (
              <React.Fragment key={u.uid}>
                <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className={`cursor-pointer border-b border-stone-50 hover:bg-stone-50 ${selected.has(u.uid) ? 'bg-violet-50' : ''}`}
                  onClick={() => setExpandedId(expandedId === u.uid ? null : u.uid)}>
                  <td className="px-4 py-3" onClick={e => { e.stopPropagation(); toggleSelect(u.uid); }}>
                    <button className="text-stone-400 hover:text-violet-600">
                      {selected.has(u.uid) ? <CheckSquare size={15} className="text-violet-600" /> : <Square size={15} />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-400 text-xs font-bold text-white">
                        {u.displayName?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <p className="font-medium text-stone-900">{u.displayName}</p>
                        <p className="text-xs text-stone-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <select value={u.role} onChange={e => handleChangeRole(u.uid, e.target.value as UserRole)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold outline-none cursor-pointer ${roleColors[u.role]}`}>
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleToggleActive(u.uid, u.isActive)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${u.isActive ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}>
                      {u.isActive ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${u.examSessions > 0 ? 'text-fuchsia-600' : 'text-stone-300'}`}>
                      {u.examSessions}
                    </span>
                    {u.examSessions > 0 && (
                      <span className="text-[10px] text-stone-400 ml-1">({u.examCompleted} selesai)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-bold text-amber-500">{u.quizCount || <span className="text-stone-300">0</span>}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setExpandedId(expandedId === u.uid ? null : u.uid)}
                        className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
                        {expandedId === u.uid ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <button onClick={() => handleDelete(u.uid)}
                        className="rounded-lg p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
                {expandedId === u.uid && (
                  <UserExpandedRow u={u} onUpdateStats={handleUpdateStats} />
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-stone-400">Tidak ada pengguna ditemukan</div>
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
                <h2 className="font-display text-lg font-extrabold text-stone-900">Buat Pengguna Baru</h2>
                <button onClick={() => setShowCreateModal(false)} className="rounded-xl p-2 text-stone-400 hover:bg-stone-100">
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
                    <label className="mb-1.5 block text-xs font-semibold text-stone-700">{f.label}</label>
                    <input type={f.type} required minLength={f.minLength}
                      value={createForm[f.key as keyof CreateUserForm]}
                      onChange={e => setCreateForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20" />
                  </div>
                ))}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-stone-700">Role</label>
                  <select value={createForm.role} onChange={e => setCreateForm(p => ({ ...p, role: e.target.value as UserRole }))}
                    className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400">
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setShowCreateModal(false); setCreateForm(defaultForm); }}
                    className="flex-1 rounded-xl border border-stone-200 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50">Batal</button>
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
