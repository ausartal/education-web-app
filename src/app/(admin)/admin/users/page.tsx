'use client';

import { FC, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile, UserRole } from '@/types/firestore';
import { useToast } from '@/hooks/useToast';
import { Search, Shield, Trash2 } from 'lucide-react';

const roleColors: Record<UserRole, string> = {
  student: 'bg-blue-50 text-primary',
  teacher: 'bg-emerald-50 text-emerald-700',
  admin: 'bg-violet-50 text-violet-700',
};

const AdminUsers: FC = () => {
  const { addToast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(collection(db, 'users'));
      setUsers(
        snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as UserProfile)
      );
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = users.filter((u) => {
    const matchSearch =
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const handleChangeRole = async (uid: string, newRole: UserRole) => {
    await updateDoc(doc(db, 'users', uid), { role: newRole });
    setUsers((prev) =>
      prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u))
    );
    addToast('success', `Role changed to ${newRole}`);
  };

  const handleToggleActive = async (uid: string, current: boolean) => {
    await updateDoc(doc(db, 'users', uid), { isActive: !current });
    setUsers((prev) =>
      prev.map((u) => (u.uid === uid ? { ...u, isActive: !current } : u))
    );
    addToast('success', !current ? 'User activated' : 'User deactivated');
  };

  const handleDelete = async (uid: string) => {
    await deleteDoc(doc(db, 'users', uid));
    setUsers((prev) => prev.filter((u) => u.uid !== uid));
    addToast('success', 'User deleted');
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
      <h1 className="mb-6 font-display text-2xl font-extrabold text-gray-900">
        User Management ({users.length})
      </h1>

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
            {filtered.map((user, i) => (
              <motion.tr
                key={user.uid}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="hover:bg-gray-50"
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-cyan text-xs font-bold text-white">
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {user.displayName}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <select
                    value={user.role}
                    onChange={(e) =>
                      handleChangeRole(user.uid, e.target.value as UserRole)
                    }
                    className={`rounded-full px-3 py-1 text-xs font-semibold outline-none ${roleColors[user.role]}`}
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => handleToggleActive(user.uid, user.isActive)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      user.isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-5 py-3 font-semibold text-amber-600">
                  {user.stats?.xp || 0}
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleDelete(user.uid)}
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
      </div>
    </div>
  );
};

export default AdminUsers;
