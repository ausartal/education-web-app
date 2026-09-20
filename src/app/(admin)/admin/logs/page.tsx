'use client';

import { FC, useEffect, useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, RefreshCw, ChevronDown, Search, Pause, Play, X } from 'lucide-react';
import { collection, limit as firestoreLimit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { AuditLog } from '@/types/firestore';
import { db } from '@/lib/firebase';

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

function formatTimestamp(ts: { seconds?: number; _seconds?: number } | Date | string | null | undefined): string {
  if (!ts) return '—';
  let date: Date;
  if (typeof ts === 'object' && ('seconds' in ts || '_seconds' in ts)) {
    const seconds = ts.seconds ?? ts._seconds;
    date = seconds ? new Date(seconds * 1000) : new Date(NaN);
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
        <div className="h-4 animate-pulse rounded bg-stone-100" />
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
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const fetchLogs = useCallback(async (fetchLimit: number, silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/audit?limit=${fetchLimit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      const data = await res.json();
      setLogs(data.logs);
      setHasMore(data.logs.length === fetchLimit);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLogs(limit);
  }, [fetchLogs, limit]);

  useEffect(() => {
    if (!autoRefresh || !user) {
      setRealtimeConnected(false);
      return;
    }

    let fallbackTimer: number | undefined;
    const auditQuery = query(
      collection(db, 'audit_logs'),
      orderBy('timestamp', 'desc'),
      firestoreLimit(Math.min(limit, 200)),
    );
    const unsubscribe = onSnapshot(
      auditQuery,
      snapshot => {
        setLogs(snapshot.docs.map(document => ({ id: document.id, ...document.data() } as AuditLog)));
        setHasMore(snapshot.size === Math.min(limit, 200));
        setLastUpdated(new Date());
        setRealtimeConnected(true);
        setLoading(false);
      },
      () => {
        setRealtimeConnected(false);
        fetchLogs(limit, true);
        fallbackTimer = window.setInterval(() => fetchLogs(limit, true), 15_000);
      },
    );

    return () => {
      unsubscribe();
      if (fallbackTimer) window.clearInterval(fallbackTimer);
    };
  }, [autoRefresh, fetchLogs, limit, user]);

  const actionOptions = useMemo(() => Array.from(new Set(logs.map(log => log.action))).sort(), [logs]);
  const filteredLogs = useMemo(() => logs.filter(log => {
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;
    if (!search) return true;
    const term = search.toLowerCase();
    return [log.actorId, log.action, log.targetId, log.targetType, JSON.stringify(log.details)].some(value => String(value ?? '').toLowerCase().includes(term));
  }), [actionFilter, logs, search]);

  const handleLoadMore = () => {
    const newLimit = limit + 50;
    setLimit(newLimit);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 text-white">
            <ClipboardList size={20} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-stone-900">
              Audit Log
            </h1>
            <p className="text-sm text-stone-500">Riwayat seluruh aktivitas admin</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setAutoRefresh(value => !value)} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${autoRefresh ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'}`}>{autoRefresh ? <Pause size={13} /> : <Play size={13} />}{autoRefresh ? (realtimeConnected ? 'Realtime terhubung' : 'Menghubungkan...') : 'Realtime dijeda'}</button>
          <button onClick={() => fetchLogs(limit)} disabled={loading} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} />Perbarui</button>
        </div>
      </div>

      {/* Stats strip */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 grid grid-cols-3 gap-4"
      >
        {[
          { label: 'Total Entri', value: logs.length, color: 'text-stone-900' },
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
          <div key={stat.label} className="border border-stone-100 rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-stone-500">{stat.label}</p>
            <p className={`mt-1 font-display text-2xl font-extrabold ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </motion.div>

      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari aktor, aksi, target, atau detail..." className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-indigo-500" /></div>
        <select value={actionFilter} onChange={event => setActionFilter(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-indigo-500"><option value="all">Semua aksi</option>{actionOptions.map(action => <option key={action} value={action}>{action}</option>)}</select>
        <p className="text-[11px] text-slate-400">{lastUpdated ? `Diperbarui ${lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Belum diperbarui'}</p>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="overflow-x-auto rounded-2xl bg-white shadow-sm"
      >
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-100 text-xs text-stone-500">
              <th className="px-5 py-4 font-medium">Waktu</th>
              <th className="px-5 py-4 font-medium">Aktor</th>
              <th className="px-5 py-4 font-medium">Aksi</th>
              <th className="px-5 py-4 font-medium">Target</th>
              <th className="px-5 py-4 font-medium">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              : filteredLogs.map((log, i) => (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.01 }}
                    onClick={() => setSelectedLog(log)}
                    className="cursor-pointer hover:bg-stone-50"
                  >
                    <td className="px-5 py-3 text-xs text-stone-500 whitespace-nowrap">
                      {formatTimestamp(log.timestamp as unknown as { seconds?: number; _seconds?: number })}
                    </td>
                    <td className="px-5 py-3">
                      <div>
                        <p className="text-xs font-medium text-stone-900">{log.actorId}</p>
                        <span className="inline-block rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                          {log.actorRole}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                          actionColors[log.action] ?? 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div>
                        <p className="text-xs font-medium text-stone-700">{log.targetId}</p>
                        <p className="text-[10px] text-stone-400">{log.targetType}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 max-w-xs">
                      <p className="truncate text-xs text-stone-500">
                        {JSON.stringify(log.details)}
                      </p>
                    </td>
                  </motion.tr>
                ))}
          </tbody>
        </table>

        {!loading && filteredLogs.length === 0 && (
          <div className="py-16 text-center text-stone-400">
            <ClipboardList size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">{logs.length ? 'Tidak ada log yang cocok dengan filter' : 'Belum ada audit log'}</p>
          </div>
        )}
      </motion.div>

      {/* Load more */}
      {!loading && hasMore && logs.length > 0 && (
        <div className="mt-4 text-center">
          <button
            onClick={handleLoadMore}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-50"
          >
            <ChevronDown size={16} />
            Muat lebih banyak
          </button>
        </div>
      )}
      {selectedLog && <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/30" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedLog(null); }}><aside role="dialog" aria-modal="true" aria-label="Detail audit log" className="h-full w-full max-w-lg overflow-y-auto border-l border-slate-200 bg-white shadow-2xl"><div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4"><div><h2 className="text-sm font-bold text-slate-900">Detail audit event</h2><p className="mt-0.5 font-mono text-[11px] text-slate-400">{selectedLog.id}</p></div><button type="button" onClick={() => setSelectedLog(null)} aria-label="Tutup detail" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={17} /></button></div><dl className="space-y-5 p-5 text-sm"><div><dt className="text-xs font-semibold text-slate-500">Waktu</dt><dd className="mt-1 text-slate-800">{formatTimestamp(selectedLog.timestamp as unknown as { seconds?: number; _seconds?: number })}</dd></div><div className="grid grid-cols-2 gap-4"><div><dt className="text-xs font-semibold text-slate-500">Aktor</dt><dd className="mt-1 break-all font-mono text-xs text-slate-800">{selectedLog.actorId}</dd></div><div><dt className="text-xs font-semibold text-slate-500">Role</dt><dd className="mt-1 text-slate-800">{selectedLog.actorRole}</dd></div></div><div><dt className="text-xs font-semibold text-slate-500">Aksi</dt><dd className="mt-1 font-semibold text-slate-800">{selectedLog.action}</dd></div><div><dt className="text-xs font-semibold text-slate-500">Target</dt><dd className="mt-1 break-all font-mono text-xs text-slate-800">{selectedLog.targetType}:{selectedLog.targetId}</dd></div><div><dt className="text-xs font-semibold text-slate-500">Detail perubahan</dt><dd className="mt-2 overflow-x-auto rounded-xl bg-slate-950 p-4"><pre className="whitespace-pre-wrap break-words font-mono text-xs leading-6 text-slate-200">{JSON.stringify(selectedLog.details, null, 2)}</pre></dd></div></dl></aside></div>}
    </div>
  );
};

export default AdminLogs;
