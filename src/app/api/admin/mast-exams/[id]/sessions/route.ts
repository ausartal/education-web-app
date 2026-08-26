import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const sessionsSnap = await adminDb
      .collection('mast_sessions')
      .where('examId', '==', params.id)
      .get();

    // Collect unique student IDs
    const studentIds = [...new Set(sessionsSnap.docs.map((doc) => doc.data().studentId as string))];

    // Fetch student names from users collection
    const studentNames: Record<string, string> = {};
    if (studentIds.length > 0) {
      // Firestore 'in' query supports max 30 items; batch if needed
      const chunks: string[][] = [];
      for (let i = 0; i < studentIds.length; i += 30) {
        chunks.push(studentIds.slice(i, i + 30));
      }

      for (const chunk of chunks) {
        const usersSnap = await adminDb
          .collection('users')
          .where('__name__', 'in', chunk)
          .get();

        usersSnap.docs.forEach((doc) => {
          studentNames[doc.id] = (doc.data().displayName as string) ?? 'Unknown';
        });
      }
    }

    const sessions = sessionsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        studentName: studentNames[data.studentId as string] ?? 'Unknown',
      };
    });

    return NextResponse.json({ sessions });
  } catch (err) {
    console.error('[mast-exams/:id/sessions GET]', err);
    return NextResponse.json(
      { error: 'Internal server error', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
