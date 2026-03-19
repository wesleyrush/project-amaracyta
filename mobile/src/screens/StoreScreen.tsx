import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Image, SafeAreaView, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { listChests } from '../api/chests';
import { listModules, listUserModules, purchaseModules } from '../api/modules';
import { useApp } from '../context/AppContext';
import { colors, font, spacing, radius } from '../theme';
import type { CoinChest, Module, UserModule } from '../types';

const COIN_LABELS = {
  gold: { label: 'Ouro', color: '#f59e0b' },
  silver: { label: 'Prata', color: '#94a3b8' },
  bronze: { label: 'Bronze', color: '#b45309' },
};

type Tab = 'coins' | 'modules';
type PayMethod = 'credit_card' | 'pix' | 'boleto';

const METHODS: { key: PayMethod; label: string }[] = [
  { key: 'pix', label: 'PIX' },
  { key: 'credit_card', label: 'Cartão de crédito' },
  { key: 'boleto', label: 'Boleto' },
];

function ChestsTab() {
  const navigation = useNavigation<any>();
  const [chests, setChests] = useState<CoinChest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listChests().then(setChests).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleBuy = (chest: CoinChest) => {
    navigation.navigate('Checkout', { chest });
  };

  if (loading) return <ActivityIndicator color={colors.accent} size="large" style={{ flex: 1 }} />;

  return (
    <FlatList
      data={chests}
      keyExtractor={c => String(c.id)}
      contentContainerStyle={styles.list}
      numColumns={2}
      columnWrapperStyle={styles.row}
      renderItem={({ item, index }) => {
        const coin = COIN_LABELS[item.coin_type];
        const isPopular = index === Math.floor(chests.length / 2);
        return (
          <View style={[styles.card, isPopular && styles.cardPopular]}>
            {isPopular && <View style={styles.popularBadge}><Text style={styles.popularText}>Mais popular</Text></View>}
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.chestImage} resizeMode="contain" />
            ) : (
              <View style={[styles.chestPlaceholder, { backgroundColor: coin?.color + '22' }]}>
                <Text style={[styles.chestIcon, { color: coin?.color }]}>⬡</Text>
              </View>
            )}
            <Text style={styles.chestName}>{item.name}</Text>
            <Text style={[styles.coinType, { color: coin?.color }]}>{coin?.label}</Text>
            <Text style={styles.coinAmount}>{item.coin_amount.toLocaleString('pt-BR')} moedas</Text>
            <Text style={styles.price}>R$ {item.price_brl.toFixed(2).replace('.', ',')}</Text>
            <TouchableOpacity style={styles.buyBtn} onPress={() => handleBuy(item)}>
              <Text style={styles.buyBtnText}>Comprar</Text>
            </TouchableOpacity>
          </View>
        );
      }}
    />
  );
}

function ModulesTab() {
  const { refreshUserModules } = useApp();
  const [modules, setModules] = useState<Module[]>([]);
  const [ownedMap, setOwnedMap] = useState<Map<number, UserModule>>(new Map());
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [method, setMethod] = useState<PayMethod>('pix');

  useEffect(() => {
    Promise.all([listModules(), listUserModules()])
      .then(([modsRes, userModsRes]) => {
        setModules(modsRes.items.filter(m => m.is_active !== false && m.module_type === 'fixed'));
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

  const totalModules = Object.values(quantities).reduce((s, v) => s + v, 0);
  const totalPrice = modules.reduce((sum, m) => {
    const qty = quantities[m.id] ?? 0;
    return sum + qty * (m.price_brl ?? 0);
  }, 0);

  const handleBuy = async () => {
    if (totalModules === 0) { Alert.alert('Atenção', 'Selecione ao menos um módulo.'); return; }
    setBuying(true);
    try {
      await purchaseModules(quantities, method);
      await refreshUserModules();
      Alert.alert('Sucesso', 'Módulos adquiridos com sucesso!');
      setQuantities({});
      const userModsRes = await listUserModules();
      setOwnedMap(new Map(userModsRes.items.map(um => [um.module_id, um])));
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.error || 'Erro ao processar compra.');
    } finally {
      setBuying(false);
    }
  };

  if (loading) return <ActivityIndicator color={colors.accent} size="large" style={{ flex: 1 }} />;

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
              {item.description && <Text style={styles.moduleDesc} numberOfLines={2}>{item.description}</Text>}
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
        totalModules > 0 ? (
          <View style={styles.checkoutBar}>
            <Text style={styles.checkoutSummary}>
              {totalModules} módulo{totalModules !== 1 ? 's' : ''} · R$ {totalPrice.toFixed(2).replace('.', ',')}
            </Text>
            <View style={styles.methodRow}>
              {METHODS.map(m => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.methodBtn, method === m.key && styles.methodBtnActive]}
                  onPress={() => setMethod(m.key)}
                >
                  <Text style={[styles.methodBtnText, method === m.key && styles.methodBtnTextActive]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleBuy} disabled={buying}>
              {buying ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Confirmar compra</Text>}
            </TouchableOpacity>
          </View>
        ) : null
      }
    />
  );
}

export default function StoreScreen() {
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<Tab>('coins');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comprar Créditos</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'coins' && styles.tabActive]}
          onPress={() => setTab('coins')}
        >
          <Text style={[styles.tabText, tab === 'coins' && styles.tabTextActive]}>Baús de Moedas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'modules' && styles.tabActive]}
          onPress={() => setTab('modules')}
        >
          <Text style={[styles.tabText, tab === 'modules' && styles.tabTextActive]}>Módulos</Text>
        </TouchableOpacity>
      </View>

      {tab === 'coins' ? <ChestsTab /> : <ModulesTab />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.panel },
  backBtn: { color: colors.accent, fontSize: font.base },
  headerTitle: { color: colors.text, fontSize: font.lg, fontWeight: '700' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.panel },
  tab: { flex: 1, padding: spacing.md, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.accent },
  tabText: { color: colors.muted, fontSize: font.base, fontWeight: '600' },
  tabTextActive: { color: colors.accent },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  row: { justifyContent: 'space-between', marginBottom: spacing.md },
  // Chest cards
  card: { width: '48%', backgroundColor: colors.panel, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  cardPopular: { borderColor: colors.accent },
  popularBadge: { backgroundColor: colors.accent, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2, marginBottom: spacing.xs },
  popularText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  chestImage: { width: 80, height: 70, marginBottom: spacing.sm },
  chestPlaceholder: { width: 80, height: 70, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  chestIcon: { fontSize: 40 },
  chestName: { color: colors.text, fontSize: font.base, fontWeight: '600', textAlign: 'center', marginBottom: 2 },
  coinType: { fontSize: font.sm, fontWeight: '700', marginBottom: 2 },
  coinAmount: { color: colors.muted, fontSize: font.sm, marginBottom: spacing.xs },
  price: { color: colors.text, fontSize: font.md, fontWeight: '800', marginBottom: spacing.sm },
  buyBtn: { backgroundColor: colors.accent, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.full, width: '100%', alignItems: 'center' },
  buyBtnText: { color: '#fff', fontSize: font.sm, fontWeight: '700' },
  // Module cards
  moduleCard: { flexDirection: 'row', backgroundColor: colors.panel, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  moduleCardBody: { flex: 1, marginRight: spacing.sm },
  moduleName: { color: colors.text, fontSize: font.base, fontWeight: '600', marginBottom: 2 },
  moduleDesc: { color: colors.muted, fontSize: font.sm, marginBottom: 4 },
  ownedBadge: { color: colors.accent, fontSize: 10, fontWeight: '600' },
  moduleRight: { alignItems: 'center', gap: spacing.xs },
  modulePrice: { color: colors.text, fontSize: font.sm, fontWeight: '700' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stepperBtn: { width: 28, height: 28, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  stepperBtnText: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  stepperVal: { color: colors.text, fontSize: font.base, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  // Checkout bar
  checkoutBar: { backgroundColor: colors.panel, borderRadius: radius.lg, padding: spacing.md, margin: spacing.md, borderWidth: 1, borderColor: colors.accent + '44', gap: spacing.sm },
  checkoutSummary: { color: colors.text, fontSize: font.base, fontWeight: '700', textAlign: 'center' },
  methodRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', justifyContent: 'center' },
  methodBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  methodBtnActive: { borderColor: colors.accent, backgroundColor: colors.accent + '22' },
  methodBtnText: { color: colors.muted, fontSize: font.sm },
  methodBtnTextActive: { color: colors.accent, fontWeight: '600' },
  confirmBtn: { backgroundColor: colors.accent, padding: spacing.md, borderRadius: radius.md, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontSize: font.base, fontWeight: '700' },
});
