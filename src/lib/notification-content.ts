export type NotificationType =
  | 'message'
  | 'system'
  | 'assignment'
  | 'grade'
  | 'exam'
  | 'class'
  | 'certificate'
  | 'account'
  | 'alert';

export interface NotificationDraft {
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  /** Collapses repeats: an unread notification with the same key is updated instead. */
  dedupeKey?: string;
}

export function truncate(text: string, max = 80): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

function join(parts: Array<string | null | undefined | false>): string {
  return parts.filter(Boolean).join(' · ');
}

function formatDue(dueDate?: string | null): string | null {
  if (!dueDate) return null;
  const date = new Date(dueDate);
  if (Number.isNaN(date.getTime())) return null;
  return `Tenggat ${date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })}`;
}

export const content = {
  assignmentCreated(p: { title: string; className?: string; classId: string; dueDate?: string | null }): NotificationDraft {
    return {
      type: 'assignment',
      title: 'Tugas baru',
      body: join([truncate(p.title, 60), p.className, formatDue(p.dueDate)]),
      link: `/kelas/${p.classId}`,
    };
  },

  assignmentGraded(p: { title: string; grade: number; maxScore: number; classId: string }): NotificationDraft {
    return {
      type: 'grade',
      title: 'Tugas sudah dinilai',
      body: `${truncate(p.title, 60)}: ${p.grade}/${p.maxScore}`,
      link: `/kelas/${p.classId}`,
    };
  },

  assignmentSubmitted(p: { studentName: string; title: string; classId: string; late: boolean; assignmentId: string; studentId: string }): NotificationDraft {
    return {
      type: 'assignment',
      title: p.late ? 'Tugas dikumpulkan (terlambat)' : 'Tugas dikumpulkan',
      body: `${p.studentName} · ${truncate(p.title, 60)}`,
      link: `/teacher/kelas/${p.classId}`,
      dedupeKey: `submit:${p.assignmentId}:${p.studentId}`,
    };
  },

  studentLeft(p: { studentName: string; className: string; classId: string }): NotificationDraft {
    return {
      type: 'class',
      title: 'Siswa keluar dari kelas',
      body: `${p.studentName} keluar dari ${p.className}`,
      link: `/teacher/kelas/${p.classId}`,
    };
  },

  removedFromClass(p: { className: string }): NotificationDraft {
    return {
      type: 'class',
      title: 'Kamu dikeluarkan dari kelas',
      body: `Kamu tidak lagi menjadi anggota ${p.className}.`,
      link: '/kelas',
    };
  },

  assignmentDueSoon(p: { title: string; classId: string; assignmentId: string; dueDate: string }): NotificationDraft {
    return {
      type: 'assignment',
      title: 'Tugas segera berakhir',
      body: join([truncate(p.title, 60), formatDue(p.dueDate)]),
      link: `/kelas/${p.classId}`,
    };
  },

  assignmentReminder(p: { title: string; classId: string; dueDate?: string | null }): NotificationDraft {
    return {
      type: 'assignment',
      title: 'Pengingat dari gurumu',
      body: join([`Belum mengumpulkan: ${truncate(p.title, 50)}`, formatDue(p.dueDate)]),
      link: `/kelas/${p.classId}`,
    };
  },

  studentJoined(p: { studentName: string; className: string; classId: string }): NotificationDraft {
    return {
      type: 'class',
      title: 'Siswa baru bergabung',
      body: `${p.studentName} bergabung ke ${p.className}`,
      link: `/teacher/kelas/${p.classId}`,
    };
  },

  examScheduled(p: { title: string; className?: string }): NotificationDraft {
    return {
      type: 'exam',
      title: 'Ujian dijadwalkan',
      body: join([truncate(p.title, 60), p.className]),
      link: '/ujian',
    };
  },

  directMessage(p: { senderId: string; senderName: string; text: string; toStaff: boolean }): NotificationDraft {
    return {
      type: 'message',
      title: `Pesan dari ${p.senderName}`,
      body: truncate(p.text, 90),
      link: p.toStaff ? '/teacher/messages' : '/pesan',
      dedupeKey: `dm:${p.senderId}`,
    };
  },

  resultsReleased(p: { sessionId: string; examTitle?: string }): NotificationDraft {
    return {
      type: 'exam',
      title: 'Hasil ujian sudah dirilis',
      body: p.examTitle ? truncate(p.examTitle, 80) : 'Lihat hasil dan analisis kompetensimu.',
      link: `/exam/results/${p.sessionId}`,
    };
  },

  certificateStatus(p: { status: 'approved' | 'sent' | 'revoked' | 'restored'; examTitle?: string; certificateId: string }): NotificationDraft {
    const title = p.examTitle ? truncate(p.examTitle, 70) : 'Sertifikat ujian';
    const map = {
      approved: { title: 'Sertifikat disetujui', body: `${title} sudah disetujui.` },
      sent: { title: 'Sertifikat siap diunduh', body: `${title} sudah dikirim.` },
      revoked: { title: 'Sertifikat dicabut', body: `${title} dicabut oleh administrator.` },
      restored: { title: 'Sertifikat dipulihkan', body: `${title} berlaku kembali.` },
    }[p.status];
    return { type: 'certificate', ...map, link: `/exam/certificates/${p.certificateId}` };
  },

  verificationChanged(p: { status: string; notes?: string }): NotificationDraft | null {
    const map: Record<string, { title: string; body: string }> = {
      verified: { title: 'Akunmu terverifikasi', body: 'Data identitasmu sudah diverifikasi administrator.' },
      rejected: { title: 'Verifikasi ditolak', body: p.notes ? truncate(p.notes, 100) : 'Periksa catatan dan perbarui datamu.' },
      pending: { title: 'Verifikasi sedang diproses', body: 'Administrator sedang memeriksa datamu.' },
    };
    const entry = map[p.status];
    return entry ? { type: 'account', ...entry, link: '/exam/profile' } : null;
  },

  sessionTerminated(p: { reason?: string }): NotificationDraft {
    return {
      type: 'exam',
      title: 'Ujianmu dihentikan pengawas',
      body: p.reason ? truncate(p.reason, 100) : 'Pengawas menghentikan sesi ujianmu.',
      link: '/exam/history',
    };
  },

  sessionCancelled(p: { wasCompleted: boolean; reason?: string }): NotificationDraft {
    return {
      type: 'exam',
      title: p.wasCompleted ? 'Hasil ujianmu dibatalkan' : 'Sesi ujianmu dibatalkan',
      body: [p.reason ? truncate(p.reason, 90) : null, p.wasCompleted ? null : 'Kamu dapat bergabung kembali dengan kode ujian.']
        .filter(Boolean)
        .join(' '),
      link: '/exam',
    };
  },

  tokenAdjusted(p: { delta: number; balance: number; reason: string }): NotificationDraft {
    return {
      type: 'account',
      title: p.delta > 0 ? 'Token ditambahkan' : 'Token dikurangi',
      body: `${p.delta > 0 ? '+' : ''}${p.delta} token. Saldo sekarang ${p.balance}. ${truncate(p.reason, 70)}`,
      link: '/exam/tokens',
    };
  },

  certificatePending(p: { examTitle?: string; participant?: string }): NotificationDraft {
    return {
      type: 'certificate',
      title: 'Sertifikat menunggu persetujuan',
      body: join([p.participant, p.examTitle ? truncate(p.examTitle, 60) : undefined]) || 'Ada sertifikat baru.',
      link: '/admin/certificates',
    };
  },

  anomalyDetected(p: { examId: string; sessionId: string; studentName?: string; flags: string[] }): NotificationDraft {
    return {
      type: 'alert',
      title: 'Anomali ujian terdeteksi',
      body: join([p.studentName, truncate(p.flags.join(', '), 70)]),
      link: '/admin/msat/anomalies',
      dedupeKey: `anomaly:${p.sessionId}`,
    };
  },
};
