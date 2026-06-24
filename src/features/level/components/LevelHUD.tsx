import { useFarmStore } from '@/store/farmStore'
import { useUiStore } from '@/store/uiStore'
import { FARM_LEVEL1 } from '@/constants/farmBalance'

function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Heads-up display for the farm level. Overlays the Phaser canvas; only its
 * interactive chips capture pointer events so the field stays clickable.
 *
 * Layout mirrors Farm Frenzy: roster (top-left), cost-flow button (top-center),
 * timer + cash + objective (top-right), menu button (bottom-left).
 */
export function LevelHUD() {
  const elapsedSec = useFarmStore((s) => s.elapsedSec)
  const cash = useFarmStore((s) => s.cash)
  const collected = useFarmStore((s) => s.eggsCollectedTotal)
  const warehouseEggs = useFarmStore((s) => s.warehouseEggs)
  const setFarmDialog = useUiStore((s) => s.setFarmDialog)

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {/* Top-left — animal roster (only the chicken in Level 1) */}
      <div className="pointer-events-auto absolute left-3 top-3 flex items-center gap-2 rounded-lg bg-black/40 px-3 py-2 backdrop-blur-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-white text-base">
          🐔
        </div>
        <span className="font-mono text-xs text-white/80">×{FARM_LEVEL1.initialChickens}</span>
      </div>

      {/* Top-center — cost flow button */}
      <div className="pointer-events-auto absolute left-1/2 top-3 -translate-x-1/2">
        <button
          onClick={() => setFarmDialog('cost-flow')}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-black shadow-md transition-transform hover:scale-105"
        >
          📊 Flujo de Costos
        </button>
      </div>

      {/* Top-right — timer, cash, objective */}
      <div className="pointer-events-auto absolute right-3 top-3 flex flex-col items-end gap-1 rounded-lg bg-black/40 px-3 py-2 backdrop-blur-sm">
        <span className="font-mono text-lg font-bold text-white">⏱ {formatTime(elapsedSec)}</span>
        <span className="font-mono text-sm text-amber-300">💰 ${cash.toLocaleString('es-CO')}</span>
        <span className="font-mono text-sm text-white">
          🥚 {collected}/{FARM_LEVEL1.objectiveEggs} recolectados
        </span>
        <span className="font-mono text-xs text-white/70">en almacén: {warehouseEggs}</span>
      </div>

      {/* Bottom-left — menu button */}
      <div className="pointer-events-auto absolute bottom-3 left-3">
        <button
          onClick={() => setFarmDialog('menu')}
          className="rounded-lg bg-black/50 px-5 py-2 text-sm font-bold text-white backdrop-blur-sm transition-colors hover:bg-black/70"
        >
          Menú
        </button>
      </div>
    </div>
  )
}
