import type { Transaction, CostEvent } from '@/store/farmStore'

export interface JournalEntry {
  id: string
  atSec: number
  concepto: string
  debeCuenta: string
  debeMonto: number
  haberCuenta: string
  haberMonto: number
}

const CUENTA = {
  caja: 'Caja',
  mpd: 'Inventario MPD (Maíz)',
  ingresos: 'Ingresos por Ventas',
  mod: 'Costo de Producción (MOD)',
  manoDeObraPorPagar: 'Mano de obra por pagar',
  cif: 'CIF (Costos Indirectos de Fabricación)',
  costosGeneralesAcumulados: 'Costos generales acumulados',
} as const

/**
 * FC-05 — Libro Diario. Derives a simple two-line Debe/Haber entry per
 * discrete event already recorded by the game (no invented figures). Each
 * entry balances by construction (debeMonto === haberMonto), so there's no
 * separate balance check needed like isECPVBalanced().
 *
 * "Compra gallina" is pushed to both transactions and costEvents by the same
 * buyChicken() call — only costEvents (type 'chicken') is used here so the
 * purchase isn't journaled twice.
 */
export function buildJournalEntries(
  transactions: Transaction[],
  costEvents: CostEvent[],
  cifOverheadTotal: number,
  elapsedSec: number
): JournalEntry[] {
  const entries: JournalEntry[] = []

  for (const t of transactions) {
    if (t.label === 'Compra maíz') {
      entries.push({
        id: `txn-${t.id}`,
        atSec: t.atSec,
        concepto: t.label,
        debeCuenta: CUENTA.mpd,
        debeMonto: Math.abs(t.amount),
        haberCuenta: CUENTA.caja,
        haberMonto: Math.abs(t.amount),
      })
    } else if (t.label === 'Venta de huevos') {
      entries.push({
        id: `txn-${t.id}`,
        atSec: t.atSec,
        concepto: t.label,
        debeCuenta: CUENTA.caja,
        debeMonto: t.amount,
        haberCuenta: CUENTA.ingresos,
        haberMonto: t.amount,
      })
    }
    // 'Compra gallina' intentionally skipped — see costEvents below.
  }

  for (const e of costEvents) {
    if (e.type === 'mod') {
      entries.push({
        id: `cost-${e.id}`,
        atSec: e.atSec,
        concepto: 'Mano de obra directa',
        debeCuenta: CUENTA.mod,
        debeMonto: e.amount,
        haberCuenta: CUENTA.manoDeObraPorPagar,
        haberMonto: e.amount,
      })
    } else if (e.type === 'chicken') {
      entries.push({
        id: `cost-${e.id}`,
        atSec: e.atSec,
        concepto: 'Compra gallina',
        debeCuenta: CUENTA.cif,
        debeMonto: e.amount,
        haberCuenta: CUENTA.caja,
        haberMonto: e.amount,
      })
    }
  }

  entries.sort((a, b) => a.atSec - b.atSec)

  // CIF overhead accrues passively every tick — it's not tied to a discrete
  // "operación" the way the entries above are, so it gets one adjusting
  // entry at the end instead of a fabricated event per tick.
  if (cifOverheadTotal > 0) {
    entries.push({
      id: 'cif-adjustment',
      atSec: elapsedSec,
      concepto: 'Asiento de ajuste — CIF del período',
      debeCuenta: CUENTA.cif,
      debeMonto: cifOverheadTotal,
      haberCuenta: CUENTA.costosGeneralesAcumulados,
      haberMonto: cifOverheadTotal,
    })
  }

  return entries
}
