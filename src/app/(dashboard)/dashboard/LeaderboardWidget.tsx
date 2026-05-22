'use client';

import { FC, useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Trophy } from 'lucide-react';

interface LeaderboardEntry {
  uid: string;
  displayName: string;
  xp: number;
}

export const LeaderboardWidget: FC = () => {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const q = query(
        collection(db, 'users'),
        orderBy('stats.xp', 'desc'),
        limit(5)
      );
      const snap = await getDocs(q);
      setEntries(
        snap.docs.map((d) => ({
          uid: d.id,
          displayName: d.data().displayName,
          xp: d.data().stats?.xp || 0,
        }))
      );
    };
    fetchLeaderboard();
  }, []);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <Trophy size={20} className="text-primary-orange" />
        <h2 className="text-lg font-bold text-gray-900">Leaderboard</h2>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white">
        {entries.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-400">
            Belum ada data
          </p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {entries.map((entry, i) => (
              <li
                key={entry.uid}
                className={`flex items-center gap-4 px-5 py-3 ${
                  entry.uid === profile?.uid ? 'bg-primary/5' : ''
                }`}
              >
                <span className="w-6 text-center text-sm">
                  {i < 3 ? medals[i] : i + 1}
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                  {entry.displayName.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 text-sm font-medium text-gray-800">
                  {entry.displayName}
                  {entry.uid === profile?.uid && (
                    <span className="ml-1 text-xs text-primary">(Kamu)</span>
                  )}
                </span>
                <span className="text-sm font-semibold text-primary-orange">
                  {entry.xp.toLocaleString()} XP
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
