const FALLBACKS: Record<number, string> = {
  400: 'Permintaan tidak valid. Periksa isian lalu coba lagi.',
  401: 'Sesi kamu berakhir. Masuk kembali untuk melanjutkan.',
  403: 'Kamu tidak punya izin untuk tindakan ini.',
  404: 'Data tidak ditemukan. Mungkin sudah dihapus.',
  409: 'Tindakan ini tidak bisa dilakukan pada kondisi data saat ini.',
  410: 'Data ini sudah tidak berlaku.',
  429: 'Terlalu banyak permintaan. Coba lagi sebentar lagi.',
};

export const NETWORK_ERROR_MESSAGE = 'Koneksi bermasalah. Periksa jaringan lalu coba lagi.';

/**
 * Message for a failed request. A message written by the server is preferred
 * because it says what went wrong; otherwise a plain explanation by status.
 */
export function describeHttpError(status: number, serverMessage?: unknown): string {
  if (typeof serverMessage === 'string' && serverMessage.trim() && serverMessage.length <= 300) {
    return serverMessage.trim();
  }
  if (FALLBACKS[status]) return FALLBACKS[status];
  if (status >= 500) return 'Terjadi kesalahan di server. Coba lagi beberapa saat lagi.';
  return 'Tindakan gagal. Coba lagi.';
}

/** Reads the error from a failed Response without throwing on a non-JSON body. */
export async function readHttpError(res: { status: number; json(): Promise<unknown> }): Promise<string> {
  const body = await res.json().catch(() => null);
  const message = body && typeof body === 'object' ? (body as { error?: unknown }).error : undefined;
  return describeHttpError(res.status, message);
}
