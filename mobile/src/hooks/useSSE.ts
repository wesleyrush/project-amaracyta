import { useEffect, useRef } from 'react';
import { openSSE, SSEHandlers } from '../api/messages';

interface Options {
  cid: string;
  enabled: boolean;
  onToken: (t: string) => void;
  onDone: () => void;
  onError: (e: string) => void;
}

export function useSSE({ cid, enabled, onToken, onDone, onError }: Options) {
  const closeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled || !cid) return;
    closeRef.current = openSSE(cid, { onToken, onDone, onError });
    return () => { closeRef.current?.(); };
  }, [cid, enabled]);

  return { close: () => closeRef.current?.() };
}
