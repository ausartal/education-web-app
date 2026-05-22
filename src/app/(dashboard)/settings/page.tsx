'use client';

import { FC, useState } from 'react';
import { motion } from 'framer-motion';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import { signOut } from '@/services/auth';
import { useRouter } from 'next/navigation';
import { User, Bell, Globe, Shield, LogOut } from 'lucide-react';

const SettingsPage: FC = () => {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [school, setSchool] = useState(profile?.profile.school || '');
  const [grade, setGrade] = useState(profile?.profile.grade || '');
  const [city, setCity] = useState(profile?.profile.city || '');
  const [notifications, setNotifications] = useState(
    profile?.settings.notifications ?? true
  );
  const [language, setLanguage] = useState(profile?.settings.language || 'id');
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
        'settings.language': language,
      });
      addToast('success', 'Settings saved!');
    } catch {
      addToast('error', 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/');
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

        <div className="space-y-6">
          {/* Profile */}
          <div className="rounded-3xl bg-white p-7 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <User size={18} className="text-primary" />
              </div>
              <h2 className="text-sm font-bold text-gray-900">Profile</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-primary/20"
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
                    className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-primary/20"
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
                    className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-primary/20"
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
                  className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-primary/20"
                  placeholder="Jakarta"
                />
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="rounded-3xl bg-white p-7 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
                <Bell size={18} className="text-amber-500" />
              </div>
              <h2 className="text-sm font-bold text-gray-900">Notifications</h2>
            </div>

            <div className="space-y-4">
              <label className="flex cursor-pointer items-center justify-between rounded-xl bg-gray-50 px-4 py-3.5">
                <span className="text-sm text-gray-700">
                  Push notifications
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
          </div>

          {/* Language */}
          <div className="rounded-3xl bg-white p-7 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                <Globe size={18} className="text-blue-500" />
              </div>
              <h2 className="text-sm font-bold text-gray-900">Language</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setLanguage('id')}
                className={`rounded-xl px-4 py-3.5 text-sm font-semibold transition-all ${
                  language === 'id'
                    ? 'bg-primary/10 text-primary ring-2 ring-primary/30'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                🇮🇩 Bahasa Indonesia
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`rounded-xl px-4 py-3.5 text-sm font-semibold transition-all ${
                  language === 'en'
                    ? 'bg-primary/10 text-primary ring-2 ring-primary/30'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                🇬🇧 English
              </button>
            </div>
          </div>

          {/* Privacy & Security */}
          <div className="rounded-3xl bg-white p-7 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                <Shield size={18} className="text-emerald-500" />
              </div>
              <h2 className="text-sm font-bold text-gray-900">
                Privacy & Security
              </h2>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3.5">
                <span className="text-sm text-gray-700">Email</span>
                <span className="text-sm text-gray-500">{profile.email}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3.5">
                <span className="text-sm text-gray-700">Role</span>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold capitalize text-primary">
                  {profile.role}
                </span>
              </div>
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-2xl bg-gradient-to-r from-primary to-primary-cyan py-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all disabled:opacity-50 hover:enabled:-translate-y-0.5"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-50 py-4 text-sm font-semibold text-rose-600 transition-all hover:bg-rose-100"
          >
            <LogOut size={16} />
            Log Out
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsPage;
