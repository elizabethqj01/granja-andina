import { motion } from 'framer-motion'
import type { ScoreBreakdown } from '@/types'
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

const RUBRIC_ROWS: { key: keyof ScoreBreakdown; label: string; weight: number }[] = [
  { key: 'metas', label: '🎯 Cumplimiento de metas', weight: 0.4 },
  { key: 'correctitud', label: '📊 Correctitud contable', weight: 0.35 },
  { key: 'tiempo', label: '⏱ Eficiencia en tiempo', weight: 0.15 },
  { key: 'costoUnitario', label: '💵 Eficiencia costo unitario', weight: 0.1 },
]

function notaColor(nota: number): string {
  if (nota >= 4) return '#6fcf5a'
  if (nota >= 3) return '#FFE066'
  return '#ff6b6b'
}

interface EvaluationRubricModalProps {
  nota: number
  breakdown: ScoreBreakdown
  onContinue: () => void
}

/** EV-02 — rúbrica detallada del cálculo de la nota oficial 0-5. */
export function EvaluationRubricModal({ nota, breakdown, onContinue }: EvaluationRubricModalProps) {
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
        <div style={{ padding: '28px 24px 12px', textAlign: 'center' }}>
          <p
            style={{
              ...TEXT_LABEL,
              fontSize: '11px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}
          >
            Modo Evaluación — Nota oficial
          </p>
          <p
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: '52px',
              color: notaColor(nota),
              textShadow: '2px 2px 6px rgba(0,0,0,0.9)',
              margin: 0,
              lineHeight: 1,
            }}
          >
            {nota.toFixed(1)}
          </p>
          <p style={{ ...TEXT_MAIN, fontSize: '12px', opacity: 0.7, margin: '4px 0 0' }}>
            sobre 5.0
          </p>
        </div>

        <div
          style={{ margin: '18px 24px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <p style={{ ...TEXT_LABEL, fontSize: '12px', margin: 0 }}>Desglose porcentual</p>
          {RUBRIC_ROWS.map((row) => {
            const value = breakdown[row.key]
            return (
              <div key={row.key}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '4px',
                  }}
                >
                  <span style={{ ...TEXT_MAIN, fontFamily: "'Kalam', cursive", fontSize: '12px' }}>
                    {row.label}{' '}
                    <span style={{ opacity: 0.6 }}>({Math.round(row.weight * 100)}%)</span>
                  </span>
                  <span style={{ ...TEXT_MAIN, fontFamily: "'Kalam', cursive", fontSize: '12px' }}>
                    {Math.round(value)}%
                  </span>
                </div>
                <div
                  style={{
                    height: '8px',
                    borderRadius: '4px',
                    background: 'rgba(0,0,0,0.35)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.max(0, Math.min(100, value))}%`,
                      background: 'linear-gradient(90deg, #c47b2b, #e8a040)',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ padding: '20px 24px 24px' }}>
          <button
            onClick={onContinue}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #c47b2b, #e8a040)',
              border: '2px solid #f5c060',
              fontFamily: "'Fredoka One', cursive",
              fontSize: '15px',
              cursor: 'pointer',
              ...TEXT_MAIN,
              boxShadow: '0 4px 12px rgba(180,100,20,0.5)',
            }}
          >
            Continuar
          </button>
        </div>
      </motion.div>
    </div>
  )
}
