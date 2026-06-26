import { describe, it, expect, beforeEach } from 'vitest'
import {
  advanceFarm,
  computeStars,
  useFarmStore,
  type FarmState,
  type ChickenState,
} from './farmStore'
import { FARM_LEVEL1 } from '@/constants/farmBalance'

const defaultChicken = {
  id: 'c1',
  col: 4,
  row: 3,
  state: 'wandering' as ChickenState,
  targetCornId: null,
  layTimerSec: 0,
  eatTimerSec: 0,
  wanderCooldownSec: FARM_LEVEL1.chickenWanderIntervalSec,
  energy: FARM_LEVEL1.chickenMaxEnergy,
}

function baseState(overrides: Partial<FarmState> = {}): FarmState {
  return {
    cash: 1_000,
    cornStock: 0,
    placedCorn: [],
    chickens: [{ ...defaultChicken }],
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
    saleState: 'idle',
    pendingSaleIncome: 0,
    levelComplete: false,
    stars: 0,
    notification: null,
    ...overrides,
  }
}

describe('computeStars', () => {
  it('should_award3Stars_when_under60Seconds', () => {
    expect(computeStars(45)).toBe(3)
    expect(computeStars(60)).toBe(3)
  })

  it('should_award2Stars_when_between61And120Seconds', () => {
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

  it('should_layEgg_automatically_when_productionTimerFires', () => {
    // Eggs are now laid on a timer (decoupled from corn)
    const state = baseState({
      chickens: [{ ...defaultChicken, layTimerSec: FARM_LEVEL1.eggLayTimeSec - 1 }],
    })
    const next = advanceFarm(state)
    expect(next.chickens[0].state).toBe('laying')
  })

  const corn1 = () => ({
    id: 'corn-1',
    col: 1,
    row: 1,
    remainingEnergy: FARM_LEVEL1.chickenCornEnergyRestore,
  })
  const corn1At = (col: number, row: number) => ({ ...corn1(), col, row })

  it('should_notSeekCorn_when_energyAboveThreshold', () => {
    const state = baseState({
      chickens: [{ ...defaultChicken, energy: FARM_LEVEL1.chickenMaxEnergy }],
      placedCorn: [corn1()],
    })
    const next = advanceFarm(state)
    expect(next.chickens[0].state).toBe('wandering')
  })

  it('should_seekCorn_when_energyBelowThreshold', () => {
    const state = baseState({
      chickens: [{ ...defaultChicken, energy: FARM_LEVEL1.chickenHungerThreshold }],
      placedCorn: [corn1()],
    })
    const next = advanceFarm(state)
    expect(next.chickens[0].state).toBe('seeking')
    expect(next.chickens[0].targetCornId).toBe('corn-1')
  })

  it('should_startEating_when_seekingAndOnCornTile', () => {
    const state = baseState({
      chickens: [
        { ...defaultChicken, col: 2, row: 2, state: 'seeking', targetCornId: 'corn-1', energy: 1 },
      ],
      placedCorn: [corn1At(2, 2)],
    })
    const next = advanceFarm(state)
    expect(next.chickens[0].state).toBe('eating')
    expect(next.placedCorn).toHaveLength(1)
  })

  it('should_leaveCornAndWander_when_chickenFull', () => {
    // Chicken with enough hunger to eat one bite then fill up — corn must persist
    const state = baseState({
      chickens: [
        {
          ...defaultChicken,
          col: 2,
          row: 2,
          state: 'eating',
          targetCornId: 'corn-1',
          energy: FARM_LEVEL1.chickenMaxEnergy - 1, // only 1 point away from full
          eatTimerSec: 0,
        },
      ],
      placedCorn: [corn1At(2, 2)],
    })
    const next = advanceFarm(state)
    expect(next.chickens[0].state).toBe('wandering')
    expect(next.chickens[0].energy).toBe(FARM_LEVEL1.chickenMaxEnergy)
    // Corn must still be there with reduced energy
    expect(next.placedCorn).toHaveLength(1)
    expect(next.placedCorn[0].remainingEnergy).toBeLessThan(FARM_LEVEL1.chickenCornEnergyRestore)
  })

  it('should_removeCorn_when_remainingEnergyDepleted', () => {
    // Corn with minimal remaining energy gets depleted in one tick
    const ratePerTick = FARM_LEVEL1.chickenCornEnergyRestore / FARM_LEVEL1.cornEatDurationSec
    let state = baseState({
      chickens: [
        {
          ...defaultChicken,
          col: 2,
          row: 2,
          state: 'eating',
          targetCornId: 'corn-1',
          energy: 0,
          eatTimerSec: 0,
        },
      ],
      placedCorn: [{ ...corn1At(2, 2), remainingEnergy: ratePerTick / 2 }],
    })
    state = advanceFarm(state)
    expect(state.chickens[0].state).toBe('wandering')
    expect(state.placedCorn).toHaveLength(0)
    expect(state.cornConsumedValue).toBe(FARM_LEVEL1.cornUnitCost)
  })

  it('should_layEggAtChickenPosition_when_layAnimTimerElapses', () => {
    const state = baseState({
      chickens: [
        {
          ...defaultChicken,
          col: 3,
          row: 5,
          state: 'laying',
          layTimerSec: FARM_LEVEL1.eggLayAnimSec - 1,
        },
      ],
    })
    const next = advanceFarm(state)
    expect(next.groundEggs).toHaveLength(1)
    expect(next.groundEggs[0].col).toBe(3)
    expect(next.groundEggs[0].row).toBe(5)
    expect(next.chickens[0].state).toBe('wandering')
  })

  it('should_drainEnergy_every_tick', () => {
    const state = baseState()
    const next = advanceFarm(state)
    expect(next.chickens[0].energy).toBeLessThan(FARM_LEVEL1.chickenMaxEnergy)
  })

  it('should_notLayEgg_when_energyIsZero', () => {
    // Chicken with 0 energy should not trigger the production timer
    const state = baseState({
      chickens: [{ ...defaultChicken, energy: 0, layTimerSec: FARM_LEVEL1.eggLayTimeSec - 1 }],
    })
    const next = advanceFarm(state)
    expect(next.chickens[0].state).toBe('wandering')
    expect(next.groundEggs).toHaveLength(0)
  })

  it('should_removeEgg_when_ageExceedsSpoilTimer', () => {
    const state = baseState({
      groundEggs: [
        {
          id: 'e1',
          col: 2,
          row: 2,
          collecting: false,
          collectElapsedSec: 0,
          ageTimerSec: FARM_LEVEL1.eggSpoilTimeSec,
        },
      ],
    })
    const next = advanceFarm(state)
    expect(next.groundEggs).toHaveLength(0)
  })

  it('should_notSpoilEgg_when_collecting', () => {
    const state = baseState({
      groundEggs: [
        {
          id: 'e1',
          col: 2,
          row: 2,
          collecting: true,
          collectElapsedSec: 0,
          ageTimerSec: FARM_LEVEL1.eggSpoilTimeSec + 10, // way over spoil limit
        },
      ],
      farmer: { state: 'working', targetEggId: 'e1' },
    })
    const next = advanceFarm(state)
    // Egg survives spoil filter because collecting === true; farmer hasn't finished yet (1 of 3 ticks)
    expect(next.groundEggs).toHaveLength(1)
  })

  it('should_depositEgg_when_farmerFinishesCollecting', () => {
    let state = baseState({
      groundEggs: [
        { id: 'e1', col: 3, row: 2, collecting: true, collectElapsedSec: 0, ageTimerSec: 0 },
      ],
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
      groundEggs: [
        { id: 'e1', col: 3, row: 2, collecting: true, collectElapsedSec: 0, ageTimerSec: 0 },
      ],
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
          ageTimerSec: 0,
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

  it('should_capWarehouseEggs_when_atMaxCapacity', () => {
    const state = baseState({
      warehouseEggs: FARM_LEVEL1.maxWarehouseEggs,
      groundEggs: [
        { id: 'e1', col: 3, row: 2, collecting: true, collectElapsedSec: 0, ageTimerSec: 0 },
      ],
      farmer: { state: 'working', targetEggId: 'e1' },
    })
    let s = state
    for (let i = 0; i < FARM_LEVEL1.farmerCollectTimeSec; i++) s = advanceFarm(s)
    expect(s.warehouseEggs).toBe(FARM_LEVEL1.maxWarehouseEggs)
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

  it('should_placeCornOnField_when_cornStockAvailable', () => {
    useFarmStore.getState().rechargeCorn()
    useFarmStore.getState().placeCorn(2, 3)
    const s = useFarmStore.getState()
    expect(s.placedCorn).toHaveLength(1)
    expect(s.placedCorn[0]).toMatchObject({ col: 2, row: 3 })
    expect(s.cornStock).toBe(FARM_LEVEL1.cornPerRecharge - 1)
  })

  it('should_notPlaceCorn_when_tileAlreadyOccupied', () => {
    useFarmStore.getState().rechargeCorn()
    useFarmStore.getState().placeCorn(2, 3)
    useFarmStore.getState().placeCorn(2, 3)
    expect(useFarmStore.getState().placedCorn).toHaveLength(1)
  })

  it('should_dispatchFarmer_when_requestCollectValidEgg', () => {
    useFarmStore.setState({
      groundEggs: [
        { id: 'e1', col: 3, row: 2, collecting: false, collectElapsedSec: 0, ageTimerSec: 0 },
      ],
    })
    useFarmStore.getState().requestCollect('e1')
    const s = useFarmStore.getState()
    expect(s.farmer).toEqual({ state: 'working', targetEggId: 'e1' })
    expect(s.groundEggs[0].collecting).toBe(true)
  })

  it('should_redirectFarmer_when_clickingNewEggWhileBusy', () => {
    useFarmStore.setState({
      groundEggs: [
        { id: 'e1', col: 3, row: 2, collecting: true, collectElapsedSec: 1, ageTimerSec: 0 },
        { id: 'e2', col: 5, row: 4, collecting: false, collectElapsedSec: 0, ageTimerSec: 0 },
      ],
      farmer: { state: 'working', targetEggId: 'e1' },
    })
    useFarmStore.getState().requestCollect('e2')
    const s = useFarmStore.getState()
    expect(s.farmer.targetEggId).toBe('e2')
    expect(s.groundEggs.find((e) => e.id === 'e1')?.collecting).toBe(false)
    expect(s.groundEggs.find((e) => e.id === 'e1')?.collectElapsedSec).toBe(0)
    expect(s.groundEggs.find((e) => e.id === 'e2')?.collecting).toBe(true)
  })

  it('should_loadTruckAndDeductGoods_when_initSale', () => {
    useFarmStore.setState({ warehouseEggs: 5 })
    useFarmStore.getState().initSale(3, 0)
    const s = useFarmStore.getState()
    expect(s.warehouseEggs).toBe(2)
    expect(s.eggsSold).toBe(3)
    expect(s.saleState).toBe('in-transit')
    expect(s.pendingSaleIncome).toBe(3 * FARM_LEVEL1.eggSellPrice)
    expect(s.cash).toBe(FARM_LEVEL1.initialCash) // cash not added yet — truck hasn't returned
  })

  it('should_addIncomeAndResetSale_when_completeSale', () => {
    useFarmStore.setState({ saleState: 'in-transit', pendingSaleIncome: 400 })
    useFarmStore.getState().completeSale()
    const s = useFarmStore.getState()
    expect(s.cash).toBe(FARM_LEVEL1.initialCash + 400)
    expect(s.revenue).toBe(400)
    expect(s.saleState).toBe('idle')
    expect(s.pendingSaleIncome).toBe(0)
  })

  it('should_addChicken_when_buyChicken', () => {
    useFarmStore.setState({ cash: FARM_LEVEL1.chickenBuyPrice * 2 })
    useFarmStore.getState().buyChicken()
    const s = useFarmStore.getState()
    expect(s.chickens).toHaveLength(2)
    expect(s.cash).toBe(FARM_LEVEL1.chickenBuyPrice)
  })

  it('should_notBuyChicken_when_insufficientFunds', () => {
    useFarmStore.setState({ cash: FARM_LEVEL1.chickenBuyPrice - 1 })
    useFarmStore.getState().buyChicken()
    expect(useFarmStore.getState().chickens).toHaveLength(1)
  })
})
