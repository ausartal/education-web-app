import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') return null;
    return decoded;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Gunakan .select() untuk hanya ambil field yang dibutuhkan
  // Gunakan .count() untuk koleksi yang hanya perlu angka total
  const [usersSnap, materialsCount, questionsCount, examsCount] = await Promise.all([
    adminDb.collection('users').select('role', 'isActive', 'displayName', 'email', 'createdAt').get(),
    adminDb.collection('materials').count().get(),
    adminDb.collection('question_bank').count().get(),
    adminDb.collection('exam_sessions').count().get(),
  ]);

  const users = usersSnap.docs.map((d) => d.data());
  const roleCount = users.reduce((acc: Record<string, number>, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  const activeCount = users.filter((u) => u.isActive).length;

  const recentUsers = usersSnap.docs
    .map((d) => ({
      uid: d.id,
      displayName: d.data().displayName,
      email: d.data().email,
      role: d.data().role,
      createdAt: d.data().createdAt,
    }))
    .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
    .slice(0, 7);

  return NextResponse.json({
    users: { total: usersSnap.size, byRole: roleCount, active: activeCount },
    materials: materialsCount.data().count,
    questions: questionsCount.data().count,
    exams: examsCount.data().count,
    recentUsers,
  });
}
