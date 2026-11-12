import { FC, ReactNode } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Inbox, RefreshCw } from 'lucide-react';

export const AdminPageHeader: FC<{
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  /** Optional icon shown in a soft tile before the title. */
  icon?: ReactNode;
  /** Adds a back arrow that links to the parent page. */
  backHref?: string;
}> = ({ eyebrow, title, description, actions, icon, backHref }) => (
  <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
    <div className="flex min-w-0 items-start gap-4">
      {backHref && (
        <Link href={backHref} aria-label="Kembali" className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700">
          <ArrowLeft size={16} aria-hidden="true" />
        </Link>
      )}
      {icon && (
        <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 sm:flex" aria-hidden="true">
          {icon}
        </span>
      )}
      <div className="min-w-0">
        {eyebrow && <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.12em] text-indigo-600">{eyebrow}</p>}
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
      </div>
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
  /** Defaults to an inbox. */
  icon?: ReactNode;
}> = ({ title, description, action, icon }) => (
  <div className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
    <span className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 ring-1 ring-indigo-100">
      {icon ?? <Inbox size={24} />}
      <span className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-indigo-300" aria-hidden="true" />
      <span className="absolute -bottom-1 -left-1.5 h-2 w-2 rounded-full bg-amber-300" aria-hidden="true" />
    </span>
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

/** Inline notice shown above a page when its data could not be loaded. */
export const AdminLoadBanner: FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
    <AlertCircle size={18} className="shrink-0 text-rose-600" aria-hidden="true" />
    <p className="min-w-0 flex-1 text-sm font-medium text-rose-800">{message}</p>
    {onRetry && (
      <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100">
        <RefreshCw size={13} aria-hidden="true" /> Coba lagi
      </button>
    )}
  </div>
);
