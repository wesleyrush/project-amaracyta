import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Modal, ActivityIndicator, SafeAreaView, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { listModules, listUserModules } from '../api/modules';
import { listChildren } from '../api/children';
import { createSession } from '../api/sessions';
import { useApp } from '../context/AppContext';
import { colors, font, spacing, radius } from '../theme';
import type { Module, Child, User } from '../types';

function isProfileComplete(u: User | null): boolean {
  if (!u) return false;
  return !!(u.full_name && u.birth_date && u.birth_time && u.birth_country && u.birth_state && u.birth_city);
}

type PersonChoice = { type: 'user' } | { type: 'child'; child: Child };

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelected: (moduleId: number, childId?: number | null) => void;
}

export default function ModulePicker({ visible, onClose, onSelected }: Props) {
  const navigation = useNavigation<any>();
  const { user, setCid, refreshSessions, refreshUserModules } = useApp();

  const [step, setStep] = useState<'person' | 'module'>('person');
  const [children, setChildren] = useState<Child[]>([]);
  const [childrenLoaded, setChildrenLoaded] = useState(false);
  const [person, setPerson] = useState<PersonChoice | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [allUsed, setAllUsed] = useState(false);
  const [hasFree, setHasFree] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setStep('person');
    setPerson(null);
    setModules([]);
    setAllUsed(false);
    setHasFree(false);
    setChildrenLoaded(false);

    listChildren()
      .then(r => {
        setChildren(r.items);
        if (r.items.length === 0) {
          setPerson({ type: 'user' });
          setStep('module');
        }
      })
      .catch(() => {
        setPerson({ type: 'user' });
        setStep('module');
      })
      .finally(() => setChildrenLoaded(true));
  }, [visible]);

  useEffect(() => {
    if (!person || !visible) return;
    setLoading(true);
    setAllUsed(false);

    Promise.all([listModules(), listUserModules()])
      .then(([modsRes, userModsRes]) => {
        const allModules = modsRes.items.filter(m => m.is_active !== false);
        const ownedMap = new Map(userModsRes.items.map(um => [um.module_id, um]));

        const freeModules = allModules.filter(
          m => m.module_type === 'free' || !m.module_type
        );
        const fixedOwned = allModules.filter(
          m => m.module_type === 'fixed' && (ownedMap.get(m.id)?.available_qty ?? 0) > 0
        );

        const totalAccessible =
          freeModules.length +
          allModules.filter(m => m.module_type === 'fixed' && ownedMap.has(m.id)).length;

        setAllUsed(totalAccessible > 0 && freeModules.length === 0 && fixedOwned.length === 0);
        setHasFree(freeModules.length > 0);
        setModules([...freeModules, ...fixedOwned]);
        refreshUserModules().catch(() => {});
      })
      .catch(() => setModules([]))
      .finally(() => setLoading(false));
  }, [person, visible]);

  const handleSelectPerson = (p: PersonChoice) => {
    setPerson(p);
    setStep('module');
  };

  const handleSelectModule = async (mod: Module) => {
    setCreating(true);
    try {
      const childId = person?.type === 'child' ? person.child.id : null;
      const session = await createSession(mod.id, childId);
      await refreshSessions();
      await refreshUserModules();
      setCid(session.id);
      onSelected(mod.id, childId);
    } catch {}
    setCreating(false);
  };

  const personLabel = person?.type === 'child'
    ? person.child.full_name
    : (user?.full_name || 'Eu');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {!isProfileComplete(user)
                ? 'Cadastro incompleto'
                : step === 'person'
                  ? 'Para quem é esta conversa?'
                  : 'Escolha o módulo'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {!isProfileComplete(user) ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyMsg}>
                Para iniciar uma conversa, complete seu cadastro no perfil.
              </Text>
              <TouchableOpacity
                style={styles.storeBtn}
                onPress={() => { onClose(); navigation.navigate('Profile'); }}
              >
                <Text style={styles.storeBtnText}>✏️ Completar meu perfil</Text>
              </TouchableOpacity>
            </View>

          ) : step === 'person' && children.length > 0 ? (
            <ScrollView contentContainerStyle={styles.list}>
              <Text style={styles.subtitle}>Selecione a pessoa para esta sessão</Text>
              <TouchableOpacity
                style={styles.personCard}
                onPress={() => handleSelectPerson({ type: 'user' })}
              >
                <Text style={styles.personAvatar}>👤</Text>
                <View>
                  <Text style={styles.personName}>{user?.full_name || 'Eu'}</Text>
                  <Text style={styles.personSub}>Para mim</Text>
                </View>
              </TouchableOpacity>
              {children.map(child => (
                <TouchableOpacity
                  key={child.id}
                  style={styles.personCard}
                  onPress={() => handleSelectPerson({ type: 'child', child })}
                >
                  <Text style={styles.personAvatar}>👶</Text>
                  <View>
                    <Text style={styles.personName}>{child.full_name}</Text>
                    {!!child.initiatic_name && (
                      <Text style={styles.personSub}>{child.initiatic_name}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

          ) : step === 'module' ? (
            <>
              {children.length > 0 && (
                <Text style={styles.subtitle}>Para: {personLabel}</Text>
              )}
              {loading || creating || !childrenLoaded ? (
                <ActivityIndicator color={colors.accent} size="large" style={styles.loader} />
              ) : modules.length === 0 ? (
                <View style={styles.emptyContainer}>
                  {allUsed ? (
                    <>
                      <Text style={styles.emptyMsg}>
                        Você não possui unidades disponíveis. Adquira mais módulos na loja.
                      </Text>
                      <TouchableOpacity
                        style={styles.storeBtn}
                        onPress={() => { onClose(); navigation.navigate('Store'); }}
                      >
                        <Text style={styles.storeBtnText}>🏪 Comprar módulos</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Text style={styles.emptyMsg}>
                        Você ainda não possui módulos disponíveis. Acesse a loja para começar.
                      </Text>
                      <TouchableOpacity
                        style={styles.storeBtn}
                        onPress={() => { onClose(); navigation.navigate('Store'); }}
                      >
                        <Text style={styles.storeBtnText}>🏪 Ir à Loja</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {children.length > 0 && (
                    <TouchableOpacity
                      style={[styles.storeBtn, styles.outlineBtn]}
                      onPress={() => setStep('person')}
                    >
                      <Text style={styles.storeBtnText}>← Escolher outra pessoa</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <FlatList
                  data={modules}
                  keyExtractor={m => String(m.id)}
                  contentContainerStyle={styles.list}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.moduleCard}
                      onPress={() => handleSelectModule(item)}
                    >
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{item.name[0]?.toUpperCase() ?? '?'}</Text>
                      </View>
                      <View style={styles.cardBody}>
                        <View style={styles.cardNameRow}>
                          <Text style={styles.cardName}>{item.name}</Text>
                          <Text style={styles.cardType}>
                            {item.module_type === 'fixed' ? '📦 Fixo' : '🆓 Livre'}
                          </Text>
                        </View>
                        {!!item.description && (
                          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  )}
                  ListFooterComponent={hasFree ? (
                    <TouchableOpacity
                      style={styles.hintBtn}
                      onPress={() => { onClose(); navigation.navigate('Store'); }}
                    >
                      <Text style={styles.hintText}>Precisa de moedas? Compre baús na loja →</Text>
                    </TouchableOpacity>
                  ) : null}
                />
              )}
              {children.length > 0 && modules.length > 0 && (
                <TouchableOpacity style={styles.backRow} onPress={() => setStep('person')}>
                  <Text style={styles.backRowText}>← Voltar</Text>
                </TouchableOpacity>
              )}
            </>
          ) : null}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.sidebar,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { color: colors.text, fontSize: font.lg, fontWeight: '700', flex: 1 },
  subtitle: {
    color: colors.muted, fontSize: font.sm,
    paddingHorizontal: spacing.md, paddingTop: spacing.sm,
  },
  closeBtn: { padding: spacing.xs },
  closeText: { color: colors.muted, fontSize: font.lg },
  loader: { padding: spacing.xl },
  list: { padding: spacing.md, gap: spacing.sm },
  moduleCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  avatar: {
    width: 44, height: 44, borderRadius: radius.full,
    backgroundColor: colors.accent + '33',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.accent, fontSize: font.lg, fontWeight: '700' },
  cardBody: { flex: 1 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  cardName: { color: colors.text, fontSize: font.md, fontWeight: '600', flex: 1 },
  cardType: { color: colors.muted, fontSize: 11 },
  cardDesc: { color: colors.muted, fontSize: font.sm },
  personCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  personAvatar: { fontSize: 32 },
  personName: { color: colors.text, fontSize: font.base, fontWeight: '600' },
  personSub: { color: colors.muted, fontSize: font.sm },
  emptyContainer: {
    padding: spacing.lg, alignItems: 'center', gap: spacing.md,
  },
  emptyMsg: { color: colors.muted, fontSize: font.base, textAlign: 'center', lineHeight: 22 },
  storeBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2,
    borderRadius: radius.md, width: '100%', alignItems: 'center',
  },
  outlineBtn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  storeBtnText: { color: '#fff', fontSize: font.base, fontWeight: '600' },
  hintBtn: { padding: spacing.md, alignItems: 'center' },
  hintText: { color: colors.accent, fontSize: font.sm },
  backRow: {
    padding: spacing.md, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  backRowText: { color: colors.accent, fontSize: font.base },
});
