import { useEffect, useRef } from 'react';
import { openSSE } from '../api/messages';

/** Intervalo entre tokens exibidos (ms). Aumente para desacelerar o stream. */
const TOKEN_DISPLAY_INTERVAL_MS = 30;

export function useSSE(
  cid: string | null | undefined,
  enabled: boolean,
  handlers: {
    onToken?: (chunk: string) => void;
    onDone?:  () => void;
    onError?: (e: MessageEvent) => void;
  } = {}
) {
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!cid || !enabled) return;
    const es = openSSE(cid);
    esRef.current = es;

    // Fila de tokens recebidos — drena em ritmo controlado
    const tokenQueue: string[] = [];
    let doneQueued   = false;
    let errorQueued: MessageEvent | null = null;

    const interval = setInterval(() => {
      if (tokenQueue.length > 0) {
        handlers.onToken?.(tokenQueue.shift()!);
      } else if (doneQueued) {
        clearInterval(interval);
        handlers.onDone?.();
      } else if (errorQueued) {
        clearInterval(interval);
        handlers.onError?.(errorQueued);
      }
    }, TOKEN_DISPLAY_INTERVAL_MS);

    const onToken = (e: MessageEvent) => tokenQueue.push(e.data as string);
    const onDone  = () => {
      doneQueued = true;
      // Fecha imediatamente para evitar auto-reconnect do EventSource enquanto
      // a fila de tokens ainda está sendo drenada (pode levar vários segundos).
      try { es.close(); } catch {}
      esRef.current = null;
    };
    const onError = (e: MessageEvent) => { if (!doneQueued) errorQueued = e; };

    es.addEventListener('token', onToken);
    es.addEventListener('done',  onDone as EventListenerOrEventListenerObject);
    es.addEventListener('error', onError);

    return () => {
      clearInterval(interval);
      try { es.close(); } catch {}
      esRef.current = null;
    };
  }, [cid, enabled]);

  return {
    close: () => { try { esRef.current?.close(); } catch {} esRef.current = null; }
  };
}