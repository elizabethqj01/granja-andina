import { motion } from 'framer-motion'
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

interface CreditsModalProps {
  onClose: () => void
}

export function CreditsModal({ onClose }: CreditsModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        className="w-full max-w-sm overflow-hidden rounded-2xl"
        style={WOOD}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Créditos"
      >
        <div style={{ padding: '28px 24px 24px' }}>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
            }}
          >
            <h2
              style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: '22px',
                ...TEXT_MAIN,
                margin: 0,
              }}
            >
              📜 Créditos
            </h2>
            <button
              onClick={onClose}
              style={{
                ...TEXT_LABEL,
                fontSize: '18px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                lineHeight: 1,
              }}
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}
          >
            <p style={{ ...TEXT_MAIN, fontSize: '13px', margin: 0 }}>
              <span style={TEXT_LABEL}>COSTFLOW</span> — juego serio para el aprendizaje de
              contabilidad de costos.
            </p>
            <div>
              <p
                style={{
                  ...TEXT_LABEL,
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  margin: '0 0 2px',
                }}
              >
                Trabajo de grado
              </p>
              <p style={{ ...TEXT_MAIN, fontSize: '13px', margin: 0 }}>
                Café / Granja Andina S.A.S.
              </p>
            </div>
            <div>
              <p
                style={{
                  ...TEXT_LABEL,
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  margin: '0 0 2px',
                }}
              >
                Inspiración de juego
              </p>
              <p style={{ ...TEXT_MAIN, fontSize: '13px', margin: 0 }}>Farm Frenzy</p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: '100%',
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
            Volver
          </button>
        </div>
      </motion.div>
    </div>
  )
}
