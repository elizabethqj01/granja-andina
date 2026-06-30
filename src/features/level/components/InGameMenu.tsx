import { motion } from 'framer-motion'
import { useUiStore } from '@/store/uiStore'
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
        <div style={{ padding: '28px 24px 24px', textAlign: 'center' }}>
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
              fontSize: '24px',
              ...TEXT_MAIN,
              marginBottom: '20px',
            }}
          >
            ⏸ Pausa
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={onResume}
              style={{
                padding: '11px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #c47b2b, #e8a040)',
                border: '2px solid #f5c060',
                fontFamily: "'Fredoka One', cursive",
                fontSize: '15px',
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
              🔄 Reiniciar nivel
            </button>
            <button
              onClick={onExit}
              style={{
                padding: '11px',
                borderRadius: '10px',
                background: 'rgba(0,0,0,0.4)',
                border: '2px solid rgba(255,224,102,0.25)',
                fontFamily: "'Fredoka One', cursive",
                fontSize: '15px',
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
