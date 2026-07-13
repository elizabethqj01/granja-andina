import { describe, it, expect } from 'vitest'
import { buildJournalEntries } from './journalEntries'
import type { Transaction, CostEvent } from '@/store/farmStore'

function txn(overrides: Partial<Transaction> = {}): Transaction {
  return { id: 't1', atSec: 10, label: 'Compra maíz', amount: -20, ...overrides }
}

function costEvent(overrides: Partial<CostEvent> = {}): CostEvent {
  return { id: 'c1', atSec: 5, type: 'mod', detail: '', amount: 3, ...overrides }
}

describe('buildJournalEntries', () => {
  it('should_journalCornPurchase_asDebeMPD_haberCaja', () => {
    const [entry] = buildJournalEntries([txn()], [], 0, 10)
    expect(entry).toMatchObject({
      debeCuenta: 'Inventario MPD (Maíz)',
      debeMonto: 20,
      haberCuenta: 'Caja',
      haberMonto: 20,
    })
  })

  it('should_journalEggSale_asDebeCaja_haberIngresos', () => {
    const [entry] = buildJournalEntries([txn({ label: 'Venta de huevos', amount: 40 })], [], 0, 10)
    expect(entry).toMatchObject({
      debeCuenta: 'Caja',
      debeMonto: 40,
      haberCuenta: 'Ingresos por Ventas',
      haberMonto: 40,
    })
  })

  it('should_skipCompraGallinaTransaction_toAvoidDoubleCounting', () => {
    const entries = buildJournalEntries([txn({ label: 'Compra gallina', amount: -100 })], [], 0, 10)
    expect(entries).toHaveLength(0)
  })

  it('should_journalModCostEvent_asDebeMOD_haberManoDeObraPorPagar', () => {
    const [entry] = buildJournalEntries([], [costEvent({ type: 'mod', amount: 3 })], 0, 10)
    expect(entry).toMatchObject({
      debeCuenta: 'Costo de Producción (MOD)',
      debeMonto: 3,
      haberCuenta: 'Mano de obra por pagar',
      haberMonto: 3,
    })
  })

  it('should_journalChickenCostEvent_asDebeCIF_haberCaja', () => {
    const [entry] = buildJournalEntries([], [costEvent({ type: 'chicken', amount: 100 })], 0, 10)
    expect(entry).toMatchObject({
      debeCuenta: 'CIF (Costos Indirectos de Fabricación)',
      debeMonto: 100,
      haberCuenta: 'Caja',
      haberMonto: 100,
    })
  })

  it('should_appendSingleCifAdjustmentEntry_whenOverheadPositive', () => {
    const entries = buildJournalEntries([], [], 50, 20)
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      atSec: 20,
      debeCuenta: 'CIF (Costos Indirectos de Fabricación)',
      debeMonto: 50,
      haberCuenta: 'Costos generales acumulados',
      haberMonto: 50,
    })
  })

  it('should_omitCifAdjustmentEntry_whenOverheadIsZero', () => {
    const entries = buildJournalEntries([], [], 0, 20)
    expect(entries).toHaveLength(0)
  })

  it('should_sortAllEntriesChronologically', () => {
    const entries = buildJournalEntries(
      [txn({ id: 't-late', atSec: 30, label: 'Compra maíz', amount: -20 })],
      [costEvent({ id: 'c-early', atSec: 5, type: 'mod', amount: 3 })],
      0,
      40
    )
    expect(entries.map((e) => e.atSec)).toEqual([5, 30])
  })

  it('should_haveEqualDebeAndHaber_forEveryEntry', () => {
    const entries = buildJournalEntries(
      [
        txn({ id: 't1', label: 'Compra maíz', amount: -20 }),
        txn({ id: 't2', label: 'Venta de huevos', amount: 40 }),
      ],
      [
        costEvent({ id: 'c1', type: 'mod', amount: 3 }),
        costEvent({ id: 'c2', type: 'chicken', amount: 100 }),
      ],
      15,
      50
    )
    expect(entries.length).toBeGreaterThan(0)
    for (const e of entries) {
      expect(e.debeMonto).toBe(e.haberMonto)
    }
  })
})
