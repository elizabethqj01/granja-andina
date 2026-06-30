export const FARM_LEVEL1 = {
  // ── Objective & stars ──────────────────────────────────────────────────────
  objectiveEggs: 4,
  objectiveChickens: 0, // 0 = no chicken objective
  initialChickens: 1,
  initialCornStock: 0,
  timeLimitSec: null as number | null,
  starThresholdsSec: { three: 60, two: 120 },

  // ── Economy ────────────────────────────────────────────────────────────────
  initialCash: 190,
  cornUnitCost: 4,
  cornPerRecharge: 5,
  eggSellPrice: 10,

  // ── Production & labor timing (seconds) ────────────────────────────────────
  eggLayTimeSec: 8,
  farmerCollectTimeSec: 3,
  modCostPerSec: 5,
  cifCostPerSec: 2,

  // ── Field limits ───────────────────────────────────────────────────────────
  maxGroundEggs: 8,
  eggSpoilTimeSec: 30,
  maxWarehouseEggs: 10,
  chickenWanderIntervalSec: 2,

  // ── Animal shop ────────────────────────────────────────────────────────────
  chickenBuyPrice: 100,
  chickenSellPrice: 50,
  maxChickens: 4,

  // ── Chicken energy system ──────────────────────────────────────────────────
  chickenMaxEnergy: 8,
  chickenHungerThreshold: 3,
  chickenEnergyDrainPerSec: 0.5,
  chickenCornEnergyRestore: 15,
  eggLayAnimSec: 2,
  cornEatDurationSec: 3,

  // ── Visual / rendering ─────────────────────────────────────────────────────
  chickenScale: 0.52,
  chickenLerpSpeed: 0.12,
  chickenHungerLerpSpeed: 0.06,
  farmerScale: 0.78,
  farmerLerpSpeed: 0.07,
} as const

export const FARM_LEVEL2 = {
  ...FARM_LEVEL1,
  // ── Objectives ─────────────────────────────────────────────────────────────
  objectiveEggs: 20,
  objectiveChickens: 5, // need 5 living chickens simultaneously
  initialChickens: 2,
  initialCornStock: 5, // starts with a full corn batch
  starThresholdsSec: { three: 180, two: 240 },

  // ── Economy ────────────────────────────────────────────────────────────────
  initialCash: 190,
  maxChickens: 6,
} as const

export interface FarmLevelConfig {
  objectiveEggs: number
  objectiveChickens: number
  initialChickens: number
  initialCornStock: number
  timeLimitSec: number | null
  starThresholdsSec: { readonly three: number; readonly two: number }
  initialCash: number
  cornUnitCost: number
  cornPerRecharge: number
  eggSellPrice: number
  eggLayTimeSec: number
  farmerCollectTimeSec: number
  modCostPerSec: number
  cifCostPerSec: number
  maxGroundEggs: number
  eggSpoilTimeSec: number
  maxWarehouseEggs: number
  chickenWanderIntervalSec: number
  chickenBuyPrice: number
  chickenSellPrice: number
  maxChickens: number
  chickenMaxEnergy: number
  chickenHungerThreshold: number
  chickenEnergyDrainPerSec: number
  chickenCornEnergyRestore: number
  eggLayAnimSec: number
  cornEatDurationSec: number
  chickenScale: number
  chickenLerpSpeed: number
  chickenHungerLerpSpeed: number
  farmerScale: number
  farmerLerpSpeed: number
}

export type LevelId = 1 | 2
