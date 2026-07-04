import { motion } from 'framer-motion'
import { useFarmStore } from '@/store/farmStore'
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

interface Props {
  onRetry: () => void
  onExit: () => void
}

export function GameOverModal({ onRetry, onExit }: Props) {
  const levelFailed = useFarmStore((s) => s.levelFailed)
  const sf = Math.min(useViewportSf(), 1)

  if (!levelFailed) return null

  const p = (base: number, min = 0) => Math.max(min, Math.round(base * sf))

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
        <div style={{ padding: `${p(32)}px ${p(24)}px ${p(24)}px`, textAlign: 'center' }}>
          <p style={{ fontSize: `${p(52, 40)}px`, lineHeight: 1, marginBottom: `${p(12)}px` }}>
            💀
          </p>
          <h2
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: `${p(24, 18)}px`,
              ...TEXT_MAIN,
              marginBottom: `${p(8)}px`,
            }}
          >
            ¡Sin gallinas!
          </h2>
          <p
            style={{
              ...TEXT_LABEL,
              fontSize: `${p(13, 13)}px`,
              marginBottom: `${p(20)}px`,
              opacity: 0.9,
            }}
          >
            Todas las gallinas murieron de hambre y no hay fondos suficientes para continuar.
          </p>

          <div
            style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '10px',
              padding: `${p(12)}px ${p(16)}px`,
              marginBottom: `${p(24)}px`,
              border: '1px solid rgba(255,224,102,0.15)',
            }}
          >
            <p style={{ ...TEXT_MAIN, fontSize: `${p(12, 13)}px`, margin: 0, opacity: 0.85 }}>
              💡 Recarga maíz antes de que la gallina tenga hambre (⚠️ señal de alerta).
            </p>
          </div>

          <div style={{ display: 'flex', gap: `${p(10)}px` }}>
            <button
              onClick={onExit}
              style={{
                flex: 1,
                padding: `${p(11)}px`,
                borderRadius: '10px',
                background: 'rgba(0,0,0,0.4)',
                border: '2px solid rgba(255,224,102,0.5)',
                fontFamily: "'Fredoka One', cursive",
                fontSize: `${p(15, 14)}px`,
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
                padding: `${p(11)}px`,
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
              🔄 Reintentar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
