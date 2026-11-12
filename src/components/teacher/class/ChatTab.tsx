'use client';

import { FC, useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ChatMessage, tsToDate } from './shared';

interface ChatTabProps {
  classId: string;
}

export const ChatTab: FC<ChatTabProps> = ({ classId }) => {
  const id = classId;
  const { user, profile } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatUnsub = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      const { collection, query, where, orderBy, limit, onSnapshot } = await import('@/lib/client-firestore');
      const { db } = await import('@/lib/firebase');
      const q = query(collection(db, 'class_messages'), where('classId', '==', id), orderBy('createdAt', 'asc'), limit(200));
      const unsub = onSnapshot(q, snap => {
        if (!active) return;
        setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
      });
      chatUnsub.current = unsub;
    })();
    return () => { active = false; chatUnsub.current?.(); chatUnsub.current = null; };
  }, [id]);

  const handleSendChat = async () => {
    const text = chatText.trim();
    if (!text || !user || !profile) return;
    setSendingChat(true);
    try {
      const { collection, addDoc, serverTimestamp } = await import('@/lib/client-firestore');
      const { db } = await import('@/lib/firebase');
      await addDoc(collection(db, 'class_messages'), {
        classId: id,
        senderId: user.uid,
        senderName: profile.displayName || 'Guru',
        senderRole: 'teacher',
        text,
        createdAt: serverTimestamp(),
      });
      setChatText('');
    } finally {
      setSendingChat(false);
    }
  };

  return (
      <motion.div key="chat" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
        className="flex h-[520px] flex-col rounded-2xl bg-white shadow-sm">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <MessageCircle size={36} className="mb-3 text-gray-200" />
              <p className="text-sm font-medium text-gray-400">Belum ada pesan</p>
              <p className="text-xs text-gray-300">Mulai percakapan dengan siswa</p>
            </div>
          )}
          {messages.map(msg => {
            const isMe = msg.senderId === user?.uid;
            const time = tsToDate(msg.createdAt);
            return (
              <div key={msg.id} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                  msg.senderRole === 'teacher' ? 'bg-emerald-500' : 'bg-primary'
                }`}>
                  {msg.senderName?.charAt(0).toUpperCase()}
                </div>
                <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                  <div className="flex items-center gap-1.5">
                    {!isMe && <span className="text-[10px] font-semibold text-gray-500">{msg.senderName}</span>}
                    {msg.senderRole === 'teacher' && (
                      <span className="rounded-full bg-emerald-100 px-1.5 py-px text-[9px] font-bold text-emerald-700">Guru</span>
                    )}
                  </div>
                  <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isMe ? 'rounded-tr-sm bg-emerald-500 text-white' : 'rounded-tl-sm bg-gray-100 text-gray-800'
                  }`}>
                    {msg.text}
                  </div>
                  {time && (
                    <span className="text-[9px] text-gray-300">
                      {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>
        <div className="border-t border-gray-100 p-3">
          <div className="flex gap-2">
            <input
              value={chatText}
              onChange={e => setChatText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
              placeholder="Tulis pesan ke siswa..."
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            />
            <button
              onClick={handleSendChat}
              disabled={sendingChat || !chatText.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {sendingChat ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </motion.div>
  );
};
