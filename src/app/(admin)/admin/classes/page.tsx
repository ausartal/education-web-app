'use client';

import { FC, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  School, Search, RefreshCw, Copy, Trash2, Users,
  ChevronDown, ChevronUp, Check, Plus, Pencil, X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import { useAdminConfirm } from '@/components/admin/ConfirmProvider';
import { TaxonomyPicker } from '@/components/admin/TaxonomyPicker';
import { ContentTaxonomy } from '@/types/taxonomy';

interface ClassDoc {
  id: string;
  name: string;
  teacherId: string;
  teacherName: string;
  studentIds: string[];
  joinCode: string;
  studentCount: number;
  createdAt: string | null;
  subject?: string;
  status?: 'active' | 'archived';
  taxonomy?: ContentTaxonomy;
}

interface UserRecord {
  uid: string;
  displayName: string;
  role?: string;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

const Skeleton: FC = () => (
  <tr>
    {Array.from({ length: 6 }).map((_, i) => (
      <td key={i} className="px-4 py-3.5">
        <div className="h-4 animate-pulse rounded bg-slate-100" />
      </td>
    ))}
  </tr>
);

const AdminClasses: FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const confirmAction = useAdminConfirm();
  const [classes, setClasses] = useState<ClassDoc[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<UserRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<ClassDoc | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', teacherId: '', status: 'active' as 'active' | 'archived', taxonomy: {} as ContentTaxonomy });

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const [ujianRes, usersRes] = await Promise.all([
        fetch('/api/admin/ujian', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!ujianRes.ok) throw new Error('Failed to fetch');
      const ujianData = await ujianRes.json();
      setClasses(ujianData.classes as ClassDoc[]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        const map: Record<string, string> = {};
        for (const u of (usersData.users as UserRecord[])) {
          map[u.uid] = u.displayName ?? u.uid.slice(0, 8);
        }
        setUserMap(map);
        setTeachers((usersData.users as UserRecord[]).filter(item => item.role === 'teacher'));
      }
    } catch {
      addToast('error', 'Gagal memuat data kelas');
    } finally {
      setLoading(false);
    }
  }, [user, addToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(id);
      addToast('success', 'Kode bergabung disalin');
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const openCreate = () => {
    setEditTarget(null);
    setForm({ name: '', teacherId: '', status: 'active', taxonomy: {} });
    setShowForm(true);
  };

  const openEdit = (classItem: ClassDoc) => {
    setEditTarget(classItem);
    setForm({ name: classItem.name, teacherId: classItem.teacherId, status: classItem.status ?? 'active', taxonomy: classItem.taxonomy ?? {} });
    setShowForm(true);
  };

  const saveClass = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/ujian', {
        method: editTarget ? 'PATCH' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(editTarget
          ? { collection: 'classes', id: editTarget.id, data: { ...form, subject: form.taxonomy.subject?.name ?? editTarget.subject ?? '' } }
          : { collection: 'classes', data: { ...form, subject: form.taxonomy.subject?.name ?? '' } }),
      });
      if (!response.ok) throw new Error();
      setShowForm(false);
      addToast('success', editTarget ? 'Kelas diperbarui' : 'Kelas dibuat');
      await fetchData();
    } catch {
      addToast('error', 'Kelas gagal disimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!(await confirmAction({ title: 'Hapus kelas?', description: `Kelas "${name}" akan dihapus permanen beserta relasi yang terkait.`, confirmLabel: 'Hapus kelas', tone: 'danger' }))) return;
    if (!user) return;
    setDeletingId(id);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/ujian?collection=classes&id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setClasses(prev => prev.filter(c => c.id !== id));
      addToast('success', `Kelas "${name}" dihapus`);
    } catch {
      addToast('error', 'Gagal menghapus kelas');
    } finally {
      setDeletingId(null);
    }
  };

  const getStudentNames = (studentIds: string[]): string[] => {
    if (!studentIds?.length) return [];
    return studentIds.map(id => userMap[id] ?? id.slice(0, 12));
  };

  const filtered = classes.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.teacherName?.toLowerCase().includes(q) ||
      c.joinCode?.toLowerCase().includes(q)
    );
  });

  const totalStudents = classes.reduce((sum, c) => sum + c.studentCount, 0);
  const avgStudents = classes.length > 0 ? Math.round(totalStudents / classes.length) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
            <School size={18} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-slate-900">Manajemen Kelas</h1>
            <p className="text-sm text-slate-500">{classes.length} kelas terdaftar</p>
          </div>
        </div>
        <div className="flex items-center gap-2"><button onClick={fetchData}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors">
          <RefreshCw size={13} /> Refresh
        </button><button onClick={openCreate} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"><Plus size={14} /> Buat kelas</button></div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Kelas', value: classes.length, color: 'text-cyan-600' },
          { label: 'Total Siswa', value: totalStudents, color: 'text-blue-600' },
          { label: 'Rata-rata Siswa/Kelas', value: avgStudents, color: 'text-emerald-600' },
        ].map(s => (
          <motion.div key={s.label}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className={`font-display text-2xl font-extrabold ${s.color}`}>
              {loading ? '—' : s.value}
            </p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama kelas, guru, atau kode bergabung..."
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-colors" />
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-500">
              <th className="px-5 py-3.5 font-medium">Nama Kelas</th>
              <th className="px-4 py-3.5 font-medium">Guru</th>
              <th className="px-4 py-3.5 font-medium">Kode Bergabung</th>
              <th className="px-4 py-3.5 font-medium text-center">Siswa</th>
              <th className="px-4 py-3.5 font-medium">Dibuat</th>
              <th className="px-4 py-3.5 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} />)
              : filtered.map((c, i) => (
                <motion.tr key={c.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="cursor-pointer hover:bg-slate-50/50 transition-colors"
                  onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-500 text-xs font-bold text-white">
                        {c.name?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{c.name}</p>
                        <p className="text-[10px] text-slate-400">{c.taxonomy?.subject?.name ?? c.subject ?? 'Belum dikategorikan'} · {c.status ?? 'active'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">{c.teacherName}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <code className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-cyan-700 tracking-wider">
                        {c.joinCode}
                      </code>
                      <button onClick={e => { e.stopPropagation(); handleCopyCode(c.joinCode, c.id); }}
                        className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-cyan-50 hover:text-cyan-600"
                        title="Salin kode">
                        {copiedId === c.id
                          ? <Check size={13} className="text-emerald-500" />
                          : <Copy size={13} />}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Users size={13} className="text-slate-400" />
                      <span className={`font-bold ${c.studentCount > 0 ? 'text-blue-600' : 'text-slate-300'}`}>
                        {c.studentCount}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                    {fmtDate(c.createdAt)}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openEdit(c)} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600" title="Edit kelas"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(c.id, c.name)}
                        disabled={deletingId === c.id}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                        title="Hapus kelas">
                        {deletingId === c.id
                          ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
                          : <Trash2 size={14} />}
                      </button>
                      <button className="text-slate-300 hover:text-slate-500 transition-colors">
                        {expandedId === c.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))
            }
            {!loading && filtered.map(c => (
              expandedId === c.id && (
                <motion.tr key={`${c.id}-expanded`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-slate-50/60">
                  <td colSpan={6} className="px-8 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Users size={14} className="text-cyan-500" />
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Siswa Terdaftar ({c.studentCount})
                      </p>
                    </div>
                    {c.studentIds?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {getStudentNames(c.studentIds).map((name, idx) => (
                          <span key={c.studentIds[idx]}
                            className="rounded-full bg-white border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
                            {name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Belum ada siswa yang bergabung</p>
                    )}
                  </td>
                </motion.tr>
              )
            ))}
          </tbody>
        </table>

        <AnimatePresence>
          {!loading && filtered.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="py-16 text-center">
              <School size={36} className="mx-auto mb-3 text-slate-200" />
              <p className="text-sm font-medium text-slate-400">
                {search ? 'Tidak ada kelas yang cocok dengan pencarian' : 'Belum ada kelas terdaftar'}
              </p>
              {search && (
                <button onClick={() => setSearch('')}
                  className="mt-2 text-xs font-semibold text-cyan-600 hover:underline">
                  Hapus filter
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <AnimatePresence>
        {showForm && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4" onMouseDown={event => { if (event.target === event.currentTarget) setShowForm(false); }}><motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }} className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-start justify-between"><div><h2 className="text-lg font-bold text-slate-900">{editTarget ? 'Edit kelas' : 'Buat kelas baru'}</h2><p className="mt-1 text-xs text-slate-500">Hubungkan kelas dengan guru dan struktur mata pelajaran yang tepat.</p></div><button type="button" onClick={() => setShowForm(false)} aria-label="Tutup" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={17} /></button></div><form onSubmit={saveClass} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-1 block text-xs font-semibold text-slate-700">Nama kelas *</label><input required value={form.name} onChange={event => setForm(previous => ({ ...previous, name: event.target.value }))} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500" /></div><div><label className="mb-1 block text-xs font-semibold text-slate-700">Guru *</label><select required value={form.teacherId} onChange={event => setForm(previous => ({ ...previous, teacherId: event.target.value }))} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500"><option value="">Pilih guru</option>{teachers.map(teacher => <option key={teacher.uid} value={teacher.uid}>{teacher.displayName}</option>)}</select></div></div><TaxonomyPicker value={form.taxonomy} requiredThrough="subject" onChange={taxonomy => setForm(previous => ({ ...previous, taxonomy }))} /><div><label className="mb-1 block text-xs font-semibold text-slate-700">Status</label><select value={form.status} onChange={event => setForm(previous => ({ ...previous, status: event.target.value as 'active' | 'archived' }))} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="active">Aktif</option><option value="archived">Diarsipkan</option></select></div><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Batal</button><button disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Menyimpan...' : 'Simpan kelas'}</button></div></form></motion.div></motion.div>}
      </AnimatePresence>
    </div>
  );
};

export default AdminClasses;
