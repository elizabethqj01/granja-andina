import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useFarmStore } from '@/store/farmStore'
import { useUiStore, type FarmDialog } from '@/store/uiStore'
import { FARM_LEVEL1, FARM_LEVEL2, type FarmLevelConfig } from '@/constants/farmBalance'
import { useViewportSf } from '@/hooks/useViewportSf'
import hudPanelUrl from '@/assets/sprites/hud_panel..png'
import starUrl from '@/assets/sprites/start.png'

function StarRow({ stars, starSize }: { stars: number; starSize: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          style={{
            display: 'inline-block',
            width: starSize,
            height: starSize,
            backgroundImage: `url(${starUrl})`,
            backgroundSize: `${starSize * 2}px ${starSize}px`,
            backgroundPosition: n <= stars ? '0 0' : `-${starSize}px 0`,
            imageRendering: 'pixelated',
          }}
        />
      ))}
    </div>
  )
}

const REVIEW_ITEMS = [
  { key: 'scroll-mpd' as FarmDialog, emoji: '🌽', label: 'MPD', sub: 'Materias primas' },
  { key: 'scroll-wip' as FarmDialog, emoji: '⚙️', label: 'En proceso', sub: 'WIP' },
  { key: 'scroll-pt' as FarmDialog, emoji: '🥚', label: 'Productos', sub: 'Terminados' },
] as const

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

interface Props {
  onRetry: () => void
  onExit: () => void
}

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
  const sf = Math.min(useViewportSf(), 1)

  const cfg: FarmLevelConfig = activeLevelId === 2 ? FARM_LEVEL2 : FARM_LEVEL1
  const [reviewed, setReviewed] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (levelComplete) setReviewed(new Set())
  }, [levelComplete])

  useEffect(() => {
    if (!levelComplete || farmDialog === null) return
    setReviewed((prev) => new Set([...prev, farmDialog as string]))
  }, [farmDialog, levelComplete])

  if (!levelComplete) return null

  const p = (base: number, min = 0) => Math.max(min, Math.round(base * sf))

  return (
    <div className="fixed inset-0 z-[45] flex items-center justify-center bg-black/70 p-4">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        className="w-full max-w-md overflow-hidden rounded-2xl"
        style={{ ...WOOD, maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto' }}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div style={{ padding: `${p(28)}px ${p(32)}px ${p(16)}px`, textAlign: 'center' }}>
          <p
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: `${p(11, 12)}px`,
              letterSpacing: '0.18em',
              color: '#FFE066',
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
              marginBottom: `${p(4)}px`,
              textTransform: 'uppercase',
            }}
          >
            Nivel {activeLevelId} — Granja Andina
          </p>
          <h2
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: `${p(26, 19)}px`,
              color: '#FFF3D0',
              textShadow: '2px 2px 6px rgba(0,0,0,0.9)',
              marginBottom: `${p(12)}px`,
            }}
          >
            🎉 ¡Nivel completado!
          </h2>
          <StarRow stars={stars} starSize={p(36)} />
        </div>

        {/* Stats */}
        <div
          style={{
            margin: `0 ${p(24)}px ${p(16)}px`,
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '10px',
            padding: `${p(10)}px ${p(16)}px`,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: `${p(6)}px ${p(16)}px`,
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
              <p style={{ ...TEXT_LABEL, fontSize: `${p(10, 11)}px`, margin: 0 }}>
                {emoji} {label}
              </p>
              <p
                style={{
                  ...TEXT_MAIN,
                  fontFamily: "'Kalam', cursive",
                  fontSize: `${p(15, 14)}px`,
                  fontWeight: 700,
                  margin: 0,
                }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Review section */}
        <div style={{ padding: `0 ${p(24)}px ${p(16)}px` }}>
          <p
            style={{
              ...TEXT_LABEL,
              fontSize: `${p(12, 13)}px`,
              textAlign: 'center',
              marginBottom: `${p(10)}px`,
            }}
          >
            📖 Revisa lo que aprendiste en este nivel
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: `${p(8)}px` }}>
            {REVIEW_ITEMS.map(({ key, emoji, label, sub }) => {
              const done = reviewed.has(key as string)
              return (
                <button
                  key={key}
                  onClick={() => setFarmDialog(key)}
                  style={{
                    background: done ? 'rgba(80,160,60,0.35)' : 'rgba(0,0,0,0.35)',
                    border: `2px solid ${done ? '#6fcf5a' : 'rgba(255,224,102,0.35)'}`,
                    borderRadius: '10px',
                    padding: `${p(8)}px ${p(10)}px`,
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: `${p(8)}px`,
                  }}
                >
                  <span style={{ fontSize: `${p(22, 18)}px`, lineHeight: 1 }}>{emoji}</span>
                  <span>
                    <span
                      style={{
                        ...TEXT_MAIN,
                        fontFamily: "'Kalam', cursive",
                        fontSize: `${p(13, 13)}px`,
                        fontWeight: 700,
                        display: 'block',
                        lineHeight: 1.2,
                      }}
                    >
                      {label}
                    </span>
                    <span style={{ ...TEXT_LABEL, fontSize: `${p(10, 11)}px` }}>{sub}</span>
                  </span>
                  {done && (
                    <span
                      style={{ marginLeft: 'auto', color: '#6fcf5a', fontSize: `${p(16, 14)}px` }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <p
            style={{
              ...TEXT_LABEL,
              fontSize: `${p(10, 11)}px`,
              textAlign: 'center',
              marginTop: `${p(8)}px`,
              opacity: 0.7,
            }}
          >
            {reviewed.size} / {REVIEW_ITEMS.length} revisados
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ padding: `0 ${p(24)}px ${p(24)}px`, display: 'flex', gap: `${p(10)}px` }}>
          <button
            onClick={onRetry}
            style={{
              flex: 1,
              padding: `${p(10)}px`,
              borderRadius: '10px',
              background: 'rgba(0,0,0,0.4)',
              border: '2px solid rgba(255,224,102,0.5)',
              fontFamily: "'Fredoka One', cursive",
              fontSize: `${p(15, 14)}px`,
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
              padding: `${p(10)}px`,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #c47b2b, #e8a040)',
              border: '2px solid #f5c060',
              fontFamily: "'Fredoka One', cursive",
              fontSize: `${p(15, 14)}px`,
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
