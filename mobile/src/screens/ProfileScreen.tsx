import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, ActivityIndicator,
  SafeAreaView, KeyboardAvoidingView, Platform, Modal, FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getProfile, putProfile, logout } from '../api/auth';
import { useApp } from '../context/AppContext';
import { colors, font, spacing, radius } from '../theme';
import type { User } from '../types';

const BR_STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
];

function StateSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <TouchableOpacity style={styles.input} onPress={() => setVisible(true)} activeOpacity={0.8}>
        <Text style={[{ fontSize: font.base }, !value && { color: colors.muted }, !!value && { color: colors.text }]}>
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

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { setUser, setAuthed } = useApp();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [iniciaticName, setIniciaticName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [birthCountry, setBirthCountry] = useState('');
  const [birthState, setBirthState] = useState('');
  const [birthCity, setBirthCity] = useState('');

  const isBrasil = birthCountry.trim().toLowerCase() === 'brasil' ||
    birthCountry.trim().toLowerCase() === 'brazil';

  useEffect(() => {
    getProfile()
      .then(u => {
        setProfile(u);
        setFullName(u.full_name ?? '');
        setIniciaticName(u.initiatic_name ?? '');
        setBirthDate(u.birth_date ?? '');
        setBirthTime(u.birth_time ?? '');
        setBirthCountry(u.birth_country ?? '');
        setBirthState(u.birth_state ?? '');
        setBirthCity(u.birth_city ?? '');
      })
      .catch(() => Alert.alert('Erro', 'Não foi possível carregar o perfil.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!fullName.trim()) { Alert.alert('Atenção', 'Nome completo é obrigatório.'); return; }
    setSaving(true);
    try {
      const updated = await putProfile({
        full_name: fullName.trim(),
        initiatic_name: iniciaticName.trim() || null,
        birth_date: birthDate.trim() || null,
        birth_time: birthTime.trim() || null,
        birth_country: birthCountry.trim() || null,
        birth_state: birthState.trim() || null,
        birth_city: birthCity.trim() || null,
      });
      setUser(updated);
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso.');
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.error || 'Erro ao salvar perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair', style: 'destructive', onPress: async () => {
          await logout().catch(() => {});
          setUser(null);
          setAuthed(false);
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Perfil</Text>
        </View>
        <ActivityIndicator color={colors.accent} size="large" style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil</Text>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Dados pessoais</Text>
            {!!profile?.email && (
              <Text style={styles.emailLabel}>{profile.email}</Text>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Nome Completo *</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholderTextColor={colors.muted}
                placeholder="Nome completo"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Nome Iniciático</Text>
              <TextInput
                style={styles.input}
                value={iniciaticName}
                onChangeText={setIniciaticName}
                placeholderTextColor={colors.muted}
                placeholder="Nome iniciático (opcional)"
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Dados de nascimento</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Data de Nascimento</Text>
              <TextInput
                style={styles.input}
                value={birthDate}
                onChangeText={setBirthDate}
                placeholderTextColor={colors.muted}
                placeholder="AAAA-MM-DD"
                maxLength={10}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Hora de Nascimento</Text>
              <TextInput
                style={styles.input}
                value={birthTime}
                onChangeText={setBirthTime}
                placeholderTextColor={colors.muted}
                placeholder="HH:MM"
                maxLength={5}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>País</Text>
              <TextInput
                style={styles.input}
                value={birthCountry}
                onChangeText={v => { setBirthCountry(v); setBirthState(''); }}
                placeholderTextColor={colors.muted}
                placeholder="País de nascimento"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Estado</Text>
              {isBrasil ? (
                <StateSelector value={birthState} onChange={setBirthState} />
              ) : (
                <TextInput
                  style={styles.input}
                  value={birthState}
                  onChangeText={setBirthState}
                  placeholderTextColor={colors.muted}
                  placeholder="Estado"
                />
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Cidade</Text>
              <TextInput
                style={styles.input}
                value={birthCity}
                onChangeText={setBirthCity}
                placeholderTextColor={colors.muted}
                placeholder="Cidade"
              />
            </View>

            <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Salvar perfil</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Segurança</Text>
            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={() => navigation.navigate('ProfilePassword')}
            >
              <Text style={styles.outlineBtnText}>🔑 Alterar senha</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>🚪 Sair da conta</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.sidebar,
  },
  backBtn: { color: colors.accent, fontSize: font.base },
  headerTitle: { color: colors.text, fontSize: font.lg, fontWeight: '700' },
  loader: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  cardTitle: { color: colors.text, fontSize: font.md, fontWeight: '700', marginBottom: spacing.md },
  emailLabel: { color: colors.muted, fontSize: font.sm, marginBottom: spacing.md },
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
  outlineBtn: {
    borderWidth: 1, borderColor: colors.accent, padding: spacing.md,
    borderRadius: radius.md, alignItems: 'center',
  },
  outlineBtnText: { color: colors.accent, fontSize: font.base, fontWeight: '600' },
  logoutBtn: {
    padding: spacing.md, alignItems: 'center', marginBottom: spacing.xl,
  },
  logoutText: { color: colors.danger, fontSize: font.base, fontWeight: '600' },
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
