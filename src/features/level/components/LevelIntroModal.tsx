import { motion } from 'framer-motion'
import { playSfx } from '@/services/sfx'
import { useUiStore } from '@/store/uiStore'
import { useFarmStore } from '@/store/farmStore'
import { FARM_LEVEL1, FARM_LEVEL2 } from '@/constants/farmBalance'
import { useViewportSf } from '@/hooks/useViewportSf'
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

const TEXT_LABEL: React.CSSProperties = {
  color: '#FFE066',
  fontFamily: "'Kalam', cursive",
  fontWeight: 700,
  textShadow: '1px 1px 3px rgba(0,0,0,0.9)',
}

const LEVEL_CONTENT = {
  1: {
    label: 'Nivel 1 — Granja Andina',
    objectives: [
      {
        icon: '🥚',
        text: `${FARM_LEVEL1.objectiveEggs} huevos`,
        sub: 'Recógelos y llévalos al almacén',
      },
    ],
    tips: [
      '🌽 Recarga maíz para que la gallina ponga huevos.',
      '🥚 Haz clic en cada huevo para que el granjero lo recoja.',
      '💰 Vende los huevos en el almacén de productos.',
    ],
    rules: [
      `🌽 Maíz: $${FARM_LEVEL1.cornUnitCost}/unidad (recarga de ${FARM_LEVEL1.cornPerRecharge})`,
      `🐔 Gallina: $${FARM_LEVEL1.chickenBuyPrice}/unidad`,
      `🥚 Venta de huevo: $${FARM_LEVEL1.eggSellPrice}/unidad`,
    ],
    starHint: `⭐⭐⭐ menos de 1 min · ⭐⭐ menos de 2 min`,
  },
  2: {
    label: 'Nivel 2 — Granja Andina',
    objectives: [
      {
        icon: '🥚',
        text: `${FARM_LEVEL2.objectiveEggs} huevos`,
        sub: 'Recógelos y llévalos al almacén',
      },
      {
        icon: '🐔',
        text: `${FARM_LEVEL2.objectiveChickens} gallinas`,
        sub: 'Cría 3 gallinas más para completar el corral',
      },
    ],
    tips: [
      '🌽 Ya tienes maíz — ¡colócalo de inmediato!',
      '🐔 Compra gallinas con el dinero de las ventas.',
      '💰 Los dos objetivos deben cumplirse al mismo tiempo.',
    ],
    rules: [
      `🌽 Maíz: $${FARM_LEVEL2.cornUnitCost}/unidad (recarga de ${FARM_LEVEL2.cornPerRecharge})`,
      `🐔 Gallina: $${FARM_LEVEL2.chickenBuyPrice}/unidad`,
      `🥚 Venta de huevo: $${FARM_LEVEL2.eggSellPrice}/unidad`,
    ],
    starHint: `⭐⭐⭐ menos de 3 min · ⭐⭐ menos de 4 min`,
  },
} as const

const SCORING_NOTE =
  'Tu puntaje final combina qué tanto cumples las metas, la exactitud de tus cálculos contables, tu tiempo y tu costo unitario por huevo.'

interface LevelIntroModalProps {
  /** EV-01: hides gameplay tips (the "how to play" hints), keeps rules/objectives visible. */
  evalMode?: boolean
}

export function LevelIntroModal({ evalMode = false }: LevelIntroModalProps) {
  const farmDialog = useUiStore((s) => s.farmDialog)
  const setFarmDialog = useUiStore((s) => s.setFarmDialog)
  const activeLevelId = useFarmStore((s) => s.activeLevelId)
  const sf = Math.min(useViewportSf(), 1)

  if (farmDialog !== 'objectives') return null

  const content = LEVEL_CONTENT[activeLevelId]
  const p = (base: number, min = 0) => Math.max(min, Math.round(base * sf))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        className="w-full max-w-sm overflow-hidden rounded-2xl"
        style={{ ...WOOD, maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto' }}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div style={{ padding: `${p(28)}px ${p(24)}px 0`, textAlign: 'center' }}>
          <p
            style={{
              ...TEXT_LABEL,
              fontSize: `${p(11, 12)}px`,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              marginBottom: `${p(4)}px`,
            }}
          >
            {content.label}
          </p>
          <h2
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: `${p(26, 19)}px`,
              ...TEXT_MAIN,
              marginBottom: 0,
            }}
          >
            🎯 Objetivos del nivel
          </h2>
        </div>

        {/* Objective cards */}
        <div
          style={{
            margin: `${p(16)}px ${p(24)}px 0`,
            display: 'flex',
            flexDirection: 'column',
            gap: `${p(8)}px`,
          }}
        >
          {content.objectives.map((obj) => (
            <div
              key={obj.icon}
              style={{
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '12px',
                padding: `${p(12)}px ${p(18)}px`,
                display: 'flex',
                alignItems: 'center',
                gap: `${p(14)}px`,
                border: '1px solid rgba(255,224,102,0.2)',
              }}
            >
              <span style={{ fontSize: `${p(32, 24)}px`, lineHeight: 1 }}>{obj.icon}</span>
              <div>
                <p
                  style={{
                    fontFamily: "'Fredoka One', cursive",
                    fontSize: `${p(22, 17)}px`,
                    ...TEXT_MAIN,
                    margin: 0,
                  }}
                >
                  {obj.text}
                </p>
                <p style={{ ...TEXT_LABEL, fontSize: `${p(11, 12)}px`, margin: 0 }}>{obj.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tips — hidden in evaluation mode (EV-01: "sin ayudas") */}
        {!evalMode && (
          <div
            style={{
              margin: `${p(12)}px ${p(24)}px ${p(8)}px`,
              display: 'flex',
              flexDirection: 'column',
              gap: `${p(6)}px`,
            }}
          >
            {content.tips.map((tip) => (
              <p
                key={tip}
                style={{ ...TEXT_MAIN, fontSize: `${p(12, 13)}px`, margin: 0, opacity: 0.85 }}
              >
                {tip}
              </p>
            ))}
          </div>
        )}

        {/* Rules — prices and scoring, always visible (P-04) */}
        <div
          style={{
            margin: `${p(evalMode ? 16 : 4)}px ${p(24)}px ${p(8)}px`,
            padding: `${p(10)}px ${p(14)}px`,
            background: 'rgba(0,0,0,0.25)',
            borderRadius: '10px',
            border: '1px solid rgba(255,224,102,0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: `${p(4)}px`,
          }}
        >
          {content.rules.map((rule) => (
            <p key={rule} style={{ ...TEXT_MAIN, fontSize: `${p(11, 12)}px`, margin: 0 }}>
              {rule}
            </p>
          ))}
          <p
            style={{
              ...TEXT_LABEL,
              fontSize: `${p(10, 11)}px`,
              margin: `${p(4)}px 0 0`,
              opacity: 0.8,
            }}
          >
            {SCORING_NOTE}
          </p>
          <p
            style={{
              ...TEXT_LABEL,
              fontSize: `${p(11, 12)}px`,
              margin: `${p(4)}px 0 0`,
              opacity: 0.7,
            }}
          >
            {content.starHint}
          </p>
        </div>

        {/* Action */}
        <div style={{ padding: `${p(8)}px ${p(24)}px ${p(24)}px` }}>
          <button
            onClick={() => {
              playSfx('btn_click')
              setFarmDialog(null)
            }}
            style={{
              width: '100%',
              padding: `${p(12)}px`,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #c47b2b, #e8a040)',
              border: '2px solid #f5c060',
              fontFamily: "'Fredoka One', cursive",
              fontSize: `${p(17, 15)}px`,
              cursor: 'pointer',
              ...TEXT_MAIN,
              boxShadow: '0 4px 12px rgba(180,100,20,0.5)',
            }}
          >
            ¡Comenzar!
          </button>
        </div>
      </motion.div>
    </div>
  )
}
