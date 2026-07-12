import { motion, AnimatePresence } from 'framer-motion'
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

// P-00B — 4-step guided tutorial, shown once after a student's first Google login.
const STEPS = [
  {
    emoji: '🟩',
    title: 'Materia Prima',
    body: 'El maíz que compras para las gallinas. Es lo que tu granja consume para producir.',
  },
  {
    emoji: '🟨',
    title: 'Producción',
    body: 'La gallina transforma el maíz en huevos, y el granjero los recolecta. Ahí se generan tus costos de mano de obra y de proceso.',
  },
  {
    emoji: '🟪',
    title: 'Productos Terminados',
    body: 'Los huevos ya recolectados y guardados en el almacén, listos para vender.',
  },
  {
    emoji: '📊',
    title: 'Resultados',
    body: 'Cada acción que haces en la granja se refleja en el flujo de costos y en tu puntaje. Ahí revisas cuánto ganaste y por qué.',
  },
] as const

export function OnboardingTutorial() {
  const onboardingStep = useUiStore((s) => s.onboardingStep)
  const setOnboardingStep = useUiStore((s) => s.setOnboardingStep)
  const finishOnboarding = useUiStore((s) => s.finishOnboarding)

  if (onboardingStep === null) return null

  const step = STEPS[onboardingStep]
  const isFirst = onboardingStep === 0
  const isLast = onboardingStep === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={onboardingStep}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="w-full max-w-sm overflow-hidden rounded-2xl"
          style={WOOD}
          role="dialog"
          aria-modal="true"
          aria-label="Tutorial guiado"
        >
          <div style={{ padding: '28px 24px 24px', textAlign: 'center' }}>
            <p
              style={{
                ...TEXT_LABEL,
                fontSize: '11px',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginBottom: '14px',
              }}
            >
              Paso {onboardingStep + 1} de {STEPS.length}
            </p>

            <div style={{ fontSize: '48px', lineHeight: 1, marginBottom: '12px' }}>
              {step.emoji}
            </div>

            <h2
              style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: '20px',
                ...TEXT_MAIN,
                margin: '0 0 10px',
              }}
            >
              {step.title}
            </h2>

            <p
              style={{
                fontFamily: "'Kalam', cursive",
                fontSize: '14px',
                ...TEXT_MAIN,
                opacity: 0.9,
                lineHeight: 1.4,
                margin: 0,
              }}
            >
              {step.body}
            </p>
          </div>

          <div style={{ padding: '0 24px 24px', display: 'flex', gap: '10px' }}>
            {!isFirst && (
              <button
                onClick={() => setOnboardingStep(onboardingStep - 1)}
                style={{
                  flex: 1,
                  padding: '10px',
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
            )}
            <button
              onClick={() => (isLast ? finishOnboarding() : setOnboardingStep(onboardingStep + 1))}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #c47b2b, #e8a040)',
                border: '2px solid #f5c060',
                fontFamily: "'Fredoka One', cursive",
                fontSize: '14px',
                cursor: 'pointer',
                color: '#FFF3D0',
                textShadow: '1px 1px 3px rgba(0,0,0,0.7)',
                boxShadow: '0 4px 12px rgba(180,100,20,0.5)',
              }}
            >
              {isLast ? '✅ Finalizar' : 'Siguiente ➡️'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
