import { describe, it, expect, beforeEach } from 'vitest'
import { advanceFarm, computeStars, useFarmStore, type FarmState } from './farmStore'
import { FARM_LEVEL1 } from '@/constants/farmBalance'

function baseState(overrides: Partial<FarmState> = {}): FarmState {
  return {
    cash: 1_000,
    cornStock: 0,
    chickens: [{ id: 'c1', col: 2, row: 2, layTimerSec: 0 }],
    groundEggs: [],
    warehouseEggs: 0,
    eggsCollectedTotal: 0,
    elapsedSec: 0,
    farmer: { state: 'idle', targetEggId: null },
    cornPurchasedValue: 0,
    cornConsumedValue: 0,
    modAccrued: 0,
    cifAccrued: 0,
    revenue: 0,
    eggsSold: 0,
    levelComplete: false,
    stars: 0,
    ...overrides,
  }
}

describe('computeStars', () => {
  it('should_award3Stars_when_under60Seconds', () => {
    expect(computeStars(45)).toBe(3)
    expect(computeStars(60)).toBe(3)
  })

  it('should_award2Stars_when_between60And120Seconds', () => {
    expect(computeStars(61)).toBe(2)
    expect(computeStars(120)).toBe(2)
  })

  it('should_award1Star_when_over120Seconds', () => {
    expect(computeStars(121)).toBe(1)
  })
})

describe('advanceFarm', () => {
  it('should_accrueCif_when_running', () => {
    const next = advanceFarm(baseState())
    expect(next.cifAccrued).toBe(FARM_LEVEL1.cifCostPerSec)
    expect(next.elapsedSec).toBe(1)
  })

  it('should_notAccrueMod_when_farmerIdle', () => {
    const next = advanceFarm(baseState())
    expect(next.modAccrued).toBe(0)
  })

  it('should_notLayEgg_when_noCorn', () => {
    let state = baseState({ cornStock: 0 })
    for (let i = 0; i < FARM_LEVEL1.eggLayTimeSec + 2; i++) state = advanceFarm(state)
    expect(state.groundEggs).toHaveLength(0)
  })

  it('should_layEggAndConsumeCorn_when_layTimerElapsesWithCorn', () => {
    let state = baseState({ cornStock: 2 })
    for (let i = 0; i < FARM_LEVEL1.eggLayTimeSec; i++) state = advanceFarm(state)
    expect(state.groundEggs).toHaveLength(1)
    expect(state.cornStock).toBe(1)
    expect(state.cornConsumedValue).toBe(FARM_LEVEL1.cornUnitCost)
  })

  it('should_depositEgg_when_farmerFinishesCollecting', () => {
    let state = baseState({
      groundEggs: [{ id: 'e1', col: 3, row: 2, collecting: true, collectElapsedSec: 0 }],
      farmer: { state: 'working', targetEggId: 'e1' },
    })
    for (let i = 0; i < FARM_LEVEL1.farmerCollectTimeSec; i++) state = advanceFarm(state)
    expect(state.groundEggs).toHaveLength(0)
    expect(state.warehouseEggs).toBe(1)
    expect(state.eggsCollectedTotal).toBe(1)
    expect(state.farmer.state).toBe('idle')
  })

  it('should_accrueMod_when_farmerWorking', () => {
    const state = baseState({
      groundEggs: [{ id: 'e1', col: 3, row: 2, collecting: true, collectElapsedSec: 0 }],
      farmer: { state: 'working', targetEggId: 'e1' },
    })
    const next = advanceFarm(state)
    expect(next.modAccrued).toBe(FARM_LEVEL1.modCostPerSec)
  })

  it('should_completeLevel_when_objectiveEggsCollected', () => {
    const state = baseState({
      eggsCollectedTotal: FARM_LEVEL1.objectiveEggs - 1,
      groundEggs: [
        {
          id: 'e1',
          col: 3,
          row: 2,
          collecting: true,
          collectElapsedSec: FARM_LEVEL1.farmerCollectTimeSec - 1,
        },
      ],
      farmer: { state: 'working', targetEggId: 'e1' },
      elapsedSec: 30,
    })
    const next = advanceFarm(state)
    expect(next.levelComplete).toBe(true)
    expect(next.stars).toBe(3)
  })

  it('should_freezeState_when_levelComplete', () => {
    const state = baseState({ levelComplete: true, elapsedSec: 99 })
    const next = advanceFarm(state)
    expect(next).toBe(state)
  })
})

describe('useFarmStore actions', () => {
  beforeEach(() => useFarmStore.getState().initLevel())

  it('should_buyCornAndDebitCash_when_rechargeCorn', () => {
    useFarmStore.getState().rechargeCorn()
    const s = useFarmStore.getState()
    expect(s.cornStock).toBe(FARM_LEVEL1.cornPerRecharge)
    expect(s.cash).toBe(
      FARM_LEVEL1.initialCash - FARM_LEVEL1.cornUnitCost * FARM_LEVEL1.cornPerRecharge
    )
  })

  it('should_dispatchFarmer_when_requestCollectValidEgg', () => {
    useFarmStore.setState({
      groundEggs: [{ id: 'e1', col: 3, row: 2, collecting: false, collectElapsedSec: 0 }],
    })
    useFarmStore.getState().requestCollect('e1')
    const s = useFarmStore.getState()
    expect(s.farmer).toEqual({ state: 'working', targetEggId: 'e1' })
    expect(s.groundEggs[0].collecting).toBe(true)
  })

  it('should_sellWarehouseEggsForCash_when_sellEggs', () => {
    useFarmStore.setState({ warehouseEggs: 3 })
    useFarmStore.getState().sellEggs()
    const s = useFarmStore.getState()
    expect(s.warehouseEggs).toBe(0)
    expect(s.eggsSold).toBe(3)
    expect(s.revenue).toBe(3 * FARM_LEVEL1.eggSellPrice)
  })
})
