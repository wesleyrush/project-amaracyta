// src/components/ModulePicker.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { listModules, listUserModules } from '../api/modules';
import { listChildren } from '../api/children';
import { listSessions } from '../api/sessions';
import { swal } from '../utils/swal';
import type { Module, User, Child } from '../types';

function isProfileComplete(u: User | null): boolean {
  if (!u) return false;
  return !!(u.full_name && u.birth_date && u.birth_time && u.birth_country && u.birth_state && u.birth_city);
}

type PersonChoice = { type: 'user' } | { type: 'child'; child: Child };

interface Props {
  onSelect: (module: Module, childId: number | null) => void;
  onCancel?: () => void;
  showCancel?: boolean;
}

export default function ModulePicker({ onSelect, onCancel, showCancel = false }: Props) {
  const navigate = useNavigate();
  const { user, refreshUserModules } = useApp();

  const [step,           setStep]           = useState<'person' | 'module'>('person');
  const [children,       setChildren]       = useState<Child[]>([]);
  const [childrenLoaded, setChildrenLoaded] = useState(false);
  const [person,         setPerson]         = useState<PersonChoice | null>(null);
  const [modules,        setModules]        = useState<Module[]>([]);
  const [hasFree,        setHasFree]        = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [allUsed,        setAllUsed]        = useState(false);

  // Load children on mount
  useEffect(() => {
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
  }, []);

  // Load modules when person is selected
  useEffect(() => {
    if (!person) return;
    setLoading(true);
    setAllUsed(false);

    Promise.all([listModules(), listUserModules(), listSessions()])
      .then(([modsRes, userModsRes, sessionsRes]) => {
        const allModules    = modsRes.items.filter(m => m.is_active !== false);
        const totalQuantity = userModsRes.total_quantity ?? 0;

        // Módulos com saldo disponível (vinculado ao módulo adquirido)
        const availableByModule = new Map<number, number>(
          userModsRes.items.map(um => [um.module_id, um.available_qty])
        );

        // Collect all module IDs already started by this person
        const personSessions = sessionsRes.items.filter(s =>
          person.type === 'user' ? !s.child_id : s.child_id === person.child.id
        );
        const usedByPerson = new Set<number>(
          personSessions.filter(s => s.module_id != null && (s.flow_step ?? 0) > 0).map(s => s.module_id!)
        );

        // Free modules: always available
        const freeModules = allModules.filter(
          m => m.module_type === 'free' || !m.module_type
        );
        // Fixed modules: apenas os que o usuário adquiriu E ainda tem saldo E não foi usado por esta pessoa
        const fixedModules = allModules.filter(
          m => m.module_type === 'fixed'
            && (availableByModule.get(m.id) ?? 0) > 0
            && !usedByPerson.has(m.id)
        );

        setAllUsed(totalQuantity > 0 && fixedModules.length === 0 && freeModules.length === 0);
        setHasFree(freeModules.length > 0);
        setModules([...freeModules, ...fixedModules]);
        // Also refresh context so topbar stays in sync
        refreshUserModules().catch(() => {});
      })
      .catch(() => setModules([]))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person]);

  function handleSelectPerson(p: PersonChoice) {
    setPerson(p);
    setStep('module');
  }

  async function handleSelectModule(m: Module) {
    const childId = person?.type === 'child' ? person.child.id : null;
    // Fixed modules require confirmation — each activation is unique per person
    if (m.module_type === 'fixed') {
      const confirmed = await swal.ask(
        `Confirmar módulo: ${m.name}`,
        `Esta escolha não poderá ser alterada para ${personLabel}. Deseja continuar?`,
        'Sim, confirmar'
      );
      if (!confirmed) return;
    }
    onSelect(m, childId);
  }

  const personLabel = person?.type === 'child' ? person.child.full_name : (user?.full_name || 'Eu');

  return (
    <div className="module-picker-overlay">
      <div className="module-picker">

        {!isProfileComplete(user) ? (
          <>
            <h2 className="module-picker-title">Cadastro incompleto</h2>
            <div className="module-picker-empty">
              <p className="module-picker-empty-msg">
                Para iniciar uma conexão, você precisa completar seu cadastro.<br />
                Preencha todos os campos obrigatórios no seu perfil.
              </p>
              <button className="module-picker-store-btn"
                onClick={() => { onCancel?.(); navigate('/profile'); }}>
                ✏️ Completar meu perfil
              </button>
              {showCancel && onCancel && (
                <button className="module-picker-cancel" onClick={onCancel}>Cancelar</button>
              )}
            </div>
          </>

        ) : step === 'person' && children.length > 0 ? (
          <>
            <h2 className="module-picker-title">Para quem é esta conexão?</h2>
            <p className="module-picker-subtitle">Selecione a pessoa que será consultada nesta sessão</p>
            <div className="person-picker-grid">
              <button className="person-card" onClick={() => handleSelectPerson({ type: 'user' })}>
                <span className="person-card-avatar">👤</span>
                <span className="person-card-name">{user?.full_name || 'Eu'}</span>
                <span className="person-card-label">Eu</span>
              </button>
              {children.map(child => (
                <button key={child.id} className="person-card"
                  onClick={() => handleSelectPerson({ type: 'child', child })}>
                  <span className="person-card-avatar">👤</span>
                  <span className="person-card-name">{child.full_name}</span>
                  {child.initiatic_name && (
                    <span className="person-card-label">{child.initiatic_name}</span>
                  )}
                </button>
              ))}
            </div>
            {showCancel && onCancel && (
              <button className="module-picker-cancel" onClick={onCancel}>Cancelar</button>
            )}
          </>

        ) : step === 'module' ? (
          <>
            <h2 className="module-picker-title">Escolha seu portal</h2>
            <p className="module-picker-subtitle">
              {children.length > 0 && <><strong>Para: {personLabel}</strong> · </>}
              Selecione o módulo desta jornada
            </p>

            {loading || !childrenLoaded ? (
              <p className="module-picker-loading">Carregando módulos...</p>
            ) : modules.length === 0 ? (
              <div className="module-picker-empty">
                {allUsed ? (
                  <>
                    <p className="module-picker-empty-msg">
                      Você não possui mais unidades disponíveis dos módulos adquiridos.<br />
                      Adquira mais unidades na loja para iniciar novas conexões.
                    </p>
                    <button className="module-picker-store-btn"
                      onClick={() => { onCancel?.(); navigate('/store'); }}>
                      🛒 Comprar mais unidades
                    </button>
                    {children.length > 0 && (
                      <button className="module-picker-store-btn" onClick={() => setStep('person')}>
                        ← Escolher outra pessoa
                      </button>
                    )}
                    {showCancel && onCancel && (
                      <button className="module-picker-store-btn" onClick={onCancel}>
                        Ver minhas conexões
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <p className="module-picker-empty-msg">
                      Você ainda não possui módulos disponíveis.<br />
                      Ative módulos para iniciar uma conexão.
                    </p>
                    <button className="module-picker-store-btn"
                      onClick={() => { onCancel?.(); navigate('/store'); }}>
                      📦 Ativar Módulos
                    </button>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="module-picker-grid">
                  {modules.map(m => (
                    <button key={m.id} className="module-card" onClick={() => handleSelectModule(m)}>
                      {m.image_svg && (
                        (m.image_svg.startsWith('http') || m.image_svg.startsWith('/'))
                          ? <img className="module-card-img" src={m.image_svg} alt={m.name} />
                          : <span className="module-card-img" dangerouslySetInnerHTML={{ __html: m.image_svg }} />
                      )}
                      <strong className="module-card-name">{m.name}</strong>
                      {m.description && (
                        <span className="module-card-desc">{m.description}</span>
                      )}
                    </button>
                  ))}
                </div>
                {hasFree && (
                  <p className="module-picker-chest-hint">
                    Precisa de moedas?{' '}
                    <button className="module-picker-chest-link"
                      onClick={() => { onCancel?.(); navigate('/store'); }}>
                      Compre baús na loja →
                    </button>
                  </p>
                )}
              </>
            )}

            {children.length > 0 && (
              <button className="module-picker-back" onClick={() => setStep('person')}>
                ← Voltar
              </button>
            )}
            {isProfileComplete(user) && showCancel && onCancel && (
              <button className="module-picker-cancel" onClick={onCancel}>Cancelar</button>
            )}
          </>
        ) : null}

      </div>
    </div>
  );
}
