'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile, UserRole } from '@/types/firestore';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/context/AuthContext';
import { Search, Trash2, UserPlus, X } from 'lucide-react';

const roleColors: Record<UserRole, string> = {
  student: 'bg-blue-50 text-primary',
  teacher: 'bg-emerald-50 text-emerald-700',
  admin: 'bg-violet-50 text-violet-700',
};

interface CreateUserForm {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
}

const defaultForm: CreateUserForm = {
  email: '',
  password: '',
  displayName: '',
  role: 'student',
};

const AdminUsers: FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserForm>(defaultForm);
  const [creating, setCreating] = useState(false);

  const getToken = useCallback(async () => {
    if (!user) throw new Error('Not authenticated');
    return user.getIdToken();
  }, [user]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.users as UserProfile[]);
    } catch (err) {
      console.error(err);
      addToast('error', 'Gagal memuat data pengguna');
    } finally {
      setLoading(false);
    }
  }, [getToken, addToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filtered = users.filter((u) => {
    const matchSearch =
      u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const handleChangeRole = async (uid: string, newRole: UserRole) => {
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/users/${uid}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error('Failed to update role');
      setUsers(prev => prev.map(u => (u.uid === uid ? { ...u, role: newRole } : u)));
      addToast('success', `Role changed to ${newRole}`);
    } catch {
      addToast('error', 'Gagal mengubah role');
    }
  };

  const handleToggleActive = async (uid: string, current: boolean) => {
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/users/${uid}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !current }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      setUsers(prev =>
        prev.map(u => (u.uid === uid ? { ...u, isActive: !current } : u))
      );
      addToast('success', !current ? 'User activated' : 'User deactivated');
    } catch {
      addToast('error', 'Gagal mengubah status');
    }
  };

  const handleDelete = async (uid: string) => {
    if (!confirm('Hapus pengguna ini secara permanen?')) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/users/${uid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete user');
      setUsers(prev => prev.filter(u => u.uid !== uid));
      addToast('success', 'User deleted');
    } catch {
      addToast('error', 'Gagal menghapus pengguna');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create user');
      }
      const data = await res.json();
      setUsers(prev => [data.user as UserProfile, ...prev]);
      setShowCreateModal(false);
      setCreateForm(defaultForm);
      addToast('success', 'Pengguna berhasil dibuat');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Gagal membuat pengguna');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-gray-900">
          User Management ({users.length})
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
        >
          <UserPlus size={15} />
          Buat Pengguna
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email..."
            className="w-full rounded-xl bg-white py-3 pl-11 pr-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'student', 'teacher', 'admin'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setFilterRole(r)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                filterRole === r
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {r === 'all' ? 'All' : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* User Table */}
      <div className="overflow-x-auto rounded-3xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500">
              <th className="px-5 py-4 font-medium">User</th>
              <th className="px-5 py-4 font-medium">Role</th>
              <th className="px-5 py-4 font-medium">Status</th>
              <th className="px-5 py-4 font-medium">XP</th>
              <th className="px-5 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((u, i) => (
              <motion.tr
                key={u.uid}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="hover:bg-gray-50"
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-cyan text-xs font-bold text-white">
                      {u.displayName?.charAt(0).toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{u.displayName}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <select
                    value={u.role}
                    onChange={(e) =>
                      handleChangeRole(u.uid, e.target.value as UserRole)
                    }
                    className={`rounded-full px-3 py-1 text-xs font-semibold outline-none ${roleColors[u.role]}`}
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => handleToggleActive(u.uid, u.isActive)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      u.isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {u.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-5 py-3 font-semibold text-amber-600">
                  {u.stats?.xp || 0}
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleDelete(u.uid)}
                      className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">
            Tidak ada pengguna ditemukan
          </div>
        )}
      </div>

      {/* Create User Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setShowCreateModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-display text-lg font-extrabold text-gray-900">
                  Buat Pengguna Baru
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl p-2 text-gray-400 hover:bg-gray-100"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.displayName}
                    onChange={e => setCreateForm(p => ({ ...p, displayName: e.target.value }))}
                    placeholder="Nama lengkap"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="email@contoh.com"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={createForm.password}
                    onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="Minimal 8 karakter"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                    Role
                  </label>
                  <select
                    value={createForm.role}
                    onChange={e => setCreateForm(p => ({ ...p, role: e.target.value as UserRole }))}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowCreateModal(false); setCreateForm(defaultForm); }}
                    className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
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
