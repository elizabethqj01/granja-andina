import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useFarmStore } from '@/store/farmStore'
import { useUiStore, type FarmDialog } from '@/store/uiStore'
import { FARM_LEVEL1, FARM_LEVEL2, type FarmLevelConfig } from '@/constants/farmBalance'
import hudPanelUrl from '@/assets/sprites/hud_panel..png'
import starUrl from '@/assets/sprites/start.png'

// ── Sprite helpers (self-contained to avoid cross-component imports) ──────────

function StarRow({ stars }: { stars: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          style={{
            display: 'inline-block',
            width: 36,
            height: 36,
            backgroundImage: `url(${starUrl})`,
            backgroundSize: '72px 36px',
            backgroundPosition: n <= stars ? '0 0' : '-36px 0',
            imageRendering: 'pixelated',
          }}
        />
      ))}
    </div>
  )
}

// ── Review items ──────────────────────────────────────────────────────────────

const REVIEW_ITEMS = [
  { key: 'scroll-mpd' as FarmDialog, emoji: '🌽', label: 'MPD', sub: 'Materias primas' },
  { key: 'scroll-wip' as FarmDialog, emoji: '⚙️', label: 'En proceso', sub: 'WIP' },
  { key: 'scroll-pt' as FarmDialog, emoji: '🥚', label: 'Productos', sub: 'Terminados' },
] as const

// ── Styles ────────────────────────────────────────────────────────────────────

const WOOD: React.CSSProperties = {
  backgroundImage: `url(${hudPanelUrl})`,
  backgroundSize: '100% 100%',
  boxShadow: '0 8px 40px rgba(0,0,0,0.75)',
}

const TEXT_MAIN: React.CSSProperties = {
  color: '#FFF3D0',
  textShadow: '1px 1px 3px rgba(0,0,0,0.85)',
}

const TEXT_LABEL: React.CSSProperties = {
  color: '#FFE066',
  fontFamily: "'Kalam', cursive",
  fontWeight: 700,
  textShadow: '1px 1px 3px rgba(0,0,0,0.9)',
}

function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  onRetry: () => void
  onExit: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LevelCompleteModal({ onRetry, onExit }: Props) {
  const levelComplete = useFarmStore((s) => s.levelComplete)
  const stars = useFarmStore((s) => s.stars)
  const elapsedSec = useFarmStore((s) => s.elapsedSec)
  const cash = useFarmStore((s) => s.cash)
  const eggsSold = useFarmStore((s) => s.eggsSold)
  const eggsCollectedTotal = useFarmStore((s) => s.eggsCollectedTotal)
  const activeLevelId = useFarmStore((s) => s.activeLevelId)
  const setFarmDialog = useUiStore((s) => s.setFarmDialog)
  const farmDialog = useUiStore((s) => s.farmDialog)

  const cfg: FarmLevelConfig = activeLevelId === 2 ? FARM_LEVEL2 : FARM_LEVEL1

  const [reviewed, setReviewed] = useState<Set<string>>(new Set())

  // Reset reviewed state each time the modal opens (after a retry)
  useEffect(() => {
    if (levelComplete) setReviewed(new Set())
  }, [levelComplete])

  // Mark a dialog as reviewed when it is opened
  useEffect(() => {
    if (!levelComplete || farmDialog === null) return
    setReviewed((prev) => new Set([...prev, farmDialog as string]))
  }, [farmDialog, levelComplete])

  if (!levelComplete) return null

  function openReview(key: FarmDialog) {
    setFarmDialog(key)
  }

  return (
    <div className="fixed inset-0 z-[45] flex items-center justify-center bg-black/70 p-4">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        className="w-full max-w-md overflow-hidden rounded-2xl"
        style={WOOD}
        role="dialog"
        aria-modal="true"
      >
        {/* ── Header ── */}
        <div className="px-8 pt-7 pb-4 text-center">
          <p
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: '11px',
              letterSpacing: '0.18em',
              color: '#FFE066',
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
              marginBottom: '4px',
              textTransform: 'uppercase',
            }}
          >
            Nivel {activeLevelId} — Granja Andina
          </p>
          <h2
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: '26px',
              color: '#FFF3D0',
              textShadow: '2px 2px 6px rgba(0,0,0,0.9)',
              marginBottom: '12px',
            }}
          >
            🎉 ¡Nivel completado!
          </h2>
          <StarRow stars={stars} />
        </div>

        {/* ── Stats ── */}
        <div
          style={{
            margin: '0 24px 16px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '10px',
            padding: '10px 16px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px 16px',
          }}
        >
          {[
            {
              label: 'Huevos recolectados',
              value: `${eggsCollectedTotal} / ${cfg.objectiveEggs}`,
              emoji: '🥚',
            },
            { label: 'Tiempo', value: formatTime(elapsedSec), emoji: '⏱' },
            { label: 'Huevos vendidos', value: `${eggsSold}`, emoji: '🚚' },
            { label: 'Caja final', value: `$${cash.toLocaleString('es-CO')}`, emoji: '💰' },
          ].map(({ label, value, emoji }) => (
            <div key={label}>
              <p style={{ ...TEXT_LABEL, fontSize: '10px', margin: 0 }}>
                {emoji} {label}
              </p>
              <p
                style={{
                  ...TEXT_MAIN,
                  fontFamily: "'Kalam', cursive",
                  fontSize: '15px',
                  fontWeight: 700,
                  margin: 0,
                }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Review section ── */}
        <div style={{ padding: '0 24px 16px' }}>
          <p
            style={{
              ...TEXT_LABEL,
              fontSize: '12px',
              textAlign: 'center',
              marginBottom: '10px',
            }}
          >
            📖 Revisa lo que aprendiste en este nivel
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {REVIEW_ITEMS.map(({ key, emoji, label, sub }) => {
              const done = reviewed.has(key as string)
              return (
                <button
                  key={key}
                  onClick={() => openReview(key)}
                  style={{
                    background: done ? 'rgba(80,160,60,0.35)' : 'rgba(0,0,0,0.35)',
                    border: `2px solid ${done ? '#6fcf5a' : 'rgba(255,224,102,0.35)'}`,
                    borderRadius: '10px',
                    padding: '8px 10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '22px', lineHeight: 1 }}>{emoji}</span>
                  <span>
                    <span
                      style={{
                        ...TEXT_MAIN,
                        fontFamily: "'Kalam', cursive",
                        fontSize: '13px',
                        fontWeight: 700,
                        display: 'block',
                        lineHeight: 1.2,
                      }}
                    >
                      {label}
                    </span>
                    <span style={{ ...TEXT_LABEL, fontSize: '10px' }}>{sub}</span>
                  </span>
                  {done && (
                    <span style={{ marginLeft: 'auto', color: '#6fcf5a', fontSize: '16px' }}>
                      ✓
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Progress hint */}
          <p
            style={{
              ...TEXT_LABEL,
              fontSize: '10px',
              textAlign: 'center',
              marginTop: '8px',
              opacity: 0.7,
            }}
          >
            {reviewed.size} / {REVIEW_ITEMS.length} revisados
          </p>
        </div>

        {/* ── Action buttons ── */}
        <div style={{ padding: '0 24px 24px', display: 'flex', gap: '10px' }}>
          <button
            onClick={onRetry}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '10px',
              background: 'rgba(0,0,0,0.4)',
              border: '2px solid rgba(255,224,102,0.5)',
              fontFamily: "'Fredoka One', cursive",
              fontSize: '15px',
              cursor: 'pointer',
              ...TEXT_MAIN,
            }}
          >
            🔄 Reintentar
          </button>
          <button
            onClick={onExit}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #c47b2b, #e8a040)',
              border: '2px solid #f5c060',
              fontFamily: "'Fredoka One', cursive",
              fontSize: '15px',
              cursor: 'pointer',
              color: '#FFF3D0',
              textShadow: '1px 1px 3px rgba(0,0,0,0.7)',
              boxShadow: '0 4px 12px rgba(180,100,20,0.5)',
            }}
          >
            ➡ Siguiente nivel
          </button>
        </div>
      </motion.div>
    </div>
  )
}
