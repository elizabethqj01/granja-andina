import { create } from 'zustand'
import type { LevelStars } from '@/types'
import { FARM_LEVEL1 } from '@/constants/farmBalance'

// ── Domain types ──────────────────────────────────────────────────────────────

export type ChickenState = 'wandering' | 'seeking' | 'eating' | 'laying'

export interface PlacedCorn {
  id: string
  col: number
  row: number
  remainingEnergy: number // starts at chickenCornEnergyRestore; depleted across multiple chickens
}

export interface Chicken {
  id: string
  col: number
  row: number
  state: ChickenState
  targetCornId: string | null
  layTimerSec: number // counts up in wandering (production timer) and laying (anim timer)
  eatTimerSec: number // counts up in eating state; resets when done
  wanderCooldownSec: number
  energy: number // 0..chickenMaxEnergy; drains over time, restored by eating corn
  dead: boolean
  deadTimerSec: number
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
  pendingSaleEggs: number

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

// Returns a neighbor tile that has no corn on it, or null if all neighbors are blocked
function findAdjacentFreeTile(
  col: number,
  row: number,
  placedCorn: PlacedCorn[]
): { col: number; row: number } | null {
  const dirs = [
    { col: col - 1, row },
    { col: col + 1, row },
    { col, row: row - 1 },
    { col, row: row + 1 },
  ].filter(
    (p) =>
      p.col >= 0 &&
      p.col < FARM_GRID.cols &&
      p.row >= 0 &&
      p.row < FARM_GRID.rows &&
      !placedCorn.some((c) => c.col === p.col && c.row === p.row)
  )
  if (dirs.length === 0) return null
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
    eatTimerSec: 0,
    wanderCooldownSec: FARM_LEVEL1.chickenWanderIntervalSec,
    energy: FARM_LEVEL1.chickenMaxEnergy,
    dead: false,
    deadTimerSec: 0,
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
    pendingSaleEggs: 0,
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
    placedCorn: state.placedCorn.map((c) => ({ ...c })),
    farmer: { ...state.farmer },
  }

  // 1) Accruals
  next.cifAccrued += cfg.cifCostPerSec
  if (next.farmer.state === 'working') next.modAccrued += cfg.modCostPerSec

  // 2) Chicken AI
  //    Energy drains over time always (not from laying eggs).
  //    When energy <= hungerThreshold the chicken seeks corn to recharge.
  //    Eggs are laid on a timer while wandering (decoupled from corn eating).
  //    Chickens never lay on a corn tile — they move to an adjacent free tile first.
  for (const chicken of next.chickens) {
    // Dead chickens just wait for the fade animation to finish before removal
    if (chicken.dead) {
      chicken.deadTimerSec += 1
      continue
    }

    // Energy drain — happens every tick regardless of state
    chicken.energy = Math.max(0, chicken.energy - cfg.chickenEnergyDrainPerSec)

    // A chicken actively eating or seeking corn cannot die immediately —
    // eating will restore energy within the same tick's state machine.
    if (chicken.energy <= 0 && chicken.state !== 'eating' && chicken.state !== 'seeking') {
      chicken.dead = true
      chicken.deadTimerSec = 0
      continue
    }

    if (chicken.state === 'laying') {
      // Laying animation timer — egg drops after eggLayAnimSec
      chicken.layTimerSec += 1
      if (chicken.layTimerSec >= cfg.eggLayAnimSec && next.groundEggs.length < cfg.maxGroundEggs) {
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
    } else if (chicken.state === 'eating') {
      const corn = next.placedCorn.find((c) => c.id === chicken.targetCornId)
      if (!corn) {
        // Corn was taken by another chicken while eating
        chicken.state = 'wandering'
        chicken.targetCornId = null
        chicken.eatTimerSec = 0
      } else {
        const ratePerTick = cfg.chickenCornEnergyRestore / cfg.cornEatDurationSec
        const needed = cfg.chickenMaxEnergy - chicken.energy
        const bite = Math.min(ratePerTick, needed, corn.remainingEnergy)

        chicken.energy += bite
        corn.remainingEnergy -= bite
        chicken.eatTimerSec += 1

        if (corn.remainingEnergy <= 0) {
          // Corn fully depleted — remove and charge cost
          next.placedCorn = next.placedCorn.filter((c) => c.id !== chicken.targetCornId)
          next.cornConsumedValue += cfg.cornUnitCost
          chicken.state = 'wandering'
          chicken.targetCornId = null
          chicken.eatTimerSec = 0
          chicken.wanderCooldownSec = cfg.chickenWanderIntervalSec
        } else if (chicken.energy >= cfg.chickenMaxEnergy) {
          // Chicken is full — leave corn for other chickens
          chicken.state = 'wandering'
          chicken.targetCornId = null
          chicken.eatTimerSec = 0
          chicken.wanderCooldownSec = cfg.chickenWanderIntervalSec
        }
      }
    } else if (chicken.state === 'seeking') {
      const corn = next.placedCorn.find((c) => c.id === chicken.targetCornId)
      if (!corn) {
        chicken.state = 'wandering'
        chicken.targetCornId = null
      } else if (chicken.col === corn.col && chicken.row === corn.row) {
        // Reached corn tile: start eating progressively
        chicken.state = 'eating'
        chicken.eatTimerSec = 0
      } else {
        // Move 2 tiles per tick — combined with the slower lerp this gives smooth 2× speed
        for (let i = 0; i < 2; i++) {
          if (chicken.col === corn.col && chicken.row === corn.row) break
          const step = stepToward(
            { col: chicken.col, row: chicken.row },
            { col: corn.col, row: corn.row }
          )
          chicken.col = step.col
          chicken.row = step.row
        }
      }
    } else {
      // wandering: hunger check → random movement → production timer
      if (chicken.energy <= cfg.chickenHungerThreshold) {
        const corn = findNearest(next.placedCorn, chicken.col, chicken.row)
        if (corn) {
          chicken.state = 'seeking'
          chicken.targetCornId = corn.id
          continue
        }
        // No corn available — keep wandering hungry
      }

      // Random movement
      chicken.wanderCooldownSec -= 1
      if (chicken.wanderCooldownSec <= 0) {
        const n = randomNeighbor(chicken.col, chicken.row)
        chicken.col = n.col
        chicken.row = n.row
        chicken.wanderCooldownSec = cfg.chickenWanderIntervalSec
      }

      // Production timer — paused while hungry (survival > production)
      if (chicken.energy > cfg.chickenHungerThreshold) {
        chicken.layTimerSec += 1
        if (chicken.layTimerSec >= cfg.eggLayTimeSec) {
          const cornOnTile = next.placedCorn.some(
            (c) => c.col === chicken.col && c.row === chicken.row
          )
          if (cornOnTile) {
            // Move to an adjacent corn-free tile before laying
            const free = findAdjacentFreeTile(chicken.col, chicken.row, next.placedCorn)
            if (free) {
              chicken.col = free.col
              chicken.row = free.row
              chicken.state = 'laying'
              chicken.layTimerSec = 0
            }
            // If no free tile, defer until next tick
          } else {
            chicken.state = 'laying'
            chicken.layTimerSec = 0
          }
        }
      }
    }
  }

  // Remove chickens whose death fade animation has completed (2 s after death)
  next.chickens = next.chickens.filter((c) => !c.dead || c.deadTimerSec < 2)

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
      if (s.cornStock > 0) return
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
        placedCorn: [
          ...s.placedCorn,
          { id: nextCornId(), col, row, remainingEnergy: FARM_LEVEL1.chickenCornEnergyRestore },
        ],
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
        pendingSaleEggs: eggCount,
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
        pendingSaleEggs: 0,
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
            eatTimerSec: 0,
            wanderCooldownSec: FARM_LEVEL1.chickenWanderIntervalSec,
            energy: FARM_LEVEL1.chickenMaxEnergy,
            dead: false,
            deadTimerSec: 0,
          },
        ],
      })
    },

    tick: () => set((s) => advanceFarm(s)),
  }
})
