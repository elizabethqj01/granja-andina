import { create } from 'zustand'
import type { LevelStars } from '@/types'
import { FARM_LEVEL1 } from '@/constants/farmBalance'

// ── Domain types ──────────────────────────────────────────────────────────────

export type ChickenState = 'wandering' | 'seeking' | 'laying'

export interface PlacedCorn {
  id: string
  col: number
  row: number
}

export interface Chicken {
  id: string
  col: number
  row: number
  state: ChickenState
  targetCornId: string | null
  layTimerSec: number
  wanderCooldownSec: number
}

export interface GroundEgg {
  id: string
  col: number
  row: number
  collecting: boolean
  collectElapsedSec: number
  ageTimerSec: number
}

export type FarmerState = 'idle' | 'working'
export type SaleState = 'idle' | 'in-transit'

export interface Farmer {
  state: FarmerState
  targetEggId: string | null
}

export interface FarmState {
  cash: number
  cornStock: number
  placedCorn: PlacedCorn[]
  chickens: Chicken[]
  groundEggs: GroundEgg[]
  warehouseEggs: number
  eggsCollectedTotal: number
  elapsedSec: number
  farmer: Farmer
  notification: string | null

  // Accounting accumulators (ECPV panel — US-3)
  cornPurchasedValue: number
  cornConsumedValue: number
  modAccrued: number
  cifAccrued: number
  revenue: number
  eggsSold: number

  // Truck sale mechanic
  saleState: SaleState
  pendingSaleIncome: number

  levelComplete: boolean
  stars: LevelStars
}

export const FARM_GRID = { cols: 12, rows: 12 } as const

// ── Internal counters (reset on initLevel) ───────────────────────────────────
let eggCounter = 0
let cornCounter = 0
let chickenCounter = 0
function nextEggId(): string {
  eggCounter += 1
  return `egg-${eggCounter}`
}
function nextCornId(): string {
  cornCounter += 1
  return `corn-${cornCounter}`
}
function nextChickenId(): string {
  chickenCounter += 1
  return `chicken-${chickenCounter}`
}

// Module-level timer — cleared/reset whenever a new notification is dispatched
let notificationTimer: ReturnType<typeof setTimeout> | null = null

// ── Pure helpers ─────────────────────────────────────────────────────────────

function findNearest(corns: readonly PlacedCorn[], col: number, row: number): PlacedCorn | null {
  if (corns.length === 0) return null
  return corns.reduce((best, c) => {
    const d = Math.abs(c.col - col) + Math.abs(c.row - row)
    const bd = Math.abs(best.col - col) + Math.abs(best.row - row)
    return d < bd ? c : best
  })
}

function stepToward(
  from: { col: number; row: number },
  to: { col: number; row: number }
): { col: number; row: number } {
  const dc = Math.sign(to.col - from.col)
  const dr = Math.sign(to.row - from.row)
  if (dc !== 0 && dr !== 0) {
    return Math.abs(to.col - from.col) >= Math.abs(to.row - from.row)
      ? { col: from.col + dc, row: from.row }
      : { col: from.col, row: from.row + dr }
  }
  return { col: from.col + dc, row: from.row + dr }
}

function randomNeighbor(col: number, row: number): { col: number; row: number } {
  const dirs = [
    { col: col - 1, row },
    { col: col + 1, row },
    { col, row: row - 1 },
    { col, row: row + 1 },
  ].filter((p) => p.col >= 0 && p.col < FARM_GRID.cols && p.row >= 0 && p.row < FARM_GRID.rows)
  if (dirs.length === 0) return { col, row }
  return dirs[Math.floor(Math.random() * dirs.length)]
}

// ── Stars ────────────────────────────────────────────────────────────────────

export function computeStars(elapsedSec: number): LevelStars {
  const { three, two } = FARM_LEVEL1.starThresholdsSec
  if (elapsedSec <= three) return 3
  if (elapsedSec <= two) return 2
  return 1
}

// ── Initial state ─────────────────────────────────────────────────────────────

function initialFarmState(): FarmState {
  const startCol = Math.floor(FARM_GRID.cols / 2)
  const startRow = Math.floor(FARM_GRID.rows / 2)
  const chickens: Chicken[] = Array.from({ length: FARM_LEVEL1.initialChickens }, () => ({
    id: nextChickenId(),
    col: startCol,
    row: startRow,
    state: 'wandering' as ChickenState,
    targetCornId: null,
    layTimerSec: 0,
    wanderCooldownSec: FARM_LEVEL1.chickenWanderIntervalSec,
  }))

  return {
    cash: FARM_LEVEL1.initialCash,
    cornStock: 0,
    placedCorn: [],
    chickens,
    groundEggs: [],
    warehouseEggs: 0,
    eggsCollectedTotal: 0,
    elapsedSec: 0,
    farmer: { state: 'idle', targetEggId: null },
    cornPurchasedValue: 0,
    cornConsumedValue: 0,
    modAccrued: 0,
    cifAccrued: 0,
    revenue: 0,
    eggsSold: 0,
    saleState: 'idle',
    pendingSaleIncome: 0,
    levelComplete: false,
    stars: 0,
    notification: null,
  }
}

// ── Pure simulation step ──────────────────────────────────────────────────────

export function advanceFarm(state: FarmState, cfg = FARM_LEVEL1): FarmState {
  if (state.levelComplete) return state

  const next: FarmState = {
    ...state,
    elapsedSec: state.elapsedSec + 1,
    chickens: state.chickens.map((c) => ({ ...c })),
    groundEggs: state.groundEggs.map((e) => ({ ...e })),
    placedCorn: [...state.placedCorn],
    farmer: { ...state.farmer },
  }

  // 1) Accruals
  next.cifAccrued += cfg.cifCostPerSec
  if (next.farmer.state === 'working') next.modAccrued += cfg.modCostPerSec

  // 2) Chicken AI: wandering → seeking → eating → laying → wandering
  for (const chicken of next.chickens) {
    if (chicken.state === 'wandering') {
      const corn = findNearest(next.placedCorn, chicken.col, chicken.row)
      if (corn) {
        chicken.state = 'seeking'
        chicken.targetCornId = corn.id
      } else {
        chicken.wanderCooldownSec -= 1
        if (chicken.wanderCooldownSec <= 0) {
          const n = randomNeighbor(chicken.col, chicken.row)
          chicken.col = n.col
          chicken.row = n.row
          chicken.wanderCooldownSec = cfg.chickenWanderIntervalSec
        }
      }
    } else if (chicken.state === 'seeking') {
      const corn = next.placedCorn.find((c) => c.id === chicken.targetCornId)
      if (!corn) {
        // Corn was removed (eaten by another chicken or the store); start over
        chicken.state = 'wandering'
        chicken.targetCornId = null
      } else if (chicken.col === corn.col && chicken.row === corn.row) {
        // On the corn tile: eat it and start the lay countdown
        next.placedCorn = next.placedCorn.filter((c) => c.id !== corn.id)
        next.cornConsumedValue += cfg.cornUnitCost
        chicken.state = 'laying'
        chicken.targetCornId = null
        chicken.layTimerSec = 0
      } else {
        // Move one step toward the corn each tick
        const step = stepToward(
          { col: chicken.col, row: chicken.row },
          { col: corn.col, row: corn.row }
        )
        chicken.col = step.col
        chicken.row = step.row
      }
    } else {
      // 'laying' — countdown to egg
      chicken.layTimerSec += 1
      if (chicken.layTimerSec >= cfg.eggLayTimeSec && next.groundEggs.length < cfg.maxGroundEggs) {
        next.groundEggs.push({
          id: nextEggId(),
          col: chicken.col,
          row: chicken.row,
          collecting: false,
          collectElapsedSec: 0,
          ageTimerSec: 0,
        })
        chicken.layTimerSec = 0
        chicken.state = 'wandering'
        chicken.wanderCooldownSec = cfg.chickenWanderIntervalSec
      }
    }
  }

  // 3) Age non-collected eggs; remove those that have spoiled
  next.groundEggs = next.groundEggs
    .map((e) => (e.collecting ? e : { ...e, ageTimerSec: e.ageTimerSec + 1 }))
    .filter((e) => e.collecting || e.ageTimerSec <= cfg.eggSpoilTimeSec)

  // 4) Farmer collects targeted egg
  if (next.farmer.state === 'working' && next.farmer.targetEggId) {
    const egg = next.groundEggs.find((e) => e.id === next.farmer.targetEggId)
    if (!egg) {
      next.farmer = { state: 'idle', targetEggId: null }
    } else {
      egg.collectElapsedSec += 1
      if (egg.collectElapsedSec >= cfg.farmerCollectTimeSec) {
        next.groundEggs = next.groundEggs.filter((e) => e.id !== egg.id)
        if (next.warehouseEggs < cfg.maxWarehouseEggs) next.warehouseEggs += 1
        next.eggsCollectedTotal += 1
        next.farmer = { state: 'idle', targetEggId: null }
      }
    }
  }

  // 5) Objective check
  if (!next.levelComplete && next.eggsCollectedTotal >= cfg.objectiveEggs) {
    next.levelComplete = true
    next.stars = computeStars(next.elapsedSec)
  }

  return next
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface FarmStore extends FarmState {
  initLevel: () => void
  rechargeCorn: () => void
  placeCorn: (col: number, row: number) => void
  requestCollect: (eggId: string) => void
  initSale: (eggCount: number, chickenCount: number) => void
  completeSale: () => void
  buyChicken: () => void
  tick: () => void
  clearNotification: () => void
}

export const useFarmStore = create<FarmStore>((set, get) => {
  // Helper: show a timed toast notification (closes over `set`)
  function flash(msg: string) {
    if (notificationTimer) clearTimeout(notificationTimer)
    set({ notification: msg })
    notificationTimer = setTimeout(() => {
      set({ notification: null })
      notificationTimer = null
    }, 2_500)
  }

  return {
    ...initialFarmState(),

    initLevel: () => {
      eggCounter = 0
      cornCounter = 0
      chickenCounter = 0
      if (notificationTimer) {
        clearTimeout(notificationTimer)
        notificationTimer = null
      }
      set(initialFarmState())
    },

    clearNotification: () => set({ notification: null }),

    // Buy a batch of corn from the warehouse → goes into hand inventory
    rechargeCorn: () => {
      const s = get()
      if (s.levelComplete) return
      const cost = FARM_LEVEL1.cornUnitCost * FARM_LEVEL1.cornPerRecharge
      if (s.cash < cost) {
        flash('¡Sin fondos! Vende los huevos primero.')
        return
      }
      set({
        cash: s.cash - cost,
        cornStock: s.cornStock + FARM_LEVEL1.cornPerRecharge,
        cornPurchasedValue: s.cornPurchasedValue + cost,
      })
    },

    // Player clicks a tile to drop one corn unit from hand inventory onto the field
    placeCorn: (col, row) => {
      const s = get()
      if (s.levelComplete || s.cornStock <= 0) return
      if (s.placedCorn.some((c) => c.col === col && c.row === row)) return
      set({
        cornStock: s.cornStock - 1,
        placedCorn: [...s.placedCorn, { id: nextCornId(), col, row }],
      })
    },

    // Player clicks an egg — dispatch farmer, or redirect if already working
    requestCollect: (eggId) => {
      const s = get()
      if (s.levelComplete) return
      const egg = s.groundEggs.find((e) => e.id === eggId)
      if (!egg || egg.collecting) return

      // Unmark previous target so it can spoil/be re-clicked normally
      const groundEggs = s.groundEggs.map((e) => {
        if (e.id === s.farmer.targetEggId) return { ...e, collecting: false, collectElapsedSec: 0 }
        if (e.id === eggId) return { ...e, collecting: true }
        return e
      })
      set({ groundEggs, farmer: { state: 'working', targetEggId: eggId } })
    },

    // Player confirms a sale via the sell modal — loads truck and removes goods
    initSale: (eggCount, chickenCount) => {
      const s = get()
      if (s.levelComplete || s.saleState !== 'idle') return
      if (eggCount === 0 && chickenCount === 0) return

      const income =
        eggCount * FARM_LEVEL1.eggSellPrice + chickenCount * FARM_LEVEL1.chickenSellPrice

      // Keep at least 1 chicken when selling
      const keepCount = Math.max(1, s.chickens.length - chickenCount)

      set({
        warehouseEggs: Math.max(0, s.warehouseEggs - eggCount),
        eggsSold: s.eggsSold + eggCount,
        chickens: s.chickens.slice(0, keepCount),
        pendingSaleIncome: income,
        saleState: 'in-transit',
      })
    },

    // Called by the Phaser truck animation when the truck returns with payment
    completeSale: () => {
      const s = get()
      if (s.saleState !== 'in-transit') return
      set({
        cash: s.cash + s.pendingSaleIncome,
        revenue: s.revenue + s.pendingSaleIncome,
        pendingSaleIncome: 0,
        saleState: 'idle',
      })
    },

    // Player buys one more chicken from the shop
    buyChicken: () => {
      const s = get()
      if (s.levelComplete) return
      if (s.chickens.length >= FARM_LEVEL1.maxChickens) {
        flash('¡Límite de gallinas alcanzado!')
        return
      }
      if (s.cash < FARM_LEVEL1.chickenBuyPrice) {
        flash('¡Sin fondos para comprar gallina!')
        return
      }
      const col = Math.floor(Math.random() * FARM_GRID.cols)
      const row = Math.floor(Math.random() * FARM_GRID.rows)
      set({
        cash: s.cash - FARM_LEVEL1.chickenBuyPrice,
        chickens: [
          ...s.chickens,
          {
            id: nextChickenId(),
            col,
            row,
            state: 'wandering' as ChickenState,
            targetCornId: null,
            layTimerSec: 0,
            wanderCooldownSec: FARM_LEVEL1.chickenWanderIntervalSec,
          },
        ],
      })
    },

    tick: () => set((s) => advanceFarm(s)),
  }
})
