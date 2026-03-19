import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { colors, font, spacing, radius } from '../theme';

export default function PurchaseSuccessScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { balances } = useApp();
  const chest = route.params?.chest;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.icon}>✓</Text>
        <Text style={styles.title}>Compra realizada!</Text>
        {chest && (
          <Text style={styles.subtitle}>
            {chest.coin_amount.toLocaleString('pt-BR')} moedas de {chest.name} adicionadas.
          </Text>
        )}

        <View style={styles.balanceCard}>
          <Text style={styles.balanceTitle}>Seu saldo atual</Text>
          <View style={styles.balanceRow}>
            <Text style={[styles.balanceDot, { color: colors.gold }]}>●</Text>
            <Text style={styles.balanceLabel}>Ouro</Text>
            <Text style={styles.balanceVal}>{balances.gold.toFixed(0)}</Text>
          </View>
          <View style={styles.balanceRow}>
            <Text style={[styles.balanceDot, { color: colors.silver }]}>●</Text>
            <Text style={styles.balanceLabel}>Prata</Text>
            <Text style={styles.balanceVal}>{balances.silver.toFixed(0)}</Text>
          </View>
          <View style={styles.balanceRow}>
            <Text style={[styles.balanceDot, { color: colors.bronze }]}>●</Text>
            <Text style={styles.balanceLabel}>Bronze</Text>
            <Text style={styles.balanceVal}>{balances.bronze.toFixed(0)}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Chat')}>
          <Text style={styles.primaryBtnText}>Voltar para as conexões</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('Store')}>
          <Text style={styles.secondaryBtnText}>Comprar mais</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  icon: { fontSize: 72, color: colors.success, marginBottom: spacing.md },
  title: { color: colors.text, fontSize: font.xxl, fontWeight: '800', marginBottom: spacing.sm },
  subtitle: { color: colors.muted, fontSize: font.base, textAlign: 'center', marginBottom: spacing.xl },
  balanceCard: { backgroundColor: colors.panel, borderRadius: radius.lg, padding: spacing.lg, width: '100%', marginBottom: spacing.xl },
  balanceTitle: { color: colors.muted, fontSize: font.sm, fontWeight: '600', marginBottom: spacing.md, textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  balanceDot: { fontSize: 12 },
  balanceLabel: { flex: 1, color: colors.text, fontSize: font.base },
  balanceVal: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  primaryBtn: { backgroundColor: colors.accent, padding: spacing.md, borderRadius: radius.md, width: '100%', alignItems: 'center', marginBottom: spacing.sm },
  primaryBtnText: { color: '#fff', fontSize: font.md, fontWeight: '700' },
  secondaryBtn: { padding: spacing.md, width: '100%', alignItems: 'center' },
  secondaryBtnText: { color: colors.accent, fontSize: font.base, fontWeight: '600' },
});
