import { describe, it, expect } from 'vitest'
import { calculateLevelScore, type LevelScoreInput } from './scoring'

const BASE: LevelScoreInput = {
  eggsCollectedTotal: 4,
  objectiveEggs: 4,
  chickensBought: 0,
  objectiveChickens: 0, // disabled, like Level 1
  elapsedSec: 30,
  starThresholdsSec: { three: 60, two: 120 },
  costPerEgg: 5,
  benchmarkCostPerEgg: 5,
  ecpvBalanced: true,
}

describe('calculateLevelScore', () => {
  describe('metas (40%)', () => {
    it('should_score_metas_as_full_when_eggs_objective_met_and_chickens_disabled', () => {
      const result = calculateLevelScore(BASE)
      expect(result.breakdown.metas).toBe(100)
    })

    it('should_score_metas_proportionally_when_eggs_partially_collected', () => {
      const result = calculateLevelScore({ ...BASE, eggsCollectedTotal: 2, objectiveEggs: 4 })
      expect(result.breakdown.metas).toBe(50)
    })

    it('should_score_metas_zero_when_level_abandoned_with_no_progress', () => {
      const result = calculateLevelScore({ ...BASE, eggsCollectedTotal: 0 })
      expect(result.breakdown.metas).toBe(0)
    })

    it('should_average_eggs_and_chickens_ratios_when_chickens_objective_active', () => {
      const result = calculateLevelScore({
        ...BASE,
        eggsCollectedTotal: 20,
        objectiveEggs: 20,
        chickensBought: 0,
        objectiveChickens: 5,
      })
      // eggs 100% + chickens 0% averaged = 50%
      expect(result.breakdown.metas).toBe(50)
    })

    it('should_not_exceed_100_when_progress_overshoots_objective', () => {
      const result = calculateLevelScore({ ...BASE, eggsCollectedTotal: 10, objectiveEggs: 4 })
      expect(result.breakdown.metas).toBe(100)
    })
  })

  describe('correctitud (35%)', () => {
    it('should_score_correctitud_full_when_ecpv_balances', () => {
      const result = calculateLevelScore({ ...BASE, ecpvBalanced: true })
      expect(result.breakdown.correctitud).toBe(100)
    })

    it('should_score_correctitud_zero_when_ecpv_does_not_balance', () => {
      const result = calculateLevelScore({ ...BASE, ecpvBalanced: false })
      expect(result.breakdown.correctitud).toBe(0)
    })
  })

  describe('tiempo (15%)', () => {
    it('should_score_tiempo_full_within_three_star_threshold', () => {
      const result = calculateLevelScore({ ...BASE, elapsedSec: 60 })
      expect(result.breakdown.tiempo).toBe(100)
    })

    it('should_score_tiempo_at_70_within_two_star_threshold', () => {
      const result = calculateLevelScore({ ...BASE, elapsedSec: 120 })
      expect(result.breakdown.tiempo).toBe(70)
    })

    it('should_decay_tiempo_score_past_two_star_threshold', () => {
      const result = calculateLevelScore({ ...BASE, elapsedSec: 180 }) // +60s over `two` (120)
      expect(result.breakdown.tiempo).toBeLessThan(70)
      expect(result.breakdown.tiempo).toBeGreaterThan(40)
    })

    it('should_floor_tiempo_score_at_40_for_very_long_sessions', () => {
      const result = calculateLevelScore({ ...BASE, elapsedSec: 100_000 })
      expect(result.breakdown.tiempo).toBe(40)
    })
  })

  describe('costoUnitario (10%)', () => {
    it('should_score_costoUnitario_full_when_at_or_below_benchmark', () => {
      const result = calculateLevelScore({ ...BASE, costPerEgg: 5, benchmarkCostPerEgg: 5 })
      expect(result.breakdown.costoUnitario).toBe(100)
    })

    it('should_score_costoUnitario_lower_when_above_benchmark', () => {
      const result = calculateLevelScore({ ...BASE, costPerEgg: 10, benchmarkCostPerEgg: 5 })
      expect(result.breakdown.costoUnitario).toBe(50)
    })

    it('should_not_divide_by_zero_when_costPerEgg_is_zero', () => {
      const result = calculateLevelScore({ ...BASE, costPerEgg: 0 })
      expect(result.breakdown.costoUnitario).toBe(100)
    })

    it('should_clamp_costoUnitario_score_to_100_when_cost_is_far_below_benchmark', () => {
      const result = calculateLevelScore({ ...BASE, costPerEgg: 0.5, benchmarkCostPerEgg: 5 })
      expect(result.breakdown.costoUnitario).toBe(100)
    })
  })

  describe('stars cutoffs', () => {
    it('should_award_three_stars_when_score_is_80_or_above', () => {
      const result = calculateLevelScore(BASE) // metas 100, correctitud 100, tiempo 100, costo 100 → 100
      expect(result.score).toBe(100)
      expect(result.stars).toBe(3)
    })

    it('should_award_two_stars_when_score_is_between_60_and_79', () => {
      const result = calculateLevelScore({
        ...BASE,
        eggsCollectedTotal: 2,
        objectiveEggs: 4, // metas 50
        elapsedSec: 180, // tiempo decays
      })
      expect(result.score).toBeGreaterThanOrEqual(60)
      expect(result.score).toBeLessThan(80)
      expect(result.stars).toBe(2)
    })

    it('should_award_one_star_when_score_is_between_1_and_59', () => {
      const result = calculateLevelScore({
        ...BASE,
        eggsCollectedTotal: 1,
        objectiveEggs: 4,
        ecpvBalanced: false,
        elapsedSec: 100_000,
        costPerEgg: 50,
      })
      expect(result.score).toBeGreaterThanOrEqual(1)
      expect(result.score).toBeLessThan(60)
      expect(result.stars).toBe(1)
    })

    it('should_never_award_zero_stars_since_the_spec_table_has_no_0-star_tier', () => {
      // Worst possible attempt: no progress, unbalanced math, maximum time, terrible unit cost.
      const result = calculateLevelScore({
        ...BASE,
        eggsCollectedTotal: 0,
        ecpvBalanced: false,
        elapsedSec: 100_000,
        costPerEgg: 5000,
      })
      expect(result.breakdown.metas).toBe(0)
      expect(result.stars).toBe(1)
    })
  })
})
