import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
  ActivityIndicator, ScrollView, Modal, FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { register } from '../api/auth';
import { useApp } from '../context/AppContext';
import { listSessions } from '../api/sessions';
import { getBalance } from '../api/balance';
import { colors, font, spacing, radius } from '../theme';

const BR_STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
];

function StateSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <TouchableOpacity
        style={styles.input}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={[styles.pickerText, !value && { color: colors.muted }]}>
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
                  <Text style={[styles.stateItemText, value === item && styles.stateItemTextActive]}>
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

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const { setUser, setAuthed, setSessions, setBalances } = useApp();

  const [fullName, setFullName] = useState('');
  const [iniciaticName, setIniciaticName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [birthCountry, setBirthCountry] = useState('');
  const [birthState, setBirthState] = useState('');
  const [birthCity, setBirthCity] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isBrasil = birthCountry.trim().toLowerCase() === 'brasil' ||
    birthCountry.trim().toLowerCase() === 'brazil';

  const handleRegister = async () => {
    if (!fullName.trim()) { setError('Nome completo é obrigatório.'); return; }
    if (!email.trim()) { setError('E-mail é obrigatório.'); return; }
    if (!password) { setError('Senha é obrigatória.'); return; }
    if (password.length < 8) { setError('A senha deve ter pelo menos 8 caracteres.'); return; }
    setError('');
    setLoading(true);
    try {
      const user = await register({
        email: email.trim(),
        password,
        full_name: fullName.trim() || null,
        initiatic_name: iniciaticName.trim() || null,
        birth_date: birthDate.trim() || null,
        birth_time: birthTime.trim() || null,
        birth_country: birthCountry.trim() || null,
        birth_state: birthState.trim() || null,
        birth_city: birthCity.trim() || null,
      });
      setUser(user);
      setAuthed(true);
      const [sessions, balData] = await Promise.all([
        listSessions().catch(() => []),
        getBalance().catch(() => null),
      ]);
      setSessions(sessions as any);
      if (balData) {
        const raw = balData as any;
        if (raw.balances) {
          setBalances(raw.balances);
        } else {
          setBalances({
            gold: raw.coins_gold ?? 0,
            silver: raw.coins_silver ?? 0,
            bronze: raw.coins_bronze ?? 0,
          });
        }
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.response?.data?.message || 'Erro ao cadastrar.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View style={styles.logoBox}>
            <Text style={styles.logoChar}>✦</Text>
          </View>
          <Text style={styles.brandName}>Amaracytã</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Criar conta</Text>

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Nome Completo *</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholderTextColor={colors.muted}
              placeholder="Seu nome completo"
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
            <Text style={styles.label}>País de Nascimento</Text>
            <TextInput
              style={styles.input}
              value={birthCountry}
              onChangeText={v => { setBirthCountry(v); setBirthState(''); }}
              placeholderTextColor={colors.muted}
              placeholder="País"
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

          <View style={styles.formGroup}>
            <Text style={styles.label}>E-mail *</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={colors.muted}
              placeholder="seu@email.com"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Senha *</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={colors.muted}
              placeholder="Mínimo 8 caracteres"
            />
          </View>

          <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Criar conta</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.link}>
            <Text style={styles.linkText}>
              Já tem conta? <Text style={styles.linkAccent}>Entrar</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  brand: { alignItems: 'center', marginBottom: spacing.xl },
  logoBox: {
    width: 72, height: 72, borderRadius: radius.lg,
    backgroundColor: colors.accent + '33',
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  logoChar: { fontSize: 36, color: colors.accent },
  brandName: { color: colors.text, fontSize: font.xxl, fontWeight: '800', letterSpacing: 0.5 },
  card: {
    width: '100%', maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  cardTitle: { color: colors.text, fontSize: font.xl, fontWeight: '700', marginBottom: spacing.lg },
  errorBox: {
    backgroundColor: colors.danger + '22',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.danger + '55',
  },
  errorText: { color: colors.danger, fontSize: font.sm },
  formGroup: { marginBottom: spacing.md },
  label: { color: colors.muted, fontSize: font.sm, fontWeight: '600', marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.inputBg,
    color: colors.text,
    borderRadius: radius.sm,
    padding: spacing.sm + 4,
    fontSize: font.base,
    borderWidth: 1, borderColor: colors.border,
  },
  pickerText: { color: colors.text, fontSize: font.base },
  btn: {
    backgroundColor: colors.accent,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  btnText: { color: '#fff', fontSize: font.md, fontWeight: '700' },
  link: { alignItems: 'center', marginTop: spacing.md },
  linkText: { color: colors.muted, fontSize: font.base },
  linkAccent: { color: colors.accent, fontWeight: '600' },
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
  stateItemTextActive: { color: colors.accent, fontWeight: '700' },
});
