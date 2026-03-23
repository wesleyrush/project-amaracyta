import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, TextInput, SafeAreaView,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { deleteSession, patchTitle } from '../api/sessions';
import { logout } from '../api/auth';
import { colors, font, spacing, radius } from '../theme';

interface Props {
  onNewChat: () => void;
  onClose: () => void;
  navigation: any;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) +
    ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function SessionDrawer({ onNewChat, onClose, navigation }: Props) {
  const { cid, setCid, sessions, setSessions, refreshSessions, setAuthed, setUser } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const sorted = [...sessions].sort((a, b) => {
    const da = a.updated_at || a.created_at || '';
    const db = b.updated_at || b.created_at || '';
    return db.localeCompare(da);
  });

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Excluir conversa', `Excluir "${title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive', onPress: async () => {
          await deleteSession(id).catch(() => {});
          const updated = sessions.filter(s => s.id !== id);
          setSessions(updated);
          if (cid === id) {
            setCid(updated[0]?.id ?? '');
          }
        },
      },
    ]);
  };

  const handleRename = async (id: string) => {
    if (!editTitle.trim()) { setEditingId(null); return; }
    await patchTitle(id, editTitle.trim()).catch(() => {});
    await refreshSessions();
    setEditingId(null);
  };

  const navAndClose = (screen: string) => {
    onClose();
    navigation.navigate(screen);
  };

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair', style: 'destructive', onPress: async () => {
          await logout().catch(() => {});
          setUser(null);
          setAuthed(false);
          onClose();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Conversas</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.newBtn} onPress={onNewChat}>
        <Text style={styles.newBtnText}>+ Nova Conversa</Text>
      </TouchableOpacity>

      <FlatList
        data={sorted}
        keyExtractor={s => s.id}
        style={styles.list}
        contentContainerStyle={{ paddingBottom: spacing.md }}
        renderItem={({ item }) => {
          const active = item.id === cid;
          return (
            <TouchableOpacity
              style={[styles.item, active && styles.itemActive]}
              onPress={() => { setCid(item.id); onClose(); }}
            >
              <View style={styles.itemContent}>
                {editingId === item.id ? (
                  <TextInput
                    style={styles.editInput}
                    value={editTitle}
                    onChangeText={setEditTitle}
                    onSubmitEditing={() => handleRename(item.id)}
                    onBlur={() => handleRename(item.id)}
                    autoFocus
                    selectTextOnFocus
                  />
                ) : (
                  <>
                    <Text
                      style={[styles.itemTitle, active && styles.itemTitleActive]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <View style={styles.itemMetaRow}>
                      {!!item.module_name && (
                        <Text style={styles.moduleTag}>{item.module_name} · </Text>
                      )}
                      <Text style={styles.itemMeta}>
                        {fmtDate(item.updated_at || item.created_at)}
                      </Text>
                    </View>
                    {!!item.child_name && (
                      <Text style={styles.childBadge}>👶 {item.child_name}</Text>
                    )}
                  </>
                )}
              </View>
              <View style={styles.itemActions}>
                <TouchableOpacity
                  onPress={() => { setEditingId(item.id); setEditTitle(item.title); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.actionIcon}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item.id, item.title)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.actionIcon}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.navSection}>
        <TouchableOpacity style={styles.navItem} onPress={() => navAndClose('Profile')}>
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>Perfil</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navAndClose('Store')}>
          <Text style={styles.navIcon}>🏪</Text>
          <Text style={styles.navLabel}>Loja</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navAndClose('History')}>
          <Text style={styles.navIcon}>📋</Text>
          <Text style={styles.navLabel}>Histórico</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navAndClose('Children')}>
          <Text style={styles.navIcon}>👶</Text>
          <Text style={styles.navLabel}>Filhos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={handleLogout}>
          <Text style={styles.navIcon}>🚪</Text>
          <Text style={[styles.navLabel, { color: colors.danger }]}>Sair</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.sidebar },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { color: colors.text, fontSize: font.lg, fontWeight: '700' },
  closeBtn: { padding: spacing.xs },
  closeIcon: { color: colors.muted, fontSize: font.lg },
  newBtn: {
    margin: spacing.md,
    backgroundColor: colors.accent,
    padding: spacing.sm + 2, borderRadius: radius.md, alignItems: 'center',
  },
  newBtnText: { color: '#fff', fontSize: font.base, fontWeight: '700' },
  list: { flex: 1 },
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1, borderBottomColor: colors.border + '44',
  },
  itemActive: { backgroundColor: colors.accent + '1a' },
  itemContent: { flex: 1, marginRight: spacing.sm },
  itemTitle: { color: colors.text, fontSize: font.base, fontWeight: '500', marginBottom: 2 },
  itemTitleActive: { color: colors.accent },
  itemMetaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  moduleTag: { color: colors.accent, fontSize: font.sm },
  itemMeta: { color: colors.muted, fontSize: font.sm },
  childBadge: { color: colors.muted, fontSize: 11 },
  itemActions: { flexDirection: 'row', gap: spacing.sm },
  actionIcon: { fontSize: 14 },
  editInput: {
    color: colors.text, fontSize: font.base,
    backgroundColor: colors.inputBg, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  navSection: {
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingBottom: spacing.sm,
  },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
  },
  navIcon: { fontSize: 16, width: 22, textAlign: 'center' },
  navLabel: { color: colors.text, fontSize: font.base },
});
