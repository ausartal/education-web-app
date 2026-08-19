'use client';

import { FC } from 'react';
import { motion } from 'framer-motion';
import { KPSIndicator, KPS_INDICATOR_LABELS, KPS_INDICATOR_ORDER } from '@/types/kps';

interface Props {
  scores: Record<KPSIndicator, number>;
  size?: number;
}

export const KPSIndicatorRadar: FC<Props> = ({ scores, size = 300 }) => {
  const center = size / 2;
  const radius = size / 2 - 40;
  const indicators = KPS_INDICATOR_ORDER;
  const angleStep = (2 * Math.PI) / indicators.length;

  // Calculate points for each axis
  const getPoint = (index: number, value: number) => {
    const angle = angleStep * index - Math.PI / 2;
    const r = (value / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // Grid circles
  const gridLevels = [20, 40, 60, 80, 100];

  // Data polygon points
  const dataPoints = indicators.map((ind, idx) => getPoint(idx, scores[ind] || 0));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  // Axis endpoints
  const axisPoints = indicators.map((_, idx) => getPoint(idx, 100));

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid circles */}
        {gridLevels.map((level) => {
          const r = (level / 100) * radius;
          return (
            <circle
              key={level}
              cx={center}
              cy={center}
              r={r}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="1"
              strokeDasharray={level === 100 ? 'none' : '4 4'}
            />
          );
        })}

        {/* Grid labels */}
        {gridLevels.map((level) => (
          <text
            key={`label-${level}`}
            x={center + 4}
            y={center - (level / 100) * radius + 4}
            fontSize="10"
            fill="#9ca3af"
          >
            {level}
          </text>
        ))}

        {/* Axis lines */}
        {axisPoints.map((p, idx) => (
          <line
            key={`axis-${idx}`}
            x1={center}
            y1={center}
            x2={p.x}
            y2={p.y}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        ))}

        {/* Data polygon */}
        <motion.path
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          d={dataPath}
          fill="rgba(88, 65, 234, 0.15)"
          stroke="#5841EA"
          strokeWidth="2"
          style={{ transformOrigin: `${center}px ${center}px` }}
        />

        {/* Data points */}
        {dataPoints.map((p, idx) => (
          <motion.circle
            key={`point-${idx}`}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.5 + idx * 0.1 }}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="#5841EA"
            stroke="white"
            strokeWidth="2"
          />
        ))}

        {/* Axis labels */}
        {indicators.map((ind, idx) => {
          const labelPoint = getPoint(idx, 120);
          const label = KPS_INDICATOR_LABELS[ind];
          // Short label for display
          const shortLabel = label.split(' ').slice(0, 2).join(' ');
          return (
            <text
              key={`axis-label-${idx}`}
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="10"
              fontWeight="600"
              fill="#374151"
            >
              {shortLabel}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-4 grid w-full max-w-md grid-cols-2 gap-2">
        {indicators.map((ind) => (
          <div key={ind} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5">
            <div className="h-2 w-2 rounded-full bg-[#5841EA]" />
            <span className="text-xs text-gray-600">{KPS_INDICATOR_LABELS[ind]}</span>
            <span className="ml-auto text-xs font-bold text-[#5841EA]">{scores[ind] || 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
