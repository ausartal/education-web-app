'use client';

import { FC, useEffect, useRef, useState, useCallback, KeyboardEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Terminal, Trash2 } from 'lucide-react';

interface OutputLine {
  type: 'input' | 'output' | 'error' | 'success' | 'info' | 'table';
  content: string;
  rows?: string[][];
  headers?: string[];
}

const HELP_TEXT = `
  AKURAT Admin CLI v1.0
  ═══════════════════════════════════════════
  Perintah tersedia:

  INFORMASI
    help                    Tampilkan bantuan ini
    whoami                  Info akun admin aktif
    stats                   Statistik platform
    ping                    Cek koneksi server

  PENGGUNA
    users [--role=<role>]   Daftar pengguna (role: student|teacher|admin)
    user <uid>              Detail pengguna
    create-user <email> <name> <role>   Buat pengguna baru
    activate <uid>          Aktifkan pengguna
    deactivate <uid>        Nonaktifkan pengguna
    set-role <uid> <role>   Ubah role pengguna
    delete <uid>            Hapus pengguna (PERMANENT)

  SOAL
    questions [--difficulty=<d>]  Daftar soal (d: easy|moderate|hard)
    q-activate <id>         Aktifkan soal
    q-deactivate <id>       Nonaktifkan soal
    q-delete <id>           Hapus soal (PERMANENT)

  AUDIT
    logs [--limit=<n>]      Tampilkan audit log (default: 20)

  EXPORT
    export users            Export pengguna sebagai CSV
    export questions        Export soal sebagai CSV
    export exams            Export sesi ujian sebagai CSV

  TAMPILAN
    clear                   Bersihkan layar
    history                 Tampilkan riwayat perintah
`.trim();

const AdminCLI: FC = () => {
  const { user, profile } = useAuth();
  const [output, setOutput] = useState<OutputLine[]>([
    { type: 'info', content: '  ╔══════════════════════════════════════╗' },
    { type: 'info', content: '  ║   AKURAT Admin CLI  v1.0             ║' },
    { type: 'info', content: '  ║   Ketik "help" untuk bantuan         ║' },
    { type: 'info', content: '  ╚══════════════════════════════════════╝' },
    { type: 'output', content: '' },
  ]);
  const [input, setInput] = useState('');
  const [historyList, setHistoryList] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addLines = useCallback((lines: OutputLine[]) => {
    setOutput(prev => [...prev, ...lines]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output]);

  const getToken = useCallback(async () => {
    if (!user) throw new Error('Not authenticated');
    return user.getIdToken();
  }, [user]);

  const apiFetch = useCallback(async (url: string, opts?: RequestInit) => {
    const token = await getToken();
    const res = await fetch(url, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts?.headers || {}) },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }, [getToken]);

  const runCommand = useCallback(async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    setHistoryList(prev => [trimmed, ...prev.slice(0, 49)]);
    setHistIdx(-1);

    addLines([{ type: 'input', content: `admin@akurat:~$ ${trimmed}` }]);

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    const flag = (name: string) => {
      const f = args.find(a => a.startsWith(`--${name}=`));
      return f ? f.split('=')[1] : null;
    };

    setBusy(true);
    try {
      if (cmd === 'clear') {
        setOutput([]);
        return;
      }

      if (cmd === 'history') {
        addLines(historyList.map((h, i) => ({ type: 'output' as const, content: `  ${String(i + 1).padStart(3)}  ${h}` })));
        return;
      }

      if (cmd === 'help') {
        addLines(HELP_TEXT.split('\n').map(l => ({ type: 'info' as const, content: l })));
        return;
      }

      if (cmd === 'ping') {
        const t = Date.now();
        await apiFetch('/api/admin/stats');
        addLines([{ type: 'success', content: `  PONG! Latensi: ${Date.now() - t}ms` }]);
        return;
      }

      if (cmd === 'whoami') {
        addLines([
          { type: 'output', content: `  UID      : ${profile?.uid ?? '—'}` },
          { type: 'output', content: `  Nama     : ${profile?.displayName ?? '—'}` },
          { type: 'output', content: `  Email    : ${profile?.email ?? '—'}` },
          { type: 'output', content: `  Role     : ${profile?.role ?? '—'}` },
          { type: 'output', content: `  Aktif    : ${profile?.isActive ? 'ya' : 'tidak'}` },
        ]);
        return;
      }

      if (cmd === 'stats') {
        const d = await apiFetch('/api/admin/stats');
        addLines([
          { type: 'output', content: '  ─── Platform Stats ───────────────────' },
          { type: 'output', content: `  Total Pengguna : ${d.users?.total ?? 0}` },
          { type: 'output', content: `    Siswa        : ${d.users?.byRole?.student ?? 0}` },
          { type: 'output', content: `    Guru         : ${d.users?.byRole?.teacher ?? 0}` },
          { type: 'output', content: `    Admin        : ${d.users?.byRole?.admin ?? 0}` },
          { type: 'output', content: `  Aktif          : ${d.users?.active ?? 0}` },
          { type: 'output', content: `  Materi         : ${d.materials ?? 0}` },
          { type: 'output', content: `  Soal           : ${d.questions ?? 0}` },
          { type: 'output', content: `  Ujian          : ${d.exams ?? 0}` },
        ]);
        return;
      }

      if (cmd === 'users') {
        const role = flag('role');
        const d = await apiFetch('/api/admin/users');
        let users = d.users as Array<{ uid: string; displayName: string; email: string; role: string; isActive: boolean }>;
        if (role) users = users.filter(u => u.role === role);
        addLines([
          { type: 'table', content: '', headers: ['UID (12)', 'Nama', 'Email', 'Role', 'Aktif'],
            rows: users.slice(0, 30).map(u => [u.uid.slice(0, 12), u.displayName ?? '—', u.email ?? '—', u.role, u.isActive ? '✓' : '✗']) },
          { type: 'output', content: `  ${users.length} pengguna ditampilkan${users.length > 30 ? ' (maks 30)' : ''}` },
        ]);
        return;
      }

      if (cmd === 'user') {
        if (!args[0]) { addLines([{ type: 'error', content: '  Error: Harap sertakan UID' }]); return; }
        const d = await apiFetch('/api/admin/users');
        const u = (d.users as Array<Record<string, unknown>>).find(x => (x.uid as string)?.startsWith(args[0]));
        if (!u) { addLines([{ type: 'error', content: `  Error: Pengguna tidak ditemukan — ${args[0]}` }]); return; }
        addLines([
          { type: 'output', content: `  UID      : ${u.uid}` },
          { type: 'output', content: `  Nama     : ${u.displayName}` },
          { type: 'output', content: `  Email    : ${u.email}` },
          { type: 'output', content: `  Role     : ${u.role}` },
          { type: 'output', content: `  Aktif    : ${u.isActive ? 'ya' : 'tidak'}` },
          { type: 'output', content: `  XP       : ${(u.stats as Record<string, number>)?.xp ?? 0}` },
          { type: 'output', content: `  Level    : ${(u.stats as Record<string, number>)?.level ?? 1}` },
        ]);
        return;
      }

      if (cmd === 'create-user') {
        if (args.length < 3) { addLines([{ type: 'error', content: '  Penggunaan: create-user <email> <nama> <role>' }]); return; }
        const [email, displayName, role] = args;
        if (!['student', 'teacher', 'admin'].includes(role)) {
          addLines([{ type: 'error', content: `  Error: Role tidak valid — ${role}` }]); return;
        }
        const pw = `Akurat@${Math.floor(Math.random() * 90000) + 10000}!`;
        addLines([{ type: 'info', content: `  Membuat pengguna ${email}...` }]);
        const d = await apiFetch('/api/admin/users', {
          method: 'POST', body: JSON.stringify({ email, displayName, role, password: pw }),
        });
        addLines([
          { type: 'success', content: `  ✓ Pengguna dibuat` },
          { type: 'output', content: `  UID      : ${d.user?.uid}` },
          { type: 'output', content: `  Email    : ${email}` },
          { type: 'output', content: `  Password : ${pw}` },
          { type: 'output', content: `  Role     : ${role}` },
        ]);
        return;
      }

      if (cmd === 'activate' || cmd === 'deactivate') {
        if (!args[0]) { addLines([{ type: 'error', content: `  Error: Harap sertakan UID` }]); return; }
        await apiFetch(`/api/admin/users/${args[0]}`, {
          method: 'PATCH', body: JSON.stringify({ isActive: cmd === 'activate' }),
        });
        addLines([{ type: 'success', content: `  ✓ Pengguna ${args[0].slice(0, 12)}... telah di-${cmd === 'activate' ? 'aktifkan' : 'nonaktifkan'}` }]);
        return;
      }

      if (cmd === 'set-role') {
        if (args.length < 2) { addLines([{ type: 'error', content: '  Penggunaan: set-role <uid> <role>' }]); return; }
        const [uid, role] = args;
        if (!['student', 'teacher', 'admin'].includes(role)) {
          addLines([{ type: 'error', content: `  Error: Role tidak valid — ${role}` }]); return;
        }
        await apiFetch(`/api/admin/users/${uid}`, {
          method: 'PATCH', body: JSON.stringify({ role }),
        });
        addLines([{ type: 'success', content: `  ✓ Role pengguna ${uid.slice(0, 12)}... diubah menjadi ${role}` }]);
        return;
      }

      if (cmd === 'delete') {
        if (!args[0]) { addLines([{ type: 'error', content: `  Error: Harap sertakan UID` }]); return; }
        addLines([{ type: 'info', content: `  Menghapus pengguna ${args[0]}...` }]);
        await apiFetch(`/api/admin/users/${args[0]}`, { method: 'DELETE' });
        addLines([{ type: 'success', content: `  ✓ Pengguna ${args[0].slice(0, 12)}... dihapus` }]);
        return;
      }

      if (cmd === 'questions') {
        const difficulty = flag('difficulty');
        let url = '/api/admin/questions';
        if (difficulty) url += `?difficulty=${difficulty}`;
        const d = await apiFetch(url);
        const questions = d.questions as Array<{ id: string; topic: string; difficulty: string; status: string; stem: string; usageCount: number }>;
        addLines([
          { type: 'table', content: '', headers: ['ID (12)', 'Topic', 'Difficulty', 'Status', 'Used', 'Stem (40)'],
            rows: questions.slice(0, 20).map(q => [q.id.slice(0, 12), q.topic ?? '—', q.difficulty, q.status, String(q.usageCount), (q.stem ?? '').slice(0, 40)]) },
          { type: 'output', content: `  ${questions.length} soal${questions.length > 20 ? ' (maks 20)' : ''}` },
        ]);
        return;
      }

      if (cmd === 'q-activate' || cmd === 'q-deactivate') {
        if (!args[0]) { addLines([{ type: 'error', content: `  Error: Harap sertakan ID soal` }]); return; }
        await apiFetch(`/api/admin/questions/${args[0]}`, {
          method: 'PATCH', body: JSON.stringify({ status: cmd === 'q-activate' ? 'active' : 'inactive' }),
        });
        addLines([{ type: 'success', content: `  ✓ Soal ${args[0].slice(0, 12)}... diubah menjadi ${cmd === 'q-activate' ? 'active' : 'inactive'}` }]);
        return;
      }

      if (cmd === 'q-delete') {
        if (!args[0]) { addLines([{ type: 'error', content: `  Error: Harap sertakan ID soal` }]); return; }
        await apiFetch(`/api/admin/questions/${args[0]}`, { method: 'DELETE' });
        addLines([{ type: 'success', content: `  ✓ Soal ${args[0].slice(0, 12)}... dihapus` }]);
        return;
      }

      if (cmd === 'logs') {
        const limit = flag('limit') ?? '20';
        const d = await apiFetch(`/api/admin/audit?limit=${limit}`);
        const logs = d.logs as Array<{ actorId: string; action: string; targetId: string; targetType: string; timestamp: { _seconds?: number; seconds?: number } }>;
        addLines([
          { type: 'table', content: '', headers: ['Waktu', 'Aktor (12)', 'Aksi', 'Target'],
            rows: logs.map(l => {
              const secs = l.timestamp?._seconds ?? l.timestamp?.seconds;
              const ts = secs ? new Date(secs * 1000).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
              return [ts, l.actorId.slice(0, 12), l.action, `${l.targetType}:${l.targetId.slice(0, 8)}`];
            }) },
          { type: 'output', content: `  ${logs.length} log` },
        ]);
        return;
      }

      if (cmd === 'export') {
        const colMap: Record<string, string> = { users: 'users', questions: 'question_bank', exams: 'exam_sessions' };
        const colKey = args[0];
        const col = colMap[colKey];
        if (!col) { addLines([{ type: 'error', content: `  Penggunaan: export users|questions|exams` }]); return; }
        addLines([{ type: 'info', content: `  Mengunduh ${colKey}...` }]);
        const token = await getToken();
        const res = await fetch(`/api/admin/export?collection=${col}&format=csv`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${colKey}-export.csv`;
        a.click();
        URL.revokeObjectURL(url);
        addLines([{ type: 'success', content: `  ✓ Download dimulai — ${colKey}-export.csv` }]);
        return;
      }

      addLines([{ type: 'error', content: `  bash: ${cmd}: perintah tidak ditemukan. Ketik "help" untuk bantuan.` }]);
    } catch (err) {
      addLines([{ type: 'error', content: `  Error: ${err instanceof Error ? err.message : String(err)}` }]);
    } finally {
      setBusy(false);
      addLines([{ type: 'output', content: '' }]);
    }
  }, [addLines, apiFetch, getToken, historyList, profile]);

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !busy) {
      runCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIdx = Math.min(histIdx + 1, historyList.length - 1);
      setHistIdx(newIdx);
      if (historyList[newIdx]) setInput(historyList[newIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIdx = Math.max(histIdx - 1, -1);
      setHistIdx(newIdx);
      setInput(newIdx === -1 ? '' : historyList[newIdx]);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const cmds = ['help', 'whoami', 'stats', 'ping', 'users', 'user', 'create-user', 'activate', 'deactivate', 'set-role', 'delete', 'questions', 'q-activate', 'q-deactivate', 'q-delete', 'logs', 'export', 'clear', 'history'];
      const match = cmds.find(c => c.startsWith(input));
      if (match) setInput(match);
    }
  };

  const lineColor: Record<OutputLine['type'], string> = {
    input: 'text-green-400',
    output: 'text-gray-400',
    error: 'text-red-400',
    success: 'text-emerald-400',
    info: 'text-cyan-400',
    table: 'text-gray-400',
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-gray-900">Admin CLI Terminal</h1>
          <p className="text-sm text-gray-500">Antarmuka baris perintah untuk manajemen platform</p>
        </div>
        <button
          onClick={() => setOutput([])}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-500 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 size={13} /> Bersihkan Layar
        </button>
      </div>

      {/* Terminal window */}
      <div className="overflow-hidden rounded-2xl border border-gray-800 shadow-2xl">
        {/* Title bar */}
        <div className="flex items-center gap-3 border-b border-gray-800 bg-gray-900 px-4 py-2.5">
          <Terminal size={13} className="text-gray-500" />
          <span className="flex-1 text-center font-mono text-xs text-gray-500">
            admin@akurat — bash
          </span>
          <span className="font-mono text-[10px] text-gray-600">{profile?.email ?? ''}</span>
        </div>

        {/* Output area */}
        <div
          onClick={() => inputRef.current?.focus()}
          className="min-h-[500px] max-h-[600px] cursor-text overflow-y-auto bg-gray-950 px-5 py-4 font-mono text-sm"
        >
          {output.map((line, i) => {
            if (line.type === 'table' && line.headers && line.rows) {
              const widths = line.headers.map((h, ci) => {
                const maxData = Math.max(...(line.rows?.map(r => (r[ci] ?? '').length) ?? [0]));
                return Math.max(h.length, maxData, 8);
              });
              return (
                <div key={i} className="my-1 overflow-x-auto">
                  <div className="whitespace-pre text-cyan-500 opacity-70">
                    {'  ' + line.headers.map((h, ci) => h.padEnd(widths[ci])).join('   ')}
                  </div>
                  <div className="whitespace-pre text-gray-700">
                    {'  ' + widths.map(w => '─'.repeat(w)).join('   ')}
                  </div>
                  {line.rows.map((row, ri) => (
                    <div key={ri} className={`whitespace-pre ${ri % 2 === 0 ? 'text-gray-300' : 'text-gray-400'}`}>
                      {'  ' + row.map((cell, ci) => (cell ?? '').padEnd(widths[ci])).join('   ')}
                    </div>
                  ))}
                </div>
              );
            }
            return (
              <div key={i} className={`${lineColor[line.type]} whitespace-pre-wrap leading-[1.6]`}>
                {line.content}
              </div>
            );
          })}

          {/* Input row */}
          <div className="mt-1 flex items-center gap-2.5">
            <span className="select-none text-green-500">admin@akurat:~$</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={busy}
              autoComplete="off"
              spellCheck={false}
              autoFocus
              className="flex-1 bg-transparent text-green-300 outline-none caret-green-400 disabled:opacity-40"
              placeholder={busy ? 'Memproses...' : ''}
            />
            {busy && (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
            )}
          </div>
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Keyboard shortcuts */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-gray-100 bg-gray-50 px-5 py-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Pintasan</p>
        <span className="text-xs text-gray-500">
          <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5 font-mono text-[10px] shadow-sm">Enter</kbd>
          {' '}Jalankan
        </span>
        <span className="text-xs text-gray-500">
          <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5 font-mono text-[10px] shadow-sm">↑</kbd>
          {' '}<kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5 font-mono text-[10px] shadow-sm">↓</kbd>
          {' '}Riwayat
        </span>
        <span className="text-xs text-gray-500">
          <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5 font-mono text-[10px] shadow-sm">Tab</kbd>
          {' '}Autocomplete
        </span>
        <span className="text-xs text-gray-500">
          Ketik <code className="rounded border border-gray-100 bg-white px-1.5 py-0.5 font-mono text-[10px] shadow-sm text-cyan-600">help</code> untuk semua perintah
        </span>
      </div>
    </div>
  );
};

export default AdminCLI;
