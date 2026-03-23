import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, SafeAreaView, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getTransactions } from '../api/balance';
import { colors, font, spacing, radius } from '../theme';
import type { Transaction } from '../api/balance';

const PAGE_SIZE = 15;

const COIN_COLORS: Record<string, string> = {
  gold: colors.gold,
  silver: colors.silver,
  bronze: colors.bronze,
};

const COIN_LABELS: Record<string, string> = {
  gold: '🥇 Ouro',
  silver: '🥈 Prata',
  bronze: '🥉 Bronze',
};

const TYPE_LABELS: Record<string, string> = {
  admin_credit: 'Crédito Admin',
  message_debit: 'Uso em conversa',
  chest_purchase: 'Compra de baú',
  module_purchase: 'Compra de módulo',
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function HistoryScreen() {
  const navigation = useNavigation<any>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    getTransactions()
      .then(setTransactions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return transactions;
    const q = search.toLowerCase();
    return transactions.filter(t =>
      (t.transaction_type ?? '').toLowerCase().includes(q) ||
      (t.description ?? '').toLowerCase().includes(q) ||
      (t.coin_type ?? '').toLowerCase().includes(q) ||
      TYPE_LABELS[t.transaction_type]?.toLowerCase().includes(q)
    );
  }, [transactions, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageData = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(0);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Histórico</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={handleSearch}
          placeholder="Buscar transações..."
          placeholderTextColor={colors.muted}
        />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} size="large" style={styles.loader} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {search ? 'Nenhuma transação encontrada.' : 'Nenhuma transação registrada.'}
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={pageData}
            keyExtractor={t => String(t.id)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const isDebit = item.transaction_type === 'message_debit';
              const coinColor = item.coin_type ? COIN_COLORS[item.coin_type] : colors.muted;
              return (
                <View style={styles.item}>
                  <View style={styles.itemLeft}>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>
                        {TYPE_LABELS[item.transaction_type] ?? item.transaction_type}
                      </Text>
                    </View>
                    {!!item.description && (
                      <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
                    )}
                    <Text style={styles.itemDate}>{fmtDate(item.created_at)}</Text>
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={[styles.itemAmount, { color: isDebit ? colors.danger : colors.success }]}>
                      {isDebit ? '−' : '+'}{Math.abs(item.amount).toFixed(4)}
                    </Text>
                    {!!item.coin_type && (
                      <Text style={[styles.itemCoin, { color: coinColor }]}>
                        {COIN_LABELS[item.coin_type] ?? item.coin_type}
                      </Text>
                    )}
                  </View>
                </View>
              );
            }}
          />

          {totalPages > 1 && (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.pageBtn, safePage === 0 && styles.pageBtnDisabled]}
                onPress={() => setPage(p => Math.max(0, p - 1))}
                disabled={safePage === 0}
              >
                <Text style={styles.pageBtnText}>← Anterior</Text>
              </TouchableOpacity>

              <Text style={styles.pageInfo}>
                {safePage + 1} / {totalPages}
              </Text>

              <TouchableOpacity
                style={[styles.pageBtn, safePage >= totalPages - 1 && styles.pageBtnDisabled]}
                onPress={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={safePage >= totalPages - 1}
              >
                <Text style={styles.pageBtnText}>Próxima →</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
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
  searchRow: { padding: spacing.md, backgroundColor: colors.sidebar },
  searchInput: {
    backgroundColor: colors.inputBg, color: colors.text,
    borderRadius: radius.md, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, fontSize: font.base,
    borderWidth: 1, borderColor: colors.border,
  },
  loader: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyText: { color: colors.muted, fontSize: font.base },
  list: { padding: spacing.md, paddingBottom: spacing.sm },
  item: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.md, padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  itemLeft: { flex: 1, marginRight: spacing.sm },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent + '22',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    marginBottom: spacing.xs,
  },
  typeBadgeText: { color: colors.accent, fontSize: 11, fontWeight: '600' },
  itemDesc: { color: colors.muted, fontSize: font.sm, marginBottom: 2 },
  itemDate: { color: colors.muted, fontSize: 11 },
  itemRight: { alignItems: 'flex-end' },
  itemAmount: { fontSize: font.base, fontWeight: '800' },
  itemCoin: { fontSize: font.sm, fontWeight: '600', marginTop: 2 },
  pagination: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.sidebar,
  },
  pageBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { color: colors.accent, fontSize: font.sm, fontWeight: '600' },
  pageInfo: { color: colors.muted, fontSize: font.sm },
});
