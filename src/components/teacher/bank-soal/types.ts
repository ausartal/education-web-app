import { MSATTierPath, CognitiveLevel, AnswerKey } from '@/types/firestore';
import { MSATDifficulty } from '@/types/msat';

// ── Types ──────────────────────────────────────────────────────────
export interface TPDef {
  id: string;
  code: string;
  name: string;
  subject: string;
  scope: 'global' | 'private';
  ownerId: string;
  questionCounts: Record<string, number>;
  totalQuestions: number;
  coveredPaths?: number;
  isComplete: boolean;
}

export interface ExamQ {
  id: string;
  domainId: string;
  domainName: string;
  tierPath: MSATTierPath;
  difficulty: MSATDifficulty;
  cognitiveLevel: CognitiveLevel;
  stem: string;
  options: Record<AnswerKey, string>;
  correctAnswer: AnswerKey;
  explanation: string;
  status: string;
  visibility?: string;
  approvalStatus?: string;
  ownerId?: string;
  usageCount: number;
}

export const TIER_PATHS: { value: MSATTierPath; label: string; tier: number; color: string }[] = [
  { value: 'anchor',       label: 'T1 – Anchor',      tier: 1, color: 'bg-violet-100 text-violet-700' },
  { value: 'mudah',        label: 'T2 – Mudah',       tier: 2, color: 'bg-emerald-100 text-emerald-700' },
  { value: 'sukar',        label: 'T2 – Sukar',       tier: 2, color: 'bg-amber-100 text-amber-700' },
  { value: 'sangat_mudah', label: 'T3 – Sangat Mudah', tier: 3, color: 'bg-sky-100 text-sky-700' },
  { value: 'sedang_a',     label: 'T3 – Sedang A',    tier: 3, color: 'bg-indigo-100 text-indigo-700' },
  { value: 'sedang_b',     label: 'T3 – Sedang B',    tier: 3, color: 'bg-purple-100 text-purple-700' },
  { value: 'sangat_sukar', label: 'T3 – Sangat Sukar', tier: 3, color: 'bg-rose-100 text-rose-700' },
];

export const TIER_PATH_DIFFICULTY: Record<MSATTierPath, MSATDifficulty> = {
  anchor: 'sedang', mudah: 'mudah', sukar: 'sukar',
  sangat_mudah: 'sangat_mudah', sedang_a: 'sedang', sedang_b: 'sedang', sangat_sukar: 'sangat_sukar',
};

export const COGNITIVE_LEVELS: CognitiveLevel[] = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'];
export const ANSWER_KEYS: AnswerKey[] = ['A', 'B', 'C', 'D', 'E'];
export const REQUIRED_PATHS = ['anchor', 'mudah', 'sukar', 'sangat_mudah', 'sedang_a', 'sedang_b', 'sangat_sukar'];

export const emptyForm = (domainId = '') => ({
  domainId,
  tierPath: 'anchor' as MSATTierPath,
  cognitiveLevel: 'C2' as CognitiveLevel,
  stem: '',
  optionA: '', optionB: '', optionC: '', optionD: '', optionE: '',
  correctAnswer: 'A' as AnswerKey,
  explanation: '',
  visibility: 'private' as 'global' | 'private',
});

export const emptyTPForm = () => ({ code: '', name: '', subject: '', scope: 'private' as 'global' | 'private' });

