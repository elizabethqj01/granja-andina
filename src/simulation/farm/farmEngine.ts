import { useFarmStore } from '@/store/farmStore'
import { useUiStore } from '@/store/uiStore'

const TICK_MS = 1_000 // 1 tick = 1 real second (no speed multiplier in Level 1)

/**
 * Real-time clock for the farm level. Drives the pure `advanceFarm` step once
 * per second. Pauses while a blocking dialog is open or the level is complete.
 *
 * Lives in `src/simulation/` — no React/Phaser imports, only Zustand stores
 * (the bridge layer), consistent with the café engine convention.
 */
class FarmEngine {
  private timerId: ReturnType<typeof setInterval> | null = null

  start(): void {
    if (this.timerId !== null) return
    this.timerId = setInterval(() => this.tick(), TICK_MS)
  }

  stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId)
      this.timerId = null
    }
  }

  reset(): void {
    this.stop()
    useFarmStore.getState().initLevel()
  }

  private tick(): void {
    const farm = useFarmStore.getState()
    if (farm.levelComplete || farm.levelFailed) return
    // Pause when a blocking dialog (menu / cost-flow) is open.
    if (useUiStore.getState().farmDialog !== null) return
    farm.tick()
  }
}

export const farmEngine = new FarmEngine()
