import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, SafeAreaView, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { listChests } from '../api/chests';
import { listModules, listUserModules } from '../api/modules';
import { useApp } from '../context/AppContext';
import { colors, font, spacing, radius } from '../theme';
import type { CoinChest, Module, UserModule } from '../types';

type Tab = 'chests' | 'modules';

const COIN_COLORS: Record<string, string> = {
  gold: colors.gold,
  silver: colors.silver,
  bronze: colors.bronze,
};
const COIN_LABELS: Record<string, string> = {
  gold: 'Ouro',
  silver: 'Prata',
  bronze: 'Bronze',
};
const COIN_EMOJI: Record<string, string> = {
  gold: '🥇',
  silver: '🥈',
  bronze: '🥉',
};

function ChestsTab() {
  const navigation = useNavigation<any>();
  const [chests, setChests] = useState<CoinChest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listChests()
      .then(r => setChests(r.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator color={colors.accent} size="large" style={{ flex: 1, marginTop: spacing.xl }} />;

  return (
    <FlatList
      data={chests}
      keyExtractor={c => String(c.id)}
      contentContainerStyle={styles.list}
      numColumns={2}
      columnWrapperStyle={styles.row}
      renderItem={({ item, index }) => {
        const coinColor = COIN_COLORS[item.coin_type] ?? colors.accent;
        const coinLabel = COIN_LABELS[item.coin_type] ?? item.coin_type;
        const coinEmoji = COIN_EMOJI[item.coin_type] ?? '🪙';
        const isPopular = index === Math.floor(chests.length / 2);
        return (
          <View style={[styles.chestCard, isPopular && styles.chestCardPopular]}>
            {isPopular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>Mais popular</Text>
              </View>
            )}
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.chestImage} resizeMode="contain" />
            ) : (
              <View style={[styles.chestPlaceholder, { backgroundColor: coinColor + '22' }]}>
                <Text style={styles.chestEmoji}>{coinEmoji}</Text>
              </View>
            )}
            <Text style={styles.chestName}>{item.name}</Text>
            <Text style={[styles.coinType, { color: coinColor }]}>{coinLabel}</Text>
            <Text style={styles.coinAmount}>{item.coin_amount.toLocaleString('pt-BR')} moedas</Text>
            <Text style={styles.chestPrice}>R$ {item.price_brl.toFixed(2).replace('.', ',')}</Text>
            <TouchableOpacity
              style={styles.buyBtn}
              onPress={() => navigation.navigate('Checkout', { chest: item })}
            >
              <Text style={styles.buyBtnText}>Comprar</Text>
            </TouchableOpacity>
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Nenhum baú disponível.</Text>
        </View>
      }
    />
  );
}

function ModulesTab() {
  const navigation = useNavigation<any>();
  const { userModules } = useApp();
  const [modules, setModules] = useState<Module[]>([]);
  const [ownedMap, setOwnedMap] = useState<Map<number, UserModule>>(new Map());
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listModules(), listUserModules()])
      .then(([modsRes, userModsRes]) => {
        const fixedModules = modsRes.items.filter(
          m => m.is_active !== false && m.module_type === 'fixed'
        );
        setModules(fixedModules);
        setOwnedMap(new Map(userModsRes.items.map(um => [um.module_id, um])));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const setQty = (moduleId: number, delta: number) => {
    setQuantities(prev => {
      const cur = prev[moduleId] ?? 0;
      const next = Math.max(0, cur + delta);
      if (next === 0) {
        const { [moduleId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [moduleId]: next };
    });
  };

  const totalQty = Object.values(quantities).reduce((s, v) => s + v, 0);
  const totalPrice = modules.reduce((sum, m) => {
    const qty = quantities[m.id] ?? 0;
    return sum + qty * (m.price_brl ?? 0);
  }, 0);

  const selectedModules = modules.filter(m => (quantities[m.id] ?? 0) > 0);

  if (loading) return <ActivityIndicator color={colors.accent} size="large" style={{ flex: 1, marginTop: spacing.xl }} />;

  return (
    <FlatList
      data={modules}
      keyExtractor={m => String(m.id)}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const owned = ownedMap.get(item.id);
        const qty = quantities[item.id] ?? 0;
        return (
          <View style={styles.moduleCard}>
            <View style={styles.moduleCardBody}>
              <Text style={styles.moduleName}>{item.name}</Text>
              {!!item.description && (
                <Text style={styles.moduleDesc} numberOfLines={2}>{item.description}</Text>
              )}
              <Text style={styles.moduleTypeBadge}>
                {item.module_type === 'fixed' ? '📦 Fixo' : '🆓 Livre'}
              </Text>
              {owned && (
                <Text style={styles.ownedBadge}>
                  Possui: {owned.quantity} ({owned.available_qty} disponíveis)
                </Text>
              )}
            </View>
            <View style={styles.moduleRight}>
              {item.price_brl != null && (
                <Text style={styles.modulePrice}>R$ {Number(item.price_brl).toFixed(2).replace('.', ',')}</Text>
              )}
              <View style={styles.stepper}>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => setQty(item.id, -1)}>
                  <Text style={styles.stepperBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepperVal}>{qty}</Text>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => setQty(item.id, 1)}>
                  <Text style={styles.stepperBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      }}
      ListFooterComponent={
        totalQty > 0 ? (
          <View style={styles.checkoutBar}>
            <Text style={styles.checkoutSummary}>
              {totalQty} módulo{totalQty !== 1 ? 's' : ''} · R$ {totalPrice.toFixed(2).replace('.', ',')}
            </Text>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => navigation.navigate('ModuleCheckout', {
                moduleQuantities: quantities,
                modules: selectedModules,
                price: totalPrice,
              })}
            >
              <Text style={styles.confirmBtnText}>Continuar para pagamento →</Text>
            </TouchableOpacity>
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Nenhum módulo disponível para compra.</Text>
        </View>
      }
    />
  );
}

export default function StoreScreen() {
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<Tab>('chests');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Loja</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'chests' && styles.tabActive]}
          onPress={() => setTab('chests')}
        >
          <Text style={[styles.tabText, tab === 'chests' && styles.tabTextActive]}>🪙 Baús</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'modules' && styles.tabActive]}
          onPress={() => setTab('modules')}
        >
          <Text style={[styles.tabText, tab === 'modules' && styles.tabTextActive]}>📦 Módulos</Text>
        </TouchableOpacity>
      </View>

      {tab === 'chests' ? <ChestsTab /> : <ModulesTab />}
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
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.sidebar,
  },
  tab: { flex: 1, padding: spacing.md, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.accent },
  tabText: { color: colors.muted, fontSize: font.base, fontWeight: '600' },
  tabTextActive: { color: colors.accent },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  row: { justifyContent: 'space-between', marginBottom: spacing.md },
  chestCard: {
    width: '48%', backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  chestCardPopular: { borderColor: colors.accent },
  popularBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    marginBottom: spacing.xs,
  },
  popularText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  chestImage: { width: 80, height: 70, marginBottom: spacing.sm },
  chestPlaceholder: {
    width: 80, height: 70, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
  },
  chestEmoji: { fontSize: 40 },
  chestName: { color: colors.text, fontSize: font.base, fontWeight: '600', textAlign: 'center', marginBottom: 2 },
  coinType: { fontSize: font.sm, fontWeight: '700', marginBottom: 2 },
  coinAmount: { color: colors.muted, fontSize: font.sm, marginBottom: spacing.xs },
  chestPrice: { color: colors.text, fontSize: font.md, fontWeight: '800', marginBottom: spacing.sm },
  buyBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
    borderRadius: radius.full, width: '100%', alignItems: 'center',
  },
  buyBtnText: { color: '#fff', fontSize: font.sm, fontWeight: '700' },
  moduleCard: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  moduleCardBody: { flex: 1, marginRight: spacing.sm },
  moduleName: { color: colors.text, fontSize: font.base, fontWeight: '600', marginBottom: 2 },
  moduleDesc: { color: colors.muted, fontSize: font.sm, marginBottom: 4 },
  moduleTypeBadge: { color: colors.muted, fontSize: 11, marginBottom: 2 },
  ownedBadge: { color: colors.accent, fontSize: 11, fontWeight: '600' },
  moduleRight: { alignItems: 'center', gap: spacing.xs },
  modulePrice: { color: colors.text, fontSize: font.sm, fontWeight: '700' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stepperBtn: {
    width: 28, height: 28, borderRadius: radius.full,
    backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  stepperBtnText: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  stepperVal: { color: colors.text, fontSize: font.base, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  checkoutBar: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.md,
    borderWidth: 1, borderColor: colors.accent + '55', gap: spacing.sm,
  },
  checkoutSummary: { color: colors.text, fontSize: font.base, fontWeight: '700', textAlign: 'center' },
  confirmBtn: {
    backgroundColor: colors.accent, padding: spacing.md,
    borderRadius: radius.md, alignItems: 'center',
  },
  confirmBtnText: { color: '#fff', fontSize: font.base, fontWeight: '700' },
  empty: { flex: 1, padding: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.muted, fontSize: font.base },
});
