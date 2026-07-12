import { describe, it, expect } from 'vitest'
import { buildClassifiableActions } from './classifiableActions'
import type { LevelSnapshot, Transaction, CostEvent } from '@/types'

function snapshot(overrides: Partial<LevelSnapshot> = {}): LevelSnapshot {
  return {
    uid: 'u1',
    levelId: 1,
    outcome: 'completed',
    elapsedSec: 60,
    cornPurchasedValue: 20,
    cornStock: 0,
    modAccrued: 12,
    cifAccrued: 10,
    chickenCostAccrued: 0,
    warehouseEggs: 4,
    groundEggsCount: 0,
    eggsCollectedTotal: 4,
    revenue: 208,
    eggsSold: 4,
    cash: 396,
    stars: 3,
    finalScore: 100,
    transactions: [],
    costEvents: [],
    completedAt: null as never,
    ...overrides,
  }
}

function txn(overrides: Partial<Transaction> = {}): Transaction {
  return { id: 't1', atSec: 3, label: 'Compra maíz', amount: -20, ...overrides }
}

function costEvent(overrides: Partial<CostEvent> = {}): CostEvent {
  return { id: 'c1', atSec: 5, type: 'mod', detail: '', amount: 12, ...overrides }
}

describe('buildClassifiableActions', () => {
  it('should_classifyCornPurchase_asMPD', () => {
    const [action] = buildClassifiableActions(snapshot({ transactions: [txn()] }), 10)
    expect(action).toMatchObject({ monto: 20, correctCategory: 'MPD' })
  })

  it('should_classifyEggSale_asPT_A_VENTAS', () => {
    const [action] = buildClassifiableActions(
      snapshot({ transactions: [txn({ label: 'Venta de huevos', amount: 208 })] }),
      10
    )
    expect(action).toMatchObject({ monto: 208, correctCategory: 'PT_A_VENTAS' })
  })

  it('should_skipCompraGallinaTransaction_toAvoidDoubleCounting', () => {
    const actions = buildClassifiableActions(
      snapshot({ transactions: [txn({ label: 'Compra gallina', amount: -100 })] }),
      10
    )
    expect(actions).toHaveLength(0)
  })

  it('should_classifyModEvent_asMOD', () => {
    const [action] = buildClassifiableActions(
      snapshot({ costEvents: [costEvent({ type: 'mod', amount: 12 })] }),
      10
    )
    expect(action).toMatchObject({ monto: 12, correctCategory: 'MOD' })
  })

  it('should_classifyChickenEvent_asCIF', () => {
    const [action] = buildClassifiableActions(
      snapshot({ costEvents: [costEvent({ type: 'chicken', amount: 100 })] }),
      10
    )
    expect(action).toMatchObject({ monto: 100, correctCategory: 'CIF' })
  })

  it('should_classifyCornPlacedEvent_asMPD_A_PRODUCCION', () => {
    const [action] = buildClassifiableActions(
      snapshot({ costEvents: [costEvent({ type: 'corn_placed', amount: 4 })] }),
      10
    )
    expect(action).toMatchObject({ monto: 4, correctCategory: 'MPD_A_PRODUCCION' })
  })

  it('should_classifyEggCollectedEvent_asPRODUCCION_A_PT_usingCostPerEgg', () => {
    const [action] = buildClassifiableActions(
      snapshot({ costEvents: [costEvent({ type: 'egg_collected', amount: 0 })] }),
      10.5
    )
    expect(action).toMatchObject({ monto: 11, correctCategory: 'PRODUCCION_A_PT' })
  })

  it('should_sortActionsChronologically', () => {
    const actions = buildClassifiableActions(
      snapshot({
        transactions: [txn({ id: 't-late', atSec: 30 })],
        costEvents: [costEvent({ id: 'c-early', atSec: 5 })],
      }),
      10
    )
    expect(actions.map((a) => a.atSec)).toEqual([5, 30])
  })
})
