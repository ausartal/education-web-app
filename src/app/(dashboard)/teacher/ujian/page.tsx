'use client';

import { FC, useState, useCallback } from 'react';
import { useAuthSWR } from '@/hooks/useAuthSWR';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, ClipboardList, Copy, Check, Pencil, Trash2, X,
  ChevronDown, Users, BarChart2, Clock, ArrowRight, HelpCircle
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { RoleGuard } from '@/components/guards/RoleGuard';

interface ClassOption { id: string; name: string; subject: string; }
interface ScheduleItem {
  id: string; title: string; module: string; domainIds: string[];
  examToken: string; status: string; durationMinutes: number;
  classId: string; sessionCount: number; completedCount: number; avgScore: number | null;
  scheduledAt: unknown;
}

const DOMAINS = [
  { id: 'tp1', label: 'TP1 – Hubungan mol & pereaksi pembatas' },
  { id: 'tp2', label: 'TP2 – Stoikiometri gas (hukum Avogadro/STP)' },
  { id: 'tp3', label: 'TP3 – Konsep mol & jumlah partikel' },
  { id: 'tp4', label: 'TP4 – Rumus empiris & rumus molekul' },
  { id: 'tp5', label: 'TP5 – Konsentrasi larutan (molaritas, molalitas)' },
];

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  active: { label: 'Aktif', cls: 'bg-emerald-100 text-emerald-700' },
  draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-600' },
  closed: { label: 'Ditutup', cls: 'bg-rose-100 text-rose-600' },
};

const TeacherUjianPage: FC = () => {
  const { user } = useAuth();

  const { data: schedData, isLoading: schedLoading, mutate: mutateScheds } =
    useAuthSWR<{ schedules: ScheduleItem[] }>('/api/teacher/exam-schedules');
  // /api/teacher/classes is already cached by the kelas page — same SWR key
  const { data: classData, isLoading: classLoading } =
    useAuthSWR<{ classes: ClassOption[] }>('/api/teacher/classes');

  const schedules = schedData?.schedules ?? [];
  const classes = classData?.classes ?? [];
  const loading = schedLoading || classLoading;

  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<ScheduleItem | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    classId: '', title: '', module: 'stoikiometri',
    domainIds: [] as string[], durationMinutes: 50, scheduledAt: '',
  });

  const getToken = useCallback(async () => user ? await user.getIdToken() : '', [user]);

  const toggleDomain = (id: string) => {
    setForm(f => ({
      ...f,
      domainIds: f.domainIds.includes(id) ? f.domainIds.filter(d => d !== id) : [...f.domainIds, id],
    }));
  };

  const handleCreate = async () => {
    if (!form.classId || !form.title || form.domainIds.length === 0) return;
    setSaving(true);
    const t = await getToken();
    await fetch('/api/teacher/exam-schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify(form),
    });
    setShowCreate(false);
    resetForm();
    setSaving(false);
    mutateScheds();
  };

  const handleEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    const t = await getToken();
    await fetch(`/api/teacher/exam-schedules/${editItem.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ title: form.title, status: editItem.status, domainIds: form.domainIds, durationMinutes: form.durationMinutes }),
    });
    setEditItem(null);
    setSaving(false);
    mutateScheds();
  };

  const handleStatusChange = async (id: string, status: string) => {
    const t = await getToken();
    await fetch(`/api/teacher/exam-schedules/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ status }),
    });
    mutateScheds();
  };

  const handleDelete = async (id: string) => {
    const t = await getToken();
    await fetch(`/api/teacher/exam-schedules/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${t}` },
    });
    setDeleteConfirm(null);
    mutateScheds();
  };

  const resetForm = () => setForm({ classId: '', title: '', module: 'stoikiometri', domainIds: [], durationMinutes: 50, scheduledAt: '' });

  const copyToken = (tok: string) => {
    navigator.clipboard.writeText(tok);
    setCopiedToken(tok);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const getClassName = (classId: string) => classes.find(c => c.id === classId)?.name || '—';

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
    </div>
  );

  return (
    <RoleGuard allowedRoles={['teacher', 'admin']}>
      <div className="mx-auto max-w-5xl py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-gray-900">Ujian</h1>
            <p className="mt-1 text-sm text-gray-500">Buat dan kelola jadwal ujian adaptif MSAT</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/teacher/ujian/soal"
              className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-100">
              <HelpCircle size={15} /> Bank Soal
            </Link>
            <button
              onClick={() => { setShowCreate(true); resetForm(); }}
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-violet-700"
            >
              <Plus size={16} /> Buat Ujian
            </button>
          </div>
        </div>

        {schedules.length === 0 ? (
          <div className="rounded-3xl bg-white p-16 text-center shadow-sm">
            <ClipboardList size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="font-semibold text-gray-500">Belum ada ujian</p>
            <p className="mt-1 text-sm text-gray-400">Buat ujian pertama untuk kelasmu</p>
          </div>
        ) : (
          <div className="space-y-4">
            {schedules.map(sch => {
              const st = STATUS_LABELS[sch.status] || STATUS_LABELS.draft;
              return (
                <motion.div
                  key={sch.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>{st.label}</span>
                        <span className="text-xs text-gray-400">{getClassName(sch.classId)}</span>
                      </div>
                      <h3 className="font-bold text-gray-900">{sch.title}</h3>
                      <p className="mt-1 text-xs text-gray-400">{sch.domainIds?.length || 0} kompetensi · {sch.durationMinutes} menit</p>
                    </div>

                    {/* Token */}
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-violet-50 px-4 py-2 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-500">Token Ujian</p>
                        <p className="font-mono text-lg font-black tracking-widest text-violet-700">{sch.examToken}</p>
                      </div>
                      <button
                        onClick={() => copyToken(sch.examToken)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      >
                        {copiedToken === sch.examToken ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Users size={13} /> {sch.sessionCount} peserta
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <BarChart2 size={13} /> {sch.completedCount} selesai
                    </div>
                    {sch.avgScore !== null && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock size={13} /> Avg skor: <span className="font-bold text-violet-600">{sch.avgScore}/120</span>
                      </div>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                      {/* Status toggle */}
                      <div className="relative">
                        <select
                          value={sch.status}
                          onChange={e => handleStatusChange(sch.id, e.target.value)}
                          className="appearance-none rounded-lg border border-gray-200 py-1.5 pl-3 pr-7 text-xs font-medium text-gray-700 outline-none focus:border-violet-400"
                        >
                          <option value="active">Aktif</option>
                          <option value="draft">Draft</option>
                          <option value="closed">Tutup</option>
                        </select>
                        <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
                      </div>
                      <button
                        onClick={() => { setEditItem(sch); setForm({ ...form, title: sch.title, domainIds: sch.domainIds, durationMinutes: sch.durationMinutes, classId: sch.classId }); }}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(sch.id)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-500"
                      >
                        <Trash2 size={14} />
                      </button>
                      <Link
                        href={`/teacher/ujian/${sch.id}/recap`}
                        className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
                      >
                        Rekap <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Create Modal */}
        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            >
              <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
                className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
              >
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold">Buat Ujian Baru</h2>
                  <button onClick={() => setShowCreate(false)} className="rounded-lg p-1.5 hover:bg-gray-100"><X size={18} /></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Kelas</label>
                    <select value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400">
                      <option value="">Pilih kelas...</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name} – {c.subject}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Judul Ujian</label>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="contoh: Ujian Stoikiometri Semester 1"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400" />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-700">Pilih Kompetensi (TP)</label>
                    <div className="space-y-2">
                      {DOMAINS.map(d => (
                        <label key={d.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${form.domainIds.includes(d.id) ? 'border-violet-300 bg-violet-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                          <input type="checkbox" checked={form.domainIds.includes(d.id)} onChange={() => toggleDomain(d.id)} className="accent-violet-600" />
                          <span className="text-sm text-gray-700">{d.label}</span>
                        </label>
                      ))}
                    </div>
                    <p className="mt-1.5 text-xs text-gray-400">{form.domainIds.length} kompetensi dipilih · {form.domainIds.length * 3} soal total</p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Durasi (menit)</label>
                    <input type="number" value={form.durationMinutes} min={10} max={180}
                      onChange={e => setForm(f => ({ ...f, durationMinutes: parseInt(e.target.value) || 50 }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400" />
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button onClick={() => setShowCreate(false)} className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-700">Batal</button>
                  <button onClick={handleCreate} disabled={saving || !form.classId || !form.title || form.domainIds.length === 0}
                    className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-violet-700">
                    {saving ? 'Membuat...' : 'Buat Ujian'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Modal */}
        <AnimatePresence>
          {editItem && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            >
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
              >
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold">Edit Ujian</h2>
                  <button onClick={() => setEditItem(null)} className="rounded-lg p-1.5 hover:bg-gray-100"><X size={18} /></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Judul Ujian</label>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400" />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-700">Kompetensi (TP)</label>
                    <div className="space-y-2">
                      {DOMAINS.map(d => (
                        <label key={d.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${form.domainIds.includes(d.id) ? 'border-violet-300 bg-violet-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                          <input type="checkbox" checked={form.domainIds.includes(d.id)} onChange={() => toggleDomain(d.id)} className="accent-violet-600" />
                          <span className="text-sm text-gray-700">{d.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Durasi (menit)</label>
                    <input type="number" value={form.durationMinutes} min={10} max={180}
                      onChange={e => setForm(f => ({ ...f, durationMinutes: parseInt(e.target.value) || 50 }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400" />
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button onClick={() => setEditItem(null)} className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold">Batal</button>
                  <button onClick={handleEdit} disabled={saving}
                    className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-violet-700">
                    {saving ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirm */}
        <AnimatePresence>
          {deleteConfirm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            >
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
              >
                <h3 className="mb-2 font-bold">Hapus Ujian?</h3>
                <p className="mb-6 text-sm text-gray-500">Jadwal ujian akan dihapus. Sesi yang sudah berjalan tidak ikut terhapus.</p>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold">Batal</button>
                  <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white">Hapus</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </RoleGuard>
  );
};

export default TeacherUjianPage;
