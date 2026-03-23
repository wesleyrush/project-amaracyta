import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, ActivityIndicator,
  SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { changePwd } from '../api/auth';
import { colors, font, spacing, radius } from '../theme';

export default function ProfilePasswordScreen() {
  const navigation = useNavigation<any>();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!current) { Alert.alert('Atenção', 'Informe a senha atual.'); return; }
    if (!next) { Alert.alert('Atenção', 'Informe a nova senha.'); return; }
    if (next.length < 8) { Alert.alert('Atenção', 'A nova senha deve ter pelo menos 8 caracteres.'); return; }
    if (next !== confirm) { Alert.alert('Atenção', 'As senhas não coincidem.'); return; }
    setSaving(true);
    try {
      await changePwd(current, next);
      Alert.alert('Sucesso', 'Senha alterada com sucesso.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.error || 'Senha atual incorreta.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alterar Senha</Text>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Senha atual</Text>
              <TextInput
                style={styles.input}
                value={current}
                onChangeText={setCurrent}
                secureTextEntry
                placeholderTextColor={colors.muted}
                placeholder="Sua senha atual"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Nova senha</Text>
              <TextInput
                style={styles.input}
                value={next}
                onChangeText={setNext}
                secureTextEntry
                placeholderTextColor={colors.muted}
                placeholder="Mínimo 8 caracteres"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Confirmar nova senha</Text>
              <TextInput
                style={styles.input}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                placeholderTextColor={colors.muted}
                placeholder="Repita a nova senha"
              />
            </View>

            <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Alterar senha</Text>}
            </TouchableOpacity>
          </View>
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
  content: { padding: spacing.md },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
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
});
