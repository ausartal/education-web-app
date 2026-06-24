'use client';

import { FC, useEffect, useState, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  collection, query, where, onSnapshot, addDoc,
  serverTimestamp, getDocs, or, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { Send, Search, MessageCircle } from 'lucide-react';
import { Message } from '@/types/firestore';

interface Contact {
  uid: string;
  displayName: string;
}

// ── Helpers ────────────────────────────────────────────────────────
const getMillis = (ts: unknown): number => {
  if (!ts) return 0;
  if (typeof (ts as Timestamp).toMillis === 'function') return (ts as Timestamp).toMillis();
  if (typeof (ts as { toMillis: () => number }).toMillis === 'function') return (ts as { toMillis: () => number }).toMillis();
  return 0;
};

const formatTime = (ts: unknown): string => {
  const ms = getMillis(ts);
  if (!ms) return '';
  return new Date(ms).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

const formatDateLabel = (ts: unknown): string => {
  const ms = getMillis(ts);
  if (!ms) return '';
  const d = new Date(ms);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Hari ini';
  if (d.toDateString() === yesterday.toDateString()) return 'Kemarin';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

const getInitial = (name: string) => name.trim().charAt(0).toUpperCase();

const AVATAR_COLORS = [
  'from-violet-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-sky-400 to-blue-500',
];

const avatarColor = (uid: string) =>
  AVATAR_COLORS[uid.charCodeAt(0) % AVATAR_COLORS.length];

// ── Avatar ─────────────────────────────────────────────────────────
const Avatar: FC<{ name: string; uid: string; size?: 'sm' | 'md' | 'lg' }> = ({ name, uid, size = 'md' }) => {
  const sz = size === 'sm' ? 'h-7 w-7 text-[10px]' : size === 'lg' ? 'h-11 w-11 text-sm' : 'h-9 w-9 text-xs';
  return (
    <div className={`${sz} shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br ${avatarColor(uid)} font-bold text-white select-none`}>
      {getInitial(name)}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────
const TeacherMessages: FC = () => {
  const { profile } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load contacts (students)
  useEffect(() => {
    getDocs(query(collection(db, 'users'), where('role', '==', 'student'))).then(snap => {
      setContacts(snap.docs.map(d => ({ uid: d.id, displayName: d.data().displayName || 'Siswa' })));
      setLoading(false);
    });
  }, []);

  // Real-time messages listener
  useEffect(() => {
    if (!selectedUid || !profile) { setMessages([]); return; }

    const q = query(
      collection(db, 'messages'),
      or(
        where('senderId', '==', profile.uid),
        where('receiverId', '==', profile.uid)
      )
    );

    const unsub = onSnapshot(q, snap => {
      const filtered = snap.docs
        .map(d => ({ id: d.id, ...d.data() }) as Message)
        .filter(m =>
          (m.senderId === profile.uid && m.receiverId === selectedUid) ||
          (m.senderId === selectedUid && m.receiverId === profile.uid)
        )
        .sort((a, b) => getMillis(a.createdAt) - getMillis(b.createdAt));
      setMessages(filtered);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    });

    return unsub;
  }, [selectedUid, profile]);

  // Scroll to bottom when switching contact
  useEffect(() => {
    if (selectedUid) {
      setTimeout(() => bottomRef.current?.scrollIntoView(), 80);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [selectedUid]);

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || !selectedUid || !profile || sending) return;
    const text = newMessage.trim();
    setNewMessage('');
    setSending(true);
    await addDoc(collection(db, 'messages'), {
      senderId: profile.uid,
      receiverId: selectedUid,
      content: text,
      readAt: null,
      createdAt: serverTimestamp(),
    });
    setSending(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [newMessage, selectedUid, profile, sending]);

  const selectedContact = contacts.find(c => c.uid === selectedUid);
  const filteredContacts = contacts.filter(c =>
    c.displayName.toLowerCase().includes(search.toLowerCase())
  );

  // Group messages by date
  const groupedMessages = messages.reduce<{ date: string; msgs: Message[] }[]>((groups, msg) => {
    const label = formatDateLabel(msg.createdAt);
    const last = groups[groups.length - 1];
    if (last?.date === label) { last.msgs.push(msg); }
    else { groups.push({ date: label, msgs: [msg] }); }
    return groups;
  }, []);

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
    </div>
  );

  return (
    <RoleGuard allowedRoles={['teacher', 'admin']}>
      <div className="mx-auto flex h-[calc(100vh-80px)] max-w-5xl gap-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 my-4">

        {/* ── Sidebar ── */}
        <div className="flex w-72 shrink-0 flex-col border-r border-gray-100">
          {/* Sidebar header */}
          <div className="px-4 pt-5 pb-3">
            <h2 className="mb-4 text-base font-bold text-gray-900">Pesan</h2>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari siswa..."
                className="w-full rounded-xl bg-gray-100 py-2.5 pl-9 pr-3 text-sm text-gray-700 outline-none transition-colors focus:bg-gray-50 focus:ring-2 focus:ring-violet-200 placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Contact list */}
          <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
            {filteredContacts.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-gray-400">Tidak ada siswa ditemukan</p>
            )}
            {filteredContacts.map(contact => (
              <button
                key={contact.uid}
                onClick={() => setSelectedUid(contact.uid)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                  selectedUid === contact.uid
                    ? 'bg-violet-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <Avatar name={contact.displayName} uid={contact.uid} />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-medium ${selectedUid === contact.uid ? 'text-violet-700' : 'text-gray-800'}`}>
                    {contact.displayName}
                  </p>
                  <p className="text-[11px] text-gray-400">Siswa</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Chat area ── */}
        <div className="flex flex-1 flex-col min-w-0">
          <AnimatePresence mode="wait">
            {!selectedUid ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-1 flex-col items-center justify-center gap-4 text-gray-400"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
                  <MessageCircle size={28} strokeWidth={1.5} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">Pilih percakapan</p>
                  <p className="mt-1 text-xs text-gray-400">Pilih siswa di sebelah kiri untuk mulai chat</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={selectedUid}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-1 flex-col min-h-0"
              >
                {/* Chat header */}
                <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3.5">
                  {selectedContact && (
                    <>
                      <Avatar name={selectedContact.displayName} uid={selectedContact.uid} size="md" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{selectedContact.displayName}</p>
                        <p className="text-[11px] text-gray-400">Siswa</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1" style={{ background: '#f9f9fc' }}>
                  {messages.length === 0 && (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-xs text-gray-400">Belum ada pesan. Mulai percakapan!</p>
                    </div>
                  )}

                  {groupedMessages.map(group => (
                    <div key={group.date}>
                      {/* Date separator */}
                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 border-t border-gray-200" />
                        <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[10px] font-medium text-gray-400 shadow-sm border border-gray-100">
                          {group.date}
                        </span>
                        <div className="flex-1 border-t border-gray-200" />
                      </div>

                      {/* Messages in group */}
                      <div className="space-y-1">
                        {group.msgs.map((msg, i) => {
                          const isMine = msg.senderId === profile?.uid;
                          const nextMsg = group.msgs[i + 1];
                          const prevMsg = group.msgs[i - 1];
                          const isLastInChain = !nextMsg || nextMsg.senderId !== msg.senderId;
                          const isFirstInChain = !prevMsg || prevMsg.senderId !== msg.senderId;
                          const showAvatar = !isMine && isLastInChain;

                          // Bubble rounding: continuous messages share edges
                          const myRadius = `${isFirstInChain ? 'rounded-tl-2xl' : 'rounded-tl-lg'} rounded-tr-2xl ${isLastInChain ? 'rounded-bl-2xl' : 'rounded-bl-lg'} rounded-br-md`;
                          const theirRadius = `rounded-tl-2xl ${isFirstInChain ? 'rounded-tr-2xl' : 'rounded-tr-lg'} rounded-br-2xl ${isLastInChain ? 'rounded-tr-2xl' : 'rounded-tr-lg'} rounded-bl-md`;

                          return (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.15 }}
                              className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'} ${isFirstInChain && i > 0 ? 'mt-3' : ''}`}
                            >
                              {/* Avatar placeholder for alignment */}
                              {!isMine && (
                                <div className="w-7 shrink-0">
                                  {showAvatar && selectedContact && (
                                    <Avatar name={selectedContact.displayName} uid={selectedContact.uid} size="sm" />
                                  )}
                                </div>
                              )}

                              {/* Bubble */}
                              <div className={`flex flex-col gap-0.5 max-w-[65%] ${isMine ? 'items-end' : 'items-start'}`}>
                                <div
                                  className={`px-4 py-2.5 text-sm leading-relaxed break-words ${
                                    isMine
                                      ? `bg-violet-600 text-white ${myRadius}`
                                      : `bg-white text-gray-800 shadow-sm border border-gray-100 ${theirRadius}`
                                  }`}
                                >
                                  {msg.content}
                                </div>
                                {/* Timestamp — only on last in chain */}
                                {isLastInChain && (
                                  <span className={`text-[10px] text-gray-400 px-1 ${isMine ? 'text-right' : 'text-left'}`}>
                                    {formatTime(msg.createdAt)}
                                  </span>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                {/* Input bar */}
                <div className="border-t border-gray-100 bg-white px-4 py-3">
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder="Tulis pesan..."
                      className="flex-1 rounded-full bg-gray-100 px-5 py-3 text-sm text-gray-800 outline-none transition-colors focus:bg-gray-50 focus:ring-2 focus:ring-violet-200 placeholder:text-gray-400"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!newMessage.trim() || sending}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white shadow-sm transition-all disabled:opacity-40 hover:enabled:bg-violet-700 hover:enabled:shadow-md active:enabled:scale-95"
                    >
                      <Send size={16} className={sending ? 'opacity-50' : ''} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </RoleGuard>
  );
};

export default TeacherMessages;
