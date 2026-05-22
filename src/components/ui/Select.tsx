import { FC, SelectHTMLAttributes } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select: FC<SelectProps> = ({
  label,
  error,
  options,
  placeholder,
  id,
  className = '',
  ...props
}) => {
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
      <select
        id={id}
        className={`w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors ${
          error
            ? 'border-error focus:border-error focus:ring-1 focus:ring-error'
            : 'border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary'
        }`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
};
