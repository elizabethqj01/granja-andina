import { FARM_LEVEL1 } from '@/constants/farmBalance'

export interface FarmCostStatementInput {
  cornPurchasedValue: number
  cornStock: number
  modAccrued: number
  cifAccrued: number
  chickenCostAccrued: number
  warehouseEggs: number
  groundEggsCount: number
  eggsCollectedTotal: number
  revenue: number
}

export interface FarmCostStatement {
  invInicialMPD: number
  comprasMPD: number
  disponibleMPD: number
  invFinalMPD: number
  costoMPD: number
  mod: number
  cifOverhead: number
  chickenCostAccrued: number
  cif: number
  cornUnitsBought: number
  costoPeriodo: number
  invInicialWIP: number
  invFinalWIP: number
  costoTerminada: number
  invInicialPT: number
  invFinalPT: number
  costoVentas: number
  ingresos: number
  utilidad: number
  cornStock: number
  groundEggsCount: number
  warehouseEggs: number
  totalEggs: number
  costPerEgg: number
}

/**
 * Pure ECPV derivation for the farm pivot (MPD → WIP → PT → Ventas), shared by
 * the cost-scroll UI and the scoring formula so the two never drift apart.
 */
export function computeFarmCostStatement(input: FarmCostStatementInput): FarmCostStatement {
  const {
    cornPurchasedValue,
    cornStock,
    modAccrued,
    cifAccrued,
    chickenCostAccrued,
    warehouseEggs,
    groundEggsCount,
    eggsCollectedTotal,
    revenue,
  } = input

  // MPD
  const invInicialMPD = 0
  const comprasMPD = cornPurchasedValue
  const disponibleMPD = invInicialMPD + comprasMPD
  const invFinalMPD = cornStock * FARM_LEVEL1.cornUnitCost
  const costoMPD = disponibleMPD - invFinalMPD // canonical ECPV: compras − inv.final

  // Conversion
  const mod = modAccrued
  const cifOverhead = cifAccrued
  const cif = cifOverhead + chickenCostAccrued

  // Derived explanatory values (for student breakdown notes)
  const cornUnitsBought =
    FARM_LEVEL1.cornUnitCost > 0 ? Math.round(comprasMPD / FARM_LEVEL1.cornUnitCost) : 0

  // Cost of period
  const costoPeriodo = costoMPD + mod + cif

  // WIP
  const totalEggs = eggsCollectedTotal + groundEggsCount
  const costPerEgg = totalEggs > 0 ? costoPeriodo / totalEggs : 0
  const invInicialWIP = 0
  const invFinalWIP = Math.round(groundEggsCount * costPerEgg)
  const costoTerminada = invInicialWIP + costoPeriodo - invFinalWIP

  // PT
  const invInicialPT = 0
  const invFinalPT = Math.round(warehouseEggs * costPerEgg)
  const costoVentas = invInicialPT + costoTerminada - invFinalPT

  // Result
  const ingresos = revenue
  const utilidad = ingresos - costoVentas

  return {
    invInicialMPD,
    comprasMPD,
    disponibleMPD,
    invFinalMPD,
    costoMPD,
    mod,
    cifOverhead,
    chickenCostAccrued,
    cif,
    cornUnitsBought,
    costoPeriodo,
    invInicialWIP,
    invFinalWIP,
    costoTerminada,
    invInicialPT,
    invFinalPT,
    costoVentas,
    ingresos,
    utilidad,
    cornStock,
    groundEggsCount,
    warehouseEggs,
    totalEggs,
    costPerEgg,
  }
}
