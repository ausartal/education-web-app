import { describe, expect, it } from 'vitest';
import { content, truncate } from '@/lib/notification-content';

describe('truncate', () => {
  it('collapses whitespace and cuts long text with an ellipsis', () => {
    expect(truncate('  halo   dunia  ')).toBe('halo dunia');
    const out = truncate('a'.repeat(100), 20);
    expect(out).toHaveLength(20);
    expect(out.endsWith('…')).toBe(true);
  });
});

describe('notification content', () => {
  it('links students to the class for new and graded assignments', () => {
    const created = content.assignmentCreated({ title: 'Latihan Mol', className: 'XI IPA 1', classId: 'c1', dueDate: '2026-12-01T00:00:00.000Z' });
    expect(created.link).toBe('/kelas/c1');
    expect(created.body).toContain('XI IPA 1');
    expect(created.body).toContain('Tenggat');

    const graded = content.assignmentGraded({ title: 'Latihan Mol', grade: 85, maxScore: 100, classId: 'c1' });
    expect(graded.type).toBe('grade');
    expect(graded.body).toBe('Latihan Mol: 85/100');
  });

  it('omits the due date when it is missing or invalid', () => {
    expect(content.assignmentCreated({ title: 'T', classId: 'c', dueDate: null }).body).toBe('T');
    expect(content.assignmentCreated({ title: 'T', classId: 'c', dueDate: 'bukan tanggal' }).body).toBe('T');
  });

  it('flags late submissions and collapses repeats per student and assignment', () => {
    const onTime = content.assignmentSubmitted({ studentName: 'Sari', title: 'T', classId: 'c', late: false, assignmentId: 'a1', studentId: 's1' });
    const late = content.assignmentSubmitted({ studentName: 'Sari', title: 'T', classId: 'c', late: true, assignmentId: 'a1', studentId: 's1' });
    expect(onTime.title).toBe('Tugas dikumpulkan');
    expect(late.title).toContain('terlambat');
    expect(onTime.dedupeKey).toBe('submit:a1:s1');
    expect(onTime.link).toBe('/teacher/kelas/c');
  });

  it('routes direct messages by the receiver role and collapses per sender', () => {
    const toStudent = content.directMessage({ senderId: 'u1', senderName: 'Bu Rina', text: 'Halo', toStaff: false });
    const toTeacher = content.directMessage({ senderId: 'u2', senderName: 'Sari', text: 'Halo', toStaff: true });
    expect(toStudent.link).toBe('/pesan');
    expect(toTeacher.link).toBe('/teacher/messages');
    expect(toStudent.dedupeKey).toBe('dm:u1');
  });

  it('describes every certificate status and links to the certificate', () => {
    for (const status of ['approved', 'sent', 'revoked', 'restored'] as const) {
      const n = content.certificateStatus({ status, examTitle: 'MSAT Kimia', certificateId: 'cert1' });
      expect(n.type).toBe('certificate');
      expect(n.link).toBe('/exam/certificates/cert1');
      expect(n.body).toContain('MSAT Kimia');
    }
  });

  it('only notifies for meaningful verification changes', () => {
    expect(content.verificationChanged({ status: 'verified' })?.title).toContain('terverifikasi');
    expect(content.verificationChanged({ status: 'rejected', notes: 'Foto buram' })?.body).toBe('Foto buram');
    expect(content.verificationChanged({ status: 'unverified' })).toBeNull();
  });

  it('points admins to the relevant admin page', () => {
    expect(content.certificatePending({ examTitle: 'MSAT', participant: 'Budi' }).link).toBe('/admin/certificates');
    const anomaly = content.anomalyDetected({ examId: 'e1', sessionId: 's1', studentName: 'Budi', flags: ['TOO_FAST_STAGE_1', 'LATE_SUBMIT_STAGE_2'] });
    expect(anomaly.link).toBe('/admin/msat/anomalies');
    expect(anomaly.dedupeKey).toBe('anomaly:s1');
    expect(anomaly.body).toContain('TOO_FAST_STAGE_1');
  });

  it('links released results to the exam results page', () => {
    expect(content.resultsReleased({ sessionId: 'sess1' }).link).toBe('/exam/results/sess1');
  });
});

describe('student leaving a class', () => {
  it('tells the teacher who left and links to the class', () => {
    const n = content.studentLeft({ studentName: 'Ani', className: 'XI IPA 1', classId: 'c1' });
    expect(n.type).toBe('class');
    expect(n.body).toBe('Ani keluar dari XI IPA 1');
    expect(n.link).toBe('/teacher/kelas/c1');
  });
});
