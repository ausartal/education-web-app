import { FC } from 'react';

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  className?: string;
}

export const ProgressBar: FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showPercentage = true,
  className = '',
}) => {
  const percentage = Math.min(Math.round((value / max) * 100), 100);
  const isComplete = percentage >= 100;

  return (
    <div className={className}>
      {(label || showPercentage) && (
        <div className="mb-1 flex items-center justify-between text-sm">
          {label && <span className="font-medium text-gray-700">{label}</span>}
          {showPercentage && (
            <span className="text-gray-500">{percentage}%</span>
          )}
        </div>
      )}
      <div
        className="h-2 overflow-hidden rounded-full bg-gray-200"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full transition-all duration-slow ease-out ${
            isComplete
              ? 'bg-success'
              : 'bg-gradient-to-r from-primary to-primary-cyan'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
