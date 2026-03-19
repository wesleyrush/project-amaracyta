import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { colors, font, spacing, radius } from '../theme';
import type { Message } from '../types';

const markdownStyles = {
  body: { color: colors.text, fontSize: font.base },
  paragraph: { marginBottom: 0, color: colors.text },
  code_inline: { backgroundColor: colors.surface, color: '#7dd3fc', fontFamily: 'monospace', fontSize: font.sm },
  fence: { backgroundColor: colors.surface, padding: spacing.sm, borderRadius: radius.sm, marginVertical: spacing.xs },
  code_block: { backgroundColor: colors.surface, color: '#7dd3fc', fontFamily: 'monospace', fontSize: font.sm },
  bullet_list: { color: colors.text },
  ordered_list: { color: colors.text },
  list_item: { color: colors.text },
  strong: { color: colors.text, fontWeight: '700' as const },
  em: { color: colors.text, fontStyle: 'italic' as const },
};

interface Props {
  message: Message;
  streaming?: boolean;
}

export default function MessageBubble({ message, streaming }: Props) {
  const isUser = message.role === 'user';
  if (message.role === 'system') return null;

  return (
    <View style={[styles.wrapper, isUser ? styles.wrapperUser : styles.wrapperAssistant]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        {isUser ? (
          <Text style={styles.userText}>{message.content}</Text>
        ) : (
          <Markdown style={markdownStyles}>{message.content || (streaming ? '…' : '')}</Markdown>
        )}
        {streaming && !isUser && (
          <View style={styles.cursor} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: spacing.md, marginVertical: spacing.xs },
  wrapperUser: { alignItems: 'flex-end' },
  wrapperAssistant: { alignItems: 'flex-start' },
  bubble: { maxWidth: '85%', padding: spacing.sm + 4, borderRadius: radius.md },
  bubbleUser: { backgroundColor: colors.userBubble, borderBottomRightRadius: 4 },
  bubbleAssistant: { backgroundColor: colors.assistantBubble, borderBottomLeftRadius: 4 },
  userText: { color: colors.text, fontSize: font.base, lineHeight: 20 },
  cursor: { width: 8, height: 14, backgroundColor: colors.accent, marginTop: 4, opacity: 0.8 },
});
