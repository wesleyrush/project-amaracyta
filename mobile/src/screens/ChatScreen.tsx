import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { getSession, flowAdvance } from '../api/sessions';
import { postMessage, openSSE } from '../api/messages';
import ModulePicker from '../components/ModulePicker';
import { colors, font, spacing, radius } from '../theme';
import { resolvePromptTemplate } from '../utils/opening';
import type { Message, Session } from '../types';

function CoinDisplay() {
  const { balances } = useApp();
  const total = balances.gold + balances.silver + balances.bronze;
  return (
    <View style={styles.coinDisplay}>
      <Text style={styles.coinIcon}>✦</Text>
      <Text style={styles.coinValue}>{Math.floor(total)}</Text>
    </View>
  );
}

function MessageBubble({ message, streaming }: { message: Message; streaming?: boolean }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAssistant]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        {message.content === '' && streaming ? (
          <View style={styles.thinkingDots}>
            <Text style={styles.thinkingText}>Acessando dados quânticos</Text>
          </View>
        ) : (
          <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant]}>
            {message.content}
            {streaming ? <Text style={styles.cursor}>▍</Text> : null}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const navigation = useNavigation<any>();
  const {
    cid, setCid, user, balances, costs,
    refreshBalance, refreshSessions, setShowModulePicker,
  } = useApp();

  const [session, setSession] = useState<Session | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [thinking, setThinking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLocalPicker, setShowLocalPicker] = useState(false);
  const [flowNextButton, setFlowNextButton] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const sseClose = useRef<(() => void) | null>(null);
  /** Guarda o cid da sessão cujo opening prompt já foi disparado (evita reenvio). */
  const openingTriggered = useRef<string | null>(null);

  const minCost = Math.min(costs.gold, costs.silver, costs.bronze);
  const totalBalance = balances.gold + balances.silver + balances.bronze;
  const noBalance = totalBalance < minCost;

  // ── SSE helper ──────────────────────────────────────────────────────────────

  const startStream = useCallback((sessionId: string) => {
    let accumulated = '';
    sseClose.current = openSSE(sessionId, {
      onToken: (token) => {
        setThinking(false);
        accumulated += token;
        setStreamText(accumulated);
      },
      onDone: () => {
        sseClose.current = null;
        setStreaming(false);
        setThinking(false);
        if (accumulated) {
          setMsgs(prev => [...prev, { role: 'assistant', content: accumulated }]);
          setStreamText('');
        }
        refreshBalance();
        refreshSessions();
      },
      onError: () => {
        sseClose.current = null;
        setStreaming(false);
        setThinking(false);
        if (accumulated) {
          setMsgs(prev => [...prev, { role: 'assistant', content: accumulated }]);
          setStreamText('');
        }
      },
    });
  }, [refreshBalance, refreshSessions]);

  // ── Carregar sessão ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!cid) return;
    setLoading(true);
    setSession(null);
    setMsgs([]);
    setFlowNextButton(null);

    getSession(cid)
      .then(s => {
        setSession(s);
        // Filtra mensagens do sistema e ocultas (flow steps com is_hidden=true)
        const visible = s.messages.filter(m => m.role !== 'system' && !m.hidden);
        setMsgs(visible);
        setFlowNextButton(s.flow_next_button ?? null);

        // Dispara opening prompt apenas em sessões novas (sem nenhuma mensagem)
        const totalMsgs = s.messages.filter(m => m.role !== 'system').length;
        if (
          totalMsgs === 0 &&
          s.module_use_opening_prompt &&
          s.module_opening_prompt &&
          openingTriggered.current !== cid
        ) {
          openingTriggered.current = cid;
          const resolved = resolvePromptTemplate(s.module_opening_prompt, user);
          sendOpeningPrompt(cid, resolved);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  useEffect(() => { scrollToBottom(); }, [msgs, streamText]);

  // ── Envio do opening prompt (automático, sem bubble de usuário visível) ──────

  const sendOpeningPrompt = async (sessionId: string, prompt: string) => {
    setThinking(true);
    setStreaming(true);
    setStreamText('');
    try {
      await postMessage(sessionId, prompt);
    } catch {
      setThinking(false);
      setStreaming(false);
      return;
    }
    startStream(sessionId);
  };

  // ── Envio de mensagem normal ─────────────────────────────────────────────────

  const stopStream = () => {
    sseClose.current?.();
    sseClose.current = null;
    setStreaming(false);
    setThinking(false);
    if (streamText) {
      setMsgs(prev => [...prev, { role: 'assistant', content: streamText }]);
      setStreamText('');
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || streaming || !cid) return;
    if (noBalance) {
      navigation.navigate('Store');
      return;
    }

    setInput('');
    setMsgs(prev => [...prev, { role: 'user', content: text }]);
    setThinking(true);
    setStreaming(true);
    setStreamText('');

    try {
      await postMessage(cid, text);
    } catch {
      setThinking(false);
      setStreaming(false);
      setMsgs(prev => [...prev, { role: 'assistant', content: 'Erro ao enviar mensagem.' }]);
      return;
    }
    startStream(cid);
  };

  // ── Avanço de passo do fluxo ─────────────────────────────────────────────────

  const handleFlowAdvance = async () => {
    if (!cid || streaming) return;
    setThinking(true);
    setStreaming(true);
    setStreamText('');

    try {
      const result = await flowAdvance(cid);
      // Atualiza o botão para o próximo passo (ou null se não houver mais)
      setFlowNextButton(result.flow_next_button ?? null);
    } catch {
      setThinking(false);
      setStreaming(false);
      return;
    }
    startStream(cid);
  };

  // ── Exibição do botão de fluxo ───────────────────────────────────────────────
  // O botão só aparece após a primeira resposta do agente (hasAssistantMsg)
  // e quando o agente não está streaming.
  const hasAssistantMsg = msgs.some(m => m.role === 'assistant');
  const showFlowBtn = !!flowNextButton && !streaming && hasAssistantMsg;

  const displayMsgs = [...msgs];
  if (thinking || streaming) {
    displayMsgs.push({ role: 'assistant', content: thinking ? '' : streamText });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.topbarTitle} numberOfLines={1}>
          {session?.module_name || 'Amaracytã'}
        </Text>
        <CoinDisplay />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <ActivityIndicator color={colors.accent} style={styles.loader} size="large" />
        ) : !cid ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>✦</Text>
            <Text style={styles.emptyTitle}>Bem-vindo à Jornada Akasha</Text>
            <Text style={styles.emptySubtitle}>Selecione um módulo para iniciar sua jornada</Text>
            <TouchableOpacity style={styles.newChatBtn} onPress={() => setShowLocalPicker(true)}>
              <Text style={styles.newChatBtnText}>Iniciar nova conexão</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={displayMsgs}
            keyExtractor={(_, i) => String(i)}
            style={styles.messageList}
            contentContainerStyle={{ paddingVertical: spacing.md, paddingBottom: spacing.xl }}
            onContentSizeChange={scrollToBottom}
            renderItem={({ item, index }) => (
              <MessageBubble
                message={item}
                streaming={streaming && index === displayMsgs.length - 1 && item.role === 'assistant'}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatText}>
                  {session?.module_welcome_message || 'Envie uma mensagem para começar.'}
                </Text>
              </View>
            }
          />
        )}

        {noBalance && !!cid && (
          <TouchableOpacity
            style={styles.noBalanceBanner}
            onPress={() => navigation.navigate('Store')}
          >
            <Text style={styles.noBalanceText}>
              Saldo insuficiente · Toque para comprar moedas →
            </Text>
          </TouchableOpacity>
        )}

        {/* Botão do próximo passo do fluxo — aparece após a resposta do agente */}
        {!!cid && showFlowBtn && (
          <TouchableOpacity style={styles.flowBtn} onPress={handleFlowAdvance}>
            <Text style={styles.flowBtnText}>{flowNextButton}</Text>
          </TouchableOpacity>
        )}

        {!!cid && (
          <View style={styles.composer}>
            <TextInput
              style={styles.textInput}
              value={input}
              onChangeText={setInput}
              multiline
              placeholder="Mensagem..."
              placeholderTextColor={colors.muted}
              maxLength={4000}
              editable={!streaming}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || streaming) && styles.sendBtnDisabled]}
              onPress={streaming ? stopStream : sendMessage}
              disabled={!streaming && !input.trim()}
            >
              <Text style={styles.sendIcon}>{streaming ? '⏹' : '↑'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      <ModulePicker
        visible={showLocalPicker}
        onClose={() => setShowLocalPicker(false)}
        onSelected={(moduleId, childId) => {
          setShowLocalPicker(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  topbar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.sidebar,
  },
  menuBtn: { padding: spacing.xs, marginRight: spacing.sm },
  menuIcon: { color: colors.text, fontSize: font.xl },
  topbarTitle: { flex: 1, color: colors.text, fontSize: font.md, fontWeight: '600' },
  coinDisplay: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.accent + '22',
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: radius.full,
  },
  coinIcon: { color: colors.accent, fontSize: 12 },
  coinValue: { color: colors.accent, fontSize: font.sm, fontWeight: '700' },
  loader: { flex: 1 },
  messageList: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyIcon: { fontSize: 48, color: colors.accent, marginBottom: spacing.md },
  emptyTitle: { color: colors.text, fontSize: font.lg, fontWeight: '700', textAlign: 'center', marginBottom: spacing.sm },
  emptySubtitle: { color: colors.muted, fontSize: font.base, textAlign: 'center', marginBottom: spacing.lg },
  newChatBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderRadius: radius.full,
  },
  newChatBtnText: { color: '#fff', fontSize: font.md, fontWeight: '700' },
  emptyChat: { padding: spacing.xl, alignItems: 'center' },
  emptyChatText: { color: colors.muted, fontSize: font.base, textAlign: 'center', lineHeight: 22 },
  msgRow: { paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  msgRowUser: { alignItems: 'flex-end' },
  msgRowAssistant: { alignItems: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: radius.lg, padding: spacing.sm + 4 },
  bubbleUser: { backgroundColor: colors.userBubble, borderBottomRightRadius: 4 },
  bubbleAssistant: { backgroundColor: colors.assistantBubble, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  bubbleText: { fontSize: font.base, lineHeight: 22 },
  bubbleTextUser: { color: colors.text },
  bubbleTextAssistant: { color: colors.text },
  cursor: { color: colors.accent },
  thinkingDots: { flexDirection: 'row', alignItems: 'center' },
  thinkingText: { color: colors.muted, fontSize: font.sm, fontStyle: 'italic' },
  noBalanceBanner: {
    backgroundColor: colors.danger + '22',
    borderTopWidth: 1, borderTopColor: colors.danger + '55',
    padding: spacing.sm, alignItems: 'center',
  },
  noBalanceText: { color: colors.danger, fontSize: font.sm, fontWeight: '600' },
  flowBtn: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  flowBtnText: { color: '#fff', fontSize: font.base, fontWeight: '700' },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
    padding: spacing.sm + 4,
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.sidebar,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.inputBg,
    color: colors.text,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: font.base,
    maxHeight: 120,
    borderWidth: 1, borderColor: colors.border,
  },
  sendBtn: {
    width: 40, height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.surface },
  sendIcon: { color: '#fff', fontSize: font.lg, fontWeight: '800' },
});
