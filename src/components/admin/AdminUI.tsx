import { FC, ReactNode } from 'react';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';

export const AdminPageHeader: FC<{
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}> = ({ eyebrow, title, description, actions }) => (
  <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
    <div className="min-w-0">
      {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-indigo-600">{eyebrow}</p>}
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </header>
);

export const AdminSection: FC<{
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}> = ({ title, description, actions, children, className = '' }) => (
  <section className={'overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ' + className}>
    <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>}
      </div>
      {actions}
    </div>
    {children}
  </section>
);

export const AdminEmptyState: FC<{
  title: string;
  description: string;
  action?: ReactNode;
}> = ({ title, description, action }) => (
  <div className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
    <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Inbox size={20} /></span>
    <h3 className="text-sm font-bold text-slate-800">{title}</h3>
    <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const AdminErrorState: FC<{
  message?: string;
  onRetry?: () => void;
}> = ({ message = 'Data belum dapat dimuat. Coba kembali beberapa saat lagi.', onRetry }) => (
  <div className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
    <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-600"><AlertCircle size={20} /></span>
    <h3 className="text-sm font-bold text-slate-800">Terjadi kendala</h3>
    <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">{message}</p>
    {onRetry && <button type="button" onClick={onRetry} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw size={14} /> Coba lagi</button>}
  </div>
);

export const AdminSkeleton: FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="animate-pulse divide-y divide-slate-100" aria-label="Memuat data">
    {Array.from({ length: rows }).map((_, index) => <div key={index} className="flex items-center gap-4 px-5 py-4"><div className="h-9 w-9 rounded-lg bg-slate-200" /><div className="flex-1 space-y-2"><div className="h-3 w-1/3 rounded bg-slate-200" /><div className="h-2.5 w-1/2 rounded bg-slate-100" /></div><div className="h-6 w-20 rounded bg-slate-100" /></div>)}
  </div>
);
