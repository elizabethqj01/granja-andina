/**
 * Farm pivot — Level 1 economic & timing balance.
 *
 * Confirmed by product: objective = 4 eggs, no time limit, stars by elapsed time.
 * Remaining economic values are developer-proposed and tunable after playtest.
 */
export const FARM_LEVEL1 = {
  // ── Objective & stars (confirmed) ──────────────────────────────────────────
  objectiveEggs: 4,
  initialChickens: 1,
  timeLimitSec: null as number | null,
  starThresholdsSec: { three: 60, two: 120 },

  // ── Economy (developer-proposed, tunable) ──────────────────────────────────
  initialCash: 190,
  cornUnitCost: 4,
  cornPerRecharge: 5, // batch of 5 corn per warehouse click
  eggSellPrice: 10,

  // ── Production & labor timing (seconds) ────────────────────────────────────
  eggLayTimeSec: 8, // ticks from eating corn to laying egg
  farmerCollectTimeSec: 3, // ticks to pick up and deposit one egg
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
  chickenMaxEnergy: 8, // full energy bar
  chickenHungerThreshold: 3, // below this the chicken seeks corn
  chickenEnergyDrainPerSec: 0.5, // drains to 0 in ~46 s
  chickenCornEnergyRestore: 15, // energy restored per corn eaten (capped at max)
  eggLayAnimSec: 2, // how long the laying animation lasts before egg drops
  cornEatDurationSec: 3, // how long a chicken takes to eat corn (progressive)

  // ── Visual / rendering (tunable without touching scene code) ──────────────
  chickenScale: 0.52, // sprite scale (128px frame → ~66px on screen)
  chickenLerpSpeed: 0.12, // fraction of distance closed per frame (~0.5 s to reach tile)
  farmerScale: 0.78, // sprite scale (128px frame → ~100px on screen)
  farmerLerpSpeed: 0.07, // slower lerp so animations are visible
} as const

export type FarmLevelConfig = typeof FARM_LEVEL1
