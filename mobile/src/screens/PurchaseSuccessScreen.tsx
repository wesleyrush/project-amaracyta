import React from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { colors, font, spacing, radius } from '../theme';
import type { CoinChest, Module } from '../types';

export default function PurchaseSuccessScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { balances } = useApp();

  const isModulePurchase: boolean = route.params?.isModulePurchase ?? false;
  const chest: CoinChest | undefined = route.params?.chest;
  const modules: Module[] = route.params?.modules ?? [];
  const moduleQuantities: Record<number, number> = route.params?.moduleQuantities ?? {};
  const price: number = route.params?.price ?? 0;
  const result = route.params?.result;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconCircle}>
          <Text style={styles.checkIcon}>✓</Text>
        </View>

        <Text style={styles.title}>Compra realizada!</Text>

        {isModulePurchase ? (
          <>
            <Text style={styles.subtitle}>
              Seus módulos foram adquiridos com sucesso.
            </Text>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Módulos ativados</Text>
              {modules.map(m => {
                const qty = moduleQuantities[m.id] ?? 0;
                return (
                  <View key={m.id} style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{m.name} × {qty}</Text>
                    <Text style={styles.summaryVal}>
                      R$ {(qty * (m.price_brl ?? 0)).toFixed(2).replace('.', ',')}
                    </Text>
                  </View>
                );
              })}
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total pago</Text>
                <Text style={styles.totalVal}>R$ {price.toFixed(2).replace('.', ',')}</Text>
              </View>
            </View>
          </>
        ) : (
          <>
            {chest && (
              <Text style={styles.subtitle}>
                {chest.coin_amount.toLocaleString('pt-BR')} moedas de {chest.name} adicionadas ao seu saldo.
              </Text>
            )}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Seu saldo atual</Text>
              <View style={styles.balanceRow}>
                <Text style={[styles.balanceDot, { color: colors.gold }]}>●</Text>
                <Text style={styles.balanceLabel}>Ouro</Text>
                <Text style={styles.balanceVal}>{Math.floor(balances.gold)}</Text>
              </View>
              <View style={styles.balanceRow}>
                <Text style={[styles.balanceDot, { color: colors.silver }]}>●</Text>
                <Text style={styles.balanceLabel}>Prata</Text>
                <Text style={styles.balanceVal}>{Math.floor(balances.silver)}</Text>
              </View>
              <View style={styles.balanceRow}>
                <Text style={[styles.balanceDot, { color: colors.bronze }]}>●</Text>
                <Text style={styles.balanceLabel}>Bronze</Text>
                <Text style={styles.balanceVal}>{Math.floor(balances.bronze)}</Text>
              </View>
            </View>
          </>
        )}

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('Main')}
        >
          <Text style={styles.primaryBtnText}>Voltar ao chat</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('Store')}
        >
          <Text style={styles.secondaryBtnText}>Ver loja</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: {
    flexGrow: 1, alignItems: 'center',
    justifyContent: 'center', padding: spacing.xl,
  },
  iconCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.success + '22',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  checkIcon: { fontSize: 48, color: colors.success },
  title: { color: colors.text, fontSize: font.xxl, fontWeight: '800', marginBottom: spacing.sm },
  subtitle: {
    color: colors.muted, fontSize: font.base,
    textAlign: 'center', marginBottom: spacing.xl,
    lineHeight: 22,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: spacing.lg,
    width: '100%', marginBottom: spacing.xl,
    borderWidth: 1, borderColor: colors.border,
  },
  summaryTitle: {
    color: colors.muted, fontSize: font.sm, fontWeight: '600',
    marginBottom: spacing.md, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  summaryLabel: { color: colors.text, fontSize: font.base, flex: 1 },
  summaryVal: { color: colors.text, fontSize: font.base, fontWeight: '600' },
  totalRow: {
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: spacing.sm, marginTop: spacing.sm,
  },
  totalLabel: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  totalVal: { color: colors.text, fontSize: font.md, fontWeight: '800' },
  balanceRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.sm, marginBottom: spacing.sm,
  },
  balanceDot: { fontSize: 12 },
  balanceLabel: { flex: 1, color: colors.text, fontSize: font.base },
  balanceVal: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  primaryBtn: {
    backgroundColor: colors.accent, padding: spacing.md,
    borderRadius: radius.md, width: '100%',
    alignItems: 'center', marginBottom: spacing.sm,
  },
  primaryBtnText: { color: '#fff', fontSize: font.md, fontWeight: '700' },
  secondaryBtn: { padding: spacing.md, width: '100%', alignItems: 'center' },
  secondaryBtnText: { color: colors.accent, fontSize: font.base, fontWeight: '600' },
});
