'use client';

import { FC, useState } from 'react';
import type { ItemStat, ItemLevel } from '@/lib/item-analysis';

const LEVEL_STYLE: Record<ItemLevel, { label: string; badge: string; bar: string }> = {
  mudah: { label: 'Mudah', badge: 'bg-emerald-50 text-emerald-700', bar: 'bg-emerald-500' },
  sedang: { label: 'Sedang', badge: 'bg-amber-50 text-amber-700', bar: 'bg-amber-500' },
  sulit: { label: 'Sulit', badge: 'bg-rose-50 text-rose-700', bar: 'bg-rose-500' },
};

const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E'];

interface ItemAnalysisTableProps {
  items: ItemStat[];
  respondents: number;
}

export const ItemAnalysisTable: FC<ItemAnalysisTableProps> = ({ items, respondents }) => {
  const [open, setOpen] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-gray-400">
        Analisis soal akan muncul setelah ada siswa yang menyelesaikan ujian.
      </p>
    );
  }

  const flagged = items.filter((i) => i.flags.length > 0).length;

  return (
    <div>
      <p className="border-b border-gray-50 px-6 py-3 text-xs text-gray-500">
        Berdasarkan {respondents} siswa (percobaan terbaik). Diurutkan dari soal tersulit.
        {flagged > 0 && <span className="ml-1 font-semibold text-amber-600">{flagged} soal perlu ditinjau.</span>}
      </p>
      <ul className="divide-y divide-gray-50">
        {items.map((item) => {
          const style = LEVEL_STYLE[item.level];
          const expanded = open === item.questionId;
          const maxCount = Math.max(1, ...Object.values(item.distribution));
          return (
            <li key={item.questionId}>
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : item.questionId)}
                aria-expanded={expanded}
                className="flex w-full items-center gap-4 px-6 py-3 text-left hover:bg-gray-50"
              >
                <div className="w-14 shrink-0">
                  <p className="text-sm font-bold tabular-nums text-gray-900">{item.percentCorrect}%</p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${item.percentCorrect}%` }} />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm text-gray-800">{item.stem.replace(/\s+/g, ' ')}</p>
                  {item.label && <p className="mt-0.5 truncate text-[11px] text-gray-400">{item.label}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${style.badge}`}>{style.label}</span>
                  {item.flags.length > 0 && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">Tinjau</span>
                  )}
                </div>
              </button>

              {expanded && (
                <div className="space-y-3 bg-gray-50/60 px-6 py-4">
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600">
                    <span>{item.correct} dari {item.attempts} menjawab benar</span>
                    {item.correctAnswer && <span>Kunci: <strong>{item.correctAnswer}</strong></span>}
                    <span>
                      Daya beda:{' '}
                      <strong>{item.discrimination === null ? 'belum cukup data' : item.discrimination.toFixed(2)}</strong>
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {[...OPTION_KEYS, '-'].filter((key) => item.distribution[key]).map((key) => {
                      const count = item.distribution[key];
                      const isKey = key === item.correctAnswer;
                      return (
                        <div key={key} className="flex items-center gap-2 text-xs">
                          <span className={`w-5 shrink-0 text-center font-bold ${isKey ? 'text-emerald-600' : 'text-gray-500'}`}>
                            {key === '-' ? '–' : key}
                          </span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                            <div
                              className={`h-full rounded-full ${isKey ? 'bg-emerald-500' : 'bg-gray-400'}`}
                              style={{ width: `${(count / maxCount) * 100}%` }}
                            />
                          </div>
                          <span className="w-16 shrink-0 text-right tabular-nums text-gray-500">
                            {count} ({Math.round((count / item.attempts) * 100)}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {item.flags.length > 0 && (
                    <ul className="space-y-1">
                      {item.flags.map((flag) => (
                        <li key={flag} className="text-xs font-medium text-amber-700">• {flag}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
