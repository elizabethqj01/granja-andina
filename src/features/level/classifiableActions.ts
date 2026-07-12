import type { LevelSnapshot } from '@/types'

export type ClassificationCategory =
  | 'MPD'
  | 'MPD_A_PRODUCCION'
  | 'MOD'
  | 'CIF'
  | 'PRODUCCION_A_PT'
  | 'PT_A_VENTAS'

export interface ClassifiableAction {
  id: string
  atSec: number
  label: string
  monto: number
  correctCategory: ClassificationCategory
}

/**
 * FC-01 — turns a saved attempt's transactions/costEvents into the list of
 * actions the student classifies. costPerEgg is passed in (computed by the
 * caller via computeFarmCostStatement) rather than recomputed here, so this
 * stays a plain data-mapping function with no knowledge of the ECPV formula.
 */
export function buildClassifiableActions(
  snapshot: LevelSnapshot,
  costPerEgg: number
): ClassifiableAction[] {
  const actions: ClassifiableAction[] = []

  for (const t of snapshot.transactions) {
    if (t.label === 'Compra maíz') {
      actions.push({
        id: `txn-${t.id}`,
        atSec: t.atSec,
        label: 'Compraste maíz',
        monto: Math.abs(t.amount),
        correctCategory: 'MPD',
      })
    } else if (t.label === 'Venta de huevos') {
      actions.push({
        id: `txn-${t.id}`,
        atSec: t.atSec,
        label: 'Vendiste huevos',
        monto: t.amount,
        correctCategory: 'PT_A_VENTAS',
      })
    }
    // 'Compra gallina' intentionally skipped — costEvents type 'chicken' below
    // is the same event, and journaling/classifying both would double it.
  }

  for (const e of snapshot.costEvents) {
    if (e.type === 'mod') {
      actions.push({
        id: `cost-${e.id}`,
        atSec: e.atSec,
        label: 'Pagaste jornal al granjero',
        monto: e.amount,
        correctCategory: 'MOD',
      })
    } else if (e.type === 'chicken') {
      actions.push({
        id: `cost-${e.id}`,
        atSec: e.atSec,
        label: 'Compraste una gallina',
        monto: e.amount,
        correctCategory: 'CIF',
      })
    } else if (e.type === 'corn_placed') {
      actions.push({
        id: `cost-${e.id}`,
        atSec: e.atSec,
        label: 'Diste maíz a la gallina',
        monto: e.amount,
        correctCategory: 'MPD_A_PRODUCCION',
      })
    } else if (e.type === 'egg_collected') {
      actions.push({
        id: `cost-${e.id}`,
        atSec: e.atSec,
        label: 'Se produjo un huevo',
        monto: Math.round(costPerEgg),
        correctCategory: 'PRODUCCION_A_PT',
      })
    }
  }

  return actions.sort((a, b) => a.atSec - b.atSec)
}
