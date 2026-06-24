import { create } from 'zustand'
import type { LevelStars } from '@/types'
import { FARM_LEVEL1 } from '@/constants/farmBalance'

// ── Domain types ──────────────────────────────────────────────────────────────

export interface Chicken {
  id: string
  col: number
  row: number
  layTimerSec: number // accumulates while corn is available; resets on lay
}

export interface GroundEgg {
  id: string
  col: number
  row: number
  collecting: boolean
  collectElapsedSec: number
}

export type FarmerState = 'idle' | 'working'

export interface Farmer {
  state: FarmerState
  targetEggId: string | null
}

/** Pure data slice (no actions) — the unit advanced one real second at a time. */
export interface FarmState {
  cash: number
  cornStock: number
  chickens: Chicken[]
  groundEggs: GroundEgg[]
  warehouseEggs: number // PT: collected, unsold
  eggsCollectedTotal: number // objective counter (cumulative deposits)
  elapsedSec: number
  farmer: Farmer

  // Accounting accumulators (consumed by the ECPV panel in US-3)
  cornPurchasedValue: number // purchases (MPD bought)
  cornConsumedValue: number // materialUsed (MPD consumed by chickens)
  modAccrued: number // MOD (farmer labor)
  cifAccrued: number // CIF (farm operation)
  revenue: number
  eggsSold: number

  levelComplete: boolean
  stars: LevelStars
}

// Layout — logical grid tiles. Screen mapping is done by the scene via IsoGrid.
export const FARM_GRID = { cols: 6, rows: 6 } as const
const CHICKEN_TILE = { col: 2, row: 2 } as const
// Candidate tiles where a freshly laid egg can appear (around the chicken).
const EGG_SPAWN_TILES = [
  { col: 3, row: 2 },
  { col: 2, row: 3 },
  { col: 3, row: 3 },
  { col: 1, row: 2 },
  { col: 2, row: 1 },
  { col: 3, row: 1 },
  { col: 1, row: 3 },
  { col: 4, row: 2 },
] as const

let eggCounter = 0
function nextEggId(): string {
  eggCounter += 1
  return `egg-${eggCounter}`
}

export function computeStars(elapsedSec: number): LevelStars {
  const { three, two } = FARM_LEVEL1.starThresholdsSec
  if (elapsedSec <= three) return 3
  if (elapsedSec <= two) return 2
  return 1
}

function initialFarmState(): FarmState {
  const chickens: Chicken[] = Array.from({ length: FARM_LEVEL1.initialChickens }, (_, i) => ({
    id: `chicken-${i + 1}`,
    col: CHICKEN_TILE.col,
    row: CHICKEN_TILE.row,
    layTimerSec: 0,
  }))

  return {
    cash: FARM_LEVEL1.initialCash,
    cornStock: 0,
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
    levelComplete: false,
    stars: 0,
  }
}

/**
 * Pure simulation step: advance the farm by one real second.
 * No store/React/Phaser access — fully testable in isolation.
 */
export function advanceFarm(state: FarmState, cfg = FARM_LEVEL1): FarmState {
  if (state.levelComplete) return state

  const next: FarmState = {
    ...state,
    elapsedSec: state.elapsedSec + 1,
    chickens: state.chickens.map((c) => ({ ...c })),
    groundEggs: state.groundEggs.map((e) => ({ ...e })),
    farmer: { ...state.farmer },
  }

  // 1) Operating costs accrue every second; labor only while the farmer works.
  next.cifAccrued += cfg.cifCostPerSec
  if (next.farmer.state === 'working') next.modAccrued += cfg.modCostPerSec

  // 2) Chickens lay eggs while corn is available and the field isn't full.
  for (const chicken of next.chickens) {
    if (next.cornStock <= 0) continue
    if (next.groundEggs.length >= cfg.maxGroundEggs) break
    chicken.layTimerSec += 1
    if (chicken.layTimerSec >= cfg.eggLayTimeSec) {
      chicken.layTimerSec = 0
      next.cornStock -= 1
      next.cornConsumedValue += cfg.cornUnitCost
      const tile = EGG_SPAWN_TILES[next.eggsCollectedTotal % EGG_SPAWN_TILES.length]
      next.groundEggs.push({
        id: nextEggId(),
        col: tile.col,
        row: tile.row,
        collecting: false,
        collectElapsedSec: 0,
      })
    }
  }

  // 3) Farmer collects the targeted egg.
  if (next.farmer.state === 'working' && next.farmer.targetEggId) {
    const egg = next.groundEggs.find((e) => e.id === next.farmer.targetEggId)
    if (!egg) {
      next.farmer = { state: 'idle', targetEggId: null }
    } else {
      egg.collectElapsedSec += 1
      if (egg.collectElapsedSec >= cfg.farmerCollectTimeSec) {
        next.groundEggs = next.groundEggs.filter((e) => e.id !== egg.id)
        next.warehouseEggs += 1
        next.eggsCollectedTotal += 1
        next.farmer = { state: 'idle', targetEggId: null }
      }
    }
  }

  // 4) Objective check.
  if (!next.levelComplete && next.eggsCollectedTotal >= cfg.objectiveEggs) {
    next.levelComplete = true
    next.stars = computeStars(next.elapsedSec)
  }

  return next
}

// ── Store ───────────────────────────────────────────────────────────────────

interface FarmStore extends FarmState {
  initLevel: () => void
  rechargeCorn: () => void
  requestCollect: (eggId: string) => void
  sellEggs: () => void
  tick: () => void
}

export const useFarmStore = create<FarmStore>((set, get) => ({
  ...initialFarmState(),

  initLevel: () => {
    eggCounter = 0
    set(initialFarmState())
  },

  // Player clicks the corn warehouse — buy corn (MPD purchase) if cash allows.
  rechargeCorn: () => {
    const s = get()
    if (s.levelComplete) return
    const cost = FARM_LEVEL1.cornUnitCost * FARM_LEVEL1.cornPerRecharge
    if (s.cash < cost) return
    set({
      cash: s.cash - cost,
      cornStock: s.cornStock + FARM_LEVEL1.cornPerRecharge,
      cornPurchasedValue: s.cornPurchasedValue + cost,
    })
  },

  // Player clicks an egg — dispatch the farmer if it's free.
  requestCollect: (eggId) => {
    const s = get()
    if (s.levelComplete || s.farmer.state !== 'idle') return
    const egg = s.groundEggs.find((e) => e.id === eggId)
    if (!egg || egg.collecting) return
    set({
      groundEggs: s.groundEggs.map((e) => (e.id === eggId ? { ...e, collecting: true } : e)),
      farmer: { state: 'working', targetEggId: eggId },
    })
  },

  // Player clicks the sell cart — sell all warehouse eggs.
  sellEggs: () => {
    const s = get()
    if (s.warehouseEggs <= 0) return
    const income = s.warehouseEggs * FARM_LEVEL1.eggSellPrice
    set({
      cash: s.cash + income,
      revenue: s.revenue + income,
      eggsSold: s.eggsSold + s.warehouseEggs,
      warehouseEggs: 0,
    })
  },

  tick: () => set((s) => advanceFarm(s)),
}))
