import { motion } from 'framer-motion'
import { FARM_LEVEL1, FARM_LEVEL2, type LevelId } from '@/constants/farmBalance'
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

const LEVEL_INFO: Record<LevelId, { label: string; difficulty: string; concepts: string[] }> = {
  1: {
    label: 'Nivel 1 — Granja Andina',
    difficulty: 'Básico',
    concepts: [
      '🟩 MPD — maíz consumido',
      '🟨 MOD — tiempo del granjero',
      '🟦 CIF — costos generales',
    ],
  },
  2: {
    label: 'Nivel 2 — Granja Andina',
    difficulty: 'Intermedio',
    concepts: [
      '🟩 MPD — maíz consumido',
      '🟨 MOD — tiempo del granjero',
      '🟦 CIF — costos generales y de gallinas',
    ],
  },
}

interface LevelInfoModalProps {
  level: LevelId
  onBack: () => void
  onStart: () => void
}

/** P-03B — ficha informativa del nivel, mostrada desde el mapa antes de entrar al juego. */
export function LevelInfoModal({ level, onBack, onStart }: LevelInfoModalProps) {
  const cfg = level === 2 ? FARM_LEVEL2 : FARM_LEVEL1
  const info = LEVEL_INFO[level]

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
            {info.difficulty}
          </p>
          <h2
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: '22px',
              ...TEXT_MAIN,
              margin: 0,
            }}
          >
            {info.label}
          </h2>
        </div>

        <div
          style={{ margin: '18px 24px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          <InfoRow label="🎯 Metas">
            <span>
              {cfg.objectiveEggs} huevos
              {cfg.objectiveChickens > 0 ? ` · ${cfg.objectiveChickens} gallinas` : ''}
            </span>
          </InfoRow>
          <InfoRow label="📚 Conceptos">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {info.concepts.map((c) => (
                <span key={c} style={{ fontSize: '11px' }}>
                  {c}
                </span>
              ))}
            </div>
          </InfoRow>
          <InfoRow label="📦 Inventario inicial">
            <span>
              {cfg.initialCornStock} mazorcas · {cfg.initialChickens} gallina
              {cfg.initialChickens === 1 ? '' : 's'}
            </span>
          </InfoRow>
          <InfoRow label="💵 Saldo inicial">
            <span>${cfg.initialCash.toLocaleString('es-CO')}</span>
          </InfoRow>
        </div>

        <div style={{ padding: '20px 24px 24px', display: 'flex', gap: '10px' }}>
          <button
            onClick={onBack}
            style={{
              flex: 1,
              padding: '11px',
              borderRadius: '10px',
              background: 'rgba(0,0,0,0.4)',
              border: '2px solid rgba(255,224,102,0.5)',
              fontFamily: "'Fredoka One', cursive",
              fontSize: '14px',
              cursor: 'pointer',
              ...TEXT_MAIN,
            }}
          >
            ⬅️ Atrás
          </button>
          <button
            onClick={onStart}
            style={{
              flex: 1,
              padding: '11px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #c47b2b, #e8a040)',
              border: '2px solid #f5c060',
              fontFamily: "'Fredoka One', cursive",
              fontSize: '14px',
              cursor: 'pointer',
              color: '#FFF3D0',
              textShadow: '1px 1px 3px rgba(0,0,0,0.7)',
            }}
          >
            ▶️ Comenzar
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'rgba(0,0,0,0.25)',
        borderRadius: '10px',
        padding: '10px 14px',
        border: '1px solid rgba(255,224,102,0.15)',
      }}
    >
      <p style={{ ...TEXT_LABEL, fontSize: '11px', margin: '0 0 4px' }}>{label}</p>
      <div style={{ ...TEXT_MAIN, fontFamily: "'Kalam', cursive", fontSize: '13px' }}>
        {children}
      </div>
    </div>
  )
}
