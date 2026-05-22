'use client';

import { FC, useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  serverTimestamp,
  or,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { Send, Search, MessageCircle } from 'lucide-react';
import { Message } from '@/types/firestore';

interface StudentContact {
  uid: string;
  displayName: string;
}

const TeacherMessages: FC = () => {
  const { profile } = useAuth();
  const [students, setStudents] = useState<StudentContact[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchContact, setSearchContact] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(
        query(collection(db, 'users'), where('role', '==', 'student'))
      );
      setStudents(
        snap.docs.map((d) => ({
          uid: d.id,
          displayName: d.data().displayName,
        }))
      );
      setLoading(false);
    };
    fetch();
  }, []);

  useEffect(() => {
    if (!selectedStudent || !profile) return;
    const fetchMessages = async () => {
      const q = query(
        collection(db, 'messages'),
        or(
          where('senderId', '==', profile.uid),
          where('receiverId', '==', profile.uid)
        )
      );
      const snap = await getDocs(q);
      const filtered = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Message)
        .filter(
          (m) =>
            (m.senderId === profile.uid && m.receiverId === selectedStudent) ||
            (m.senderId === selectedStudent && m.receiverId === profile.uid)
        )
        .sort(
          (a, b) =>
            (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0)
        );
      setMessages(filtered);
      setTimeout(() => messagesEndRef.current?.scrollIntoView(), 100);
    };
    fetchMessages();
  }, [selectedStudent, profile]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedStudent || !profile) return;
    await addDoc(collection(db, 'messages'), {
      senderId: profile.uid,
      receiverId: selectedStudent,
      content: newMessage.trim(),
      readAt: null,
      createdAt: serverTimestamp(),
    });
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        senderId: profile.uid,
        receiverId: selectedStudent,
        content: newMessage.trim(),
        readAt: null,
        createdAt: { toMillis: () => Date.now() },
      } as unknown as Message,
    ]);
    setNewMessage('');
    setTimeout(() => messagesEndRef.current?.scrollIntoView(), 100);
  };

  const filteredContacts = students.filter((s) =>
    s.displayName.toLowerCase().includes(searchContact.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={['teacher', 'admin']}>
      <div className="mx-auto flex h-[calc(100vh-120px)] max-w-5xl gap-4 py-8">
        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex w-72 shrink-0 flex-col rounded-3xl bg-white shadow-sm"
        >
          <div className="p-4 pb-3">
            <h2 className="mb-3 font-display text-sm font-bold text-gray-900">
              Kontak Siswa
            </h2>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchContact}
                onChange={(e) => setSearchContact(e.target.value)}
                placeholder="Cari siswa..."
                className="w-full rounded-xl bg-gray-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
            {filteredContacts.map((s) => (
              <button
                key={s.uid}
                onClick={() => setSelectedStudent(s.uid)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                  selectedStudent === s.uid
                    ? 'bg-gradient-to-r from-primary/10 to-cyan-50 text-primary'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                    selectedStudent === s.uid
                      ? 'bg-gradient-to-br from-primary to-cyan-400'
                      : 'bg-gray-300'
                  }`}
                >
                  {s.displayName.charAt(0).toUpperCase()}
                </div>
                <span className="truncate text-sm font-medium">
                  {s.displayName}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Chat Area */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-1 flex-col rounded-3xl bg-white shadow-sm"
        >
          {!selectedStudent ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-gray-400">
              <MessageCircle size={40} strokeWidth={1.5} />
              <p className="text-sm">Pilih siswa untuk mulai percakapan</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-cyan-400 text-xs font-bold text-white">
                  {students
                    .find((s) => s.uid === selectedStudent)
                    ?.displayName.charAt(0)
                    .toUpperCase()}
                </div>
                <p className="text-sm font-bold text-gray-900">
                  {students.find((s) => s.uid === selectedStudent)?.displayName}
                </p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {messages.length === 0 && (
                  <p className="py-12 text-center text-xs text-gray-400">
                    Belum ada pesan. Mulai percakapan!
                  </p>
                )}
                <div className="space-y-3">
                  {messages.map((msg) => {
                    const isMine = msg.senderId === profile?.uid;
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                            isMine
                              ? 'bg-gradient-to-r from-primary to-blue-500 text-white'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </motion.div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input */}
              <div className="border-t border-gray-100 px-4 py-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ketik pesan..."
                    className="flex-1 rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!newMessage.trim()}
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-r from-primary to-blue-500 text-white shadow-sm transition-all disabled:opacity-40 hover:enabled:shadow-md"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </RoleGuard>
  );
};

export default TeacherMessages;
