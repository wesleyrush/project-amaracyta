import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { deleteSession, patchTitle } from '../api/sessions';
import { colors, font, spacing, radius } from '../theme';

interface Props {
  onNewChat: () => void;
  onClose: () => void;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function SessionDrawer({ onNewChat, onClose }: Props) {
  const navigation = useNavigation<any>();
  const { cid, setCid, sessions, setSessions, refreshSessions } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const sorted = [...sessions].sort((a, b) => {
    const da = a.updated_at || a.created_at || '';
    const db = b.updated_at || b.created_at || '';
    return db.localeCompare(da);
  });

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Excluir conexão', `Excluir "${title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive', onPress: async () => {
          await deleteSession(id).catch(() => {});
          const updated = sessions.filter(s => s.id !== id);
          setSessions(updated);
          if (cid === id) setCid(updated[0]?.id ?? '');
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Conexões</Text>
        <TouchableOpacity onPress={onNewChat} style={styles.newBtn}>
          <Text style={styles.newBtnText}>+ Nova conexão</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={s => s.id}
        contentContainerStyle={{ paddingBottom: spacing.lg }}
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
                  />
                ) : (
                  <>
                    <Text style={[styles.itemTitle, active && styles.itemTitleActive]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View style={styles.itemMetaRow}>
                      {item.module_name && (
                        <Text style={styles.moduleTag}>{item.module_name} · </Text>
                      )}
                      <Text style={styles.itemMeta}>{fmtDate(item.updated_at || item.created_at)}</Text>
                    </View>
                    {(item.child_id || item.child_name) && (
                      <View style={styles.personBadge}>
                        <Text style={styles.personBadgeText}>
                          👶 {item.child_name || 'Filho(a)'}
                        </Text>
                      </View>
                    )}
                    {!item.child_id && (
                      <View style={[styles.personBadge, styles.personBadgeSelf]}>
                        <Text style={[styles.personBadgeText, styles.personBadgeTextSelf]}>👤 Eu</Text>
                      </View>
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

      {/* Navigation links */}
      <View style={styles.navSection}>
        <View style={styles.navDivider} />
        <TouchableOpacity style={styles.navItem} onPress={() => navAndClose('Store')}>
          <Text style={styles.navIcon}>🛒</Text>
          <Text style={styles.navLabel}>Comprar Créditos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navAndClose('Children')}>
          <Text style={styles.navIcon}>👶</Text>
          <Text style={styles.navLabel}>Cadastro de Filhos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navAndClose('History')}>
          <Text style={styles.navIcon}>📋</Text>
          <Text style={styles.navLabel}>Histórico de consumo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navAndClose('Profile')}>
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>Perfil e Configurações</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.panel },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { color: colors.text, fontSize: font.lg, fontWeight: '700' },
  newBtn: { backgroundColor: colors.accent, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full },
  newBtnText: { color: '#fff', fontSize: font.sm, fontWeight: '600' },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: colors.border + '44' },
  itemActive: { backgroundColor: colors.accent + '22' },
  itemContent: { flex: 1, marginRight: spacing.sm },
  itemTitle: { color: colors.text, fontSize: font.base, fontWeight: '500', marginBottom: 2 },
  itemTitleActive: { color: colors.accent },
  itemMetaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  itemMeta: { color: colors.muted, fontSize: font.sm },
  moduleTag: { color: colors.accent, fontSize: font.sm },
  personBadge: { alignSelf: 'flex-start', backgroundColor: '#a78bfa22', borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 1, marginTop: 2 },
  personBadgeSelf: { backgroundColor: colors.muted + '22' },
  personBadgeText: { color: '#a78bfa', fontSize: 10, fontWeight: '600' },
  personBadgeTextSelf: { color: colors.muted },
  itemActions: { flexDirection: 'row', gap: spacing.sm },
  actionIcon: { fontSize: 14 },
  editInput: { color: colors.text, fontSize: font.base, backgroundColor: colors.surface, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  navSection: { borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: spacing.md },
  navDivider: { height: 0 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  navIcon: { fontSize: 16, width: 22, textAlign: 'center' },
  navLabel: { color: colors.text, fontSize: font.base },
});
