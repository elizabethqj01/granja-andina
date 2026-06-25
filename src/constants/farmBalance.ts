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
  initialCash: 1_000,
  cornUnitCost: 50,
  cornPerRecharge: 5, // batch of 5 corn per warehouse click
  eggSellPrice: 100,

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
  chickenBuyPrice: 500, // cost to add one more chicken
  chickenSellPrice: 250, // revenue when selling a chicken (half of buy price)
  maxChickens: 4, // maximum chickens allowed on the field
} as const

export type FarmLevelConfig = typeof FARM_LEVEL1
