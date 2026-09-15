'use client';

import { FC, useState, useEffect, useCallback } from 'react';
import {
  Users, Loader2, CheckCircle2, XCircle, AlertCircle, Shield,
  Search, ChevronDown, CreditCard, Eye,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface ExamUser {
  id: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  gender: string;
  identityType: string;
  identityNumber: string;
  institution: string;
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  tokenBalance: number;
  isActive: boolean;
  createdAt: { _seconds: number } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  unverified: { label: 'Belum Verifikasi', color: 'text-amber-700', bg: 'bg-amber-50' },
  pending: { label: 'Menunggu', color: 'text-blue-700', bg: 'bg-blue-50' },
  verified: { label: 'Terverifikasi', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  rejected: { label: 'Ditolak', color: 'text-red-700', bg: 'bg-red-50' },
};

function formatDate(ts: { _seconds: number } | null): string {
  if (!ts) return '-';
  return new Date(ts._seconds * 1000).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

const AdminExamUsersPage: FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<ExamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const params = new URLSearchParams();
      if (filter) params.set('status', filter);
      const res = await fetch(`/api/admin/exam-users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [user, filter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAction = async (uid: string, action: Record<string, unknown>) => {
    if (!user) return;
    setActionLoading(uid);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/exam-users/${uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(action),
      });
      if (res.ok) {
        await fetchUsers();
      }
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.institution.toLowerCase().includes(q) ||
      u.identityNumber.includes(q)
    );
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-extrabold text-stone-800">Peserta Ujian</h1>
          <p className="mt-0.5 text-xs text-stone-400">Kelola akun UjiTuntas dan verifikasi identitas</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-bold text-stone-600">
            {users.length} peserta
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, institusi..."
            className="w-full rounded-lg border border-stone-200 bg-white py-2 pl-9 pr-3 text-sm text-stone-700 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="appearance-none rounded-lg border border-stone-200 bg-white py-2 pl-3 pr-8 text-sm text-stone-700 outline-none focus:border-violet-300"
        >
          <option value="">Semua Status</option>
          <option value="unverified">Belum Verifikasi</option>
          <option value="pending">Menunggu</option>
          <option value="verified">Terverifikasi</option>
          <option value="rejected">Ditolak</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="animate-spin text-stone-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg bg-white py-16 text-center ring-1 ring-stone-200">
          <Users size={28} className="mx-auto text-stone-300" />
          <p className="mt-3 text-sm font-semibold text-stone-500">
            {search || filter ? 'Tidak ada peserta yang sesuai filter' : 'Belum ada peserta ujian'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white ring-1 ring-stone-200">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500">Peserta</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500">Institusi</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500">Identitas</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500">Verifikasi</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500 text-center">Token</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500">Daftar</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const status = STATUS_CONFIG[u.verificationStatus] ?? STATUS_CONFIG.unverified;
                const isLoading = actionLoading === u.id;
                return (
                  <tr key={u.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-stone-800">{u.displayName}</p>
                      <p className="text-xs text-stone-400">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{u.institution || '-'}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-stone-600">{u.identityType}: {u.identityNumber}</p>
                      <p className="text-xs text-stone-400">{u.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${status.color} ${status.bg}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-sm font-bold text-stone-700">
                      {u.tokenBalance}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-400">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {u.verificationStatus !== 'verified' && (
                          <button
                            onClick={() => handleAction(u.id, { verificationStatus: 'verified' })}
                            disabled={isLoading}
                            title="Verifikasi"
                            className="flex h-7 w-7 items-center justify-center rounded text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-40"
                          >
                            {isLoading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={14} />}
                          </button>
                        )}
                        {u.verificationStatus !== 'rejected' && (
                          <button
                            onClick={() => handleAction(u.id, { verificationStatus: 'rejected', verificationNotes: 'Ditolak oleh admin' })}
                            disabled={isLoading}
                            title="Tolak"
                            className="flex h-7 w-7 items-center justify-center rounded text-red-500 transition-colors hover:bg-red-50 disabled:opacity-40"
                          >
                            <XCircle size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => handleAction(u.id, { isActive: !u.isActive })}
                          disabled={isLoading}
                          title={u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                          className={`flex h-7 w-7 items-center justify-center rounded transition-colors disabled:opacity-40 ${
                            u.isActive ? 'text-stone-400 hover:bg-stone-100' : 'text-amber-500 hover:bg-amber-50'
                          }`}
                        >
                          <Shield size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminExamUsersPage;