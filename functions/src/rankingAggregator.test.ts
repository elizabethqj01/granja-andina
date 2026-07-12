import { describe, it, expect } from 'vitest'
import {
  buildRankingEntries,
  updateGlobalRecords,
  type GlobalRecordsState,
} from './rankingAggregator'

const EMPTY_RECORDS: GlobalRecordsState = {
  menorCostoUnitario: null,
  tiempoMasRapido: null,
  mayorUtilidad: null,
}

describe('buildRankingEntries', () => {
  it('sorts by totalScore descending', () => {
    const result = buildRankingEntries([
      { uid: 'a', displayName: 'A', photoURL: '', totalScore: 50, starsTotal: 2 },
      { uid: 'b', displayName: 'B', photoURL: '', totalScore: 90, starsTotal: 3 },
      { uid: 'c', displayName: 'C', photoURL: '', totalScore: 70, starsTotal: 2 },
    ])
    expect(result.map((r) => r.uid)).toEqual(['b', 'c', 'a'])
  })

  it('caps the result at the given limit', () => {
    const users = Array.from({ length: 10 }, (_, i) => ({
      uid: `u${i}`,
      displayName: `U${i}`,
      photoURL: '',
      totalScore: i,
      starsTotal: 0,
    }))
    expect(buildRankingEntries(users, 3)).toHaveLength(3)
  })

  it('returns an empty array for an empty group', () => {
    expect(buildRankingEntries([])).toEqual([])
  })
})

describe('updateGlobalRecords', () => {
  it('sets all three records on the first candidate', () => {
    const result = updateGlobalRecords(EMPTY_RECORDS, {
      uid: 'a',
      displayName: 'A',
      costoUnitario: 4,
      timeSeconds: 60,
      utilidad: 100,
    })
    expect(result.menorCostoUnitario).toEqual({ uid: 'a', displayName: 'A', value: 4 })
    expect(result.tiempoMasRapido).toEqual({ uid: 'a', displayName: 'A', value: 60 })
    expect(result.mayorUtilidad).toEqual({ uid: 'a', displayName: 'A', value: 100 })
  })

  it('replaces a record only when the candidate is better', () => {
    const current = updateGlobalRecords(EMPTY_RECORDS, {
      uid: 'a',
      displayName: 'A',
      costoUnitario: 4,
      timeSeconds: 60,
      utilidad: 100,
    })
    const worse = updateGlobalRecords(current, {
      uid: 'b',
      displayName: 'B',
      costoUnitario: 10, // worse (higher) unit cost
      timeSeconds: 90, // worse (slower) time
      utilidad: 50, // worse (lower) profit
    })
    expect(worse).toEqual(current)
  })

  it('replaces menorCostoUnitario when the candidate costs less', () => {
    const current = updateGlobalRecords(EMPTY_RECORDS, {
      uid: 'a',
      displayName: 'A',
      costoUnitario: 4,
      timeSeconds: 60,
      utilidad: 100,
    })
    const better = updateGlobalRecords(current, {
      uid: 'b',
      displayName: 'B',
      costoUnitario: 2,
      timeSeconds: 90,
      utilidad: 50,
    })
    expect(better.menorCostoUnitario).toEqual({ uid: 'b', displayName: 'B', value: 2 })
    expect(better.tiempoMasRapido).toEqual(current.tiempoMasRapido)
  })

  it('ignores a zero or negative costoUnitario/timeSeconds as not a real attempt', () => {
    const result = updateGlobalRecords(EMPTY_RECORDS, {
      uid: 'a',
      displayName: 'A',
      costoUnitario: 0,
      timeSeconds: 0,
      utilidad: -20,
    })
    expect(result.menorCostoUnitario).toBeNull()
    expect(result.tiempoMasRapido).toBeNull()
    expect(result.mayorUtilidad).toEqual({ uid: 'a', displayName: 'A', value: -20 })
  })
})
