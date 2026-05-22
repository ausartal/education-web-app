'use client';

import { FC } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, LucideIcon } from 'lucide-react';
import { useToast, ToastType } from '@/hooks/useToast';

const icons: Record<ToastType, LucideIcon> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles: Record<ToastType, string> = {
  success: 'border-success bg-success-light text-success-dark',
  error: 'border-error bg-error-light text-error-dark',
  warning: 'border-warning bg-warning-light text-warning-dark',
  info: 'border-info bg-info-light text-gray-800',
};

export const ToastContainer: FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-[200] flex flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];

        return (
          <div
            key={toast.id}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 shadow-md animate-in slide-in-from-right ${styles[toast.type]}`}
            role="alert"
          >
            <Icon size={18} />
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="opacity-60 hover:opacity-100"
              aria-label="Tutup"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
