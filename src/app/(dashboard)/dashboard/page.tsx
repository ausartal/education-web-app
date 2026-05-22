'use client';

import { FC, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserProgress } from '@/services/progress';
import { getMaterials } from '@/services/materials';
import { getUserAchievements } from '@/services/achievements';
import { Material, UserProgress } from '@/types/firestore';
import { WelcomeHero } from './WelcomeHero';
import { StatsGrid } from './StatsGrid';
import { QuickActions } from './QuickActions';
import { LearningPath } from './LearningPath';
import { LeaderboardWidget } from './LeaderboardWidget';

const DashboardPage: FC = () => {
  const { profile } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [achievementCount, setAchievementCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    const fetchData = async () => {
      const [mats, prog, achievements] = await Promise.all([
        getMaterials(),
        getUserProgress(profile.uid),
        getUserAchievements(profile.uid),
      ]);
      setMaterials(mats);
      setProgress(prog);
      setAchievementCount(achievements.length);
      setLoading(false);
    };

    fetchData();
  }, [profile]);

  if (loading || !profile) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const completedCount = progress.filter(
    (p) => p.status === 'completed'
  ).length;

  return (
    <div className="space-y-8">
      <WelcomeHero name={profile.displayName} streak={profile.stats.streak} />
      <StatsGrid
        xp={profile.stats.xp}
        materialsCompleted={completedCount}
        totalMaterials={materials.length}
        quizzes={profile.stats.totalQuizzes}
        achievements={achievementCount}
      />
      <QuickActions />
      <LearningPath materials={materials} progress={progress} />
      <LeaderboardWidget />
    </div>
  );
};

export default DashboardPage;
