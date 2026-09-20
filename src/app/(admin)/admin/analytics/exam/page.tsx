'use client';

import Link from 'next/link';
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, Clock3, ShieldAlert, Target } from 'lucide-react';
import { useAuthSWR } from '@/hooks/useAuthSWR';
import { AdminEmptyState, AdminErrorState, AdminPageHeader, AdminSection, AdminSkeleton } from '@/components/admin/AdminUI';

interface ExamAnalytics {
  totals: { exams: number; sessions: number; completed: number; flagged: number; completionRate: number; anomalyRate: number; averageScore: number; averageDurationMinutes: number };
  statusDistribution: Record<string, number>;
  proficiencyDistribution: Record<string, number>;
  cognitivePerformance: Array<{ label: string; averageCorrect: number; observations: number }>;
  byExam: Array<{ id: string; title: string; sessions: number; completed: number; completionRate: number; averageScore: number; flagged: number }>;
}

const formatNumber = new Intl.NumberFormat('id-ID');

function Progress({ value, tone = 'bg-indigo-500' }: { value: number; tone?: string }) {
  return <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={'h-full rounded-full ' + tone} style={{ width: String(Math.min(100, Math.max(0, value))) + '%' }} /></div>;
}

export default function ExamAnalyticsPage() {
  const { data, error, isLoading, mutate } = useAuthSWR<ExamAnalytics>('/api/admin/analytics/exam', { dedupingInterval: 60_000 });
  if (isLoading) return <div className="mx-auto max-w-[1440px] space-y-6"><div className="h-24 animate-pulse rounded-xl bg-slate-200" /><div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><AdminSkeleton rows={7} /></div></div>;
  if (error || !data) return <AdminErrorState onRetry={() => mutate()} />;

  const cards = [
    { label: 'Sesi keseluruhan', value: formatNumber.format(data.totals.sessions), help: formatNumber.format(data.totals.exams) + ' ujian terdaftar', icon: Activity, tone: 'bg-indigo-50 text-indigo-700' },
    { label: 'Completion rate', value: data.totals.completionRate + '%', help: formatNumber.format(data.totals.completed) + ' sesi selesai', icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Rata-rata skor', value: String(data.totals.averageScore), help: 'Berdasarkan sesi yang memiliki skor', icon: Target, tone: 'bg-sky-50 text-sky-700' },
    { label: 'Anomaly rate', value: data.totals.anomalyRate + '%', help: formatNumber.format(data.totals.flagged) + ' sesi perlu ditinjau', icon: ShieldAlert, tone: data.totals.flagged ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600' },
    { label: 'Durasi rata-rata', value: data.totals.averageDurationMinutes + ' mnt', help: 'Dari sesi dengan waktu lengkap', icon: Clock3, tone: 'bg-violet-50 text-violet-700' },
  ];

  return <div className="mx-auto max-w-[1440px] space-y-6 pb-10">
    <AdminPageHeader eyebrow="AKURAT Exam" title="Analitik AKURAT Exam" description="Pantau kualitas asesmen adaptif, penyelesaian peserta, profil kemampuan, dan risiko sesi dari data MSAT aktual." actions={<Link href="/admin/msat/results" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Buka hasil peserta <ArrowRight size={15} /></Link>} />

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{cards.map(card => { const Icon = card.icon; return <article key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><span className={'flex h-9 w-9 items-center justify-center rounded-lg ' + card.tone}><Icon size={17} /></span><p className="mt-4 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">{card.label}</p><p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{card.value}</p><p className="mt-1 text-[11px] leading-4 text-slate-500">{card.help}</p></article>; })}</section>

    <section className="grid gap-5 xl:grid-cols-2">
      <AdminSection title="Performa kognitif" description="Rata-rata jawaban benar per kelompok proses kognitif pada seluruh stage.">
        {data.cognitivePerformance.length ? <div className="space-y-5 p-5">{data.cognitivePerformance.map(item => <div key={item.label}><div className="mb-2 flex items-center justify-between text-xs"><span className="font-semibold text-slate-700">{item.label}</span><span className="font-bold text-slate-900">{item.averageCorrect} benar <span className="font-normal text-slate-400">· {item.observations} observasi</span></span></div><Progress value={Math.min(100, item.averageCorrect * 20)} tone={item.label === 'Knowing' ? 'bg-blue-500' : item.label === 'Applying' ? 'bg-violet-500' : 'bg-amber-500'} /></div>)}</div> : <AdminEmptyState title="Belum ada data kognitif" description="Data akan tersedia setelah peserta menyelesaikan stage ujian." />}
      </AdminSection>
      <AdminSection title="Distribusi profisiensi" description="Sebaran predikat atau tingkat profisiensi hasil peserta.">
        {Object.keys(data.proficiencyDistribution).length ? <div className="space-y-4 p-5">{Object.entries(data.proficiencyDistribution).sort((a, b) => b[1] - a[1]).map(([label, value]) => <div key={label} className="flex items-center gap-3"><span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">{label}</span><div className="w-1/2"><Progress value={data.totals.completed ? (value / data.totals.completed) * 100 : 0} tone="bg-indigo-500" /></div><span className="w-10 text-right text-xs font-bold tabular-nums text-slate-900">{value}</span></div>)}</div> : <AdminEmptyState title="Belum ada distribusi" description="Predikat hasil peserta akan ditampilkan setelah sesi selesai." />}
      </AdminSection>
    </section>

    <AdminSection title="Performa per ujian" description="Gunakan tabel ini untuk menemukan ujian dengan penyelesaian rendah, skor rendah, atau anomaly tinggi.">
      {data.byExam.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500"><tr><th className="px-5 py-3">Ujian</th><th className="px-4 py-3">Sesi</th><th className="px-4 py-3">Penyelesaian</th><th className="px-4 py-3">Rata-rata skor</th><th className="px-4 py-3">Anomaly</th><th className="px-4 py-3" /></tr></thead><tbody className="divide-y divide-slate-100">{data.byExam.map(exam => <tr key={exam.id} className="hover:bg-slate-50"><td className="px-5 py-3.5 text-sm font-semibold text-slate-800">{exam.title}</td><td className="px-4 py-3.5 text-xs tabular-nums text-slate-600">{exam.sessions}</td><td className="px-4 py-3.5"><div className="flex items-center gap-2"><div className="w-24"><Progress value={exam.completionRate} tone={exam.completionRate >= 80 ? 'bg-emerald-500' : exam.completionRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'} /></div><span className="text-xs font-bold text-slate-700">{exam.completionRate}%</span></div></td><td className="px-4 py-3.5 text-xs font-bold tabular-nums text-slate-800">{exam.averageScore}</td><td className="px-4 py-3.5">{exam.flagged ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700"><AlertTriangle size={12} /> {exam.flagged}</span> : <span className="text-xs text-slate-400">Tidak ada</span>}</td><td className="px-4 py-3.5 text-right"><Link href={'/admin/msat/' + exam.id} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-700" aria-label={'Buka ' + exam.title}><ArrowRight size={15} /></Link></td></tr>)}</tbody></table></div> : <AdminEmptyState title="Belum ada sesi AKURAT Exam" description="Performa per ujian akan muncul setelah peserta mulai mengerjakan." />}
    </AdminSection>
  </div>;
}
