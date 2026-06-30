import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFarmStore, type FarmState } from '@/store/farmStore'
import { useUiStore } from '@/store/uiStore'

// ── Step definitions ───────────────────────────────────────────────────────────

interface Step {
  pulse: { x: string; y: string } | null
  card: { x: string; y: string; anchor: 'left' | 'right' | 'center' }
  title: string
  body: string
  sub?: string
  // auto-advance: evaluates farm state. manualAdvance: player clicks "Siguiente"
  advance: ((farm: FarmState) => boolean) | 'manual'
}

const STEPS: Step[] = [
  {
    pulse: { x: '24%', y: '24%' },
    card: { x: '32%', y: '14%', anchor: 'left' },
    title: '🌽 Compra maíz',
    body: 'Haz clic en el almacén de maíz para comprar una recarga.',
    sub: '$20 por 5 mazorcas',
    advance: (farm) => farm.cornStock > 0,
  },
  {
    pulse: { x: '50%', y: '54%' },
    card: { x: '18%', y: '36%', anchor: 'left' },
    title: '📍 Coloca el maíz en el campo',
    body: 'Haz clic sobre cualquier casilla del campo para soltar una mazorca.',
    sub: 'La gallina irá a comerla',
    advance: (farm) => farm.placedCorn.length > 0,
  },
  {
    pulse: { x: '50%', y: '54%' },
    card: { x: '50%', y: '8%', anchor: 'center' },
    title: '⏳ ¡Bien! Espera a que la gallina ponga un huevo',
    body: 'La gallina comerá el maíz y luego pondrá un huevo en el campo.',
    advance: (farm) => farm.groundEggs.length > 0,
  },
  {
    pulse: { x: '50%', y: '54%' },
    card: { x: '18%', y: '55%', anchor: 'left' },
    title: '🥚 ¡Haz clic en el huevo!',
    body: 'El granjero irá a recogerlo y lo llevará al almacén de huevos.',
    advance: (farm) => farm.eggsCollectedTotal > 0,
  },
  {
    // Egg warehouse at ~86% x, 88% y (LAYOUT.warehouseSprite)
    pulse: { x: '86%', y: '82%' },
    card: { x: '54%', y: '68%', anchor: 'right' },
    title: '💰 Vende los huevos',
    body: 'Haz clic en el almacén de huevos para abrir el menú de ventas.',
    sub: '$10 por huevo',
    advance: (farm) => farm.eggsSold > 0,
  },
  {
    // Chicken shop button is at top-left of the HUD (absolute left-3 top-3)
    pulse: { x: '9%', y: '7%' },
    card: { x: '2%', y: '15%', anchor: 'left' },
    title: '🐔 Compra más gallinas',
    body: 'Con el dinero de las ventas puedes comprar gallinas adicionales para producir más huevos.',
    sub: '$100 por gallina · máx. 4',
    advance: 'manual',
  },
  {
    // Scroll MPD button at ~18% x, 22% y (LAYOUT.scrollMPD)
    pulse: { x: '18%', y: '22%' },
    card: { x: '26%', y: '12%', anchor: 'left' },
    title: '📜 Estado de costos',
    body: 'Estos tres pergaminos muestran en tiempo real el flujo de costos: Materias primas, Producción y Productos terminados.',
    sub: '¡Todo lo que haces en la granja se refleja aquí!',
    advance: 'manual',
  },
]

export const TUTORIAL_STEP_COUNT = STEPS.length

// ── Sub-components ─────────────────────────────────────────────────────────────

function PulseRing({ x, y }: { x: string; y: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: '3px solid #FFE066',
          position: 'absolute',
          inset: 0,
        }}
      />
      <motion.div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: '3px solid #FFE066',
          position: 'absolute',
          inset: 0,
        }}
        animate={{ scale: [1, 1.9], opacity: [0.9, 0] }}
        transition={{ repeat: Infinity, duration: 1.3, ease: 'easeOut' }}
      />
    </div>
  )
}

interface CardProps {
  step: Step
  stepIndex: number
  onSkip: () => void
  onNext: () => void
}

function TutorialCard({ step, stepIndex, onSkip, onNext }: CardProps) {
  const translateX =
    step.card.anchor === 'center' ? '-50%' : step.card.anchor === 'right' ? '-100%' : '0%'
  const isManual = step.advance === 'manual'
  const isLast = stepIndex === TUTORIAL_STEP_COUNT - 1

  return (
    <motion.div
      key={stepIndex}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'absolute',
        left: step.card.x,
        top: step.card.y,
        transform: `translateX(${translateX})`,
        width: '220px',
        background: 'rgba(30, 14, 4, 0.92)',
        border: '2px solid rgba(255, 224, 102, 0.5)',
        borderRadius: '12px',
        padding: '10px 12px 10px',
        backdropFilter: 'blur(4px)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
        pointerEvents: 'auto',
      }}
    >
      {/* Step counter + skip */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px',
        }}
      >
        <span
          style={{
            fontFamily: "'Kalam', cursive",
            fontSize: '10px',
            color: 'rgba(255,224,102,0.6)',
          }}
        >
          {stepIndex + 1} / {TUTORIAL_STEP_COUNT}
        </span>
        <button
          onClick={onSkip}
          style={{
            fontFamily: "'Kalam', cursive",
            fontSize: '10px',
            color: 'rgba(255,243,208,0.45)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0 2px',
          }}
        >
          Saltar
        </button>
      </div>

      <p
        style={{
          fontFamily: "'Fredoka One', cursive",
          fontSize: '14px',
          color: '#FFE066',
          margin: '0 0 4px',
          lineHeight: 1.25,
        }}
      >
        {step.title}
      </p>
      <p
        style={{
          fontFamily: "'Kalam', cursive",
          fontSize: '12px',
          color: '#FFF3D0',
          margin: 0,
          lineHeight: 1.35,
          opacity: 0.9,
        }}
      >
        {step.body}
      </p>
      {step.sub && (
        <p
          style={{
            fontFamily: "'Kalam', cursive",
            fontSize: '10px',
            color: 'rgba(255,224,102,0.7)',
            margin: '4px 0 0',
          }}
        >
          {step.sub}
        </p>
      )}

      {/* Manual-advance button */}
      {isManual && (
        <button
          onClick={onNext}
          style={{
            marginTop: '10px',
            width: '100%',
            padding: '6px',
            borderRadius: '8px',
            background: isLast
              ? 'linear-gradient(135deg, #c47b2b, #e8a040)'
              : 'rgba(255,224,102,0.15)',
            border: `1px solid ${isLast ? '#f5c060' : 'rgba(255,224,102,0.4)'}`,
            fontFamily: "'Fredoka One', cursive",
            fontSize: '13px',
            color: '#FFF3D0',
            cursor: 'pointer',
          }}
        >
          {isLast ? '¡Entendido! ✓' : 'Siguiente ▶'}
        </button>
      )}
    </motion.div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function TutorialOverlay() {
  const farmTutorialStep = useUiStore((s) => s.farmTutorialStep)
  const farmDialog = useUiStore((s) => s.farmDialog)
  const nextFarmTutorialStep = useUiStore((s) => s.nextFarmTutorialStep)
  const skipFarmTutorial = useUiStore((s) => s.skipFarmTutorial)

  const cornStock = useFarmStore((s) => s.cornStock)
  const placedCornLen = useFarmStore((s) => s.placedCorn.length)
  const groundEggsLen = useFarmStore((s) => s.groundEggs.length)
  const eggsCollectedTotal = useFarmStore((s) => s.eggsCollectedTotal)
  const eggsSold = useFarmStore((s) => s.eggsSold)
  const levelComplete = useFarmStore((s) => s.levelComplete)
  const levelFailed = useFarmStore((s) => s.levelFailed)

  // Auto-advance when the current step's condition is met (only for non-manual steps)
  useEffect(() => {
    if (farmTutorialStep === null) return
    const step = STEPS[farmTutorialStep]
    if (!step || step.advance === 'manual') return
    const farm = useFarmStore.getState()
    if (step.advance(farm)) nextFarmTutorialStep()
  }, [
    farmTutorialStep,
    cornStock,
    placedCornLen,
    groundEggsLen,
    eggsCollectedTotal,
    eggsSold,
    nextFarmTutorialStep,
  ])

  // Dismiss tutorial when level ends
  useEffect(() => {
    if ((levelComplete || levelFailed) && farmTutorialStep !== null) {
      skipFarmTutorial()
    }
  }, [levelComplete, levelFailed, farmTutorialStep, skipFarmTutorial])

  const hidden = farmDialog !== null || farmTutorialStep === null
  if (hidden) return null

  const step = STEPS[farmTutorialStep]
  if (!step) return null

  return (
    <div className="pointer-events-none absolute inset-0 select-none" style={{ zIndex: 20 }}>
      <AnimatePresence mode="wait">
        {step.pulse && (
          <PulseRing key={`pulse-${farmTutorialStep}`} x={step.pulse.x} y={step.pulse.y} />
        )}
        <TutorialCard
          key={`card-${farmTutorialStep}`}
          step={step}
          stepIndex={farmTutorialStep}
          onSkip={skipFarmTutorial}
          onNext={nextFarmTutorialStep}
        />
      </AnimatePresence>
    </div>
  )
}
