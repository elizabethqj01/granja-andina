import { motion, AnimatePresence } from 'framer-motion'
import { playSfx } from '@/services/sfx'
import { useFarmStore } from '@/store/farmStore'
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

function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** P-05B — sliding panel with every transaction so far, most recent first. */
export function TransactionsPanel() {
  const farmDialog = useUiStore((s) => s.farmDialog)
  const setFarmDialog = useUiStore((s) => s.setFarmDialog)
  const transactions = useFarmStore((s) => s.transactions)

  if (farmDialog !== 'transactions') return null

  const reversed = [...transactions].reverse()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 p-4">
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="flex h-full w-full max-w-xs flex-col overflow-hidden rounded-2xl"
        style={WOOD}
        role="dialog"
        aria-modal="true"
        aria-label="Transacciones"
      >
        <div
          style={{
            padding: '20px 20px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: '18px',
              ...TEXT_MAIN,
              margin: 0,
            }}
          >
            📜 Transacciones
          </h2>
          <button
            onClick={() => {
              playSfx('btn_click')
              setFarmDialog(null)
            }}
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

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
          {reversed.length === 0 ? (
            <p style={{ ...TEXT_MAIN, fontSize: '13px', opacity: 0.7, padding: '12px 4px' }}>
              Todavía no hay movimientos.
            </p>
          ) : (
            <AnimatePresence initial={false}>
              {reversed.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '8px 8px',
                    borderBottom: '1px solid rgba(255,224,102,0.12)',
                  }}
                >
                  <span
                    style={{ ...TEXT_LABEL, fontSize: '11px', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatTime(t.atSec)}
                  </span>
                  <span
                    style={{
                      ...TEXT_MAIN,
                      fontFamily: "'Kalam', cursive",
                      fontSize: '13px',
                      flex: 1,
                    }}
                  >
                    {t.label}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Kalam', cursive",
                      fontWeight: 700,
                      fontSize: '13px',
                      color: t.amount >= 0 ? '#6fcf5a' : '#ff6b6b',
                    }}
                  >
                    {t.amount >= 0 ? '+' : '-'}${Math.abs(t.amount).toLocaleString('es-CO')}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </div>
  )
}
