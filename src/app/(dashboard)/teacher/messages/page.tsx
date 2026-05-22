'use client';

import { FC, useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  or,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { Send } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load students
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

  // Load messages for selected student
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

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={['teacher', 'admin']}>
      <div className="mx-auto flex h-[calc(100vh-120px)] max-w-5xl gap-4 px-4 py-8">
        {/* Student List */}
        <div className="w-64 shrink-0 overflow-y-auto rounded-3xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-gray-900">Students</h2>
          <div className="space-y-1">
            {students.map((s) => (
              <button
                key={s.uid}
                onClick={() => setSelectedStudent(s.uid)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                  selectedStudent === s.uid
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-cyan text-xs font-bold text-white">
                  {s.displayName.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium">{s.displayName}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex flex-1 flex-col rounded-3xl bg-white shadow-sm">
          {!selectedStudent ? (
            <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
              Select a student to start messaging
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="border-b border-gray-100 px-6 py-4">
                <p className="text-sm font-bold text-gray-900">
                  {students.find((s) => s.uid === selectedStudent)?.displayName}
                </p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
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
                              ? 'bg-primary text-white'
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
                    placeholder="Type a message..."
                    className="flex-1 rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!newMessage.trim()}
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white transition-all disabled:opacity-40 hover:enabled:opacity-90"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </RoleGuard>
  );
};

export default TeacherMessages;
