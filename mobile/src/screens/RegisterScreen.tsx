import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { register } from '../api/auth';
import { useApp } from '../context/AppContext';
import { listSessions } from '../api/sessions';
import { getBalance } from '../api/balance';
import { colors, font, spacing, radius } from '../theme';

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const { setUser, setSessions, setBalances } = useApp();
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password) { Alert.alert('Atenção', 'Preencha e-mail e senha.'); return; }
    if (password.length < 8) { Alert.alert('Atenção', 'A senha deve ter pelo menos 8 caracteres.'); return; }
    setLoading(true);
    try {
      const user = await register({ email, password, full_name: fullName || undefined, birth_date: birthDate || undefined });
      setUser(user);
      const [sessions, balData] = await Promise.all([
        listSessions().catch(() => []),
        getBalance().catch(() => null),
      ]);
      setSessions(sessions as any);
      if (balData) setBalances(balData.balances);
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.error || 'Erro ao cadastrar.');
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

          <View style={styles.formGroup}>
            <Text style={styles.label}>Nome completo</Text>
            <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholderTextColor={colors.muted} placeholder="Seu nome" />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Data de nascimento</Text>
            <TextInput style={styles.input} value={birthDate} onChangeText={setBirthDate} placeholderTextColor={colors.muted} placeholder="AAAA-MM-DD" />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={colors.muted} placeholder="seu@email.com" />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Senha</Text>
            <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor={colors.muted} placeholder="Mínimo 8 caracteres" />
          </View>

          <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Cadastrar</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.link}>
            <Text style={styles.linkText}>Já tem conta? <Text style={styles.linkAccent}>Entrar</Text></Text>
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
  logoBox: { width: 72, height: 72, borderRadius: radius.lg, backgroundColor: colors.accent + '33', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  logoChar: { fontSize: 36, color: colors.accent },
  brandName: { color: colors.text, fontSize: font.xxl, fontWeight: '800', letterSpacing: 0.5 },
  card: { width: '100%', maxWidth: 380, backgroundColor: colors.panel, borderRadius: radius.lg, padding: spacing.lg },
  cardTitle: { color: colors.text, fontSize: font.xl, fontWeight: '700', marginBottom: spacing.lg },
  formGroup: { marginBottom: spacing.md },
  label: { color: colors.muted, fontSize: font.sm, fontWeight: '600', marginBottom: spacing.xs },
  input: { backgroundColor: colors.surface, color: colors.text, borderRadius: radius.sm, padding: spacing.sm + 4, fontSize: font.base, borderWidth: 1, borderColor: colors.border },
  btn: { backgroundColor: colors.accent, padding: spacing.md, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.sm },
  btnText: { color: '#fff', fontSize: font.md, fontWeight: '700' },
  link: { alignItems: 'center', marginTop: spacing.md },
  linkText: { color: colors.muted, fontSize: font.base },
  linkAccent: { color: colors.accent, fontWeight: '600' },
});
