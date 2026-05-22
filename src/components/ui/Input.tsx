'use client';

import { FC, InputHTMLAttributes, ReactNode, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

export const Input: FC<InputProps> = ({
  label,
  error,
  iconLeft,
  iconRight,
  type = 'text',
  id,
  className = '',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {iconLeft && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {iconLeft}
          </span>
        )}
        <input
          id={id}
          type={inputType}
          className={`w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors ${
            iconLeft ? 'pl-10' : ''
          } ${iconRight || isPassword ? 'pr-10' : ''} ${
            error
              ? 'border-error focus:border-error focus:ring-1 focus:ring-error'
              : 'border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary'
          }`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label={
              showPassword ? 'Sembunyikan password' : 'Tampilkan password'
            }
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
        {iconRight && !isPassword && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {iconRight}
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
};
