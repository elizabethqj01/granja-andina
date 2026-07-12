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
  count: number
  correctCategory: ClassificationCategory
}

type ActionKind =
  | 'compra_maiz'
  | 'venta_huevos'
  | 'jornal'
  | 'compra_gallina'
  | 'maiz_a_gallina'
  | 'produccion_huevo'

const KIND_META: Record<
  ActionKind,
  { label: string; labelMany: (count: number) => string; category: ClassificationCategory }
> = {
  compra_maiz: {
    label: 'Compraste maíz',
    labelMany: (n) => `Compraste maíz (${n} veces)`,
    category: 'MPD',
  },
  venta_huevos: {
    label: 'Vendiste huevos',
    labelMany: (n) => `Vendiste huevos (${n} veces)`,
    category: 'PT_A_VENTAS',
  },
  jornal: {
    label: 'Pagaste jornal al granjero',
    labelMany: (n) => `Pagaste jornal al granjero (${n} veces)`,
    category: 'MOD',
  },
  compra_gallina: {
    label: 'Compraste una gallina',
    labelMany: (n) => `Compraste gallinas (${n})`,
    category: 'CIF',
  },
  maiz_a_gallina: {
    label: 'Diste maíz a la gallina',
    labelMany: (n) => `Diste maíz a la gallina (${n} veces)`,
    category: 'MPD_A_PRODUCCION',
  },
  produccion_huevo: {
    label: 'Se produjo un huevo',
    labelMany: (n) => `Se produjeron ${n} huevos`,
    category: 'PRODUCCION_A_PT',
  },
}

interface RawEvent {
  kind: ActionKind
  atSec: number
  monto: number
}

/**
 * FC-01 — turns a saved attempt's transactions/costEvents into the list of
 * actions the student classifies. Grouped by *kind of action*, not by raw
 * event — a player who collected 4 eggs or bought corn 3 times only
 * classifies "producción de huevo" or "compra maíz" once, matching the
 * mockup itself (which shows "se produjeron 4 huevos" as a single line).
 * costPerEgg is passed in (computed by the caller via computeFarmCostStatement)
 * rather than recomputed here, so this stays a plain data-mapping function
 * with no knowledge of the ECPV formula.
 */
export function buildClassifiableActions(
  snapshot: LevelSnapshot,
  costPerEgg: number
): ClassifiableAction[] {
  const raw: RawEvent[] = []

  for (const t of snapshot.transactions) {
    if (t.label === 'Compra maíz') {
      raw.push({ kind: 'compra_maiz', atSec: t.atSec, monto: Math.abs(t.amount) })
    } else if (t.label === 'Venta de huevos') {
      raw.push({ kind: 'venta_huevos', atSec: t.atSec, monto: t.amount })
    }
    // 'Compra gallina' intentionally skipped — costEvents type 'chicken' below
    // is the same event, and journaling/classifying both would double it.
  }

  for (const e of snapshot.costEvents) {
    if (e.type === 'mod') {
      raw.push({ kind: 'jornal', atSec: e.atSec, monto: e.amount })
    } else if (e.type === 'chicken') {
      raw.push({ kind: 'compra_gallina', atSec: e.atSec, monto: e.amount })
    } else if (e.type === 'corn_placed') {
      raw.push({ kind: 'maiz_a_gallina', atSec: e.atSec, monto: e.amount })
    } else if (e.type === 'egg_collected') {
      raw.push({ kind: 'produccion_huevo', atSec: e.atSec, monto: costPerEgg })
    }
  }

  const groups = new Map<ActionKind, { atSec: number; monto: number; count: number }>()
  for (const r of raw) {
    const existing = groups.get(r.kind)
    if (existing) {
      existing.monto += r.monto
      existing.count += 1
      existing.atSec = Math.min(existing.atSec, r.atSec)
    } else {
      groups.set(r.kind, { atSec: r.atSec, monto: r.monto, count: 1 })
    }
  }

  const actions: ClassifiableAction[] = []
  for (const [kind, group] of groups) {
    const meta = KIND_META[kind]
    actions.push({
      id: kind,
      atSec: group.atSec,
      label: group.count > 1 ? meta.labelMany(group.count) : meta.label,
      monto: Math.round(group.monto),
      count: group.count,
      correctCategory: meta.category,
    })
  }

  return actions.sort((a, b) => a.atSec - b.atSec)
}
