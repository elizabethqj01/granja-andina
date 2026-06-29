import { useFarmStore } from '@/store/farmStore'
import { FARM_LEVEL1 } from '@/constants/farmBalance'

function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

interface LevelCompleteModalProps {
  onRetry: () => void
  onExit: () => void
}

/**
 * Victory screen for Level 1. Appears (and pauses the sim) when the objective
 * of 4 collected eggs is reached. Stars reflect completion time:
 * ≤60s → 3★, ≤120s → 2★, >120s → 1★.
 */
export function LevelCompleteModal({ onRetry, onExit }: LevelCompleteModalProps) {
  const levelComplete = useFarmStore((s) => s.levelComplete)
  const stars = useFarmStore((s) => s.stars)
  const elapsedSec = useFarmStore((s) => s.elapsedSec)
  const cash = useFarmStore((s) => s.cash)
  const eggsSold = useFarmStore((s) => s.eggsSold)

  if (!levelComplete) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="panel w-full max-w-sm p-6 text-center" role="dialog" aria-modal="true">
        <h2 className="text-xl font-bold text-accent-primary">¡Nivel 1 completado!</h2>

        <div
          className="my-4 flex justify-center gap-2 text-4xl"
          aria-label={`${stars} de 3 estrellas`}
        >
          {[1, 2, 3].map((i) => (
            <span key={i} className={i <= stars ? 'text-accent-primary' : 'text-border-strong'}>
              ★
            </span>
          ))}
        </div>

        <dl className="mx-auto flex max-w-[220px] flex-col gap-1.5 text-sm">
          <Row label="Huevos recolectados" value={`${FARM_LEVEL1.objectiveEggs}`} />
          <Row label="Tiempo" value={formatTime(elapsedSec)} />
          <Row label="Huevos vendidos" value={`${eggsSold}`} />
          <Row label="Caja final" value={`$${cash.toLocaleString('es-CO')}`} />
        </dl>

        <div className="mt-6 flex gap-3">
          <button onClick={onRetry} className="btn-secondary flex-1 text-sm">
            Reintentar
          </button>
          <button onClick={onExit} className="btn-primary flex-1 text-sm">
            Volver al mapa
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="font-kalam font-semibold text-text-primary">{value}</dd>
    </div>
  )
}
