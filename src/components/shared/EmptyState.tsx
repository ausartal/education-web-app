import { FC, ReactNode } from 'react';
import { FileQuestion, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center py-12 text-center ${className}`}
    >
      <div className="mb-4 text-gray-300">
        {icon || <FileQuestion size={48} />}
      </div>
      <h3 className="mb-1 text-lg font-semibold text-gray-700">{title}</h3>
      {description && (
        <p className="mb-4 max-w-sm text-sm text-gray-500">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
};

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: FC<ErrorStateProps> = ({
  title = 'Terjadi Kesalahan',
  description = 'Maaf, terjadi kesalahan. Silakan coba lagi.',
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center py-12 text-center ${className}`}
    >
      <div className="mb-4 text-error">
        <AlertTriangle size={48} />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-gray-700">{title}</h3>
      <p className="mb-4 max-w-sm text-sm text-gray-500">{description}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Coba Lagi
        </Button>
      )}
    </div>
  );
};
