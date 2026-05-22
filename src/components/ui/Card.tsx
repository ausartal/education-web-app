import { FC, ReactNode } from 'react';

type CardVariant = 'standard' | 'lesson' | 'stat' | 'achievement';

interface CardProps {
  variant?: CardVariant;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

const variantStyles: Record<CardVariant, string> = {
  standard: 'bg-white shadow-sm hover:shadow-md',
  lesson:
    'bg-white shadow-sm hover:shadow-md hover:-translate-y-1 cursor-pointer',
  stat: 'bg-white shadow-sm border-l-4 border-l-primary',
  achievement:
    'bg-white shadow-sm border border-gray-100 text-center hover:shadow-md',
};

export const Card: FC<CardProps> = ({
  variant = 'standard',
  children,
  className = '',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl p-6 transition-all duration-normal ${variantStyles[variant]} ${className}`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export const CardHeader: FC<CardHeaderProps> = ({
  children,
  className = '',
}) => {
  return <div className={`mb-4 ${className}`}>{children}</div>;
};

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

export const CardBody: FC<CardBodyProps> = ({ children, className = '' }) => {
  return <div className={className}>{children}</div>;
};

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export const CardFooter: FC<CardFooterProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`mt-4 border-t border-gray-100 pt-4 ${className}`}>
      {children}
    </div>
  );
};
