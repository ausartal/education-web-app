import { FC } from 'react';
import Image from 'next/image';

interface StatsGridProps {
  xp: number;
  materialsCompleted: number;
  totalMaterials: number;
  quizzes: number;
  achievements: number;
}

const StatCard: FC<{
  icon: string;
  label: string;
  value: string;
  color: string;
}> = ({ icon, label, value, color }) => (
  <div className="rounded-xl border border-gray-100 bg-white p-5">
    <div className="mb-3 flex items-center gap-3">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${color}15` }}
      >
        <Image src={icon} alt="" width={22} height={22} />
      </div>
      <span className="text-xs font-medium text-gray-500">{label}</span>
    </div>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
  </div>
);

export const StatsGrid: FC<StatsGridProps> = ({
  xp,
  materialsCompleted,
  totalMaterials,
  quizzes,
  achievements,
}) => {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        icon="/icons/lighting.png"
        label="Total XP"
        value={xp.toLocaleString()}
        color="#FF9500"
      />
      <StatCard
        icon="/icons/bar.png"
        label="Materi Selesai"
        value={`${materialsCompleted}/${totalMaterials}`}
        color="#1A73E8"
      />
      <StatCard
        icon="/icons/target.png"
        label="Quiz Selesai"
        value={quizzes.toString()}
        color="#00B84D"
      />
      <StatCard
        icon="/icons/fire.png"
        label="Achievements"
        value={achievements.toString()}
        color="#8B5CF6"
      />
    </div>
  );
};
