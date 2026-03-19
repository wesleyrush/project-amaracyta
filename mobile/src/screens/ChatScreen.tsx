import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { getSession, createSession } from '../api/sessions';
import { postMessage, openSSE } from '../api/messages';
import MessageBubble from '../components/MessageBubble';
import ModulePicker from '../components/ModulePicker';
import CoinBalance from '../components/CoinBalance';
import { colors, font, spacing, radius } from '../theme';
import type { Message, Session } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ChatScreen() {
  const navigation = useNavigation<any>();
  const { cid, setCid, user, balances, costs, refreshBalance, refreshSessions } = useApp();

  const [session, setSession] = useState<Session | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [thinking, setThinking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showModulePicker, setShowModulePicker] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const sseClose = useRef<(() => void) | null>(null);

  const totalBalance = balances.gold + balances.silver + balances.bronze;
  const noBalance = totalBalance < Math.min(costs.gold, costs.silver, costs.bronze);

  // Load session on cid change
  useEffect(() => {
    if (!cid) return;
    setLoading(true);
    getSession(cid)
      .then(s => {
        setSession(s);
        setMsgs(s.messages.filter(m => m.role !== 'system'));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cid]);

  const scrollToBottom = () => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  useEffect(() => { scrollToBottom(); }, [msgs, streamText]);

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
    if (noBalance) { navigation.navigate('Store'); return; }

    setInput('');
    setMsgs(prev => [...prev, { role: 'user', content: text }]);
    setThinking(true);
    setStreaming(true);
    setStreamText('');

    try {
      await postMessage(cid, text);
    } catch (e: any) {
      setThinking(false);
      setStreaming(false);
      setMsgs(prev => [...prev, { role: 'assistant', content: 'Erro ao enviar mensagem.' }]);
      return;
    }

    let accumulated = '';
    sseClose.current = openSSE(cid, {
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
  };

  const displayMsgs = [...msgs];
  if (streaming || thinking) {
    displayMsgs.push({
      role: 'assistant',
      content: thinking ? '' : streamText,
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Topbar */}
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.topbarTitle} numberOfLines={1}>
          {session?.module_name || 'Jornada Akasha'}
        </Text>
        <CoinBalance />
      </View>

      {/* Messages */}
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
            <TouchableOpacity style={styles.newChatBtn} onPress={() => setShowModulePicker(true)}>
              <Text style={styles.newChatBtnText}>Iniciar nova conexão</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={displayMsgs}
            keyExtractor={(_, i) => String(i)}
            style={styles.messageList}
            contentContainerStyle={{ paddingVertical: spacing.md }}
            onContentSizeChange={scrollToBottom}
            renderItem={({ item, index }) => (
              <MessageBubble
                message={item}
                streaming={streaming && index === displayMsgs.length - 1 && item.role === 'assistant'}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatText}>Comece a conversa enviando uma mensagem.</Text>
              </View>
            }
          />
        )}

        {/* No balance warning */}
        {noBalance && cid && (
          <TouchableOpacity style={styles.noBalanceBanner} onPress={() => navigation.navigate('Store')}>
            <Text style={styles.noBalanceText}>Saldo insuficiente · Comprar créditos →</Text>
          </TouchableOpacity>
        )}

        {/* Input */}
        {cid && (
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
        visible={showModulePicker}
        onClose={() => setShowModulePicker(false)}
        onSelected={(id) => { setCid(id); setShowModulePicker(false); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  topbar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.panel },
  menuBtn: { padding: spacing.xs },
  menuIcon: { color: colors.text, fontSize: font.xl },
  topbarTitle: { flex: 1, color: colors.text, fontSize: font.md, fontWeight: '600' },
  loader: { flex: 1 },
  messageList: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyIcon: { fontSize: 48, color: colors.accent, marginBottom: spacing.md },
  emptyTitle: { color: colors.text, fontSize: font.lg, fontWeight: '700', textAlign: 'center', marginBottom: spacing.lg },
  newChatBtn: { backgroundColor: colors.accent, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.full },
  newChatBtnText: { color: '#fff', fontSize: font.md, fontWeight: '700' },
  emptyChat: { padding: spacing.xl, alignItems: 'center' },
  emptyChatText: { color: colors.muted, fontSize: font.base, textAlign: 'center' },
  noBalanceBanner: { backgroundColor: colors.danger + '22', borderTopWidth: 1, borderTopColor: colors.danger + '44', padding: spacing.sm, alignItems: 'center' },
  noBalanceText: { color: colors.danger, fontSize: font.sm, fontWeight: '600' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.sm + 4, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.panel },
  textInput: { flex: 1, backgroundColor: colors.surface, color: colors.text, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, fontSize: font.base, maxHeight: 120, borderWidth: 1, borderColor: colors.border },
  sendBtn: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: colors.surface },
  sendIcon: { color: '#fff', fontSize: font.lg, fontWeight: '800' },
});
