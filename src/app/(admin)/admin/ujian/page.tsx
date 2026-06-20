'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FlaskConical, School, CalendarCheck, ClipboardList, BookOpen,
  RefreshCw, Plus, Pencil, Trash2, X, Check, ChevronDown, ChevronUp,
  AlertTriangle, Loader2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClassDoc {
  id: string; name: string; teacherId: string; teacherName: string;
  studentIds: string[]; joinCode: string; studentCount: number; createdAt: string | null;
}
interface ScheduleDoc {
  id: string; title: string; token: string; teacherId: string; teacherName: string;
  classId: string; domainIds: string[]; durationMinutes: number;
  status: 'active' | 'closed' | 'draft'; createdAt: string | null;
}
interface SessionDoc {
  id: string; studentId: string; studentName: string; scheduleId: string;
  status: string; numericScore: number | null; completedDomains: number;
  domainCount: number; comprehensionSummary: Record<string, number>;
  anomalyFlags: string[]; startedAt: string | null; completedAt: string | null;
}
interface QuestionDoc {
  id: string; domainId: string; domainName: string; stem: string;
  options: Record<string, string>; correctAnswer: string;
  tierPath: string; difficulty: string; cognitiveLevel: string; createdAt: string | null;
}
interface UjianData {
  classes: ClassDoc[];
  schedules: ScheduleDoc[];
  sessions: SessionDoc[];
  questions: QuestionDoc[];
  stats: {
    totalClasses: number; totalSchedules: number; totalSessions: number;
    completedSessions: number; avgNumericScore: number;
    comprehensionDistribution: Record<string, number>;
    domainPerformance: Record<string, { count: number; comprehensionCounts: Record<string, number> }>;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const COMPREHENSION_LABELS: Record<string, { label: string; color: string }> = {
  paham_konsep:   { label: 'Paham Konsep',   color: 'bg-emerald-100 text-emerald-700' },
  paham_sebagian: { label: 'Paham Sebagian',  color: 'bg-blue-100 text-blue-700' },
  tidak_paham:    { label: 'Tidak Paham',     color: 'bg-gray-100 text-gray-600' },
  miskonsepsi:    { label: 'Miskonsepsi',     color: 'bg-rose-100 text-rose-700' },
  hasil_nebak:    { label: 'Hasil Nebak',     color: 'bg-amber-100 text-amber-700' },
};

const DOMAIN_LABELS: Record<string, string> = {
  tp1: 'Konsep Mol', tp2: 'Rumus Kimia', tp3: 'Persamaan Reaksi',
  tp4: 'Perhitungan Stoikiometri', tp5: 'Stoikiometri Larutan',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  closed: 'bg-gray-100 text-gray-500',
  draft: 'bg-amber-50 text-amber-700',
  completed: 'bg-emerald-50 text-emerald-700',
  in_progress: 'bg-blue-50 text-blue-700',
  abandoned: 'bg-gray-100 text-gray-500',
};

// ── Inline editable row ───────────────────────────────────────────────────────

function EditableField({
  value, onSave, type = 'text', options,
}: {
  value: string | number; onSave: (v: string) => Promise<void>;
  type?: string; options?: string[];
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await onSave(val);
    setSaving(false);
    setEditing(false);
  };

  if (!editing) {
    return (
      <span className="group flex items-center gap-1 cursor-pointer" onClick={() => setEditing(true)}>
        <span className="text-xs text-gray-800">{String(value) || '—'}</span>
        <Pencil size={10} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1">
      {options ? (
        <select value={val} onChange={e => setVal(e.target.value)}
          className="rounded border border-gray-300 px-1 py-0.5 text-xs">
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={val} onChange={e => setVal(e.target.value)}
          className="rounded border border-gray-300 px-1 py-0.5 text-xs w-24 outline-none focus:border-violet-400" />
      )}
      {saving ? <Loader2 size={11} className="animate-spin text-violet-500" /> : (
        <>
          <button onClick={save} className="text-emerald-600 hover:text-emerald-700"><Check size={11} /></button>
          <button onClick={() => { setEditing(false); setVal(String(value)); }} className="text-gray-400 hover:text-gray-600"><X size={11} /></button>
        </>
      )}
    </span>
  );
}

// ── Expandable session row ────────────────────────────────────────────────────

function SessionRow({ s, onDelete }: { s: SessionDoc; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const total = Object.values(s.comprehensionSummary).reduce((a, b) => a + b, 0);
  return (
    <>
      <tr className="border-b border-gray-50 hover:bg-gray-50/50">
        <td className="py-2 pr-3">
          <p className="text-xs font-semibold text-gray-900">{s.studentName}</p>
          <p className="text-[10px] text-gray-400">{s.studentId.slice(0, 8)}</p>
        </td>
        <td className="py-2 pr-3">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[s.status] ?? 'bg-gray-100 text-gray-500'}`}>
            {s.status}
          </span>
        </td>
        <td className="py-2 pr-3 text-xs font-bold text-gray-900">
          {s.numericScore !== null ? s.numericScore : '—'}
        </td>
        <td className="py-2 pr-3 text-xs text-gray-600">{s.completedDomains}/{s.domainCount}</td>
        <td className="py-2 pr-3">
          {s.anomalyFlags.length > 0 && (
            <span title={s.anomalyFlags.join(', ')}>
              <AlertTriangle size={12} className="text-amber-500" />
            </span>
          )}
        </td>
        <td className="py-2 pr-3 text-[10px] text-gray-400 whitespace-nowrap">{fmtDate(s.completedAt)}</td>
        <td className="py-2">
          <div className="flex items-center gap-1">
            <button onClick={() => setExpanded(v => !v)} className="text-gray-400 hover:text-violet-600">
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            <button onClick={onDelete} className="text-gray-300 hover:text-rose-500">
              <Trash2 size={12} />
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-violet-50/40">
          <td colSpan={7} className="px-4 pb-3 pt-2">
            <p className="mb-2 text-[10px] font-bold text-gray-600">Distribusi Kategori Pemahaman ({total} domain)</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(COMPREHENSION_LABELS).map(([cat, { label, color }]) => (
                <span key={cat} className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${color}`}>
                  {label}: {s.comprehensionSummary[cat] ?? 0}
                </span>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Question form modal ───────────────────────────────────────────────────────

const BLANK_Q = {
  domainId: 'tp1', domainName: 'Konsep Mol', stem: '',
  options: { A: '', B: '', C: '', D: '', E: '' },
  correctAnswer: 'A', tierPath: 'K1', difficulty: 'moderate', cognitiveLevel: 'C2',
};

function QuestionModal({
  initial, onClose, onSave,
}: {
  initial?: Partial<typeof BLANK_Q & { id: string }>;
  onClose: () => void;
  onSave: (data: typeof BLANK_Q) => Promise<void>;
}) {
  const baseOptions = { A: '', B: '', C: '', D: '', E: '' };
  const initOptions = initial?.options
    ? { A: (initial.options as Record<string, string>).A ?? '', B: (initial.options as Record<string, string>).B ?? '', C: (initial.options as Record<string, string>).C ?? '', D: (initial.options as Record<string, string>).D ?? '', E: (initial.options as Record<string, string>).E ?? '' }
    : baseOptions;
  const [form, setForm] = useState({ ...BLANK_Q, ...initial, options: initOptions });
  const [saving, setSaving] = useState(false);

  const domainOptions = Object.entries(DOMAIN_LABELS);
  const answerKeys = ['A', 'B', 'C', 'D', 'E'];
  const tierPaths = ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7'];

  const handleSave = async () => {
    if (!form.stem.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl rounded-2xl bg-white shadow-xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-bold text-gray-900">{initial?.id ? 'Edit Soal' : 'Tambah Soal'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">Domain</label>
              <select value={form.domainId}
                onChange={e => {
                  const name = DOMAIN_LABELS[e.target.value] ?? e.target.value;
                  setForm(f => ({ ...f, domainId: e.target.value, domainName: name }));
                }}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-400">
                {domainOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">Tier Path</label>
              <select value={form.tierPath} onChange={e => setForm(f => ({ ...f, tierPath: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-400">
                {tierPaths.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">Kesulitan</label>
              <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-400">
                {['easy', 'moderate', 'hard'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">Level Kognitif</label>
              <select value={form.cognitiveLevel} onChange={e => setForm(f => ({ ...f, cognitiveLevel: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-400">
                {['C1','C2','C3','C4','C5','C6'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">Stem Soal</label>
            <textarea value={form.stem} onChange={e => setForm(f => ({ ...f, stem: e.target.value }))}
              rows={3} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-400 resize-none" />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-700">Pilihan Jawaban</label>
            {answerKeys.map(k => (
              <div key={k} className="flex items-center gap-2">
                <button
                  onClick={() => setForm(f => ({ ...f, correctAnswer: k }))}
                  className={`h-6 w-6 shrink-0 rounded-full border-2 text-[10px] font-black transition-colors ${form.correctAnswer === k ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-200 text-gray-400'}`}>
                  {k}
                </button>
                <input value={(form.options as Record<string, string>)[k] ?? ''} onChange={e => setForm(f => ({ ...f, options: { ...f.options, [k]: e.target.value } }))}
                  placeholder={`Pilihan ${k}`}
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-violet-400" />
              </div>
            ))}
            <p className="text-[10px] text-gray-400">Klik tombol huruf untuk menandai jawaban benar</p>
          </div>
        </div>
        <div className="flex gap-3 border-t border-gray-100 px-5 py-4">
          <button onClick={onClose} className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200">
            Batal
          </button>
          <button onClick={handleSave} disabled={saving || !form.stem.trim()}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-40">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {initial?.id ? 'Simpan Perubahan' : 'Tambah Soal'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = 'stats' | 'classes' | 'schedules' | 'sessions' | 'questions';

const AdminUjianPage: FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('stats');
  const [data, setData] = useState<UjianData | null>(null);
  const [loading, setLoading] = useState(true);
  const [questionModal, setQuestionModal] = useState<{ open: boolean; doc?: QuestionDoc }>({ open: false });
  const [scheduleFilter, setScheduleFilter] = useState('');
  const [sessionSearch, setSessionSearch] = useState('');
  const [questionSearch, setQuestionSearch] = useState('');

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/ujian', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setData(await res.json());
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const apiCall = useCallback(async (method: string, body?: object, params?: string) => {
    if (!user) return;
    const token = await user.getIdToken();
    const url = `/api/admin/ujian${params ? `?${params}` : ''}`;
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }, [user]);

  const patchField = async (collection: string, id: string, field: string, value: unknown) => {
    await apiCall('PATCH', { collection, id, data: { [field]: value } });
    await fetchData();
  };

  const deleteDoc = async (collection: string, id: string) => {
    if (!confirm('Yakin ingin menghapus data ini?')) return;
    await apiCall('DELETE', undefined, `collection=${collection}&id=${id}`);
    await fetchData();
  };

  const saveQuestion = async (qData: typeof BLANK_Q, id?: string) => {
    if (id) {
      await apiCall('PATCH', { collection: 'exam_questions', id, data: qData });
    } else {
      await apiCall('POST', { collection: 'exam_questions', data: qData });
    }
    await fetchData();
  };

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
    </div>
  );

  if (!data) return null;

  const tabs: { key: Tab; label: string; icon: typeof FlaskConical; count?: number }[] = [
    { key: 'stats', label: 'Statistik', icon: FlaskConical },
    { key: 'classes', label: 'Kelas', icon: School, count: data.classes.length },
    { key: 'schedules', label: 'Jadwal Ujian', icon: CalendarCheck, count: data.schedules.length },
    { key: 'sessions', label: 'Sesi & Hasil', icon: ClipboardList, count: data.sessions.length },
    { key: 'questions', label: 'Bank Soal MSAT', icon: BookOpen, count: data.questions.length },
  ];

  const filteredSessions = data.sessions.filter(s =>
    !sessionSearch || s.studentName.toLowerCase().includes(sessionSearch.toLowerCase()) || s.scheduleId.includes(sessionSearch)
  );
  const filteredQuestions = data.questions.filter(q =>
    !questionSearch || q.stem.toLowerCase().includes(questionSearch.toLowerCase()) || q.domainId.includes(questionSearch) || q.tierPath.includes(questionSearch)
  );
  const filteredSchedules = data.schedules.filter(s =>
    !scheduleFilter || s.title.toLowerCase().includes(scheduleFilter.toLowerCase()) || s.token.includes(scheduleFilter.toUpperCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-fuchsia-50 text-fuchsia-600">
            <FlaskConical size={20} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-gray-900">MSAT Ujian</h1>
            <p className="text-sm text-gray-500">Kelola kelas, jadwal ujian, soal, dan hasil sesi</p>
          </div>
        </div>
        <button onClick={fetchData}
          className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl bg-gray-100 p-1">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all ${tab === t.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              <Icon size={13} />
              {t.label}
              {t.count !== undefined && (
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${tab === t.key ? 'bg-violet-100 text-violet-700' : 'bg-gray-200 text-gray-500'}`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Stats Tab */}
      {tab === 'stats' && (
        <div className="space-y-4">
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: 'Total Kelas', value: data.stats.totalClasses, sub: 'kelas aktif', color: 'text-cyan-600', bg: 'bg-cyan-50', icon: School },
              { label: 'Jadwal Ujian', value: data.stats.totalSchedules, sub: 'jadwal dibuat', color: 'text-violet-600', bg: 'bg-violet-50', icon: CalendarCheck },
              { label: 'Total Sesi', value: data.stats.totalSessions, sub: `${data.stats.completedSessions} selesai`, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: ClipboardList },
              { label: 'Skor MSAT Rata2', value: data.stats.avgNumericScore, sub: 'dari sesi selesai', color: 'text-fuchsia-600', bg: 'bg-fuchsia-50', icon: FlaskConical },
            ].map((k, i) => {
              const Icon = k.icon;
              return (
                <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className={`mb-2 inline-flex rounded-xl p-2 ${k.bg}`}>
                    <Icon size={16} className={k.color} />
                  </div>
                  <p className="font-display text-2xl font-black text-gray-900">{k.value}</p>
                  <p className="text-[11px] font-semibold text-gray-700">{k.label}</p>
                  <p className="text-[10px] text-gray-400">{k.sub}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Comprehension distribution */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="mb-4 text-sm font-bold text-gray-900">Distribusi Kategori Pemahaman (seluruh domain)</p>
            <div className="space-y-3">
              {Object.entries(COMPREHENSION_LABELS).map(([cat, { label, color }]) => {
                const val = data.stats.comprehensionDistribution[cat] ?? 0;
                const total = Object.values(data.stats.comprehensionDistribution).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                return (
                  <div key={cat}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${color}`}>{label}</span>
                      <span className="font-bold text-gray-900">{val} <span className="font-normal text-gray-400">({pct}%)</span></span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, delay: 0.1 }}
                        className="h-full rounded-full bg-violet-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Domain performance */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="mb-4 text-sm font-bold text-gray-900">Performa per Domain</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] text-gray-400">
                    <th className="pb-2 text-left font-medium">Domain</th>
                    <th className="pb-2 text-left font-medium">Total Respons</th>
                    {Object.values(COMPREHENSION_LABELS).map(({ label }) => (
                      <th key={label} className="pb-2 text-left font-medium">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {Object.entries(data.stats.domainPerformance).map(([domainId, perf]) => (
                    <tr key={domainId} className="hover:bg-gray-50">
                      <td className="py-2 pr-3">
                        <p className="font-semibold text-gray-900">{DOMAIN_LABELS[domainId] ?? domainId}</p>
                        <p className="text-[9px] text-gray-400">{domainId}</p>
                      </td>
                      <td className="py-2 pr-3 font-bold text-gray-900">{perf.count}</td>
                      {Object.keys(COMPREHENSION_LABELS).map(cat => (
                        <td key={cat} className="py-2 pr-3 text-gray-600">{perf.comprehensionCounts[cat] ?? 0}</td>
                      ))}
                    </tr>
                  ))}
                  {Object.keys(data.stats.domainPerformance).length === 0 && (
                    <tr><td colSpan={7} className="py-6 text-center text-xs text-gray-400">Belum ada data sesi</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}

      {/* Classes Tab */}
      {tab === 'classes' && (
        <div className="rounded-3xl bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-900">Daftar Kelas ({data.classes.length})</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-[10px] text-gray-400">
                  <th className="px-5 py-3 text-left font-medium">Nama Kelas</th>
                  <th className="px-3 py-3 text-left font-medium">Guru</th>
                  <th className="px-3 py-3 text-left font-medium">Join Code</th>
                  <th className="px-3 py-3 text-left font-medium">Siswa</th>
                  <th className="px-3 py-3 text-left font-medium">Dibuat</th>
                  <th className="px-3 py-3 text-left font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.classes.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3">
                      <EditableField value={c.name} onSave={v => patchField('classes', c.id, 'name', v)} />
                    </td>
                    <td className="px-3 py-3 text-gray-600">{c.teacherName}</td>
                    <td className="px-3 py-3">
                      <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-violet-700">{c.joinCode}</code>
                    </td>
                    <td className="px-3 py-3 font-bold text-gray-900">{c.studentCount}</td>
                    <td className="px-3 py-3 text-[10px] text-gray-400 whitespace-nowrap">{fmtDate(c.createdAt)}</td>
                    <td className="px-3 py-3">
                      <button onClick={() => deleteDoc('classes', c.id)} className="text-gray-300 hover:text-rose-500">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {data.classes.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-xs text-gray-400">Belum ada kelas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Schedules Tab */}
      {tab === 'schedules' && (
        <div className="rounded-3xl bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-900">Jadwal Ujian ({filteredSchedules.length})</p>
            <input value={scheduleFilter} onChange={e => setScheduleFilter(e.target.value)}
              placeholder="Cari judul atau token..."
              className="ml-auto rounded-xl border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-violet-400 w-52" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-[10px] text-gray-400">
                  <th className="px-5 py-3 text-left font-medium">Judul</th>
                  <th className="px-3 py-3 text-left font-medium">Token</th>
                  <th className="px-3 py-3 text-left font-medium">Guru</th>
                  <th className="px-3 py-3 text-left font-medium">Domain</th>
                  <th className="px-3 py-3 text-left font-medium">Durasi</th>
                  <th className="px-3 py-3 text-left font-medium">Status</th>
                  <th className="px-3 py-3 text-left font-medium">Dibuat</th>
                  <th className="px-3 py-3 text-left font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredSchedules.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3">
                      <EditableField value={s.title} onSave={v => patchField('exam_schedules', s.id, 'title', v)} />
                    </td>
                    <td className="px-3 py-3">
                      <code className="rounded bg-violet-50 px-2 py-0.5 font-mono font-bold text-violet-700">{s.token}</code>
                    </td>
                    <td className="px-3 py-3 text-gray-600">{s.teacherName}</td>
                    <td className="px-3 py-3 font-bold text-gray-900">{s.domainIds?.length ?? 0}</td>
                    <td className="px-3 py-3 text-gray-600">
                      <EditableField value={s.durationMinutes} type="number"
                        onSave={v => patchField('exam_schedules', s.id, 'durationMinutes', parseInt(v))} />
                      <span className="text-[9px] text-gray-400"> menit</span>
                    </td>
                    <td className="px-3 py-3">
                      <EditableField value={s.status} options={['active', 'closed', 'draft']}
                        onSave={v => patchField('exam_schedules', s.id, 'status', v)} />
                    </td>
                    <td className="px-3 py-3 text-[10px] text-gray-400 whitespace-nowrap">{fmtDate(s.createdAt)}</td>
                    <td className="px-3 py-3">
                      <button onClick={() => deleteDoc('exam_schedules', s.id)} className="text-gray-300 hover:text-rose-500">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredSchedules.length === 0 && (
                  <tr><td colSpan={8} className="py-8 text-center text-xs text-gray-400">Tidak ada jadwal ditemukan</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {tab === 'sessions' && (
        <div className="rounded-3xl bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-900">Sesi Ujian ({filteredSessions.length})</p>
            <input value={sessionSearch} onChange={e => setSessionSearch(e.target.value)}
              placeholder="Cari nama siswa atau jadwal ID..."
              className="ml-auto rounded-xl border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-violet-400 w-52" />
          </div>
          {/* Comprehension summary bar */}
          <div className="flex gap-2 flex-wrap px-5 py-3 border-b border-gray-50 bg-gray-50/50">
            {Object.entries(COMPREHENSION_LABELS).map(([cat, { label, color }]) => {
              const total = data.sessions.filter(s => s.status === 'completed')
                .reduce((sum, s) => sum + (s.comprehensionSummary[cat] ?? 0), 0);
              return (
                <span key={cat} className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${color}`}>
                  {label}: {total}
                </span>
              );
            })}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-[10px] text-gray-400">
                  <th className="px-5 py-3 text-left font-medium">Siswa</th>
                  <th className="px-3 py-3 text-left font-medium">Status</th>
                  <th className="px-3 py-3 text-left font-medium">Skor</th>
                  <th className="px-3 py-3 text-left font-medium">Domain Selesai</th>
                  <th className="px-3 py-3 text-left font-medium">Flag</th>
                  <th className="px-3 py-3 text-left font-medium">Selesai</th>
                  <th className="px-3 py-3 text-left font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map(s => (
                  <SessionRow key={s.id} s={s} onDelete={() => deleteDoc('exam_sessions', s.id)} />
                ))}
                {filteredSessions.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-xs text-gray-400">Tidak ada sesi ditemukan</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Questions Tab */}
      {tab === 'questions' && (
        <div className="rounded-3xl bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-900">Bank Soal MSAT ({filteredQuestions.length})</p>
            <input value={questionSearch} onChange={e => setQuestionSearch(e.target.value)}
              placeholder="Cari stem, domain, tier..."
              className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-violet-400 w-52" />
            <button onClick={() => setQuestionModal({ open: true })}
              className="ml-auto flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-700">
              <Plus size={13} /> Tambah Soal
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-[10px] text-gray-400">
                  <th className="px-5 py-3 text-left font-medium">Stem</th>
                  <th className="px-3 py-3 text-left font-medium">Domain</th>
                  <th className="px-3 py-3 text-left font-medium">Tier</th>
                  <th className="px-3 py-3 text-left font-medium">Kesulitan</th>
                  <th className="px-3 py-3 text-left font-medium">Kognitif</th>
                  <th className="px-3 py-3 text-left font-medium">Jawaban</th>
                  <th className="px-3 py-3 text-left font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredQuestions.map(q => (
                  <tr key={q.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-2.5 max-w-xs">
                      <p className="line-clamp-2 text-gray-800">{q.stem}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-gray-900">{DOMAIN_LABELS[q.domainId] ?? q.domainId}</p>
                      <p className="text-[9px] text-gray-400">{q.domainId}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{q.tierPath}</code>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        q.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-700'
                        : q.difficulty === 'hard' ? 'bg-rose-50 text-rose-700'
                        : 'bg-amber-50 text-amber-700'
                      }`}>{q.difficulty}</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-gray-600">{q.cognitiveLevel}</td>
                    <td className="px-3 py-2.5">
                      <span className="font-black text-emerald-600">{q.correctAnswer}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setQuestionModal({ open: true, doc: q })}
                          className="text-gray-400 hover:text-violet-600">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => deleteDoc('exam_questions', q.id)}
                          className="text-gray-300 hover:text-rose-500">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredQuestions.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-xs text-gray-400">Tidak ada soal ditemukan</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Question Modal */}
      {questionModal.open && (
        <QuestionModal
          initial={questionModal.doc as Parameters<typeof QuestionModal>[0]['initial']}
          onClose={() => setQuestionModal({ open: false })}
          onSave={data => saveQuestion(data, questionModal.doc?.id)}
        />
      )}
    </div>
  );
};

export default AdminUjianPage;
