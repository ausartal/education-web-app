'use client';

import { FC, useCallback, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  MessageCircle,
  Info,
  Check,
  ClipboardList,
  Award,
  FileCheck,
  Users,
  UserCheck,
  TriangleAlert,
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
  message: MessageCircle,
  system: Info,
  assignment: ClipboardList,
  grade: Award,
  exam: FileCheck,
  class: Users,
  certificate: Award,
  account: UserCheck,
  alert: TriangleAlert,
};

const typeColors: Record<NotificationType, string> = {
  message: 'bg-blue-100 text-primary',
  system: 'bg-gray-100 text-gray-600',
  assignment: 'bg-amber-100 text-amber-600',
  grade: 'bg-emerald-100 text-emerald-600',
  exam: 'bg-violet-100 text-violet-600',
  class: 'bg-cyan-100 text-cyan-600',
  certificate: 'bg-violet-100 text-violet-600',
  account: 'bg-sky-100 text-sky-600',
  alert: 'bg-rose-100 text-rose-600',
};

const POLL_MS = 60_000;

function toMillis(value: unknown): number {
  if (!value || typeof value !== 'object') return 0;
  const v = value as { toMillis?: () => number; seconds?: number; _seconds?: number };
  if (typeof v.toMillis === 'function') return v.toMillis();
  const seconds = v.seconds ?? v._seconds;
  return typeof seconds === 'number' ? seconds * 1000 : 0;
}

function timeAgo(value: unknown): string {
  const ms = toMillis(value);
  if (!ms) return '';
  const diff = Math.max(0, Date.now() - ms);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} mnt lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return new Date(ms).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

interface NotificationDropdownProps {
  /** Opens to the left edge when the bell sits at the right of the screen. */
  align?: 'right' | 'left';
}

export const NotificationDropdown: FC<NotificationDropdownProps> = ({ align = 'right' }) => {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const uid = user?.uid;

  const load = useCallback(() => {
    if (!uid) return;
    getNotifications(uid)
      .then(setNotifications)
      .catch(() => {});
  }, [uid]);

  // Initial load, then refresh every minute while the tab is visible.
  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

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

  const toggle = () => {
    if (!open) load();
    setOpen(!open);
  };

  const handleMarkAll = async () => {
    if (!uid) return;
    await markAllAsRead(uid);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleOpenNotification = async (notif: Notification) => {
    if (!notif.read) {
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));
      markAsRead(notif.id).catch(() => {});
    }
    if (notif.link) {
      setOpen(false);
      router.push(notif.link);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        className="relative rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        aria-label={unreadCount > 0 ? `Notifikasi, ${unreadCount} belum dibaca` : 'Notifikasi'}
        aria-expanded={open}
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
            className={`absolute top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-100 ${align === 'right' ? 'right-0' : 'left-0'}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h3 className="text-sm font-bold text-gray-900">Notifikasi</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Check size={12} /> Tandai semua dibaca
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">
                  Belum ada notifikasi
                </p>
              ) : (
                notifications.slice(0, 15).map((notif) => {
                  const Icon = typeIcons[notif.type] ?? Info;
                  const color = typeColors[notif.type] ?? typeColors.system;
                  return (
                    <button
                      key={notif.id}
                      onClick={() => handleOpenNotification(notif)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                        !notif.read ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${color}`}
                      >
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {notif.title}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {notif.body}
                        </p>
                        <p className="mt-0.5 text-[10px] text-gray-400">{timeAgo(notif.createdAt)}</p>
                      </div>
                      {!notif.read && (
                        <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
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
