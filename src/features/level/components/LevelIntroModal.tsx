import { motion } from 'framer-motion'
import { useUiStore } from '@/store/uiStore'
import { FARM_LEVEL1 } from '@/constants/farmBalance'
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

export function LevelIntroModal() {
  const farmDialog = useUiStore((s) => s.farmDialog)
  const setFarmDialog = useUiStore((s) => s.setFarmDialog)
  if (farmDialog !== 'objectives') return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        className="w-full max-w-sm overflow-hidden rounded-2xl"
        style={WOOD}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div style={{ padding: '28px 24px 0', textAlign: 'center' }}>
          <p
            style={{
              ...TEXT_LABEL,
              fontSize: '11px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}
          >
            Nivel 1 — Granja Andina
          </p>
          <h2
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: '26px',
              ...TEXT_MAIN,
              marginBottom: '0',
            }}
          >
            🎯 Objetivo del nivel
          </h2>
        </div>

        {/* Objective card */}
        <div
          style={{
            margin: '16px 24px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '12px',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            border: '1px solid rgba(255,224,102,0.2)',
          }}
        >
          <span style={{ fontSize: '36px', lineHeight: 1 }}>🥚</span>
          <div>
            <p
              style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: '26px',
                ...TEXT_MAIN,
                margin: 0,
              }}
            >
              {FARM_LEVEL1.objectiveEggs} huevos
            </p>
            <p style={{ ...TEXT_LABEL, fontSize: '11px', margin: 0 }}>
              Recógelos y llévalos al almacén
            </p>
          </div>
        </div>

        {/* Tips */}
        <div
          style={{ margin: '0 24px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}
        >
          {[
            '🌽 Recarga maíz para que la gallina ponga huevos.',
            '🥚 Haz clic en cada huevo para que el granjero lo recoja.',
            '💰 Vende los huevos en el almacén de productos.',
          ].map((tip) => (
            <p key={tip} style={{ ...TEXT_MAIN, fontSize: '12px', margin: 0, opacity: 0.85 }}>
              {tip}
            </p>
          ))}
          <p style={{ ...TEXT_LABEL, fontSize: '11px', margin: '4px 0 0', opacity: 0.7 }}>
            ⭐ Termina rápido para ganar más estrellas.
          </p>
        </div>

        {/* Action */}
        <div style={{ padding: '0 24px 24px' }}>
          <button
            onClick={() => setFarmDialog(null)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #c47b2b, #e8a040)',
              border: '2px solid #f5c060',
              fontFamily: "'Fredoka One', cursive",
              fontSize: '17px',
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
