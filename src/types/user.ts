export type UserRole = 'student' | 'teacher' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: UserRole;
  createdAt: string;
  lastLoginAt: string;
  isActive: boolean;
  profile: {
    school?: string;
    grade?: string;
    city?: string;
  };
  stats: {
    xp: number;
    level: number;
    streak: number;
    longestStreak: number;
    totalLessons: number;
    totalQuizzes: number;
  };
  settings: {
    notifications: boolean;
    language: string;
  };
}
