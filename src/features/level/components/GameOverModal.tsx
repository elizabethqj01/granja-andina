import { motion } from 'framer-motion'
import { useFarmStore } from '@/store/farmStore'
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

interface Props {
  onRetry: () => void
  onExit: () => void
}

export function GameOverModal({ onRetry, onExit }: Props) {
  const levelFailed = useFarmStore((s) => s.levelFailed)
  if (!levelFailed) return null

  return (
    <div className="fixed inset-0 z-[45] flex items-center justify-center bg-black/80 p-4">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        className="w-full max-w-sm overflow-hidden rounded-2xl"
        style={WOOD}
        role="dialog"
        aria-modal="true"
      >
        <div style={{ padding: '32px 24px 24px', textAlign: 'center' }}>
          {/* Icon + title */}
          <p style={{ fontSize: '52px', lineHeight: 1, marginBottom: '12px' }}>💀</p>
          <h2
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: '24px',
              ...TEXT_MAIN,
              marginBottom: '8px',
            }}
          >
            ¡Sin gallinas!
          </h2>
          <p style={{ ...TEXT_LABEL, fontSize: '13px', marginBottom: '20px', opacity: 0.9 }}>
            Todas las gallinas murieron de hambre.
          </p>

          {/* Hint */}
          <div
            style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '24px',
              border: '1px solid rgba(255,224,102,0.15)',
            }}
          >
            <p style={{ ...TEXT_MAIN, fontSize: '12px', margin: 0, opacity: 0.85 }}>
              💡 Recarga maíz antes de que la gallina tenga hambre (⚠️ señal de alerta).
            </p>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onExit}
              style={{
                flex: 1,
                padding: '11px',
                borderRadius: '10px',
                background: 'rgba(0,0,0,0.4)',
                border: '2px solid rgba(255,224,102,0.5)',
                fontFamily: "'Fredoka One', cursive",
                fontSize: '15px',
                cursor: 'pointer',
                ...TEXT_MAIN,
              }}
            >
              🗺 Salir al mapa
            </button>
            <button
              onClick={onRetry}
              style={{
                flex: 1,
                padding: '11px',
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
              🔄 Reintentar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
