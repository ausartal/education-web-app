import { useEffect, useRef } from 'react';

export function useLivePoll(task: () => unknown | Promise<unknown>, intervalMs = 10_000, enabled = true) {
  const ref = useRef(task);
  ref.current = task;

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;
    let busy = false;
    const run = async () => {
      if (busy || document.visibilityState !== 'visible') return;
      busy = true;
      try { await ref.current(); } catch { /* keep the last data on screen */ } finally { busy = false; }
    };
    const timer = setInterval(run, intervalMs);
    document.addEventListener('visibilitychange', run);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', run);
    };
  }, [intervalMs, enabled]);
}
