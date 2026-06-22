'use client';

import { FC, useEffect, useRef, useState, useCallback, KeyboardEvent } from 'react';
import { useAuth } from '@/context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface OutputLine {
  type: 'input' | 'output' | 'error' | 'success' | 'info' | 'table' | 'divider' | 'blank';
  content: string;
  rows?: string[][];
  headers?: string[];
  timestamp?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ALL_COMMANDS = [
  'help', 'whoami', 'stats', 'ping',
  'users', 'user', 'create-user', 'activate', 'deactivate', 'set-role', 'delete',
  'questions', 'q-activate', 'q-deactivate', 'q-delete',
  'logs', 'export', 'clear', 'history',
];

const HELP_SECTIONS = [
  {
    label: 'INFORMASI',
    color: 'text-sky-400',
    cmds: [
      ['help',                      'Tampilkan bantuan ini'],
      ['whoami',                    'Info akun admin aktif'],
      ['stats',                     'Statistik platform'],
      ['ping',                      'Cek koneksi server'],
    ],
  },
  {
    label: 'PENGGUNA',
    color: 'text-violet-400',
    cmds: [
      ['users [--role=<role>]',     'Daftar pengguna  (role: student|teacher|admin)'],
      ['user <uid>',                'Detail pengguna'],
      ['create-user <email> <name> <role>', 'Buat pengguna baru'],
      ['activate <uid>',            'Aktifkan pengguna'],
      ['deactivate <uid>',          'Nonaktifkan pengguna'],
      ['set-role <uid> <role>',     'Ubah role pengguna'],
      ['delete <uid>',              'Hapus pengguna (PERMANENT)'],
    ],
  },
  {
    label: 'SOAL',
    color: 'text-amber-400',
    cmds: [
      ['questions [--difficulty=<d>]', 'Daftar soal  (d: easy|moderate|hard)'],
      ['q-activate <id>',           'Aktifkan soal'],
      ['q-deactivate <id>',         'Nonaktifkan soal'],
      ['q-delete <id>',             'Hapus soal (PERMANENT)'],
    ],
  },
  {
    label: 'AUDIT & EXPORT',
    color: 'text-emerald-400',
    cmds: [
      ['logs [--limit=<n>]',        'Audit log (default: 20)'],
      ['export users|questions|exams', 'Unduh data sebagai CSV'],
    ],
  },
  {
    label: 'TAMPILAN',
    color: 'text-gray-400',
    cmds: [
      ['clear',                     'Bersihkan layar  (atau Ctrl+L)'],
      ['history',                   'Riwayat perintah'],
    ],
  },
];

const WELCOME: OutputLine[] = [
  { type: 'blank', content: '' },
  { type: 'info', content: '  ┌─────────────────────────────────────────────┐' },
  { type: 'info', content: '  │                                             │' },
  { type: 'info', content: '  │   AKURAT  Admin Terminal  v2.0              │' },
  { type: 'info', content: '  │   Ketik  help  untuk daftar perintah        │' },
  { type: 'info', content: '  │                                             │' },
  { type: 'info', content: '  └─────────────────────────────────────────────┘' },
  { type: 'blank', content: '' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const now = () =>
  new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminCLI: FC = () => {
  const { user, profile } = useAuth();
  const [output, setOutput] = useState<OutputLine[]>(WELCOME);
  const [input, setInput] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [historyList, setHistoryList] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output]);

  // Tab suggestion
  useEffect(() => {
    if (!input.trim()) { setSuggestion(''); return; }
    const parts = input.trim().split(/\s+/);
    if (parts.length === 1) {
      const match = ALL_COMMANDS.find(c => c.startsWith(parts[0]) && c !== parts[0]);
      setSuggestion(match ? match.slice(parts[0].length) : '');
    } else {
      setSuggestion('');
    }
  }, [input]);

  const addLines = useCallback((lines: OutputLine[]) => {
    setOutput(prev => [...prev, ...lines]);
  }, []);

  const getToken = useCallback(async () => {
    if (!user) throw new Error('Not authenticated');
    return user.getIdToken();
  }, [user]);

  const apiFetch = useCallback(async (url: string, opts?: RequestInit) => {
    const token = await getToken();
    const res = await fetch(url, {
      ...opts,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(opts?.headers ?? {}),
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }, [getToken]);

  const runCommand = useCallback(async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    setHistoryList(prev => [trimmed, ...prev.filter(h => h !== trimmed).slice(0, 49)]);
    setHistIdx(-1);

    const ts = now();
    addLines([{ type: 'input', content: trimmed, timestamp: ts }]);

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    const flag = (name: string) => {
      const f = args.find(a => a.startsWith(`--${name}=`));
      return f ? f.split('=')[1] : null;
    };

    setBusy(true);
    try {
      // ── clear ───────────────────────────────────────────────────────────────
      if (cmd === 'clear') { setOutput([]); return; }

      // ── history ─────────────────────────────────────────────────────────────
      if (cmd === 'history') {
        if (historyList.length === 0) {
          addLines([{ type: 'output', content: '  (belum ada riwayat)' }]);
        } else {
          addLines(historyList.map((h, i) => ({
            type: 'output' as const,
            content: `  ${String(historyList.length - i).padStart(3, ' ')}  ${h}`,
          })));
        }
        return;
      }

      // ── help ────────────────────────────────────────────────────────────────
      if (cmd === 'help') {
        const lines: OutputLine[] = [{ type: 'blank', content: '' }];
        for (const section of HELP_SECTIONS) {
          lines.push({ type: 'info', content: `  ${section.label}`, });
          for (const [c, desc] of section.cmds) {
            lines.push({ type: 'output', content: `    ${c.padEnd(38)}${desc}` });
          }
          lines.push({ type: 'blank', content: '' });
        }
        lines.push({ type: 'output', content: '  Pintasan: ↑↓ riwayat · Tab autocomplete · Ctrl+L bersihkan layar' });
        lines.push({ type: 'blank', content: '' });
        addLines(lines);
        return;
      }

      // ── ping ────────────────────────────────────────────────────────────────
      if (cmd === 'ping') {
        addLines([{ type: 'output', content: '  PING api.akurat ...' }]);
        const t = Date.now();
        await apiFetch('/api/admin/stats');
        const ms = Date.now() - t;
        const bar = '█'.repeat(Math.min(Math.floor(ms / 20), 20));
        addLines([
          { type: 'success', content: `  PONG  ${ms}ms  ${bar}` },
          { type: 'success', content: `  Status: 200 OK — server terhubung` },
        ]);
        setConnected(true);
        return;
      }

      // ── whoami ───────────────────────────────────────────────────────────────
      if (cmd === 'whoami') {
        addLines([
          { type: 'divider', content: '  ── Profil Admin ──────────────────────────────' },
          { type: 'output', content: `  uid        ${profile?.uid ?? '—'}` },
          { type: 'output', content: `  nama       ${profile?.displayName ?? '—'}` },
          { type: 'output', content: `  email      ${profile?.email ?? '—'}` },
          { type: 'output', content: `  role       ${profile?.role ?? '—'}` },
          { type: 'output', content: `  aktif      ${profile?.isActive ? 'ya' : 'tidak'}` },
        ]);
        return;
      }

      // ── stats ────────────────────────────────────────────────────────────────
      if (cmd === 'stats') {
        const d = await apiFetch('/api/admin/stats');
        const total = d.users?.total ?? 0;
        const active = d.users?.active ?? 0;
        const pct = total > 0 ? Math.round((active / total) * 100) : 0;
        addLines([
          { type: 'divider', content: '  ── Statistik Platform ─────────────────────────' },
          { type: 'output', content: `  pengguna   ${total}  (aktif: ${active} — ${pct}%)` },
          { type: 'output', content: `  siswa      ${d.users?.byRole?.student ?? 0}` },
          { type: 'output', content: `  guru       ${d.users?.byRole?.teacher ?? 0}` },
          { type: 'output', content: `  admin      ${d.users?.byRole?.admin ?? 0}` },
          { type: 'divider', content: '  ───────────────────────────────────────────────' },
          { type: 'output', content: `  materi     ${d.materials ?? 0}` },
          { type: 'output', content: `  soal       ${d.questions ?? 0}` },
          { type: 'output', content: `  ujian      ${d.exams ?? 0}` },
        ]);
        return;
      }

      // ── users ────────────────────────────────────────────────────────────────
      if (cmd === 'users') {
        const role = flag('role');
        const d = await apiFetch('/api/admin/users');
        let users = d.users as Array<{ uid: string; displayName: string; email: string; role: string; isActive: boolean }>;
        if (role) users = users.filter(u => u.role === role);
        addLines([
          { type: 'table', content: '',
            headers: ['UID', 'Nama', 'Email', 'Role', 'Status'],
            rows: users.slice(0, 30).map(u => [
              u.uid.slice(0, 12),
              u.displayName ?? '—',
              u.email ?? '—',
              u.role,
              u.isActive ? '● aktif' : '○ nonaktif',
            ]) },
          { type: 'output', content: `  ${users.length} pengguna${users.length > 30 ? '  (tampil 30 pertama)' : ''}` },
        ]);
        return;
      }

      // ── user <uid> ───────────────────────────────────────────────────────────
      if (cmd === 'user') {
        if (!args[0]) { addLines([{ type: 'error', content: '  Error  penggunaan: user <uid>' }]); return; }
        const d = await apiFetch('/api/admin/users');
        const u = (d.users as Array<Record<string, unknown>>).find(x => (x.uid as string)?.startsWith(args[0]));
        if (!u) { addLines([{ type: 'error', content: `  Error  pengguna tidak ditemukan — "${args[0]}"` }]); return; }
        addLines([
          { type: 'divider', content: '  ── Detail Pengguna ────────────────────────────' },
          { type: 'output', content: `  uid        ${u.uid}` },
          { type: 'output', content: `  nama       ${u.displayName}` },
          { type: 'output', content: `  email      ${u.email}` },
          { type: 'output', content: `  role       ${u.role}` },
          { type: 'output', content: `  aktif      ${u.isActive ? 'ya' : 'tidak'}` },
          { type: 'output', content: `  xp         ${(u.stats as Record<string, number>)?.xp ?? 0}` },
          { type: 'output', content: `  level      ${(u.stats as Record<string, number>)?.level ?? 1}` },
        ]);
        return;
      }

      // ── create-user ──────────────────────────────────────────────────────────
      if (cmd === 'create-user') {
        if (args.length < 3) { addLines([{ type: 'error', content: '  Error  penggunaan: create-user <email> <nama> <role>' }]); return; }
        const [email, displayName, role] = args;
        if (!['student', 'teacher', 'admin'].includes(role)) {
          addLines([{ type: 'error', content: `  Error  role tidak valid: "${role}"  (student|teacher|admin)` }]); return;
        }
        const pw = `Akurat@${Math.floor(Math.random() * 90000) + 10000}!`;
        addLines([{ type: 'info', content: `  Membuat pengguna ${email} ...` }]);
        const d = await apiFetch('/api/admin/users', {
          method: 'POST', body: JSON.stringify({ email, displayName, role, password: pw }),
        });
        addLines([
          { type: 'success', content: `  ✓  Pengguna berhasil dibuat` },
          { type: 'output', content: `  uid        ${d.user?.uid}` },
          { type: 'output', content: `  email      ${email}` },
          { type: 'output', content: `  password   ${pw}` },
          { type: 'output', content: `  role       ${role}` },
        ]);
        return;
      }

      // ── activate / deactivate ────────────────────────────────────────────────
      if (cmd === 'activate' || cmd === 'deactivate') {
        if (!args[0]) { addLines([{ type: 'error', content: `  Error  penggunaan: ${cmd} <uid>` }]); return; }
        await apiFetch(`/api/admin/users/${args[0]}`, {
          method: 'PATCH', body: JSON.stringify({ isActive: cmd === 'activate' }),
        });
        const verb = cmd === 'activate' ? 'diaktifkan' : 'dinonaktifkan';
        addLines([{ type: 'success', content: `  ✓  Pengguna ${args[0].slice(0, 12)}…  ${verb}` }]);
        return;
      }

      // ── set-role ─────────────────────────────────────────────────────────────
      if (cmd === 'set-role') {
        if (args.length < 2) { addLines([{ type: 'error', content: '  Error  penggunaan: set-role <uid> <role>' }]); return; }
        const [uid, role] = args;
        if (!['student', 'teacher', 'admin'].includes(role)) {
          addLines([{ type: 'error', content: `  Error  role tidak valid: "${role}"` }]); return;
        }
        await apiFetch(`/api/admin/users/${uid}`, { method: 'PATCH', body: JSON.stringify({ role }) });
        addLines([{ type: 'success', content: `  ✓  Role ${uid.slice(0, 12)}…  →  ${role}` }]);
        return;
      }

      // ── delete ───────────────────────────────────────────────────────────────
      if (cmd === 'delete') {
        if (!args[0]) { addLines([{ type: 'error', content: `  Error  penggunaan: delete <uid>` }]); return; }
        addLines([{ type: 'info', content: `  Menghapus ${args[0]} ...` }]);
        await apiFetch(`/api/admin/users/${args[0]}`, { method: 'DELETE' });
        addLines([{ type: 'success', content: `  ✓  Pengguna ${args[0].slice(0, 12)}…  dihapus permanen` }]);
        return;
      }

      // ── questions ────────────────────────────────────────────────────────────
      if (cmd === 'questions') {
        const difficulty = flag('difficulty');
        let url = '/api/admin/questions';
        if (difficulty) url += `?difficulty=${difficulty}`;
        const d = await apiFetch(url);
        const qs = d.questions as Array<{ id: string; topic: string; difficulty: string; status: string; stem: string; usageCount: number }>;
        addLines([
          { type: 'table', content: '',
            headers: ['ID', 'Topic', 'Difficulty', 'Status', 'Used', 'Stem'],
            rows: qs.slice(0, 20).map(q => [
              q.id.slice(0, 12),
              q.topic ?? '—',
              q.difficulty,
              q.status,
              String(q.usageCount ?? 0),
              (q.stem ?? '').slice(0, 36),
            ]) },
          { type: 'output', content: `  ${qs.length} soal${qs.length > 20 ? '  (tampil 20 pertama)' : ''}` },
        ]);
        return;
      }

      // ── q-activate / q-deactivate ────────────────────────────────────────────
      if (cmd === 'q-activate' || cmd === 'q-deactivate') {
        if (!args[0]) { addLines([{ type: 'error', content: `  Error  penggunaan: ${cmd} <id>` }]); return; }
        const status = cmd === 'q-activate' ? 'active' : 'inactive';
        await apiFetch(`/api/admin/questions/${args[0]}`, { method: 'PATCH', body: JSON.stringify({ status }) });
        addLines([{ type: 'success', content: `  ✓  Soal ${args[0].slice(0, 12)}…  →  ${status}` }]);
        return;
      }

      // ── q-delete ─────────────────────────────────────────────────────────────
      if (cmd === 'q-delete') {
        if (!args[0]) { addLines([{ type: 'error', content: `  Error  penggunaan: q-delete <id>` }]); return; }
        await apiFetch(`/api/admin/questions/${args[0]}`, { method: 'DELETE' });
        addLines([{ type: 'success', content: `  ✓  Soal ${args[0].slice(0, 12)}…  dihapus` }]);
        return;
      }

      // ── logs ─────────────────────────────────────────────────────────────────
      if (cmd === 'logs') {
        const limit = flag('limit') ?? '20';
        const d = await apiFetch(`/api/admin/audit?limit=${limit}`);
        const logs = d.logs as Array<{
          actorId: string; action: string; targetId: string; targetType: string;
          timestamp: { _seconds?: number; seconds?: number };
        }>;
        addLines([
          { type: 'table', content: '',
            headers: ['Waktu', 'Aktor', 'Aksi', 'Target'],
            rows: logs.map(l => {
              const secs = l.timestamp?._seconds ?? l.timestamp?.seconds;
              const ts = secs
                ? new Date(secs * 1000).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                : '—';
              return [ts, l.actorId.slice(0, 12), l.action, `${l.targetType}:${l.targetId.slice(0, 8)}`];
            }) },
          { type: 'output', content: `  ${logs.length} entri log` },
        ]);
        return;
      }

      // ── export ───────────────────────────────────────────────────────────────
      if (cmd === 'export') {
        const colMap: Record<string, string> = { users: 'users', questions: 'question_bank', exams: 'exam_sessions' };
        const colKey = args[0];
        const col = colMap[colKey];
        if (!col) { addLines([{ type: 'error', content: `  Error  penggunaan: export users|questions|exams` }]); return; }
        addLines([{ type: 'info', content: `  Mengunduh ${colKey}.csv ...` }]);
        const token = await getToken();
        const res = await fetch(`/api/admin/export?collection=${col}&format=csv`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${colKey}-export.csv`; a.click();
        URL.revokeObjectURL(url);
        addLines([{ type: 'success', content: `  ✓  Unduhan dimulai  —  ${colKey}-export.csv  (${(blob.size / 1024).toFixed(1)} KB)` }]);
        return;
      }

      // ── unknown ──────────────────────────────────────────────────────────────
      addLines([
        { type: 'error', content: `  bash: ${cmd}: perintah tidak ditemukan` },
        { type: 'output', content: `  Ketik  help  untuk daftar perintah yang tersedia.` },
      ]);

    } catch (err) {
      setConnected(false);
      addLines([{ type: 'error', content: `  Error  ${err instanceof Error ? err.message : String(err)}` }]);
    } finally {
      setBusy(false);
      addLines([{ type: 'blank', content: '' }]);
    }
  }, [addLines, apiFetch, getToken, historyList, profile]);

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !busy) {
      runCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const idx = Math.min(histIdx + 1, historyList.length - 1);
      setHistIdx(idx);
      if (historyList[idx]) setInput(historyList[idx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const idx = Math.max(histIdx - 1, -1);
      setHistIdx(idx);
      setInput(idx === -1 ? '' : historyList[idx]);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (suggestion) setInput(prev => prev + suggestion);
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setOutput([]);
    }
  };

  // ─── Render helpers ─────────────────────────────────────────────────────────
  const renderTable = (line: OutputLine, key: number) => {
    if (!line.headers || !line.rows) return null;
    const widths = line.headers.map((h, ci) => {
      const maxData = Math.max(...(line.rows?.map(r => (r[ci] ?? '').length) ?? [0]));
      return Math.max(h.length, maxData, 6);
    });
    const sep = '  ' + widths.map(w => '─'.repeat(w)).join('  ┼  ');
    return (
      <div key={key} className="my-1 overflow-x-auto font-mono text-xs">
        <div className="whitespace-pre text-sky-400 opacity-80">
          {'  ' + line.headers.map((h, ci) => h.toUpperCase().padEnd(widths[ci])).join('  │  ')}
        </div>
        <div className="whitespace-pre text-gray-600">{sep}</div>
        {line.rows.map((row, ri) => (
          <div key={ri} className={`whitespace-pre ${ri % 2 === 0 ? 'text-gray-300' : 'text-gray-400'}`}>
            {'  ' + row.map((cell, ci) => (cell ?? '').padEnd(widths[ci])).join('  │  ')}
          </div>
        ))}
      </div>
    );
  };

  const renderLine = (line: OutputLine, i: number) => {
    if (line.type === 'table') return renderTable(line, i);
    if (line.type === 'blank') return <div key={i} className="h-1" />;
    if (line.type === 'divider') return (
      <div key={i} className="whitespace-pre font-mono text-xs text-gray-600 my-0.5">{line.content}</div>
    );
    if (line.type === 'input') return (
      <div key={i} className="flex items-baseline gap-2 my-0.5 group">
        <span className="text-[10px] text-gray-600 font-mono select-none shrink-0">{line.timestamp}</span>
        <span className="text-emerald-500 font-mono text-xs select-none shrink-0">❯</span>
        <span className="font-mono text-xs text-gray-100 whitespace-pre-wrap">{line.content}</span>
      </div>
    );
    const colors: Record<string, string> = {
      output: 'text-gray-400',
      error: 'text-red-400',
      success: 'text-emerald-400',
      info: 'text-sky-400',
    };
    return (
      <div key={i} className={`font-mono text-xs whitespace-pre-wrap leading-5 ${colors[line.type] ?? 'text-gray-400'}`}>
        {line.content}
      </div>
    );
  };

  const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="flex flex-col gap-0 rounded-2xl overflow-hidden shadow-2xl border border-gray-800">

      {/* ── Window chrome ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 bg-[#1c1c1e] px-4 py-3 border-b border-gray-800">
        {/* Traffic lights */}
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57] hover:opacity-80 cursor-pointer" title="Tutup" onClick={() => setOutput([])} />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        {/* Title */}
        <div className="flex-1 text-center">
          <span className="text-[11px] font-medium text-gray-400 tracking-wide select-none">
            admin@akurat  —  bash  —  80×24
          </span>
        </div>
        {/* Badge */}
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${connected ? 'bg-emerald-900/60 text-emerald-400' : 'bg-red-900/60 text-red-400'}`}>
          {connected ? '● connected' : '● offline'}
        </span>
      </div>

      {/* ── Terminal body ──────────────────────────────────────────────────────── */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="min-h-[520px] max-h-[620px] cursor-text overflow-y-auto bg-[#0d1117] p-5 pb-3"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#30363d transparent' }}
      >
        {output.map((line, i) => renderLine(line, i))}

        {/* Input row */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-gray-700 font-mono select-none shrink-0">{now()}</span>
          <span className="text-emerald-500 font-mono text-xs select-none shrink-0">❯</span>
          <div className="relative flex-1 font-mono text-xs">
            {/* Ghost suggestion */}
            {suggestion && (
              <span className="pointer-events-none absolute inset-0 flex items-center">
                <span className="text-transparent">{input}</span>
                <span className="text-gray-700">{suggestion}</span>
              </span>
            )}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={busy}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="w-full bg-transparent text-gray-100 outline-none caret-emerald-400 disabled:opacity-40 relative"
              placeholder={busy ? '' : ''}
              autoFocus
            />
          </div>
          {busy && (
            <div className="flex items-center gap-1 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* ── Status bar ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between bg-[#161b22] border-t border-gray-800 px-4 py-1.5">
        <div className="flex items-center gap-4 text-[10px] text-gray-500 font-mono">
          <span className="text-emerald-600">bash</span>
          <span>{profile?.email ?? '—'}</span>
          <span>{profile?.role ?? '—'}</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-gray-600 font-mono">
          <span>↑↓ riwayat</span>
          <span>Tab autocomplete</span>
          <span>Ctrl+L clear</span>
          <span className="text-gray-500">{today}</span>
        </div>
      </div>
    </div>
  );
};

export default AdminCLI;
