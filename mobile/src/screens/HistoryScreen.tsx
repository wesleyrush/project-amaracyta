import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getTransactions } from '../api/balance';
import { colors, font, spacing, radius } from '../theme';
import type { Transaction } from '../api/balance';

const COIN_COLORS: Record<string, string> = {
  gold: '#f59e0b',
  silver: '#94a3b8',
  bronze: '#b45309',
};

const COIN_LABELS: Record<string, string> = {
  gold: 'Ouro',
  silver: 'Prata',
  bronze: 'Bronze',
};

const TYPE_LABELS: Record<string, string> = {
  admin_credit: 'Crédito administrativo',
  message_debit: 'Uso em conversa',
  chest_purchase: 'Compra de baú',
  module_purchase: 'Compra de módulo',
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function HistoryScreen() {
  const navigation = useNavigation<any>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTransactions()
      .then(setTransactions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Histórico de consumo</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} size="large" style={styles.loader} />
      ) : transactions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Nenhuma transação encontrada.</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={t => String(t.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const coinColor = item.coin_type ? COIN_COLORS[item.coin_type] : colors.muted;
            const isDebit = item.transaction_type === 'message_debit';
            return (
              <View style={styles.item}>
                <View style={styles.itemLeft}>
                  <Text style={styles.itemType}>{TYPE_LABELS[item.transaction_type] ?? item.transaction_type}</Text>
                  {item.description && (
                    <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
                  )}
                  <Text style={styles.itemDate}>{fmtDate(item.created_at)}</Text>
                </View>
                <View style={styles.itemRight}>
                  <Text style={[styles.itemAmount, { color: isDebit ? colors.danger : colors.success }]}>
                    {isDebit ? '−' : '+'}{Math.abs(item.amount).toFixed(4)}
                  </Text>
                  {item.coin_type && (
                    <Text style={[styles.itemCoin, { color: coinColor }]}>
                      {COIN_LABELS[item.coin_type]}
                    </Text>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.panel },
  backBtn: { color: colors.accent, fontSize: font.base },
  headerTitle: { color: colors.text, fontSize: font.lg, fontWeight: '700' },
  loader: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyText: { color: colors.muted, fontSize: font.base },
  list: { padding: spacing.md, gap: spacing.sm },
  item: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.panel, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  itemLeft: { flex: 1, marginRight: spacing.sm },
  itemType: { color: colors.text, fontSize: font.base, fontWeight: '600', marginBottom: 2 },
  itemDesc: { color: colors.muted, fontSize: font.sm, marginBottom: 2 },
  itemDate: { color: colors.muted, fontSize: 11 },
  itemRight: { alignItems: 'flex-end' },
  itemAmount: { fontSize: font.base, fontWeight: '800' },
  itemCoin: { fontSize: font.sm, fontWeight: '600' },
});
