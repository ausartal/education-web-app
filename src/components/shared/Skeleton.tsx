import { FC } from 'react';

type SkeletonVariant = 'text' | 'card' | 'avatar' | 'row';

interface SkeletonProps {
  variant?: SkeletonVariant;
  className?: string;
}

const variantStyles: Record<SkeletonVariant, string> = {
  text: 'h-4 w-full rounded',
  card: 'h-40 w-full rounded-xl',
  avatar: 'h-10 w-10 rounded-full',
  row: 'h-12 w-full rounded-md',
};

export const Skeleton: FC<SkeletonProps> = ({
  variant = 'text',
  className = '',
}) => {
  return (
    <div
      className={`animate-pulse bg-gray-200 ${variantStyles[variant]} ${className}`}
      aria-hidden="true"
    />
  );
};
