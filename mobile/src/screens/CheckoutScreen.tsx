import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, SafeAreaView, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { purchaseChest } from '../api/chests';
import { useApp } from '../context/AppContext';
import { colors, font, spacing, radius } from '../theme';
import type { CoinChest } from '../types';

type PayMethod = 'credit_card' | 'pix' | 'boleto';

const METHODS: { key: PayMethod; label: string; icon: string }[] = [
  { key: 'credit_card', label: 'Cartão de crédito', icon: '💳' },
  { key: 'pix', label: 'PIX', icon: '⚡' },
  { key: 'boleto', label: 'Boleto', icon: '📄' },
];

export default function CheckoutScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const chest: CoinChest = route.params?.chest;
  const { refreshBalance } = useApp();

  const [method, setMethod] = useState<PayMethod>('pix');
  const [loading, setLoading] = useState(false);

  if (!chest) { navigation.goBack(); return null; }

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const result = await purchaseChest(chest.id, method);
      await refreshBalance();
      navigation.navigate('PurchaseSuccess', { chest, added: result.added });
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.error || 'Erro ao processar pagamento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Finalizar compra</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Order summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resumo do pedido</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{chest.name}</Text>
            <Text style={styles.summaryVal}>R$ {chest.price_brl.toFixed(2).replace('.', ',')}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Moedas</Text>
            <Text style={[styles.summaryVal, { color: colors.accent }]}>{chest.coin_amount.toLocaleString('pt-BR')}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalVal}>R$ {chest.price_brl.toFixed(2).replace('.', ',')}</Text>
          </View>
        </View>

        {/* Payment method */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Forma de pagamento</Text>
          {METHODS.map(m => (
            <TouchableOpacity
              key={m.key}
              style={[styles.methodRow, method === m.key && styles.methodRowActive]}
              onPress={() => setMethod(m.key)}
            >
              <Text style={styles.methodIcon}>{m.icon}</Text>
              <Text style={[styles.methodLabel, method === m.key && styles.methodLabelActive]}>{m.label}</Text>
              <View style={[styles.radio, method === m.key && styles.radioActive]} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.buyBtn} onPress={handlePurchase} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buyBtnText}>Confirmar pagamento</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.panel },
  backBtn: { color: colors.accent, fontSize: font.base },
  headerTitle: { color: colors.text, fontSize: font.lg, fontWeight: '700' },
  content: { padding: spacing.md, gap: spacing.md },
  card: { backgroundColor: colors.panel, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  cardTitle: { color: colors.text, fontSize: font.md, fontWeight: '700', marginBottom: spacing.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  summaryLabel: { color: colors.muted, fontSize: font.base },
  summaryVal: { color: colors.text, fontSize: font.base, fontWeight: '600' },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.sm },
  totalLabel: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  totalVal: { color: colors.text, fontSize: font.md, fontWeight: '800' },
  methodRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  methodRowActive: { borderColor: colors.accent, backgroundColor: colors.accent + '11' },
  methodIcon: { fontSize: 22 },
  methodLabel: { flex: 1, color: colors.muted, fontSize: font.base },
  methodLabelActive: { color: colors.text, fontWeight: '600' },
  radio: { width: 18, height: 18, borderRadius: radius.full, borderWidth: 2, borderColor: colors.border },
  radioActive: { borderColor: colors.accent, backgroundColor: colors.accent },
  buyBtn: { backgroundColor: colors.accent, padding: spacing.md + 2, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.sm },
  buyBtnText: { color: '#fff', fontSize: font.md, fontWeight: '700' },
});
