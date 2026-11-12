/**
 * Downloads a file from an authenticated endpoint (a plain link cannot send the
 * Authorization header). The server's Content-Disposition file name is used.
 */
export async function downloadAuthedFile(url: string, token: string, fallbackName: string): Promise<void> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || 'Gagal mengunduh file');
  }

  const blob = await res.blob();
  const match = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '');
  const href = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = href;
  link.download = match?.[1] ?? fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
