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

export function CostFlowDialog() {
  const farmDialog = useUiStore((s) => s.farmDialog)
  const setFarmDialog = useUiStore((s) => s.setFarmDialog)
  if (farmDialog !== 'cost-flow') return null

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
        <div style={{ padding: '28px 24px 24px', textAlign: 'center' }}>
          <h2
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: '22px',
              ...TEXT_MAIN,
              marginBottom: '12px',
            }}
          >
            📊 Flujo de Costos
          </h2>
          <p style={{ ...TEXT_MAIN, fontSize: '13px', opacity: 0.85, marginBottom: '8px' }}>
            El Estado de Costos (ECPV) completo — maíz como materia prima, el granjero como mano de
            obra y los huevos como producto terminado — se habilita en la siguiente entrega.
          </p>
          <p style={{ ...TEXT_LABEL, fontSize: '11px', opacity: 0.7, marginBottom: '20px' }}>
            El juego está en pausa mientras lees esto.
          </p>
          <button
            onClick={() => setFarmDialog(null)}
            style={{
              width: '100%',
              padding: '11px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #c47b2b, #e8a040)',
              border: '2px solid #f5c060',
              fontFamily: "'Fredoka One', cursive",
              fontSize: '15px',
              cursor: 'pointer',
              ...TEXT_MAIN,
            }}
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  )
}
