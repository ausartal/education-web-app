'use client';

import { FC, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Trophy,
  Flame,
  MessageCircle,
  Info,
  Check,
  LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  Notification,
  NotificationType,
} from '@/services/notifications';

const typeIcons: Record<NotificationType, LucideIcon> = {
  achievement: Trophy,
  streak: Flame,
  message: MessageCircle,
  system: Info,
};

const typeColors: Record<NotificationType, string> = {
  achievement: 'bg-amber-100 text-amber-600',
  streak: 'bg-orange-100 text-orange-600',
  message: 'bg-blue-100 text-primary',
  system: 'bg-gray-100 text-gray-600',
};

export const NotificationDropdown: FC = () => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!profile) return;
    getNotifications(profile.uid)
      .then(setNotifications)
      .catch(() => {});
  }, [profile]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkAll = async () => {
    if (!profile) return;
    await markAllAsRead(profile.uid);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleMarkOne = async (id: string) => {
    await markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl bg-white shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Check size={12} /> Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">
                  No notifications
                </p>
              ) : (
                notifications.slice(0, 10).map((notif) => {
                  const Icon = typeIcons[notif.type];
                  return (
                    <button
                      key={notif.id}
                      onClick={() => handleMarkOne(notif.id)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                        !notif.read ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${typeColors[notif.type]}`}
                      >
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {notif.title}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {notif.body}
                        </p>
                      </div>
                      {!notif.read && (
                        <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
