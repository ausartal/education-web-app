'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { useLivePoll } from '@/hooks/useLivePoll';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, ClipboardCheck, PlusCircle, Trash2, Calendar, X, Loader2, AlertTriangle, Link2, Star } from 'lucide-react';
import { RichEditor } from '@/components/teacher/RichEditor';
import { useToast } from '@/hooks/useToast';
import { stripMarkdown } from '@/lib/strip-markdown';
import { Assignment, SubmissionsData, fmtDate, fmtDateTime, EmptyState } from './shared';

interface AssignmentsTabProps {
  classId: string;
  authToken: () => Promise<string>;
}

export const AssignmentsTab: FC<AssignmentsTabProps> = ({ classId, authToken }) => {
  const id = classId;
  const { addToast } = useToast();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingAsgn, setLoadingAsgn] = useState(false);
  const [showCreateAsgn, setShowCreateAsgn] = useState(false);
  const [asgnForm, setAsgnForm] = useState({ title: '', description: '', dueDate: '', maxScore: 100, allowLate: false });
  const [savingAsgn, setSavingAsgn] = useState(false);
  const [viewSubmissions, setViewSubmissions] = useState<Assignment | null>(null);
  const [submissionsData, setSubmissionsData] = useState<SubmissionsData | null>(null);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [gradeInputs, setGradeInputs] = useState<Record<string, { grade: string; note: string }>>({});
  const [savingGrade, setSavingGrade] = useState<Record<string, boolean>>({});

  const fetchAssignments = useCallback(async (silent?: unknown) => {
    if (silent !== true) setLoadingAsgn(true);
    try {
      const t = await authToken();
      const res = await fetch(`/api/teacher/assignments?classId=${id}`, { headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) return;
      const data = await res.json();
      setAssignments(data.assignments ?? []);
    } finally {
      setLoadingAsgn(false);
    }
  }, [id, authToken]);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);
  useLivePoll(() => fetchAssignments(true));

  const [reminding, setReminding] = useState(false);

  const handleRemind = async (asgnId: string) => {
    setReminding(true);
    try {
      const t = await authToken();
      const res = await fetch(`/api/teacher/assignments/${asgnId}/remind`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Gagal mengirim pengingat');
      addToast('success', `Pengingat dikirim ke ${data.reminded} siswa`);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Gagal mengirim pengingat');
    } finally {
      setReminding(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!asgnForm.title.trim()) { addToast('error', 'Judul tugas wajib diisi'); return; }
    setSavingAsgn(true);
    try {
      const t = await authToken();
      const res = await fetch('/api/teacher/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ ...asgnForm, classId: id }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      addToast('success', 'Tugas berhasil dibuat');
      setShowCreateAsgn(false);
      setAsgnForm({ title: '', description: '', dueDate: '', maxScore: 100, allowLate: false });
      await fetchAssignments();
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Gagal membuat tugas');
    } finally {
      setSavingAsgn(false);
    }
  };

  const handleViewSubmissions = async (asgn: Assignment) => {
    setViewSubmissions(asgn);
    setSubmissionsData(null);
    setLoadingSubmissions(true);
    setGradeInputs({});
    try {
      const t = await authToken();
      const res = await fetch(`/api/teacher/assignments/${asgn.id}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data: SubmissionsData = await res.json();
        setSubmissionsData(data);
        const initGrades: Record<string, { grade: string; note: string }> = {};
        data.submitted.forEach(s => {
          initGrades[s.studentId] = {
            grade: typeof s.grade === 'number' ? String(s.grade) : '',
            note: s.gradeNote ?? '',
          };
        });
        setGradeInputs(initGrades);
      }
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleGradeSubmission = async (asgnId: string, studentId: string, maxScore: number) => {
    const input = gradeInputs[studentId];
    if (!input) return;
    const grade = Number(input.grade);
    if (isNaN(grade) || grade < 0 || grade > maxScore) {
      addToast('error', `Nilai harus antara 0 dan ${maxScore}`);
      return;
    }
    setSavingGrade(g => ({ ...g, [studentId]: true }));
    try {
      const t = await authToken();
      const res = await fetch(`/api/teacher/assignments/${asgnId}/grade`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ studentId, grade, gradeNote: input.note }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Gagal');
      setSubmissionsData(prev => prev ? {
        ...prev,
        submitted: prev.submitted.map(s =>
          s.studentId === studentId ? { ...s, grade, gradeNote: input.note } : s
        ),
      } : prev);
      addToast('success', 'Nilai berhasil disimpan');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Gagal menyimpan nilai');
    } finally {
      setSavingGrade(g => ({ ...g, [studentId]: false }));
    }
  };

  const handleDeleteAssignment = async (asgnId: string) => {
    if (!confirm('Hapus tugas ini?')) return;
    try {
      const t = await authToken();
      await fetch(`/api/teacher/assignments/${asgnId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${t}` },
      });
      setAssignments(prev => prev.filter(a => a.id !== asgnId));
      addToast('success', 'Tugas dihapus');
    } catch {
      addToast('error', 'Gagal menghapus tugas');
    }
  };

  return (
      <motion.div key="tugas" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">{assignments.length} tugas</p>
          <button
            onClick={() => setShowCreateAsgn(true)}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
          >
            <PlusCircle size={14} /> Buat Tugas
          </button>
        </div>

        {loadingAsgn ? (
          <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" /></div>
        ) : assignments.length === 0 ? (
          <EmptyState icon={<ClipboardCheck size={32} />} title="Belum ada tugas" description="Buat tugas untuk siswa di kelas ini" />
        ) : (
          <div className="space-y-3">
            {assignments.map((a, i) => {
              const isOverdue = a.dueDate && new Date(a.dueDate) < new Date();
              const plainDesc = a.description ? stripMarkdown(a.description) : '';
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-2xl bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-gray-900">{a.title}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isOverdue ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {isOverdue ? 'Lewat batas' : a.status === 'published' ? 'Aktif' : 'Draf'}
                        </span>
                        {a.allowLate && (
                          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-600">
                            Boleh terlambat
                          </span>
                        )}
                      </div>
                      {plainDesc && (
                        <p className="mt-1 line-clamp-2 text-xs text-gray-500">{plainDesc}</p>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                        {a.dueDate && (
                          <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : ''}`}>
                            <Calendar size={10} /> Batas: {fmtDate(a.dueDate)}
                          </span>
                        )}
                        <span>Nilai maks: {a.maxScore}</span>
                      </div>
                      <button
                        onClick={() => handleViewSubmissions(a)}
                        className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                      >
                        <ClipboardCheck size={12} />
                        {a.submissionCount ?? 0} pengumpulan · Lihat Detail
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDeleteAssignment(a.id)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Submissions Modal */}
        <AnimatePresence>
          {viewSubmissions && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
              onClick={e => { if (e.target === e.currentTarget) setViewSubmissions(null); }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Pengumpulan Tugas</h3>
                    <p className="text-xs text-gray-400">{viewSubmissions.title}</p>
                  </div>
                  <button onClick={() => setViewSubmissions(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                  {loadingSubmissions ? (
                    <div className="flex justify-center py-10"><div className="h-7 w-7 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" /></div>
                  ) : submissionsData ? (
                    <>
                      {submissionsData.submitted.length > 0 && (
                        <div className="p-4">
                          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-emerald-600">Sudah Mengumpulkan ({submissionsData.submitted.length})</p>
                          <div className="space-y-2">
                            {submissionsData.submitted.map(s => (
                              <div key={s.studentId} className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 space-y-2">
                                <div className="flex flex-wrap items-center gap-2 justify-between">
                                  <p className="text-sm font-semibold text-gray-800">{s.studentName}</p>
                                  <div className="flex items-center gap-1.5">
                                    {s.isLate && (
                                      <span className="flex items-center gap-0.5 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-600">
                                        <AlertTriangle size={9} /> Terlambat
                                      </span>
                                    )}
                                    {s.submittedAt && (
                                      <span className="text-[10px] text-gray-400">{fmtDateTime(s.submittedAt)}</span>
                                    )}
                                  </div>
                                </div>
                                {s.text && (
                                  <p className="text-xs text-gray-600 whitespace-pre-wrap">{s.text}</p>
                                )}
                                {s.links && s.links.length > 0 && (
                                  <div className="space-y-1">
                                    {s.links.map((link, i) => (
                                      <a key={i} href={link} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-xs text-violet-600 hover:underline truncate">
                                        <Link2 size={11} className="shrink-0" /> {link}
                                      </a>
                                    ))}
                                  </div>
                                )}
                                {/* Grading */}
                                <div className="border-t border-emerald-200 pt-2">
                                  {typeof s.grade === 'number' && (
                                    <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-violet-600">
                                      <Star size={11} /> Nilai saat ini: {s.grade}/{viewSubmissions!.maxScore}
                                      {s.gradeNote && <span className="font-normal text-gray-500"> — {s.gradeNote}</span>}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min={0}
                                      max={viewSubmissions!.maxScore}
                                      value={gradeInputs[s.studentId]?.grade ?? ''}
                                      onChange={e => setGradeInputs(g => ({ ...g, [s.studentId]: { ...(g[s.studentId] ?? { grade: '', note: '' }), grade: e.target.value } }))}
                                      placeholder={`0–${viewSubmissions!.maxScore}`}
                                      className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-violet-300 focus:ring-1 focus:ring-violet-100"
                                    />
                                    <input
                                      type="text"
                                      value={gradeInputs[s.studentId]?.note ?? ''}
                                      onChange={e => setGradeInputs(g => ({ ...g, [s.studentId]: { ...(g[s.studentId] ?? { grade: '', note: '' }), note: e.target.value } }))}
                                      placeholder="Catatan (opsional)"
                                      className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-violet-300 focus:ring-1 focus:ring-violet-100"
                                    />
                                    <button
                                      onClick={() => handleGradeSubmission(viewSubmissions!.id, s.studentId, viewSubmissions!.maxScore)}
                                      disabled={savingGrade[s.studentId] || !gradeInputs[s.studentId]?.grade}
                                      className="flex items-center gap-1 rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-600 disabled:opacity-40 whitespace-nowrap"
                                    >
                                      {savingGrade[s.studentId] ? <Loader2 size={11} className="animate-spin" /> : <Star size={11} />}
                                      Simpan
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {submissionsData.notSubmitted.length > 0 && (
                        <div className="border-t border-gray-50 p-4">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-red-500">Belum Mengumpulkan ({submissionsData.notSubmitted.length})</p>
                            <button
                              onClick={() => handleRemind(viewSubmissions.id)}
                              disabled={reminding}
                              className="flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                            >
                              {reminding ? <Loader2 size={11} className="animate-spin" /> : <Bell size={11} />}
                              Ingatkan semua
                            </button>
                          </div>
                          <div className="space-y-1.5">
                            {submissionsData.notSubmitted.map(s => (
                              <div key={s.studentId} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                                <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                  {s.studentName.charAt(0).toUpperCase()}
                                </div>
                                <p className="text-sm text-gray-600">{s.studentName}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {submissionsData.submitted.length === 0 && submissionsData.notSubmitted.length === 0 && (
                        <p className="py-10 text-center text-sm text-gray-400">Belum ada siswa di kelas ini</p>
                      )}
                    </>
                  ) : null}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Assignment Modal */}
        <AnimatePresence>
          {showCreateAsgn && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8 backdrop-blur-sm"
              onClick={e => { if (e.target === e.currentTarget) setShowCreateAsgn(false); }}
            >
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.97 }}
                className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                  <h3 className="font-display text-lg font-bold text-gray-900">Buat Tugas Baru</h3>
                  <button onClick={() => setShowCreateAsgn(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
                </div>
                <div className="space-y-4 px-6 py-5">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Judul Tugas *</label>
                    <input
                      value={asgnForm.title}
                      onChange={e => setAsgnForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="mis. Latihan Soal Stoikiometri Bab 1"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Deskripsi / Instruksi</label>
                    <RichEditor
                      value={asgnForm.description}
                      onChange={v => setAsgnForm(f => ({ ...f, description: v }))}
                      placeholder="Tulis instruksi tugas..."
                      minHeight={200}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-700">Batas Waktu</label>
                      <input
                        type="datetime-local"
                        value={asgnForm.dueDate}
                        onChange={e => setAsgnForm(f => ({ ...f, dueDate: e.target.value }))}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-700">Nilai Maksimum</label>
                      <input
                        type="number"
                        min={1}
                        value={asgnForm.maxScore}
                        onChange={e => setAsgnForm(f => ({ ...f, maxScore: Number(e.target.value) }))}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                      />
                    </div>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => setAsgnForm(f => ({ ...f, allowLate: !f.allowLate }))}
                      className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                        asgnForm.allowLate
                          ? 'border-orange-200 bg-orange-50 text-orange-700'
                          : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`flex h-4 w-4 items-center justify-center rounded border-2 transition-colors ${
                        asgnForm.allowLate ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
                      }`}>
                        {asgnForm.allowLate && <Check size={10} className="text-white" />}
                      </div>
                      Izinkan pengumpulan terlambat
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
                  <button
                    onClick={() => setShowCreateAsgn(false)}
                    className="rounded-xl border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleCreateAssignment}
                    disabled={savingAsgn || !asgnForm.title.trim()}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-400 px-6 py-2 text-sm font-semibold text-white shadow-md disabled:opacity-50"
                  >
                    {savingAsgn && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                    Buat Tugas
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
  );
};
