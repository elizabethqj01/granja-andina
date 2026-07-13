import type { LevelStars, ScoreBreakdown } from '@/types'

export interface LevelScoreInput {
  eggsCollectedTotal: number
  objectiveEggs: number
  chickensBought: number
  objectiveChickens: number
  elapsedSec: number
  starThresholdsSec: { three: number; two: number }
  costPerEgg: number
  benchmarkCostPerEgg: number
  ecpvBalanced: boolean
}

export interface LevelScoreResult {
  score: number
  stars: LevelStars
  breakdown: ScoreBreakdown
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

// Eggs are always required; the chicken headcount goal only applies to levels
// that set one (0 = disabled). With both active, we average the two ratios —
// the level only counts as "done" when both are met, but partial attempts
// still deserve partial credit split evenly between the two goals. When the
// chicken goal is disabled it must NOT count as a free 100% toward the
// average, or an untouched level would still score a phantom 50%.
function metasScore(input: LevelScoreInput): number {
  const eggsRatio = clamp(input.eggsCollectedTotal / Math.max(input.objectiveEggs, 1), 0, 1)
  if (input.objectiveChickens === 0) return eggsRatio * 100
  const chickensRatio = clamp(input.chickensBought / input.objectiveChickens, 0, 1)
  return ((eggsRatio + chickensRatio) / 2) * 100
}

// 100 within the 3-star time, 70 within the 2-star time, then decays toward a
// floor of 40 the longer the level drags on past that second threshold.
function tiempoScore(elapsedSec: number, thresholds: { three: number; two: number }): number {
  if (elapsedSec <= thresholds.three) return 100
  if (elapsedSec <= thresholds.two) return 70
  const overBy = elapsedSec - thresholds.two
  const decayed = 70 - (overBy / Math.max(thresholds.two, 1)) * 30
  return clamp(Math.round(decayed), 40, 70)
}

function costoUnitarioScore(costPerEgg: number, benchmark: number): number {
  return clamp(Math.round((100 * benchmark) / Math.max(costPerEgg, 0.01)), 0, 100)
}

// especificaciones.md §2.1: < 60 = 1 star, 60-79 = 2, >= 80 = 3 — there is no 0-star tier.
function starsFromScore(score: number): LevelStars {
  if (score >= 80) return 3
  if (score >= 60) return 2
  return 1
}

/** Official PuntajeNivel formula (especificaciones.md §2.1) — codificado tal cual. */
export function calculateLevelScore(input: LevelScoreInput): LevelScoreResult {
  const metas = metasScore(input)
  const correctitud = input.ecpvBalanced ? 100 : 0
  const tiempo = tiempoScore(input.elapsedSec, input.starThresholdsSec)
  const costoUnitario = costoUnitarioScore(input.costPerEgg, input.benchmarkCostPerEgg)

  const score = Math.round(metas * 0.4 + correctitud * 0.35 + tiempo * 0.15 + costoUnitario * 0.1)

  return {
    score,
    stars: starsFromScore(score),
    breakdown: { metas, correctitud, tiempo, costoUnitario },
  }
}
