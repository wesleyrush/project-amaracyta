import { useEffect, useRef } from 'react';
import { openSSE } from '../api/messages';

export function useSSE(
  cid: string | null | undefined,
  enabled: boolean, // <-- NOVO: controla se deve abrir o SSE
  handlers: {
    onToken?: (chunk: string) => void;
    onDone?:  () => void;
    onError?: (e: MessageEvent) => void;
  } = {}
) {
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!cid || !enabled) return;     // <-- só abre se explicitamente habilitado
    const es = openSSE(cid);
    esRef.current = es;

    const onToken = (e: MessageEvent) => handlers.onToken?.(e.data as string);
    const onDone  = () => handlers.onDone?.();
    const onError = (e: MessageEvent) => handlers.onError?.(e);

    es.addEventListener('token', onToken);
    es.addEventListener('done',  onDone as EventListenerOrEventListenerObject);
    es.addEventListener('error', onError);

    return () => { try { es.close(); } catch {} esRef.current = null; };
  }, [cid, enabled]); // <-- reabre só quando for habilitado

  return {
    close: () => { try { esRef.current?.close(); } catch {} esRef.current=null; }
  };
}