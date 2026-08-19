'use client';

import { FC, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
  KPS_LEVEL_LABELS,
  KPS_LEVEL_COLORS,
  KPSDifficultyLevel,
  KPS_INDICATOR_LABELS,
  KPSIndicator,
} from '@/types/kps';
import {
  Trophy,
  Calendar,
  Target,
  ChevronDown,
  ChevronUp,
  Loader2,
  Download,
  AlertTriangle,
  Filter,
} from 'lucide-react';

interface ResultRow {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  completedAt: string | null;
  finalLevel: KPSDifficultyLevel;
  numericScore: number;
  indicatorScores: Record<KPSIndicator, number> | null;
  totalCorrect: number;
  totalQuestions: number;
  anomalyFlags: string[];
  accessCodeId: string;
}

const AdminKPSResultsPage: FC = () => {
  const { user } = useAuth();
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState('');

  const fetchResults = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      let url = '/api/kps/admin/results?limit=100';
      if (levelFilter) url += `&level=${levelFilter}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [user, levelFilter]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const levels: KPSDifficultyLevel[] = [
    'tetap_rendah', 'rendah', 'menengah_lebih_rendah', 'menengah',
    'menengah_lebih_tinggi', 'tinggi', 'tetap_tinggi',
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hasil Ujian KPS</h1>
          <p className="text-sm text-gray-500">Lihat hasil ujian KPS semua siswa</p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6 flex items-center gap-3">
        <Filter size={16} className="text-gray-400" />
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#5841EA] focus:outline-none"
        >
          <option value="">Semua Level</option>
          {levels.map((l) => (
            <option key={l} value={l}>{KPS_LEVEL_LABELS[l]}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-[#5841EA]" />
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white py-12 text-center">
          <Trophy size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">Belum ada hasil ujian</p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((result, idx) => {
            const colors = KPS_LEVEL_COLORS[result.finalLevel];
            const label = KPS_LEVEL_LABELS[result.finalLevel];
            const isExpanded = expandedId === result.id;

            return (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : result.id)}
                  className="flex w-full items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colors.bg}`}>
                      <Trophy size={18} className={colors.text} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{result.studentName}</p>
                      <p className="text-xs text-gray-500">{result.studentEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${colors.bg} ${colors.text}`}>
                        {label}
                      </span>
                      <p className="mt-1 text-xs text-gray-500">
                        Skor: {result.numericScore} | {result.totalCorrect}/{result.totalQuestions}
                      </p>
                    </div>
                    {result.anomalyFlags.length > 0 && (
                      <AlertTriangle size={16} className="text-amber-500" />
                    )}
                    {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="border-t border-gray-100 px-4 pb-4 pt-3"
                  >
                    <div className="mb-3 flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {result.completedAt
                          ? new Date(result.completedAt).toLocaleString('id-ID')
                          : '-'}
                      </span>
                      {result.anomalyFlags.length > 0 && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <AlertTriangle size={12} />
                          Flags: {result.anomalyFlags.join(', ')}
                        </span>
                      )}
                    </div>

                    {result.indicatorScores && (
                      <div className="space-y-2">
                        {Object.entries(result.indicatorScores).map(([key, score]) => (
                          <div key={key} className="flex items-center gap-3">
                            <span className="w-48 text-xs text-gray-600">
                              {KPS_INDICATOR_LABELS[key as KPSIndicator]}
                            </span>
                            <div className="flex-1">
                              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                                <div
                                  className="h-full rounded-full bg-[#5841EA]"
                                  style={{ width: `${score}%` }}
                                />
                              </div>
                            </div>
                            <span className="w-10 text-right text-xs font-bold text-[#5841EA]">
                              {score}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminKPSResultsPage;
