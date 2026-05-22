import { FC, InputHTMLAttributes } from 'react';

interface RadioProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Radio: FC<RadioProps> = ({
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
        type="radio"
        className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
        {...props}
      />
      {label}
    </label>
  );
};
