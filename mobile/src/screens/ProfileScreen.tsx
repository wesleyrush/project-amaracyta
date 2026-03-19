import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { putProfile, changePwd } from '../api/auth';
import { useApp } from '../context/AppContext';
import { colors, font, spacing, radius } from '../theme';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, setUser } = useApp();

  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [iniciaticName, setIniciaticName] = useState(user?.initiatic_name ?? '');
  const [birthDate, setBirthDate] = useState(user?.birth_date ?? '');
  const [birthTime, setBirthTime] = useState(user?.birth_time ?? '');
  const [birthCountry, setBirthCountry] = useState(user?.birth_country ?? '');
  const [birthState, setBirthState] = useState(user?.birth_state ?? '');
  const [birthCity, setBirthCity] = useState(user?.birth_city ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currPwd, setCurrPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  const handleSaveProfile = async () => {
    if (fullName.trim().length < 3) { Alert.alert('Atenção', 'O nome deve ter pelo menos 3 caracteres.'); return; }
    setSavingProfile(true);
    try {
      const updated = await putProfile({
        full_name: fullName.trim(),
        initiatic_name: iniciaticName.trim() || undefined,
        birth_date: birthDate || undefined,
        birth_time: birthTime || undefined,
        birth_country: birthCountry.trim() || undefined,
        birth_state: birthState.trim() || undefined,
        birth_city: birthCity.trim() || undefined,
      });
      setUser({ ...user!, ...updated });
      Alert.alert('Sucesso', 'Perfil atualizado.');
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.error || 'Erro ao atualizar perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePwd = async () => {
    if (!currPwd || !newPwd) { Alert.alert('Atenção', 'Preencha todos os campos.'); return; }
    if (newPwd.length < 8) { Alert.alert('Atenção', 'A nova senha deve ter pelo menos 8 caracteres.'); return; }
    if (newPwd !== confirmPwd) { Alert.alert('Atenção', 'As senhas não coincidem.'); return; }
    setSavingPwd(true);
    try {
      await changePwd(currPwd, newPwd);
      Alert.alert('Sucesso', 'Senha alterada com sucesso.');
      setCurrPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.error || 'Senha atual incorreta.');
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil e Configurações</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dados pessoais</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Nome completo *</Text>
            <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholderTextColor={colors.muted} placeholder="Nome completo" />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Nome iniciático</Text>
            <TextInput style={styles.input} value={iniciaticName} onChangeText={setIniciaticName} placeholderTextColor={colors.muted} placeholder="Nome iniciático (opcional)" />
          </View>

          <Text style={styles.emailLabel}>{user?.email}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dados de nascimento</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Data de nascimento *</Text>
            <TextInput style={styles.input} value={birthDate} onChangeText={setBirthDate} placeholderTextColor={colors.muted} placeholder="AAAA-MM-DD" />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Hora de nascimento *</Text>
            <TextInput style={styles.input} value={birthTime} onChangeText={setBirthTime} placeholderTextColor={colors.muted} placeholder="HH:MM" maxLength={5} />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>País de nascimento *</Text>
            <TextInput style={styles.input} value={birthCountry} onChangeText={setBirthCountry} placeholderTextColor={colors.muted} placeholder="País" />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Estado de nascimento *</Text>
            <TextInput style={styles.input} value={birthState} onChangeText={setBirthState} placeholderTextColor={colors.muted} placeholder="Estado" />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Cidade de nascimento *</Text>
            <TextInput style={styles.input} value={birthCity} onChangeText={setBirthCity} placeholderTextColor={colors.muted} placeholder="Cidade" />
          </View>

          <TouchableOpacity style={styles.btn} onPress={handleSaveProfile} disabled={savingProfile}>
            {savingProfile ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Salvar perfil</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Alterar senha</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Senha atual</Text>
            <TextInput style={styles.input} value={currPwd} onChangeText={setCurrPwd} secureTextEntry placeholderTextColor={colors.muted} />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nova senha</Text>
            <TextInput style={styles.input} value={newPwd} onChangeText={setNewPwd} secureTextEntry placeholderTextColor={colors.muted} placeholder="Mínimo 8 caracteres" />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Confirmar nova senha</Text>
            <TextInput style={styles.input} value={confirmPwd} onChangeText={setConfirmPwd} secureTextEntry placeholderTextColor={colors.muted} />
          </View>

          <TouchableOpacity style={styles.btn} onPress={handleChangePwd} disabled={savingPwd}>
            {savingPwd ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Alterar senha</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.panel },
  backBtn: { color: colors.accent, fontSize: font.base },
  headerTitle: { color: colors.text, fontSize: font.lg, fontWeight: '700' },
  scroll: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md },
  card: { backgroundColor: colors.panel, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm, marginBottom: spacing.md },
  cardTitle: { color: colors.text, fontSize: font.md, fontWeight: '700', marginBottom: spacing.sm },
  formGroup: { marginBottom: spacing.sm },
  label: { color: colors.muted, fontSize: font.sm, fontWeight: '600', marginBottom: spacing.xs },
  input: { backgroundColor: colors.surface, color: colors.text, borderRadius: radius.sm, padding: spacing.sm + 4, fontSize: font.base, borderWidth: 1, borderColor: colors.border },
  emailLabel: { color: colors.muted, fontSize: font.sm, marginBottom: spacing.sm },
  btn: { backgroundColor: colors.accent, padding: spacing.md, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.sm },
  btnText: { color: '#fff', fontSize: font.md, fontWeight: '700' },
});
