import { FC } from 'react';

interface TagProps {
  label: string;
  color?: string;
  className?: string;
}

export const Tag: FC<TagProps> = ({ label, color, className = '' }) => {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${className}`}
      style={color ? { backgroundColor: `${color}20`, color } : undefined}
    >
      {label}
    </span>
  );
};
