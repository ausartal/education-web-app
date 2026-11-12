export type Severity = 'high' | 'medium' | 'low';
export type ReviewVerdict = 'dismissed' | 'confirmed';
export type ReviewState = 'pending' | ReviewVerdict;

export interface AnomalyReview {
  verdict: ReviewVerdict;
  note: string;
  reviewedBy: string;
}

interface FlagRule {
  pattern: RegExp;
  label: (match: RegExpMatchArray) => string;
  severity: Severity;
}

const RULES: FlagRule[] = [
  { pattern: /^TERMINATED_TAB_VIOLATIONS$/, label: () => 'Dihentikan: pelanggaran pindah tab', severity: 'high' },
  { pattern: /^TERMINATED_BY_ADMIN$/, label: () => 'Dihentikan pengawas', severity: 'high' },
  { pattern: /^PERFECT_FAST_STAGE_(\d)$/, label: (m) => `Stage ${m[1]}: semua benar dengan sangat cepat`, severity: 'high' },
  { pattern: /^TOO_FAST_STAGE_(\d)$/, label: (m) => `Stage ${m[1]}: jawaban terlalu cepat`, severity: 'medium' },
  { pattern: /^LATE_SUBMIT_STAGE_(\d)$/, label: (m) => `Stage ${m[1]}: dikirim setelah waktu habis`, severity: 'medium' },
  { pattern: /^SUDDEN_DROP_STAGE_(\d)_TO_(\d)$/, label: (m) => `Skor turun mendadak stage ${m[1]} ke ${m[2]}`, severity: 'low' },
];

const SEVERITY_ORDER: Record<Severity, number> = { high: 3, medium: 2, low: 1 };

export function describeFlag(flag: string): { label: string; severity: Severity } {
  for (const rule of RULES) {
    const match = flag.match(rule.pattern);
    if (match) return { label: rule.label(match), severity: rule.severity };
  }
  return { label: flag, severity: 'low' };
}

export function topSeverity(flags: string[]): Severity {
  return flags.reduce<Severity>(
    (top, flag) => (SEVERITY_ORDER[describeFlag(flag).severity] > SEVERITY_ORDER[top] ? describeFlag(flag).severity : top),
    'low',
  );
}

export function reviewState(review: AnomalyReview | null | undefined): ReviewState {
  return review?.verdict ?? 'pending';
}

export interface AnomalyItem {
  id: string;
  examId: string;
  examTitle: string;
  studentName: string;
  flags: string[];
  severity: Severity;
  review: AnomalyReview | null;
  status: string;
  completedAtMs: number | null;
}

export interface AnomalyFilter {
  state?: ReviewState | 'all';
  severity?: Severity | 'all';
  examId?: string;
  query?: string;
}

export function filterAnomalies(items: AnomalyItem[], filter: AnomalyFilter): AnomalyItem[] {
  const query = filter.query?.trim().toLowerCase();
  return items.filter((item) => {
    if (filter.state && filter.state !== 'all' && reviewState(item.review) !== filter.state) return false;
    if (filter.severity && filter.severity !== 'all' && item.severity !== filter.severity) return false;
    if (filter.examId && item.examId !== filter.examId) return false;
    if (query && !`${item.studentName} ${item.examTitle}`.toLowerCase().includes(query)) return false;
    return true;
  });
}

/** Most serious and most recent first; reviewed items sink below pending ones. */
export function sortAnomalies(items: AnomalyItem[]): AnomalyItem[] {
  return [...items].sort((a, b) => {
    const pendingDiff = Number(reviewState(a.review) !== 'pending') - Number(reviewState(b.review) !== 'pending');
    if (pendingDiff !== 0) return pendingDiff;
    const severityDiff = SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity];
    if (severityDiff !== 0) return severityDiff;
    return (b.completedAtMs ?? 0) - (a.completedAtMs ?? 0);
  });
}

export function validateReview(verdict: unknown, note: unknown): { ok: true; verdict: ReviewVerdict | 'reopen'; note: string } | { ok: false; error: string } {
  if (verdict !== 'dismissed' && verdict !== 'confirmed' && verdict !== 'reopen') {
    return { ok: false, error: 'Keputusan tidak valid' };
  }
  const text = typeof note === 'string' ? note.trim() : '';
  if (verdict === 'confirmed' && text.length < 5) {
    return { ok: false, error: 'Catatan wajib diisi (minimal 5 karakter) saat mengonfirmasi anomali' };
  }
  if (text.length > 500) return { ok: false, error: 'Catatan terlalu panjang (maksimal 500 karakter)' };
  return { ok: true, verdict, note: text };
}
