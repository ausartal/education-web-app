'use client';

import { FC, useState } from 'react';
import { motion } from 'framer-motion';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';

const SettingsPage: FC = () => {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [school, setSchool] = useState(profile?.profile.school || '');
  const [grade, setGrade] = useState(profile?.profile.grade || '');
  const [city, setCity] = useState(profile?.profile.city || '');
  const [notifications, setNotifications] = useState(
    profile?.settings.notifications ?? true
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        displayName,
        'profile.school': school,
        'profile.grade': grade,
        'profile.city': city,
        'settings.notifications': notifications,
      });
      addToast('success', 'Settings saved!');
    } catch {
      addToast('error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="mb-8 font-display text-2xl font-extrabold text-gray-900">
          Settings
        </h1>

        <div className="space-y-6 rounded-3xl bg-white p-8 shadow-sm">
          {/* Profile Section */}
          <div>
            <h2 className="mb-4 text-sm font-bold text-gray-900">Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-xl border-0 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                    School
                  </label>
                  <input
                    type="text"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    className="w-full rounded-xl border-0 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-primary/20"
                    placeholder="SMA..."
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                    Grade
                  </label>
                  <input
                    type="text"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full rounded-xl border-0 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-primary/20"
                    placeholder="11"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-xl border-0 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-primary/20"
                  placeholder="Jakarta"
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Notifications */}
          <div>
            <h2 className="mb-4 text-sm font-bold text-gray-900">
              Notifications
            </h2>
            <label className="flex cursor-pointer items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
              <span className="text-sm text-gray-700">
                Enable notifications
              </span>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  notifications ? 'bg-primary' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
                    notifications ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            </label>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-2xl bg-gradient-to-r from-primary to-primary-cyan py-4 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all disabled:opacity-50 hover:enabled:-translate-y-0.5"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsPage;
