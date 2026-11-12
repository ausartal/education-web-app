import { FC, ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export const headerPrimaryButton =
  'inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-primary shadow-sm transition-transform hover:scale-[1.03]';
export const headerSecondaryButton =
  'inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25';

export const PageHeader: FC<PageHeaderProps> = ({ title, subtitle, actions }) => (
  <header className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-blue-600 to-indigo-700 p-6 text-white shadow-lg shadow-blue-200/60 sm:p-7">
    <div className="pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full bg-white/10" />
    <div className="pointer-events-none absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-white/10" />
    <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="max-w-xl">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm leading-relaxed text-blue-100">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  </header>
);
