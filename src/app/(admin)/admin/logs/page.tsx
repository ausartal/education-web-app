'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, RefreshCw, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AuditLog } from '@/types/firestore';

const actionColors: Record<string, string> = {
  create_user: 'bg-emerald-50 text-emerald-700',
  create_material: 'bg-emerald-50 text-emerald-700',
  create_question: 'bg-emerald-50 text-emerald-700',
  update_user: 'bg-blue-50 text-blue-700',
  update_material: 'bg-blue-50 text-blue-700',
  update_question: 'bg-blue-50 text-blue-700',
  update_config: 'bg-blue-50 text-blue-700',
  change_role: 'bg-violet-50 text-violet-700',
  toggle_active: 'bg-amber-50 text-amber-700',
  delete_user: 'bg-rose-50 text-rose-700',
  delete_material: 'bg-rose-50 text-rose-700',
  delete_question: 'bg-rose-50 text-rose-700',
  delete_exam: 'bg-rose-50 text-rose-700',
};

function formatTimestamp(ts: { seconds?: number } | Date | string | null | undefined): string {
  if (!ts) return '—';
  let date: Date;
  if (typeof ts === 'object' && 'seconds' in ts && ts.seconds) {
    date = new Date(ts.seconds * 1000);
  } else if (ts instanceof Date) {
    date = ts;
  } else {
    date = new Date(ts as string);
  }
  return date.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const SkeletonRow: FC = () => (
  <tr>
    {Array.from({ length: 5 }).map((_, i) => (
      <td key={i} className="px-5 py-3">
        <div className="h-4 animate-pulse rounded bg-gray-100" />
      </td>
    ))}
  </tr>
);

const AdminLogs: FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(50);
  const [hasMore, setHasMore] = useState(true);

  const fetchLogs = useCallback(async (fetchLimit: number) => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/audit?limit=${fetchLimit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      const data = await res.json();
      setLogs(data.logs);
      setHasMore(data.logs.length === fetchLimit);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLogs(limit);
  }, [fetchLogs, limit]);

  const handleLoadMore = () => {
    const newLimit = limit + 50;
    setLimit(newLimit);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <ClipboardList size={20} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-gray-900">
              Audit Log
            </h1>
            <p className="text-sm text-gray-500">Riwayat seluruh aktivitas admin</p>
          </div>
        </div>
        <button
          onClick={() => fetchLogs(limit)}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats strip */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 grid grid-cols-3 gap-4"
      >
        {[
          { label: 'Total Entri', value: logs.length, color: 'text-gray-900' },
          {
            label: 'Hapus',
            value: logs.filter(l => l.action?.startsWith('delete')).length,
            color: 'text-rose-600',
          },
          {
            label: 'Buat',
            value: logs.filter(l => l.action?.startsWith('create')).length,
            color: 'text-emerald-600',
          },
        ].map(stat => (
          <div key={stat.label} className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">{stat.label}</p>
            <p className={`mt-1 font-display text-2xl font-extrabold ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="overflow-x-auto rounded-3xl bg-white shadow-sm"
      >
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500">
              <th className="px-5 py-4 font-medium">Waktu</th>
              <th className="px-5 py-4 font-medium">Aktor</th>
              <th className="px-5 py-4 font-medium">Aksi</th>
              <th className="px-5 py-4 font-medium">Target</th>
              <th className="px-5 py-4 font-medium">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              : logs.map((log, i) => (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.01 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {formatTimestamp(log.timestamp as unknown as { seconds?: number })}
                    </td>
                    <td className="px-5 py-3">
                      <div>
                        <p className="text-xs font-medium text-gray-900">{log.actorId}</p>
                        <span className="inline-block rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                          {log.actorRole}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                          actionColors[log.action] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div>
                        <p className="text-xs font-medium text-gray-700">{log.targetId}</p>
                        <p className="text-[10px] text-gray-400">{log.targetType}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 max-w-xs">
                      <p className="truncate text-xs text-gray-500">
                        {JSON.stringify(log.details)}
                      </p>
                    </td>
                  </motion.tr>
                ))}
          </tbody>
        </table>

        {!loading && logs.length === 0 && (
          <div className="py-16 text-center text-gray-400">
            <ClipboardList size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Belum ada audit log</p>
          </div>
        )}
      </motion.div>

      {/* Load more */}
      {!loading && hasMore && logs.length > 0 && (
        <div className="mt-4 text-center">
          <button
            onClick={handleLoadMore}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            <ChevronDown size={16} />
            Muat lebih banyak
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminLogs;
