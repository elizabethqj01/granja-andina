/**
 * Farm pivot — Level 1 economic & timing balance.
 *
 * Confirmed by product: objective = 4 eggs, no time limit, stars by elapsed time.
 * Remaining economic values are developer-proposed and tunable after playtest;
 * the ECPV logic does not depend on the exact numbers.
 */
export const FARM_LEVEL1 = {
  // ── Objective & stars (confirmed) ──────────────────────────────────────────
  objectiveEggs: 4, // collect (deposit in warehouse) 4 eggs to win
  initialChickens: 1, // only the chicken is on the roster
  timeLimitSec: null as number | null, // no time limit; timer counts up
  // ≤60s → 3★, ≤120s → 2★, >120s → 1★
  starThresholdsSec: { three: 60, two: 120 },

  // ── Economy (developer-proposed, tunable) ──────────────────────────────────
  initialCash: 1_000, // enough working capital to buy corn comfortably
  cornUnitCost: 50, // COP per corn unit (MPD purchase)
  cornPerRecharge: 3, // corn units added per click on the corn warehouse
  eggSellPrice: 100, // COP per egg sold at the cart (revenue)

  // ── Production & labor timing (seconds) ────────────────────────────────────
  eggLayTimeSec: 8, // a chicken lays one egg every 8s while it has corn
  farmerCollectTimeSec: 3, // time to walk to an egg, pick it up and deposit it
  modCostPerSec: 5, // MOD: farmer labor accrued per second while working
  cifCostPerSec: 2, // CIF: farm operation accrued per second while running

  // ── Field limits ───────────────────────────────────────────────────────────
  maxGroundEggs: 8, // safety cap on uncollected eggs (WIP) on the field
} as const

export type FarmLevelConfig = typeof FARM_LEVEL1
