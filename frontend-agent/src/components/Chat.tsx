// src/components/Chat.tsx
import { FormEvent, useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getSession, advanceFlow, sendOpening } from '../api/sessions';
import { postMessage } from '../api/messages';
import { useSSE } from '../hooks/useSSE';
import { renderMarkdown } from '../utils/markdown';
import {
  renderOpening,
  REINC_SUGGESTION_LABEL,
  REINC_PROMPT_HIDDEN
} from '../utils/opening';
import { generateMandala, downloadMandala } from '../utils/mandala';
import { openPdfReport } from '../utils/report';
import type { Message } from '../types';
import { swal } from '../utils/swal';

export default function Chat(){
  const navigate = useNavigate();
  const { cid, user, balances, costs, setBalances, siteSettings } = useApp();
  const noBalance = balances.gold < costs.gold && balances.silver < costs.silver && balances.bronze < costs.bronze;

  const [msgs, setMsgs] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState(''); // ← texto sendo transmitido token a token
  const [thinking, setThinking] = useState(false);
  const [moduleType, setModuleType] = useState<'free' | 'fixed' | null>(null);
  const [flowNextButton, setFlowNextButton] = useState<string | null>(null);
  const [flowStep, setFlowStep] = useState(0);
  const [moduleName, setModuleName] = useState<string | null>(null);
  const [sessionCreatedAt, setSessionCreatedAt] = useState<string | null>(null);
  /** true depois que o agente respondeu de verdade (via SSE ou mensagem no banco) */
  const [hasRealAgentResponse, setHasRealAgentResponse] = useState(false);
  /** Data URL da mandala gerada ao fim do fluxo */
  const [mandalaDataUrl, setMandalaDataUrl] = useState<string | null>(null);

  const bubbleRef = useRef<string>('');
  const waitingIdxRef = useRef<number | null>(null);
  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLLIElement | null>(null);

  const wrapRef = useRef<HTMLDivElement | null>(null);

  const openingSentKey = cid ? `OPEN_SENT__${cid}` : '';
  const suggestShownKey = cid ? `REINC_SUG_SHOWN__${cid}` : '';
  const forceTitleKey  = cid ? `FORCE_NOVA_CONVERSA__${cid}` : '';
  const hasUserMsgRef = useRef<boolean>(false);
  const [showSuggestion, setShowSuggestion] = useState(false);

  const [isComposing, setIsComposing] = useState(false);

  // Auto-scroll para o final quando msgs ou streamingText mudam
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, streamingText]);

  // Carrega conversa e dispara opening ou welcome message
  useEffect(() => {
    (async () => {
      if (!cid) return;

      // Limpa estado de streaming ao trocar de conversa
      bubbleRef.current = '';
      setStreamingText('');
      waitingIdxRef.current = null;
      setStreaming(false);
      setBusy(false);
      setThinking(false);
      setHasRealAgentResponse(false);
      setFlowStep(0);
      setModuleName(null);
      setSessionCreatedAt(null);
      setMandalaDataUrl(null);

      const s = await getSession(cid);
      setModuleType(s.module_type ?? 'free');
      setFlowNextButton(s.flow_next_button ?? null);
      setFlowStep(s.flow_step ?? 0);
      setModuleName(s.module_name ?? null);
      setSessionCreatedAt(s.created_at ?? null);

      const first = (user?.full_name || '').trim().split(/\s+/)[0] || 'Amigo';

      const useOpening = s.module_use_opening_prompt ?? false;
      // Usa o opening_prompt do módulo ou cai no template padrão
      const openingTemplate = s.module_opening_prompt || null;
      const openingResolved = openingTemplate
        ? openingTemplate.replace(/\{first\}/g, first).trim()
        : renderOpening(first).trim();

      const filtered = (s.messages || []).filter((m) => {
        if (m.hidden) return false;  // mensagens ocultas do fluxo
        const role = (m.role || '').toLowerCase();
        const content = (m.content || '').trim();
        // Não exibe o opening prompt enviado pelo frontend (mensagem técnica)
        if (role === 'user' && content === openingResolved) return false;
        if (role === 'user' && content === REINC_PROMPT_HIDDEN) return false;
        return true;
      });
      setMsgs(filtered);

      // Verifica se o agente já respondeu de verdade (mensagem persistida no banco)
      const hasDbAgentMsg = (s.messages || []).some(
        m => (m.role || '').toLowerCase() === 'assistant' && !m.hidden
      );
      setHasRealAgentResponse(hasDbAgentMsg);

      hasUserMsgRef.current = (s.messages || []).some(m => (m.role || '').toLowerCase() === 'user');

      const tt = document.getElementById('convTitle');
      if (tt) tt.textContent = s.title || 'Conversa';

      if (!hasUserMsgRef.current) {
        if (useOpening) {
          // Fluxo com opening prompt: envia o prompt e aguarda resposta da IA.
          // Não verifica noBalance aqui — o servidor rejeita se não houver saldo.
          const alreadySent = openingSentKey && sessionStorage.getItem(openingSentKey) === '1';
          if (!alreadySent) {
            setMsgs(prev => {
              if (waitingIdxRef.current !== null) return prev;
              const next = [...prev, {
                role: 'assistant',
                content: 'Acessando dados quânticos'
              } as Message];
              waitingIdxRef.current = next.length - 1;
              return next;
            });

            setBusy(true);
            try {
              await sendOpening(cid);
              sessionStorage.setItem(openingSentKey, '1');
              setStreaming(true);
            } catch {
              // Falha (sem saldo ou erro de rede): remove "aguarde" e mostra welcome message
              if (waitingIdxRef.current !== null) {
                setMsgs(prev => prev.filter((_, i) => i !== waitingIdxRef.current!));
                waitingIdxRef.current = null;
              }
              const rawWelcome = s.module_welcome_message || `Olá, ${first}! Como posso ajudar hoje?`;
              setMsgs(prev => {
                const fallback = rawWelcome.replace(/\{first\}/g, first);
                const alreadyHas = prev.some(m => m.role === 'assistant' && m.content === fallback);
                if (alreadyHas) return prev;
                return [...prev, { role: 'assistant', content: fallback } as Message];
              });
              setBusy(false);
            }
          } else {
            setBusy(false);
            setStreaming(false);
          }
        } else {
          // Fluxo sem opening prompt: exibe welcome message local (não enviada à IA)
          const rawWelcome = s.module_welcome_message || `Olá, ${first}! Como posso ajudar hoje?`;
          const welcomeText = rawWelcome.replace(/\{first\}/g, first);
          setMsgs(prev => {
            // Evita duplicar se já existe na lista filtrada
            const alreadyHas = prev.some(m => m.role === 'assistant' && m.content === welcomeText);
            if (alreadyHas) return prev;
            return [...prev, { role: 'assistant', content: welcomeText } as Message];
          });
          setBusy(false);
          setStreaming(false);
        }
      } else {
        setBusy(false);
        setStreaming(false);
      }

      const sugShown = suggestShownKey && sessionStorage.getItem(suggestShownKey) === '1';
      setShowSuggestion(!sugShown && false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid, user]);

  // STREAM (SSE)
  useSSE(cid, streaming, {
    onToken: (t) => {
      // Remove a bolha "Aguarde..." na chegada do primeiro token
      if (waitingIdxRef.current !== null) {
        setMsgs(prev => prev.filter((_, i) => i !== waitingIdxRef.current!));
        waitingIdxRef.current = null;
      }
      setThinking(false);
      // Acumula e exibe o conteúdo sendo transmitido em tempo real
      bubbleRef.current += t;
      setStreamingText(bubbleRef.current);
    },
    onDone: () => {
      if (waitingIdxRef.current !== null) {
        setMsgs(prev => prev.filter((_, i) => i !== waitingIdxRef.current!));
        waitingIdxRef.current = null;
      }
      const text = bubbleRef.current.trim();
      // Move o conteúdo da bolha streaming para msgs finalizadas
      if (text) setMsgs(prev => ([...prev, { role: 'assistant', content: text }]));
      bubbleRef.current = '';
      setStreamingText('');
      setThinking(false);
      setBusy(false);
      setStreaming(false);
      if (text) setHasRealAgentResponse(true);

      const firstLine = (text || '').trim().split('\n', 1)[0];
      const newTitle = firstLine
        ? (firstLine.length > 48 ? firstLine.slice(0,48) + '…' : firstLine)
        : 'Conversa';
      const tt = document.getElementById('convTitle');
      if (tt) tt.textContent = newTitle;

      const sugShown = suggestShownKey && sessionStorage.getItem(suggestShownKey) === '1';
      if (!hasUserMsgRef.current && !sugShown) {
        setShowSuggestion(true);
      }
    },
    onError: () => {
      if (waitingIdxRef.current !== null) {
        setMsgs(prev => prev.filter((_, i) => i !== waitingIdxRef.current!));
        waitingIdxRef.current = null;
      }
      bubbleRef.current = '';
      setStreamingText('');
      setThinking(false);
      setBusy(false);
      setStreaming(false);
    },
  });

  // Fluxo concluído: sem próximo botão, agente já respondeu, não está ocupado
  const flowCompleted = flowStep > 0 && !flowNextButton && hasRealAgentResponse && !busy;

  // Gera a mandala uma única vez quando o fluxo é concluído
  useEffect(() => {
    if (flowCompleted && !mandalaDataUrl) {
      const first = (user?.full_name || '').trim().split(/\s+/)[0] || 'Amigo';
      setMandalaDataUrl(generateMandala(first));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowCompleted]);

  const handleDownloadMandala = useCallback(() => {
    if (!mandalaDataUrl) return;
    const first = (user?.full_name || '').trim().split(/\s+/)[0] || 'Amigo';
    downloadMandala(mandalaDataUrl, first);
  }, [mandalaDataUrl, user]);

  const handleDownloadReport = useCallback(() => {
    if (!mandalaDataUrl) return;
    const fmtDate = (iso: string | null) => {
      if (!iso) return '';
      const d = new Date(iso);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    };
    openPdfReport({
      moduleName: moduleName || 'Consulta',
      userName: user?.full_name || '',
      userEmail: user?.email || undefined,
      birthDate: user?.birth_date
        ? new Date(user.birth_date + 'T12:00:00').toLocaleDateString('pt-BR')
        : undefined,
      consultationDate: fmtDate(sessionCreatedAt),
      messages: msgs,
      mandalaDataUrl,
      logoUrl: siteSettings?.logo_url || undefined,
      logoSvg: siteSettings?.logo_svg || undefined,
      siteTitle: siteSettings?.site_title || 'Jornada Akasha',
    });
  }, [mandalaDataUrl, moduleName, user, sessionCreatedAt, msgs, siteSettings]);

  // Envio (Enter / botão)
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || !cid || busy || noBalance) return;
    setInput('');
    setMsgs(prev => ([...prev, { role: 'user', content: text }]));
    hasUserMsgRef.current = true;
    setBusy(true);
    setThinking(true);
    try {
      const result = await postMessage(cid, text);
      if (result) {
        const r = result as any;
        if (r.coins_gold !== undefined || r.coins_silver !== undefined || r.coins_bronze !== undefined) {
          setBalances({ gold: r.coins_gold ?? balances.gold, silver: r.coins_silver ?? balances.silver, bronze: r.coins_bronze ?? balances.bronze });
        }
      }
      setStreaming(true);
    } catch {
      setThinking(false);
      setBusy(false);
      // Remove a mensagem do usuário que foi adicionada localmente mas não enviada
      setMsgs(prev => prev.slice(0, -1));
    }
  }, [input, cid, busy, noBalance, setBalances, balances]);

  const sendReincPrompt = useCallback(async () => {
    if (!cid || busy) return;
    setShowSuggestion(false);
    sessionStorage.setItem(suggestShownKey, '1');

    setMsgs(prev => {
      if (waitingIdxRef.current !== null) return prev;
      const next = [...prev, {
        role: 'assistant',
        content: 'Aguarde, iniciando a conexão com o portal e aguardando autorização do mestre'
      } as Message];
      waitingIdxRef.current = next.length - 1;
      return next;
    });

    setBusy(true);
    try {
      await postMessage(cid, REINC_PROMPT_HIDDEN);
      setStreaming(true);
    } catch {
      if (waitingIdxRef.current !== null) {
        setMsgs(prev => prev.filter((_, i) => i !== waitingIdxRef.current!));
        waitingIdxRef.current = null;
      }
      setBusy(false);
    }
  }, [cid, busy, suggestShownKey, forceTitleKey]);

  // Esc -> parar stream
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        waitingIdxRef.current = null;
        setThinking(false);
        setStreaming(false);
        setBusy(false);
        if (bubbleRef.current.trim()) {
          setMsgs(prev => ([...prev, { role: 'assistant', content: bubbleRef.current.trim() }]));
        }
        bubbleRef.current = '';
        setStreamingText('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Auto-resize do textarea
  useEffect(() => {
    const el = promptRef.current;
    if (!el) return;
    const fit = () => { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 220) + 'px'; };
    fit();
    el.addEventListener('input', fit, { passive: true });
    return () => el.removeEventListener('input', fit as any);
  }, []);

  // Medição dinâmica do composer (ResizeObserver) -> --composer-h
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const setH = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty('--composer-h', `${h}px`);
    };
    setH();
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const h = Math.ceil(e.contentRect.height);
        document.documentElement.style.setProperty('--composer-h', `${h}px`);
      }
    });
    ro.observe(el);
    const onResize = () => setH();
    window.addEventListener('resize', onResize);
    return () => { ro.disconnect(); window.removeEventListener('resize', onResize); };
  }, [showSuggestion]);

  // Avança para o próximo passo do fluxo do módulo
  const handleFlowAdvance = useCallback(async () => {
    if (!cid || busy) return;
    setBusy(true);
    setThinking(true);
    try {
      const result = await advanceFlow(cid);
      setFlowNextButton(result.flow_next_button ?? null);
      setFlowStep(result.flow_step ?? 0);
      setStreaming(true);
    } catch {
      setThinking(false);
      setBusy(false);
    }
  }, [cid, busy]);

  const onSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    if (!busy) void send();
  }, [busy, send]);

  return (
    <section className="chat-area">
      <ul id="messages" className="messages">
        {msgs.map((m, i) => (
          <li key={i} className={`message ${m.role}`}>
            <div
              className="bubble"
              dangerouslySetInnerHTML={{
                __html: m.role === 'assistant'
                  ? renderMarkdown(m.content || '')
                  : (m.content || '')
              }}
            />
          </li>
        ))}

        {/* Bolha "Pensando...": aparece entre o envio e o primeiro token */}
        {thinking && !streamingText && (
          <li className="message assistant">
            <div className="bubble thinking">Acessando dados quânticos </div>
          </li>
        )}

        {/* Bolha de streaming: aparece token a token enquanto a resposta chega */}
        {streaming && streamingText && (
          <li className="message assistant">
            <div
              className="bubble streaming"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingText) }}
            />
          </li>
        )}

        <li ref={messagesEndRef} style={{ height: 0, padding: 0, margin: 0, listStyle: 'none' }} />
      </ul>

      {/* Botões de download ao concluir o fluxo */}
      {flowCompleted && mandalaDataUrl && (
        <div className="flow-action">
          <div className="download-actions" style={{ display: 'flex', justifyContent: 'center' }}>
            <button className="flow-action-btn download-btn" onClick={handleDownloadMandala}>
              ✦ Baixar Mandala PNG
            </button>
            <button className="flow-action-btn download-btn secondary" onClick={handleDownloadReport}>
              ⬇ Baixar Relatório PDF
            </button>
          </div>
        </div>
      )}

      {/* Botão de avanço do fluxo do módulo — só aparece após resposta real do agente */}
      {!flowCompleted && flowNextButton && !busy && hasRealAgentResponse && (
        <div className="flow-action">
          <button className="flow-action-btn" onClick={handleFlowAdvance}>
            {flowNextButton}
          </button>
        </div>
      )}

      {moduleType !== 'fixed' && <footer className="composer-wrap" ref={wrapRef}>
        <form className="composer" onSubmit={onSubmit}>
          {showSuggestion && (
            <div className="composer-suggestions">
              <button type="button" className="chip" onClick={sendReincPrompt}>
                {REINC_SUGGESTION_LABEL}
              </button>
            </div>
          )}

          <div className="composer-bubble">
            <button
              type="button"
              className="composer-ctl left"
              title="Anexar"
              aria-label="Anexar"
              onClick={() => swal.soon('Em breve', 'O envio de anexos estará disponível em breve.')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5"  x2="12" y2="19" />
                <line x1="5"  y1="12" x2="19" y2="12" />
              </svg>
            </button>

            <textarea
              id="prompt"
              ref={promptRef}
              rows={1}
              placeholder="Digite sua mensagem (Shift+Enter para nova linha)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              inputMode="text"
              enterKeyHint="send"
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  if (isComposing) return;
                  e.preventDefault();
                  if (!busy && !noBalance) void send();
                }
              }}
            />

            <button
              type="button"
              className="composer-ctl right mic"
              title="Voz"
              aria-label="Voz"
              onClick={() => swal.soon('Em breve', 'O envio de áudio estará disponível em breve.')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8"  y1="23" x2="16" y2="23" />
              </svg>
            </button>

            <button
              type="submit"
              className="composer-ctl right send"
              title={noBalance ? 'Saldo insuficiente' : 'Enviar'}
              aria-label="Enviar"
              disabled={busy || !input.trim() || noBalance}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>

          <div className="composer-hint">
            {noBalance ? (
              <span className="hint-no-balance">
                Saldo insuficiente de moedas.{' '}
                <button className="hint-buy-link" onClick={() => navigate('/store')}>
                  Comprar moedas →
                </button>
              </span>
            ) : (
              <span>Enter: enviar • Shift+Enter: nova linha • Esc: parar</span>
            )}
          </div>
        </form>
      </footer>}
    </section>
  );
}
