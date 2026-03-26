import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { purchaseChest } from '../api/chests';
import { useApp } from '../context/AppContext';
import { colors, font, spacing, radius } from '../theme';
import type { CoinChest } from '../types';

type PayMethod = 'credit_card' | 'pix' | 'boleto';

const METHODS: { key: PayMethod; label: string; icon: string }[] = [
  { key: 'credit_card', label: 'Cartão de Crédito', icon: '💳' },
  { key: 'pix', label: 'PIX', icon: '⚡' },
  { key: 'boleto', label: 'Boleto', icon: '📄' },
];

function formatCardNumber(v: string) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

export default function CheckoutScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const chest: CoinChest = route.params?.chest;
  const { refreshBalance, setBalances } = useApp();

  const [method, setMethod] = useState<PayMethod>('pix');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [loading, setLoading] = useState(false);

  if (!chest) {
    navigation.goBack();
    return null;
  }

  const handlePurchase = async () => {
    if (method === 'credit_card') {
      if (cardNumber.replace(/\s/g, '').length < 16) {
        Alert.alert('Atenção', 'Número de cartão inválido.');
        return;
      }
      if (!cardName.trim()) {
        Alert.alert('Atenção', 'Informe o nome no cartão.');
        return;
      }
      if (cardExpiry.length < 5) {
        Alert.alert('Atenção', 'Informe a validade do cartão (MM/AA).');
        return;
      }
      if (cardCvv.length < 3) {
        Alert.alert('Atenção', 'Informe o CVV.');
        return;
      }
    }
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 1800));
      const result = await purchaseChest(chest.id, method);
      await refreshBalance();
      navigation.navigate('PurchaseSuccess', {
        chest,
        result,
        isModulePurchase: false,
      });
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
        <Text style={styles.headerTitle}>Finalizar Ativação</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resumo do pedido</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{chest.name}</Text>
            <Text style={styles.summaryVal}>R$ {chest.price_brl.toFixed(2).replace('.', ',')}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Tipo de moeda
            </Text>
            <Text style={[styles.summaryVal, { color: colors[chest.coin_type] ?? colors.accent }]}>
              {chest.coin_type === 'gold' ? 'Ouro' : chest.coin_type === 'silver' ? 'Prata' : 'Bronze'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Quantidade</Text>
            <Text style={[styles.summaryVal, { color: colors.accent }]}>
              {chest.coin_amount.toLocaleString('pt-BR')} moedas
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalVal}>R$ {chest.price_brl.toFixed(2).replace('.', ',')}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Forma de pagamento</Text>
          {METHODS.map(m => (
            <TouchableOpacity
              key={m.key}
              style={[styles.methodRow, method === m.key && styles.methodRowActive]}
              onPress={() => setMethod(m.key)}
            >
              <Text style={styles.methodIcon}>{m.icon}</Text>
              <Text style={[styles.methodLabel, method === m.key && styles.methodLabelActive]}>
                {m.label}
              </Text>
              <View style={[styles.radio, method === m.key && styles.radioActive]} />
            </TouchableOpacity>
          ))}
        </View>

        {method === 'credit_card' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Dados do cartão</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Número do cartão</Text>
              <TextInput
                style={styles.input}
                value={cardNumber}
                onChangeText={v => setCardNumber(formatCardNumber(v))}
                keyboardType="numeric"
                placeholderTextColor={colors.muted}
                placeholder="0000 0000 0000 0000"
                maxLength={19}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Nome no cartão</Text>
              <TextInput
                style={styles.input}
                value={cardName}
                onChangeText={setCardName}
                autoCapitalize="characters"
                placeholderTextColor={colors.muted}
                placeholder="NOME SOBRENOME"
              />
            </View>

            <View style={styles.row2}>
              <View style={[styles.formGroup, { flex: 1, marginRight: spacing.sm }]}>
                <Text style={styles.label}>Validade (MM/AA)</Text>
                <TextInput
                  style={styles.input}
                  value={cardExpiry}
                  onChangeText={v => {
                    const clean = v.replace(/\D/g, '').slice(0, 4);
                    setCardExpiry(clean.length > 2 ? clean.slice(0, 2) + '/' + clean.slice(2) : clean);
                  }}
                  keyboardType="numeric"
                  placeholderTextColor={colors.muted}
                  placeholder="MM/AA"
                  maxLength={5}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>CVV</Text>
                <TextInput
                  style={styles.input}
                  value={cardCvv}
                  onChangeText={v => setCardCvv(v.replace(/\D/g, '').slice(0, 4))}
                  keyboardType="numeric"
                  secureTextEntry
                  placeholderTextColor={colors.muted}
                  placeholder="•••"
                  maxLength={4}
                />
              </View>
            </View>
          </View>
        )}

        {method === 'pix' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>PIX</Text>
            <View style={styles.pixPlaceholder}>
              <Text style={styles.pixIcon}>⚡</Text>
              <Text style={styles.pixText}>QR Code simulado</Text>
              <Text style={styles.pixSub}>O pagamento será processado ao confirmar.</Text>
            </View>
          </View>
        )}

        {method === 'boleto' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Boleto</Text>
            <View style={styles.pixPlaceholder}>
              <Text style={styles.pixIcon}>📄</Text>
              <Text style={styles.pixText}>Código de barras simulado</Text>
              <Text style={styles.pixSub}>12345.67890 12345.678901 12345.678901 1 00000000000000</Text>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.buyBtn} onPress={handlePurchase} disabled={loading}>
          {loading
            ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={[styles.buyBtnText, { marginLeft: spacing.sm }]}>Processando...</Text>
              </View>
            )
            : <Text style={styles.buyBtnText}>Confirmar pagamento</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.sidebar,
  },
  backBtn: { color: colors.accent, fontSize: font.base },
  headerTitle: { color: colors.text, fontSize: font.lg, fontWeight: '700' },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  cardTitle: { color: colors.text, fontSize: font.md, fontWeight: '700', marginBottom: spacing.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  summaryLabel: { color: colors.muted, fontSize: font.base },
  summaryVal: { color: colors.text, fontSize: font.base, fontWeight: '600' },
  totalRow: {
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: spacing.sm, marginTop: spacing.sm,
  },
  totalLabel: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  totalVal: { color: colors.text, fontSize: font.md, fontWeight: '800' },
  methodRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm,
  },
  methodRowActive: { borderColor: colors.accent, backgroundColor: colors.accent + '11' },
  methodIcon: { fontSize: 22 },
  methodLabel: { flex: 1, color: colors.muted, fontSize: font.base },
  methodLabelActive: { color: colors.text, fontWeight: '600' },
  radio: {
    width: 18, height: 18, borderRadius: radius.full,
    borderWidth: 2, borderColor: colors.border,
  },
  radioActive: { borderColor: colors.accent, backgroundColor: colors.accent },
  formGroup: { marginBottom: spacing.md },
  label: { color: colors.muted, fontSize: font.sm, fontWeight: '600', marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.inputBg, color: colors.text,
    borderRadius: radius.sm, padding: spacing.sm + 4,
    fontSize: font.base, borderWidth: 1, borderColor: colors.border,
  },
  row2: { flexDirection: 'row' },
  pixPlaceholder: {
    alignItems: 'center', padding: spacing.lg,
    backgroundColor: colors.inputBg, borderRadius: radius.md,
    gap: spacing.sm,
  },
  pixIcon: { fontSize: 40 },
  pixText: { color: colors.text, fontSize: font.md, fontWeight: '600' },
  pixSub: { color: colors.muted, fontSize: font.sm, textAlign: 'center' },
  buyBtn: {
    backgroundColor: colors.accent,
    padding: spacing.md + 2, borderRadius: radius.md,
    alignItems: 'center', marginTop: spacing.sm,
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },
  buyBtnText: { color: '#fff', fontSize: font.md, fontWeight: '700' },
});
