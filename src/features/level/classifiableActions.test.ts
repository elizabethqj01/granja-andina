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
    expect(action).toMatchObject({ monto: 20, count: 1, correctCategory: 'MPD' })
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

  it('should_groupRepeatedActionsOfTheSameKind_intoOneEntry', () => {
    const actions = buildClassifiableActions(
      snapshot({
        costEvents: [
          costEvent({ id: 'e1', type: 'egg_collected', atSec: 10 }),
          costEvent({ id: 'e2', type: 'egg_collected', atSec: 20 }),
          costEvent({ id: 'e3', type: 'egg_collected', atSec: 30 }),
          costEvent({ id: 'e4', type: 'egg_collected', atSec: 40 }),
        ],
      }),
      10
    )
    expect(actions).toHaveLength(1)
    expect(actions[0]).toMatchObject({
      count: 4,
      monto: 40, // 4 eggs × $10 each, summed
      correctCategory: 'PRODUCCION_A_PT',
      atSec: 10, // earliest occurrence
    })
    expect(actions[0].label).toContain('4')
  })

  it('should_sumMontos_whenGroupingRepeatedTransactions', () => {
    const actions = buildClassifiableActions(
      snapshot({
        transactions: [
          txn({ id: 't1', atSec: 3, amount: -20 }),
          txn({ id: 't2', atSec: 40, amount: -20 }),
          txn({ id: 't3', atSec: 80, amount: -20 }),
        ],
      }),
      10
    )
    expect(actions).toHaveLength(1)
    expect(actions[0]).toMatchObject({ count: 3, monto: 60 })
  })

  it('should_notMixDifferentKinds_intoTheSameGroup', () => {
    const actions = buildClassifiableActions(
      snapshot({
        transactions: [txn({ id: 't1', atSec: 3 })],
        costEvents: [costEvent({ id: 'c1', type: 'mod', atSec: 5 })],
      }),
      10
    )
    expect(actions).toHaveLength(2)
  })
})
