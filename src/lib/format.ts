/**
 * Shared date formatting utilities for handling multiple timestamp formats.
 *
 * Timestamps may arrive as:
 * - Old Firestore: `{ _seconds, _nanoseconds }`
 * - New format:    `{ seconds, nanoseconds }`
 * - JSON from Timestamp.toJSON(): `{ _seconds, _nanoseconds, seconds, nanoseconds }`
 * - ISO string:    `"2024-01-15T10:30:00.000Z"`
 * - Date object
 * - null / undefined
 */

/** Extract milliseconds from any timestamp format. Returns null if unparseable. */
export function tsToMs(ts: unknown): number | null {
  if (!ts) return null;
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'string') {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d.getTime();
  }
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'object') {
    const o = ts as Record<string, unknown>;
    const secs = (o._seconds ?? o.seconds) as number | undefined;
    if (typeof secs === 'number') return secs * 1000;
  }
  return null;
}

/** Format a timestamp as a short date (e.g. "15 Jan 2024"). Returns fallback if unparseable. */
export function formatDate(ts: unknown, fallback = '—'): string {
  const ms = tsToMs(ts);
  if (ms === null) return fallback;
  return new Date(ms).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Format a timestamp as date + time (e.g. "15 Jan 2024, 10.30"). Returns fallback if unparseable. */
export function formatDateTime(ts: unknown, fallback = '—'): string {
  const ms = tsToMs(ts);
  if (ms === null) return fallback;
  return new Date(ms).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Format a timestamp as a short date with 2-digit day (e.g. "15 Jan 2024"). */
export function formatDateShort(ts: unknown, fallback = '—'): string {
  const ms = tsToMs(ts);
  if (ms === null) return fallback;
  return new Date(ms).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Format a timestamp as date + time with short month (e.g. "15 Jan 2024 10:30"). */
export function formatTimestampFull(ts: unknown, fallback = '—'): string {
  const ms = tsToMs(ts);
  if (ms === null) return fallback;
  return new Date(ms).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
