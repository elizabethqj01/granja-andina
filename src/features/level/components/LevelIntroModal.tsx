import { useUiStore } from '@/store/uiStore'
import { FARM_LEVEL1 } from '@/constants/farmBalance'

/**
 * Level-intro dialog shown when entering the level. The farm simulation is
 * paused (farmDialog === 'objectives') until the player presses "Comenzar".
 */
export function LevelIntroModal() {
  const farmDialog = useUiStore((s) => s.farmDialog)
  const setFarmDialog = useUiStore((s) => s.setFarmDialog)
  if (farmDialog !== 'objectives') return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="panel w-full max-w-sm p-6 text-center" role="dialog" aria-modal="true">
        <h2 className="text-xl font-bold text-accent-primary">Nivel 1</h2>
        <p className="mt-1 text-sm text-text-muted">Objetivo del nivel</p>

        <div className="my-5 flex items-center justify-center gap-3 rounded-lg border border-border-default bg-surface-secondary p-4">
          <span className="text-3xl">🥚</span>
          <div className="text-left">
            <p className="font-fredoka text-2xl font-bold text-text-primary">
              {FARM_LEVEL1.objectiveEggs} huevos
            </p>
            <p className="text-xs text-text-secondary">Recoléctalos en el almacén</p>
          </div>
        </div>

        <ul className="mb-3 space-y-1 text-left text-xs text-text-secondary">
          <li>🌽 Recarga maíz para que la gallina ponga huevos.</li>
          <li>🥚 Haz clic en cada huevo para que el granjero lo recoja.</li>
          <li>💰 Vende los huevos en el carro.</li>
        </ul>
        <p className="mb-6 text-xs text-text-muted">⭐ Termina rápido para ganar más estrellas.</p>

        <button onClick={() => setFarmDialog(null)} className="btn-primary w-full">
          Comenzar
        </button>
      </div>
    </div>
  )
}
