import { FC } from 'react';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: number;
  className?: string;
}

export const Spinner: FC<SpinnerProps> = ({ size = 24, className = '' }) => {
  return (
    <Loader2
      size={size}
      className={`animate-spin text-primary ${className}`}
      aria-label="Memuat..."
    />
  );
};
