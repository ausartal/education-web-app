import { FC, ReactNode } from 'react';

type BadgeVariant = 'success' | 'warning' | 'gray' | 'primary';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-success-light text-success-dark',
  warning: 'bg-warning-light text-warning-dark',
  gray: 'bg-gray-100 text-gray-600',
  primary: 'bg-primary/10 text-primary',
};

export const Badge: FC<BadgeProps> = ({
  variant = 'gray',
  children,
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
