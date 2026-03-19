import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';
import { colors, font, spacing } from '../theme';

export default function CoinBalance() {
  const { balances } = useApp();

  return (
    <View style={styles.row}>
      <View style={styles.coin}>
        <Text style={[styles.dot, { color: colors.gold }]}>●</Text>
        <Text style={styles.val}>{balances.gold.toFixed(0)}</Text>
      </View>
      <View style={styles.coin}>
        <Text style={[styles.dot, { color: colors.silver }]}>●</Text>
        <Text style={styles.val}>{balances.silver.toFixed(0)}</Text>
      </View>
      <View style={styles.coin}>
        <Text style={[styles.dot, { color: colors.bronze }]}>●</Text>
        <Text style={styles.val}>{balances.bronze.toFixed(0)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  coin: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dot: { fontSize: 10 },
  val: { color: colors.text, fontSize: font.sm, fontWeight: '600' },
});
