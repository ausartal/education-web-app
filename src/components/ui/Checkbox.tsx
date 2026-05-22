import { FC, InputHTMLAttributes } from 'react';

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Checkbox: FC<CheckboxProps> = ({
  label,
  id,
  className = '',
  ...props
}) => {
  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer items-center gap-2 text-sm text-gray-700 ${className}`}
    >
      <input
        id={id}
        type="checkbox"
        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        {...props}
      />
      {label}
    </label>
  );
};
