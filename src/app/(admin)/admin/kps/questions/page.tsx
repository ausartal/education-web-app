'use client';

import { FC, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import {
  KPS_LEVEL_LABELS,
  KPSDifficultyLevel,
  KPS_INDICATOR_LABELS,
  KPSIndicator,
  KPS_QUESTION_TYPE_LABELS,
  KPSQuestionType,
} from '@/types/kps';
import {
  BookOpen,
  Filter,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Search,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface QuestionItem {
  id: string;
  stem: string;
  indicator: string;
  stage: number;
  difficultyLevel: string;
  questionType: string;
  order: number;
  status: string;
  usageCount: number;
  avgCorrectRate: number;
  stimulusTopic: string;
  stimulusTitle: string;
}

const AdminKPSQuestionsPage: FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchQuestions = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      let url = '/api/kps/admin/questions?';
      if (levelFilter) url += `level=${levelFilter}&`;
      if (statusFilter) url += `status=${statusFilter}&`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
      }
      setLoading(false);
    } catch { setLoading(false); }
  }, [user, levelFilter, statusFilter]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const token = await user!.getIdToken();
      await fetch('/api/kps/admin/questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ questionId: id, status: newStatus }),
      });
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, status: newStatus } : q));
      addToast('success', `Soal ${newStatus === 'active' ? 'diaktifkan' : 'dinonaktifkan'}`);
    } catch { addToast('error', 'Gagal mengubah status'); }
  };

  const filtered = questions.filter(q => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return q.stem.toLowerCase().includes(term) ||
        (KPS_INDICATOR_LABELS[q.indicator as KPSIndicator] || '').toLowerCase().includes(term) ||
        q.stimulusTitle.toLowerCase().includes(term);
    }
    return true;
  });

  const levels: KPSDifficultyLevel[] = ['menengah', 'tinggi', 'rendah', 'tetap_tinggi', 'menengah_lebih_tinggi', 'menengah_lebih_rendah', 'tetap_rendah'];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-extrabold text-stone-800">Bank Soal KPS</h1>
        <p className="text-sm text-stone-400">Kelola soal ujian KPS — {questions.length} soal total</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Cari soal..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="rounded-xl border border-stone-200 py-2 pl-9 pr-4 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
        </div>
        <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} className="rounded-xl border border-stone-200 px-3 py-2 text-sm">
          <option value="">Semua Level</option>
          {levels.map(l => <option key={l} value={l}>{KPS_LEVEL_LABELS[l]}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-xl border border-stone-200 px-3 py-2 text-sm">
          <option value="">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Total Soal', value: questions.length, color: 'bg-violet-50 text-violet-700' },
          { label: 'Aktif', value: questions.filter(q => q.status === 'active').length, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Nonaktif', value: questions.filter(q => q.status === 'inactive').length, color: 'bg-stone-100 text-stone-600' },
          { label: 'Rata-rata Benar', value: `${Math.round(questions.reduce((s, q) => s + (q.avgCorrectRate || 0), 0) / (questions.length || 1) * 100)}%`, color: 'bg-blue-50 text-blue-700' },
        ].map(stat => (
          <div key={stat.label} className={`rounded-2xl p-4 ${stat.color}`}>
            <p className="text-xs font-semibold">{stat.label}</p>
            <p className="font-display text-2xl font-extrabold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-violet-600" /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map((q, idx) => (
            <motion.div key={q.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}>
              <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100/80">
                <button onClick={() => setExpandedId(expandedId === q.id ? null : q.id)} className="flex w-full items-center justify-between p-4 text-left">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`flex-shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold ${q.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                      {q.status === 'active' ? 'Aktif' : 'Off'}
                    </span>
                    <span className="flex-shrink-0 rounded-lg bg-violet-100 px-2 py-1 text-[10px] font-bold text-violet-700">
                      {KPS_LEVEL_LABELS[q.difficultyLevel as KPSDifficultyLevel] || q.difficultyLevel}
                    </span>
                    <span className="flex-shrink-0 rounded-lg bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-700">
                      S{q.stage}
                    </span>
                    <span className="text-sm text-stone-700 truncate">{q.stem.substring(0, 80)}...</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span className="text-xs text-stone-400">{q.usageCount}x</span>
                    {expandedId === q.id ? <ChevronUp size={14} className="text-stone-400" /> : <ChevronDown size={14} className="text-stone-400" />}
                  </div>
                </button>

                {expandedId === q.id && (
                  <div className="border-t border-stone-100 px-4 pb-4 pt-3">
                    <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
                      <div><span className="text-stone-400">Indikator:</span> <span className="font-semibold text-stone-700">{KPS_INDICATOR_LABELS[q.indicator as KPSIndicator] || q.indicator}</span></div>
                      <div><span className="text-stone-400">Tipe:</span> <span className="font-semibold text-stone-700">{KPS_QUESTION_TYPE_LABELS[q.questionType as KPSQuestionType] || q.questionType}</span></div>
                      <div><span className="text-stone-400">Topik:</span> <span className="font-semibold text-stone-700">{q.stimulusTopic}</span></div>
                      <div><span className="text-stone-400">Stimulus:</span> <span className="font-semibold text-stone-700">{q.stimulusTitle}</span></div>
                      <div><span className="text-stone-400">Urutan:</span> <span className="font-semibold text-stone-700">{q.order}</span></div>
                      <div><span className="text-stone-400">Digunakan:</span> <span className="font-semibold text-stone-700">{q.usageCount}x</span></div>
                      <div><span className="text-stone-400">Rata-rata Benar:</span> <span className="font-semibold text-stone-700">{Math.round((q.avgCorrectRate || 0) * 100)}%</span></div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => toggleStatus(q.id, q.status)}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                          q.status === 'active' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        }`}
                      >
                        {q.status === 'active' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        {q.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminKPSQuestionsPage;
