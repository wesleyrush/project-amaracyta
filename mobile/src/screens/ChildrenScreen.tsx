import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, ActivityIndicator, SafeAreaView,
  ScrollView, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { listChildren, createChild, updateChild, deleteChild } from '../api/children';
import { colors, font, spacing, radius } from '../theme';
import type { Child } from '../types';

const BR_STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
];

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
  full_name: '', initiatic_name: '',
  birth_date: '', birth_time: '',
  birth_country: '', birth_state: '', birth_city: '',
};

function StatePickerModal({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <TouchableOpacity style={styles.input} onPress={() => setVisible(true)} activeOpacity={0.8}>
        <Text style={[{ fontSize: font.base }, !value ? { color: colors.muted } : { color: colors.text }]}>
          {value || 'Selecione o estado'}
        </Text>
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Selecione o estado</Text>
            <FlatList
              data={BR_STATES}
              keyExtractor={s => s}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.stateItem, value === item && styles.stateItemActive]}
                  onPress={() => { onChange(item); setVisible(false); }}
                >
                  <Text style={[styles.stateItemText, value === item && { color: colors.accent, fontWeight: '700' }]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function ChildForm({
  visible, onClose, onSaved, initial,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial: Child | null;
}) {
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const isBrasil = form.birth_country.trim().toLowerCase() === 'brasil' ||
    form.birth_country.trim().toLowerCase() === 'brazil';

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
    if (!form.full_name.trim()) { Alert.alert('Atenção', 'Nome completo é obrigatório.'); return; }
    setSaving(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        initiatic_name: form.initiatic_name.trim() || null,
        birth_date: form.birth_date.trim() || null,
        birth_time: form.birth_time.trim() || null,
        birth_country: form.birth_country.trim() || null,
        birth_state: form.birth_state.trim() || null,
        birth_city: form.birth_city.trim() || null,
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
          <Text style={styles.headerTitle}>
            {initial ? 'Editar filho' : 'Novo filho'}
          </Text>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">

            <View style={styles.formGroup}>
              <Text style={styles.label}>Nome Completo *</Text>
              <TextInput
                style={styles.input}
                value={form.full_name}
                onChangeText={set('full_name')}
                placeholder="Nome completo"
                placeholderTextColor={colors.muted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Nome Iniciático</Text>
              <TextInput
                style={styles.input}
                value={form.initiatic_name}
                onChangeText={set('initiatic_name')}
                placeholder="Nome iniciático (opcional)"
                placeholderTextColor={colors.muted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Data de Nascimento</Text>
              <TextInput
                style={styles.input}
                value={form.birth_date}
                onChangeText={set('birth_date')}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={colors.muted}
                maxLength={10}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Hora de Nascimento</Text>
              <TextInput
                style={styles.input}
                value={form.birth_time}
                onChangeText={set('birth_time')}
                placeholder="HH:MM"
                placeholderTextColor={colors.muted}
                maxLength={5}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>País</Text>
              <TextInput
                style={styles.input}
                value={form.birth_country}
                onChangeText={v => setForm(p => ({ ...p, birth_country: v, birth_state: '' }))}
                placeholder="País de nascimento"
                placeholderTextColor={colors.muted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Estado</Text>
              {isBrasil ? (
                <StatePickerModal value={form.birth_state} onChange={set('birth_state')} />
              ) : (
                <TextInput
                  style={styles.input}
                  value={form.birth_state}
                  onChangeText={set('birth_state')}
                  placeholder="Estado"
                  placeholderTextColor={colors.muted}
                />
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Cidade</Text>
              <TextInput
                style={styles.input}
                value={form.birth_city}
                onChangeText={set('birth_city')}
                placeholder="Cidade"
                placeholderTextColor={colors.muted}
              />
            </View>

            <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Salvar</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
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
        <Text style={styles.headerTitle}>Filhos</Text>
        <TouchableOpacity onPress={openNew} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Adicionar</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} size="large" style={styles.loader} />
      ) : children.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>👶</Text>
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
                {!!item.initiatic_name && (
                  <Text style={styles.childSub}>{item.initiatic_name}</Text>
                )}
                {!!item.birth_date && (
                  <Text style={styles.childSub}>Nasc.: {item.birth_date}</Text>
                )}
                {!!item.birth_city && !!item.birth_state && (
                  <Text style={styles.childSub}>{item.birth_city}, {item.birth_state}</Text>
                )}
              </View>
              <View style={styles.childActions}>
                <TouchableOpacity
                  onPress={() => openEdit(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.actionBtn}
                >
                  <Text style={styles.actionIcon}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.actionBtn}
                >
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
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.sidebar,
  },
  backBtn: { color: colors.accent, fontSize: font.base },
  headerTitle: { flex: 1, color: colors.text, fontSize: font.lg, fontWeight: '700' },
  addBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  addBtnText: { color: '#fff', fontSize: font.sm, fontWeight: '600' },
  loader: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: colors.muted, fontSize: font.base },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  childCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md, padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  childCardBody: { flex: 1 },
  childName: { color: colors.text, fontSize: font.base, fontWeight: '600', marginBottom: 2 },
  childSub: { color: colors.muted, fontSize: font.sm, marginBottom: 1 },
  childActions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { padding: spacing.xs },
  actionIcon: { fontSize: 18 },
  formContent: { padding: spacing.md, paddingBottom: spacing.xl },
  formGroup: { marginBottom: spacing.md },
  label: { color: colors.muted, fontSize: font.sm, fontWeight: '600', marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.inputBg, color: colors.text,
    borderRadius: radius.sm, padding: spacing.sm + 4,
    fontSize: font.base, borderWidth: 1, borderColor: colors.border,
  },
  btn: {
    backgroundColor: colors.accent, padding: spacing.md,
    borderRadius: radius.md, alignItems: 'center', marginTop: spacing.sm,
  },
  btnText: { color: '#fff', fontSize: font.md, fontWeight: '700' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalSheet: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, width: '80%', maxHeight: 400,
  },
  modalTitle: { color: colors.text, fontSize: font.md, fontWeight: '700', marginBottom: spacing.md },
  stateItem: { padding: spacing.sm, borderRadius: radius.sm },
  stateItemActive: { backgroundColor: colors.accent + '33' },
  stateItemText: { color: colors.text, fontSize: font.base },
});
