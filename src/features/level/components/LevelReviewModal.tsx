import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import type { LevelSnapshot } from '@/types'
import type { LevelId } from '@/constants/farmBalance'
import { computeFarmCostStatement } from '@/features/level/farmCostStatement'
import {
  buildClassifiableActions,
  type ClassificationCategory,
} from '@/features/level/classifiableActions'
import { ActionsTabContent } from '@/features/level/components/ActionsTabContent'
import hudPanelUrl from '@/assets/sprites/hud_panel..png'

const WOOD: React.CSSProperties = {
  backgroundImage: `url(${hudPanelUrl})`,
  backgroundSize: '100% 100%',
  boxShadow: '0 8px 40px rgba(0,0,0,0.75)',
}

const TEXT_MAIN: React.CSSProperties = {
  color: '#FFF3D0',
  textShadow: '1px 1px 3px rgba(0,0,0,0.85)',
}

type TabKey = 'acciones' | 'diagrama' | 'desgloses' | 'simulador' | 'asientos' | 'informe'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'acciones', label: '🟢 Acciones' },
  { key: 'diagrama', label: '🟡 Diagrama' },
  { key: 'desgloses', label: '🟪 Desgloses' },
  { key: 'simulador', label: '🟧 Simulador' },
  { key: 'asientos', label: '📄 Asientos' },
  { key: 'informe', label: '📝 Informe' },
]

interface LevelReviewModalProps {
  snapshot: LevelSnapshot
  levelId: LevelId
  onClose: () => void
}

/**
 * FC-01..FC-06 review window — reads a saved LevelSnapshot (not live
 * farmStore), so it works the same right after a level or days later from
 * the level map. Only "Acciones" (FC-01) is real in this sub-phase; the rest
 * are locked placeholders until classification is 100% correct, matching
 * the mockup's own gating ("DESBLOQUEASTE LA SIGUIENTE PESTAÑA").
 */
export function LevelReviewModal({ snapshot, levelId, onClose }: LevelReviewModalProps) {
  const [tab, setTab] = useState<TabKey>('acciones')
  const [classifiedIds, setClassifiedIds] = useState<Set<string>>(new Set())

  const statement = useMemo(
    () =>
      computeFarmCostStatement({
        cornPurchasedValue: snapshot.cornPurchasedValue,
        cornStock: snapshot.cornStock,
        modAccrued: snapshot.modAccrued,
        cifAccrued: snapshot.cifAccrued,
        chickenCostAccrued: snapshot.chickenCostAccrued,
        warehouseEggs: snapshot.warehouseEggs,
        groundEggsCount: snapshot.groundEggsCount,
        eggsCollectedTotal: snapshot.eggsCollectedTotal,
        revenue: snapshot.revenue,
      }),
    [snapshot]
  )

  const actions = useMemo(
    () => buildClassifiableActions(snapshot, statement.costPerEgg),
    [snapshot, statement.costPerEgg]
  )

  const actionsDone = actions.length > 0 && actions.every((a) => classifiedIds.has(a.id))

  function handleClassifyCorrect(actionId: string, _category: ClassificationCategory) {
    setClassifiedIds((prev) => new Set(prev).add(actionId))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl"
        style={{ ...WOOD, maxHeight: 'calc(100dvh - 2rem)' }}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 20px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            onClick={onClose}
            style={{
              ...TEXT_MAIN,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            ⬅️
          </button>
          <h2
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: '15px',
              ...TEXT_MAIN,
              margin: 0,
              textAlign: 'center',
              flex: 1,
            }}
          >
            FLUJO DE COSTOS · NIVEL {levelId}
          </h2>
          <span style={{ fontSize: '13px' }}>{'⭐'.repeat(snapshot.stars)}</span>
        </div>

        {/* Tab bar */}
        <div
          className="flex gap-1 overflow-x-auto"
          style={{ padding: '0 16px 12px', flexShrink: 0 }}
        >
          {TABS.map((t, i) => {
            const locked = i > 0 && !actionsDone
            return (
              <button
                key={t.key}
                onClick={() => !locked && setTab(t.key)}
                disabled={locked}
                style={{
                  fontFamily: "'Kalam', cursive",
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '6px 10px',
                  borderRadius: '8px',
                  whiteSpace: 'nowrap',
                  background: tab === t.key ? 'rgba(255,224,102,0.25)' : 'rgba(0,0,0,0.25)',
                  border: `1px solid ${tab === t.key ? '#f5c060' : 'rgba(255,224,102,0.2)'}`,
                  color: locked ? 'rgba(255,243,208,0.35)' : '#FFF3D0',
                  cursor: locked ? 'not-allowed' : 'pointer',
                }}
              >
                {locked ? '🔒' : t.label}
              </button>
            )
          })}
        </div>

        {/* Content — wrapped in a light "paper" panel so text stays readable */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            margin: '0 16px 16px',
            padding: '14px',
            background: '#faf6e4',
            borderRadius: '10px',
          }}
        >
          {tab === 'acciones' && (
            <ActionsTabContent
              actions={actions}
              classifiedIds={classifiedIds}
              onClassifyCorrect={handleClassifyCorrect}
            />
          )}
          {tab !== 'acciones' && (
            <p style={{ fontFamily: "'Kalam', cursive", fontSize: '13px', color: '#5a3a20' }}>
              Próximamente en una siguiente entrega.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  )
}
