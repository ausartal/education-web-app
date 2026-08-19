'use client';

import { FC, useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface Props {
  timeLeftMs: number;
  onTimeUp: () => void;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export const KPSTimer: FC<Props> = ({ timeLeftMs, onTimeUp }) => {
  const [timeLeft, setTimeLeft] = useState(timeLeftMs);

  useEffect(() => {
    setTimeLeft(timeLeftMs);
  }, [timeLeftMs]);

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp();
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1000) {
          onTimeUp();
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, onTimeUp]);

  const isLow = timeLeft < 5 * 60 * 1000; // < 5 min
  const isCritical = timeLeft < 2 * 60 * 1000; // < 2 min

  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold tabular-nums transition-all ${
        isCritical
          ? 'animate-pulse bg-red-100 text-red-700'
          : isLow
            ? 'bg-amber-100 text-amber-700'
            : 'bg-gray-100 text-gray-700'
      }`}
    >
      <Clock size={14} />
      {formatTime(timeLeft)}
    </div>
  );
};
