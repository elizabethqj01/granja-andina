import { motion } from 'framer-motion'
import { useUiStore } from '@/store/uiStore'
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

interface InGameMenuProps {
  onResume: () => void
  onRestart: () => void
  onExit: () => void
}

export function InGameMenu({ onResume, onRestart, onExit }: InGameMenuProps) {
  const farmDialog = useUiStore((s) => s.farmDialog)
  const sf = Math.min(useViewportSf(), 1)
  const p = (base: number, min = 0) => Math.max(min, Math.round(base * sf))

  if (farmDialog !== 'menu') return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        className="w-full max-w-xs overflow-hidden rounded-2xl"
        style={WOOD}
        role="dialog"
        aria-modal="true"
        aria-label="Menú"
      >
        <div
          style={{
            padding: `${p(28)}px ${p(24)}px ${p(24)}px`,
            textAlign: 'center',
          }}
        >
          <p
            style={{
              ...TEXT_LABEL,
              fontSize: `${p(11, 12)}px`,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              marginBottom: `${p(4)}px`,
            }}
          >
            Nivel 1 — Granja Andina
          </p>
          <h2
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: `${p(24, 18)}px`,
              ...TEXT_MAIN,
              marginBottom: `${p(20)}px`,
            }}
          >
            ⏸ Pausa
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: `${p(10)}px` }}>
            <button
              onClick={onResume}
              style={{
                padding: `${p(11)}px`,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #c47b2b, #e8a040)',
                border: '2px solid #f5c060',
                fontFamily: "'Fredoka One', cursive",
                fontSize: `${p(15, 14)}px`,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(180,100,20,0.4)',
                ...TEXT_MAIN,
              }}
            >
              ▶ Continuar
            </button>
            <button
              onClick={onRestart}
              style={{
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
              🔄 Reiniciar nivel
            </button>
            <button
              onClick={onExit}
              style={{
                padding: `${p(11)}px`,
                borderRadius: '10px',
                background: 'rgba(0,0,0,0.4)',
                border: '2px solid rgba(255,224,102,0.25)',
                fontFamily: "'Fredoka One', cursive",
                fontSize: `${p(15, 14)}px`,
                cursor: 'pointer',
                ...TEXT_MAIN,
                opacity: 0.75,
              }}
            >
              🗺 Salir al mapa
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
