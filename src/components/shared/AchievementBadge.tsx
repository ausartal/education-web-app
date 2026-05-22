import { FC } from 'react';
import { Trophy } from 'lucide-react';

type BadgeTier = 'gold' | 'silver' | 'bronze';

interface AchievementBadgeProps {
  tier: BadgeTier;
  label?: string;
  unlocked?: boolean;
  size?: number;
  className?: string;
}

const tierStyles: Record<
  BadgeTier,
  { bg: string; border: string; icon: string }
> = {
  gold: {
    bg: 'bg-yellow-50',
    border: 'border-[var(--achievement-gold)]',
    icon: 'text-[var(--achievement-gold)]',
  },
  silver: {
    bg: 'bg-gray-50',
    border: 'border-[var(--achievement-silver)]',
    icon: 'text-[var(--achievement-silver)]',
  },
  bronze: {
    bg: 'bg-orange-50',
    border: 'border-[var(--achievement-bronze)]',
    icon: 'text-[var(--achievement-bronze)]',
  },
};

export const AchievementBadge: FC<AchievementBadgeProps> = ({
  tier,
  label,
  unlocked = true,
  size = 64,
  className = '',
}) => {
  const styles = tierStyles[tier];

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <div
        className={`flex items-center justify-center rounded-full border-2 ${styles.bg} ${styles.border} ${
          !unlocked ? 'opacity-30 grayscale' : ''
        }`}
        style={{ width: size, height: size }}
      >
        <Trophy size={size * 0.4} className={styles.icon} />
      </div>
      {label && (
        <span className="text-xs font-medium text-gray-600">{label}</span>
      )}
    </div>
  );
};
