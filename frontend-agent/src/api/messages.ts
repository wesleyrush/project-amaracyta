
import { apiWrite } from './client';

export const postMessage = (cid:string, q:string) =>
  apiWrite<{status:'ok'; cid:string}>('/messages','POST', { cid, q });

export const openSSE = (cid:string): EventSource => {
  // URL relativa: passa pelo proxy Vite em dev (evita CORS) e funciona
  // na mesma origem em produção.
  const url = `/api/stream?cid=${encodeURIComponent(cid)}`;
  return new EventSource(url, { withCredentials: true });
};
