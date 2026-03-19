import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, ActivityIndicator, SafeAreaView, ScrollView, Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { listChildren, createChild, updateChild, deleteChild } from '../api/children';
import { colors, font, spacing, radius } from '../theme';
import type { Child } from '../types';

type FormData = {
  full_name: string;
  initiatic_name: string;
  birth_date: string;
  birth_time: string;
  birth_country: string;
  birth_state: string;
  birth_city: string;
};

const emptyForm: FormData = {
  full_name: '',
  initiatic_name: '',
  birth_date: '',
  birth_time: '',
  birth_country: '',
  birth_state: '',
  birth_city: '',
};

function ChildForm({
  visible,
  onClose,
  onSaved,
  initial,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial: Child | null;
}) {
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm(initial ? {
        full_name: initial.full_name ?? '',
        initiatic_name: initial.initiatic_name ?? '',
        birth_date: initial.birth_date ?? '',
        birth_time: initial.birth_time ?? '',
        birth_country: initial.birth_country ?? '',
        birth_state: initial.birth_state ?? '',
        birth_city: initial.birth_city ?? '',
      } : emptyForm);
    }
  }, [visible, initial]);

  const set = (key: keyof FormData) => (val: string) => setForm(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    if (!form.full_name.trim()) { Alert.alert('Atenção', 'Nome é obrigatório.'); return; }
    setSaving(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        initiatic_name: form.initiatic_name.trim() || undefined,
        birth_date: form.birth_date || undefined,
        birth_time: form.birth_time || undefined,
        birth_country: form.birth_country.trim() || undefined,
        birth_state: form.birth_state.trim() || undefined,
        birth_city: form.birth_city.trim() || undefined,
      };
      if (initial) {
        await updateChild(initial.id, payload);
      } else {
        await createChild(payload as any);
      }
      onSaved();
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.error || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.backBtn}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{initial ? 'Editar filho' : 'Novo filho'}</Text>
        </View>
        <ScrollView contentContainerStyle={styles.formContent}>
          {([
            ['full_name', 'Nome completo *', 'Nome completo'],
            ['initiatic_name', 'Nome iniciático', 'Nome iniciático (opcional)'],
            ['birth_date', 'Data de nascimento', 'AAAA-MM-DD'],
            ['birth_time', 'Hora de nascimento', 'HH:MM'],
            ['birth_country', 'País de nascimento', 'País'],
            ['birth_state', 'Estado de nascimento', 'Estado'],
            ['birth_city', 'Cidade de nascimento', 'Cidade'],
          ] as [keyof FormData, string, string][]).map(([key, label, placeholder]) => (
            <View key={key} style={styles.formGroup}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                style={styles.input}
                value={form[key]}
                onChangeText={set(key)}
                placeholder={placeholder}
                placeholderTextColor={colors.muted}
                maxLength={key === 'birth_time' ? 5 : undefined}
              />
            </View>
          ))}
          <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Salvar</Text>}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function ChildrenScreen() {
  const navigation = useNavigation<any>();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<Child | null>(null);

  const load = async () => {
    try {
      const r = await listChildren();
      setChildren(r.items);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = (child: Child) => {
    Alert.alert('Excluir filho', `Excluir "${child.full_name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive', onPress: async () => {
          await deleteChild(child.id).catch(() => {});
          await load();
        },
      },
    ]);
  };

  const openNew = () => { setEditTarget(null); setFormVisible(true); };
  const openEdit = (child: Child) => { setEditTarget(child); setFormVisible(true); };
  const onSaved = async () => { setFormVisible(false); await load(); };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cadastro de Filhos</Text>
        <TouchableOpacity onPress={openNew} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Novo</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} size="large" style={styles.loader} />
      ) : children.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Nenhum filho cadastrado.</Text>
          <TouchableOpacity style={styles.btn} onPress={openNew}>
            <Text style={styles.btnText}>+ Cadastrar filho</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={children}
          keyExtractor={c => String(c.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.childCard}>
              <View style={styles.childCardBody}>
                <Text style={styles.childName}>{item.full_name}</Text>
                {item.initiatic_name && (
                  <Text style={styles.childSub}>{item.initiatic_name}</Text>
                )}
                {item.birth_date && (
                  <Text style={styles.childSub}>Nasc.: {item.birth_date}</Text>
                )}
                {item.birth_city && item.birth_state && (
                  <Text style={styles.childSub}>{item.birth_city}, {item.birth_state}</Text>
                )}
              </View>
              <View style={styles.childActions}>
                <TouchableOpacity onPress={() => openEdit(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.actionIcon}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.actionIcon}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <ChildForm
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onSaved={onSaved}
        initial={editTarget}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.panel },
  backBtn: { color: colors.accent, fontSize: font.base },
  headerTitle: { flex: 1, color: colors.text, fontSize: font.lg, fontWeight: '700' },
  addBtn: { backgroundColor: colors.accent, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full },
  addBtnText: { color: '#fff', fontSize: font.sm, fontWeight: '600' },
  loader: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  emptyText: { color: colors.muted, fontSize: font.base },
  list: { padding: spacing.md, gap: spacing.sm },
  childCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.panel, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  childCardBody: { flex: 1 },
  childName: { color: colors.text, fontSize: font.base, fontWeight: '600', marginBottom: 2 },
  childSub: { color: colors.muted, fontSize: font.sm },
  childActions: { flexDirection: 'row', gap: spacing.md },
  actionIcon: { fontSize: 16 },
  formContent: { padding: spacing.md, gap: spacing.sm },
  formGroup: { marginBottom: spacing.sm },
  label: { color: colors.muted, fontSize: font.sm, fontWeight: '600', marginBottom: spacing.xs },
  input: { backgroundColor: colors.surface, color: colors.text, borderRadius: radius.sm, padding: spacing.sm + 4, fontSize: font.base, borderWidth: 1, borderColor: colors.border },
  btn: { backgroundColor: colors.accent, padding: spacing.md, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.sm },
  btnText: { color: '#fff', fontSize: font.md, fontWeight: '700' },
});
