import apiClient, { getBaseUrl } from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Message } from '../types';

export async function postMessage(cid: string, query: string): Promise<Message> {
  const res = await apiClient.post<Message>(`/sessions/${cid}/messages`, { query });
  return res.data;
}

export interface SSEHandlers {
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}

/** XHR-based SSE streaming — works in React Native/Hermes */
export function openSSE(cid: string, handlers: SSEHandlers): () => void {
  let aborted = false;
  let buffer = '';

  (async () => {
    const base = await getBaseUrl();
    const token = await AsyncStorage.getItem('AUTH_TOKEN');
    const url = `${base}/sessions/${cid}/stream`;

    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Accept', 'text/event-stream');
    xhr.setRequestHeader('Cache-Control', 'no-cache');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    let lastLength = 0;
    xhr.onreadystatechange = () => {
      if (aborted) return;
      if (xhr.readyState >= 3) {
        const chunk = xhr.responseText.substring(lastLength);
        lastLength = xhr.responseText.length;
        buffer += chunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        let eventName = '';
        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventName = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            const data = line.slice(5).trim();
            if (eventName === 'token' || eventName === '') {
              try { handlers.onToken(JSON.parse(data)); } catch { handlers.onToken(data); }
            } else if (eventName === 'done') {
              handlers.onDone();
            } else if (eventName === 'error') {
              handlers.onError(data);
            }
            eventName = '';
          }
        }
      }
      if (xhr.readyState === 4 && !aborted) {
        handlers.onDone();
      }
    };

    xhr.onerror = () => { if (!aborted) handlers.onError('Erro de conexão'); };
    xhr.send();
  })();

  return () => { aborted = true; };
}
