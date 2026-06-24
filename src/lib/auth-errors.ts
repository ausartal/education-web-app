export function getAuthErrorMessage(error: unknown): string | null {
  const msg = error instanceof Error ? error.message : '';

  // User cancelled — don't show error
  if (msg.includes('popup-closed-by-user') || msg.includes('cancelled')) {
    return null;
  }

  if (
    msg.includes('user-not-found') ||
    msg.includes('wrong-password') ||
    msg.includes('invalid-credential')
  ) {
    return 'Email atau password salah. Silakan coba lagi.';
  }
  if (msg.includes('email-already-in-use')) {
    return 'Email sudah terdaftar. Silakan login.';
  }
  if (msg.includes('weak-password')) {
    return 'Password terlalu lemah. Minimal 6 karakter.';
  }
  if (msg.includes('invalid-email')) {
    return 'Format email tidak valid.';
  }
  if (msg.includes('too-many-requests')) {
    return 'Terlalu banyak percobaan. Coba lagi nanti.';
  }
  if (msg.includes('network-request-failed')) {
    return 'Koneksi internet bermasalah. Periksa jaringanmu.';
  }
  if (msg.includes('popup-blocked')) {
    return 'Popup diblok oleh browser. Mengalihkan ke halaman Google...';
  }
  if (msg.includes('unauthorized-domain')) {
    return 'Domain ini belum diotorisasi untuk Google Sign-In.';
  }
  if (msg.includes('account-exists-with-different-credential')) {
    return 'Email ini sudah terdaftar dengan metode login lain. Coba login dengan email & password.';
  }

  return 'Terjadi kesalahan. Silakan coba lagi.';
}
