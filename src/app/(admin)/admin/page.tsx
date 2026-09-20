'use client';

import { FC, useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronRight, ClipboardCheck, FileText, Flag, Layers3, RefreshCw, ShieldCheck, Sparkles, TrendingUp, Users, XCircle } from 'lucide-react';
import { useAuthSWR } from '@/hooks/useAuthSWR';

interface AnalyticsData {
  userRegistrationsByDay: Record<string, number>;
  examsByDay: Record<string, number>;
  questionsByStatus: { active: number; inactive: number };
  examStatusDistribution: Record<string, number>;
  roleDistribution: { student: number; teacher: number; admin: number };
  avgAccuracy: number;
  recentExams: Array<{ id: string; userName: string; theta: string; accuracy: number; proficiencyLevel: string; completedAt: string | null; flagged: boolean }>;
  lowAccuracyQuestions: Array<{ id: string; stem: string; avgCorrectRate: number; usageCount: number; topic: string }>;
  materialStats: Array<{ id: string; title: string; status: string; topic: string }>;
  today: { users: number; exams: number };
  totals: { users: number; exams: number; questions: number; completedExams: number; activeQuestions: number; activeUsers: number; classes?: number; examSchedules?: number };
}

const numberFormat = new Intl.NumberFormat('id-ID');
const ratio = (value: number, total: number) => total ? Math.round((value / total) * 100) : 0;

function Progress({ value, color = 'bg-indigo-500' }: { value: number; color?: string }) {
  return <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={'h-full rounded-full ' + color} style={{ width: String(Math.min(100, Math.max(0, value))) + '%' }} /></div>;
}

function TrendBars({ values, color }: { values: Record<string, number>; color: string }) {
  const points = Object.values(values);
  const max = Math.max(...points, 1);
  return <div className="flex h-10 items-end gap-1" aria-label="Tren tujuh hari terakhir">{points.map((point, index) => <span key={index} className={'min-w-[5px] flex-1 rounded-sm ' + color + (index === points.length - 1 ? ' opacity-100' : ' opacity-60')} style={{ height: String(Math.max(12, (point / max) * 100)) + '%' }} />)}</div>;
}

function EmptyState({ icon: Icon, title, detail }: { icon: typeof CheckCircle2; title: string; detail: string }) {
  return <div className="flex min-h-[180px] flex-col items-center justify-center p-6 text-center"><span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-400"><Icon size={20} /></span><p className="text-sm font-bold text-slate-700">{title}</p><p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">{detail}</p></div>;
}

function Skeleton() {
  return <div className="animate-pulse space-y-6"><div className="h-20 rounded-xl bg-slate-200" /><div className="grid gap-3 lg:grid-cols-3">{[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-slate-200" />)}</div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map(i => <div key={i} className="h-40 rounded-xl bg-slate-200" />)}</div><div className="grid gap-5 xl:grid-cols-2"><div className="h-80 rounded-xl bg-slate-200" /><div className="h-80 rounded-xl bg-slate-200" /></div></div>;
}

function dateTime(value: string | null) {
  return value ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : 'Belum tersedia';
}

const profileTone: Record<string, string> = {
  rendah: 'bg-rose-50 text-rose-700 ring-rose-100', sedang: 'bg-amber-50 text-amber-700 ring-amber-100',
  tinggi: 'bg-blue-50 text-blue-700 ring-blue-100', sangat_tinggi: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
};

const DashboardOverview: FC = () => {
  const { data, isLoading, mutate } = useAuthSWR<AnalyticsData>('/api/admin/analytics', { dedupingInterval: 60_000 });
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => { setRefreshing(true); await mutate(); setRefreshing(false); }, [mutate]);
  const state = useMemo(() => {
    if (!data) return null;
    return {
      ongoing: data.examStatusDistribution.in_progress ?? 0,
      flagged: data.examStatusDistribution.flagged ?? 0,
      abandoned: data.examStatusDistribution.abandoned ?? 0,
      completion: ratio(data.totals.completedExams, data.totals.exams),
      drafts: data.materialStats.filter(item => item.status === 'draft').length,
    };
  }, [data]);

  if (isLoading) return <Skeleton />;
  if (!data || !state) return <section className="flex min-h-[52vh] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><XCircle className="mb-3 text-slate-300" size={32} /><h1 className="text-base font-bold text-slate-800">Dashboard belum dapat dimuat</h1><p className="mt-1 text-sm text-slate-500">Periksa koneksi data lalu coba kembali.</p><button onClick={refresh} className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Coba lagi</button></section>;

  const priority = [
    { title: numberFormat.format(state.flagged) + ' sesi perlu ditinjau', detail: state.flagged ? 'Anomali terdeteksi dalam sesi ujian.' : 'Tidak ada anomali ujian yang menunggu.', href: '/admin/msat', icon: Flag, tone: state.flagged ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800', badge: state.flagged ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700' },
    { title: numberFormat.format(data.lowAccuracyQuestions.length) + ' soal perlu evaluasi', detail: 'Akurasi rendah setelah digunakan oleh peserta.', href: '/admin/questions', icon: AlertTriangle, tone: data.lowAccuracyQuestions.length ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-slate-200 bg-slate-50 text-slate-700', badge: data.lowAccuracyQuestions.length ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600' },
    { title: numberFormat.format(state.drafts) + ' materi belum dipublikasikan', detail: 'Periksa kesiapan konten sebelum periode belajar berikutnya.', href: '/admin/content', icon: FileText, tone: state.drafts ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-slate-200 bg-slate-50 text-slate-700', badge: state.drafts ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600' },
  ];
  const kpis = [
    { label: 'Akun dapat mengakses', value: numberFormat.format(data.totals.activeUsers), help: 'dari ' + numberFormat.format(data.totals.users) + ' akun terdaftar', icon: Users, tone: 'bg-indigo-50 text-indigo-700', href: '/admin/users' },
    { label: 'Sesi sedang berlangsung', value: numberFormat.format(state.ongoing), help: state.ongoing ? 'Pantau status peserta secara langsung' : 'Tidak ada sesi aktif saat ini', icon: TrendingUp, tone: 'bg-sky-50 text-sky-700', href: '/admin/ujian' },
    { label: 'Penyelesaian ujian', value: String(state.completion) + '%', help: numberFormat.format(data.totals.completedExams) + ' dari ' + numberFormat.format(data.totals.exams) + ' sesi selesai', icon: ClipboardCheck, tone: 'bg-emerald-50 text-emerald-700', href: '/admin/analytics' },
    { label: 'Akurasi rata-rata', value: String(data.avgAccuracy) + '%', help: 'Berdasarkan ujian yang selesai', icon: Sparkles, tone: 'bg-violet-50 text-violet-700', href: '/admin/analytics' },
  ];

  return <div className="mx-auto max-w-[1440px] space-y-6 pb-10">
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500"><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700">Pusat kendali</span><span>Ringkasan operasional platform</span></div><h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900">Dashboard Overview</h1><p className="mt-1 text-sm text-slate-500">Lihat kondisi penting, temukan risiko, dan lanjutkan tindakan yang paling berdampak.</p></div>
      <div className="flex items-center gap-3"><span className="hidden items-center gap-2 text-xs text-slate-500 sm:flex"><span className="h-2 w-2 rounded-full bg-emerald-500" />Data platform tersinkron</span><button onClick={refresh} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Perbarui</button></div>
    </header>

    <section aria-labelledby="priority-heading"><div className="mb-3 flex items-center justify-between"><div><h2 id="priority-heading" className="text-sm font-bold text-slate-900">Perlu perhatian</h2><p className="text-xs text-slate-500">Antrean tindakan yang tidak sebaiknya terlewat.</p></div><Link href="/admin/logs" className="hidden items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-800 sm:flex">Lihat audit trail <ChevronRight size={14} /></Link></div>
      <div className="grid gap-3 lg:grid-cols-3">{priority.map(item => { const Icon = item.icon; return <Link key={item.href} href={item.href} className={'group flex min-h-[100px] items-center gap-3 rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ' + item.tone}><span className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ' + item.badge}><Icon size={18} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold">{item.title}</span><span className="mt-0.5 block text-xs leading-5 opacity-80">{item.detail}</span></span><ArrowRight size={16} className="shrink-0 opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-100" /></Link>; })}</div>
    </section>

    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Indikator utama">{kpis.map(item => { const Icon = item.icon; return <Link href={item.href} key={item.label} className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"><div className="flex items-start justify-between"><span className={'flex h-9 w-9 items-center justify-center rounded-lg ' + item.tone}><Icon size={18} /></span><ArrowRight size={15} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" /></div><p className="mt-5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">{item.label}</p><p className="mt-1 font-display text-3xl font-extrabold tracking-tight text-slate-900">{item.value}</p><p className="mt-1 text-xs text-slate-500">{item.help}</p></Link>; })}</section>

    <section className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-start justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-bold text-slate-900">Kinerja pembelajaran & ujian</h2><p className="mt-0.5 text-xs text-slate-500">Sinyal ringkas untuk memantau pengalaman peserta.</p></div><Link href="/admin/analytics" className="text-xs font-semibold text-indigo-700 hover:underline">Analitik lengkap</Link></div>
        <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0"><div className="p-5"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-600">Sesi ujian · 7 hari</p><span className="text-xs font-bold text-slate-900">{numberFormat.format(Object.values(data.examsByDay).reduce((a, b) => a + b, 0))}</span></div><div className="mt-4"><TrendBars values={data.examsByDay} color="bg-sky-500" /></div><p className="mt-3 text-xs text-slate-500">{data.today.exams} sesi dimulai hari ini.</p></div><div className="p-5"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-600">Pendaftaran · 7 hari</p><span className="text-xs font-bold text-slate-900">{numberFormat.format(Object.values(data.userRegistrationsByDay).reduce((a, b) => a + b, 0))}</span></div><div className="mt-4"><TrendBars values={data.userRegistrationsByDay} color="bg-indigo-500" /></div><p className="mt-3 text-xs text-slate-500">{data.today.users} akun baru hari ini.</p></div></div>
        <div className="grid gap-4 border-t border-slate-100 p-5 sm:grid-cols-2"><div><div className="mb-2 flex justify-between text-xs"><span className="font-semibold text-slate-700">Kelengkapan sesi</span><span className="font-bold text-slate-900">{state.completion}%</span></div><Progress value={state.completion} color="bg-emerald-500" /><p className="mt-2 text-[11px] text-slate-500">{numberFormat.format(state.abandoned)} sesi ditinggalkan.</p></div><div><div className="mb-2 flex justify-between text-xs"><span className="font-semibold text-slate-700">Kesiapan bank soal</span><span className="font-bold text-slate-900">{ratio(data.totals.activeQuestions, data.totals.questions)}%</span></div><Progress value={ratio(data.totals.activeQuestions, data.totals.questions)} /><p className="mt-2 text-[11px] text-slate-500">{numberFormat.format(data.questionsByStatus.inactive)} soal tidak aktif.</p></div></div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-bold text-slate-900">Komposisi platform</h2><p className="mt-0.5 text-xs text-slate-500">Segmentasi akun dan kesiapan sumber belajar.</p></div><div className="space-y-5 p-5">{[{ label: 'Siswa', value: data.roleDistribution.student, color: 'bg-indigo-500' }, { label: 'Guru', value: data.roleDistribution.teacher, color: 'bg-sky-500' }, { label: 'Administrator', value: data.roleDistribution.admin, color: 'bg-slate-500' }].map(item => <div key={item.label}><div className="mb-2 flex justify-between text-xs"><span className="font-medium text-slate-700">{item.label}</span><span className="font-bold text-slate-900">{numberFormat.format(item.value)} <span className="font-normal text-slate-400">({ratio(item.value, data.totals.users)}%)</span></span></div><Progress value={ratio(item.value, data.totals.users)} color={item.color} /></div>)}<div className="border-t border-slate-100 pt-5"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><Layers3 size={18} /></span><div><p className="text-xs font-semibold text-slate-700">Ruang belajar</p><p className="text-xs text-slate-500">{numberFormat.format(data.totals.classes ?? 0)} kelas · {numberFormat.format(data.totals.examSchedules ?? 0)} jadwal ujian</p></div></div></div></div></div>
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-bold text-slate-900">Sesi ujian terbaru</h2><p className="mt-0.5 text-xs text-slate-500">Hasil terbaru untuk pemeriksaan cepat.</p></div><Link href="/admin/analytics" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:underline">Semua hasil <ChevronRight size={14} /></Link></div>
        {data.recentExams.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500"><tr><th className="px-5 py-3">Peserta</th><th className="px-4 py-3">Akurasi</th><th className="px-4 py-3">Profil</th><th className="px-4 py-3">Selesai</th><th className="px-4 py-3 text-right">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{data.recentExams.map(session => <tr key={session.id} className="hover:bg-slate-50"><td className="px-5 py-3.5"><p className="text-sm font-semibold text-slate-800">{session.userName}</p><p className="mt-0.5 text-[11px] text-slate-500">Theta {session.theta}</p></td><td className="px-4 py-3.5"><div className="flex items-center gap-2"><div className="w-16"><Progress value={session.accuracy} color={session.accuracy >= 70 ? 'bg-emerald-500' : session.accuracy >= 45 ? 'bg-amber-500' : 'bg-rose-500'} /></div><span className="text-xs font-bold text-slate-700">{session.accuracy}%</span></div></td><td className="px-4 py-3.5"><span className={'rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ' + (profileTone[session.proficiencyLevel] ?? 'bg-slate-100 text-slate-600 ring-slate-200')}>{session.proficiencyLevel || 'Belum terpetakan'}</span></td><td className="px-4 py-3.5 text-xs text-slate-500">{dateTime(session.completedAt)}</td><td className="px-4 py-3.5 text-right">{session.flagged ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700"><Flag size={12} /> Tinjau</span> : <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700"><CheckCircle2 size={13} /> Normal</span>}</td></tr>)}</tbody></table></div> : <EmptyState icon={ClipboardCheck} title="Belum ada sesi selesai" detail="Hasil ujian akan muncul di sini setelah peserta menyelesaikan sesi." />}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-bold text-slate-900">Kualitas konten</h2><p className="mt-0.5 text-xs text-slate-500">Soal dengan akurasi terendah.</p></div><Link href="/admin/questions" className="text-xs font-semibold text-indigo-700 hover:underline">Kelola</Link></div>{data.lowAccuracyQuestions.length ? <div className="divide-y divide-slate-100">{data.lowAccuracyQuestions.slice(0, 4).map(question => <Link href="/admin/questions" key={question.id} className="block p-4 transition hover:bg-slate-50"><div className="flex gap-3"><span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-rose-50 text-rose-600"><AlertTriangle size={14} /></span><div className="min-w-0 flex-1"><p className="line-clamp-2 text-xs font-semibold leading-5 text-slate-700">{question.stem}</p><div className="mt-2 flex items-center gap-2 text-[11px]"><span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">{question.topic || 'Tanpa topik'}</span><span className="font-bold text-rose-600">{question.avgCorrectRate}% benar</span><span className="text-slate-400">{question.usageCount} penggunaan</span></div></div></div></Link>)}</div> : <EmptyState icon={ShieldCheck} title="Tidak ada soal berisiko" detail="Belum ada soal dengan akurasi rendah yang cukup data untuk ditinjau." />}</div>
    </section>
  </div>;
};

export default DashboardOverview;
