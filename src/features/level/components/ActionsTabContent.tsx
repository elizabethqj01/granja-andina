import { useState } from 'react'
import type {
  ClassifiableAction,
  ClassificationCategory,
} from '@/features/level/classifiableActions'

const CATEGORIES: { key: ClassificationCategory; label: string }[] = [
  { key: 'MPD', label: '🟩 MPD' },
  { key: 'MPD_A_PRODUCCION', label: '🟩→🟨 MPD a Producción' },
  { key: 'MOD', label: '🟨 Mano de obra directa' },
  { key: 'CIF', label: '🟦 Costo indirecto (CIF)' },
  { key: 'PRODUCCION_A_PT', label: '🟨→🟪 Producción a PT' },
  { key: 'PT_A_VENTAS', label: '🟪→🟧 PT a Ventas' },
]

function fmt(n: number): string {
  return `$${Math.max(0, Math.round(n)).toLocaleString('es-CO')}`
}

function formatTime(atSec: number): string {
  const m = Math.floor(atSec / 60)
  const s = atSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

interface ActionsTabContentProps {
  actions: ClassifiableAction[]
  classifiedIds: Set<string>
  onClassifyCorrect: (actionId: string, category: ClassificationCategory) => void
}

/** FC-01 — "Mis Acciones": tap-to-classify (not drag-and-drop, mobile-friendly). */
export function ActionsTabContent({
  actions,
  classifiedIds,
  onClassifyCorrect,
}: ActionsTabContentProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [errorId, setErrorId] = useState<string | null>(null)

  function handlePick(action: ClassifiableAction, category: ClassificationCategory) {
    if (category === action.correctCategory) {
      setErrorId(null)
      setExpandedId(null)
      onClassifyCorrect(action.id, category)
    } else {
      setErrorId(action.id)
    }
  }

  const allDone = actions.length > 0 && actions.every((a) => classifiedIds.has(a.id))

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-secondary">
        📋 Todas tus decisiones quedaron registradas. Toca cada una y elige a qué categoría
        pertenece.
      </p>

      {actions.length === 0 && (
        <p className="text-sm text-text-muted">No hay suficientes acciones en esta partida.</p>
      )}

      {actions.map((action) => {
        const done = classifiedIds.has(action.id)
        const expanded = expandedId === action.id
        return (
          <div
            key={action.id}
            className={`rounded-lg border p-3 ${
              done
                ? 'border-status-ok/40 bg-status-ok/10'
                : 'border-border-default bg-surface-secondary'
            }`}
          >
            <button
              disabled={done}
              onClick={() => setExpandedId(expanded ? null : action.id)}
              className="flex w-full items-center justify-between gap-2 text-left"
            >
              <span className="text-sm text-text-primary">
                <span className="text-text-muted">{formatTime(action.atSec)}</span> {action.label}
              </span>
              <span className="text-sm font-semibold text-text-primary">
                {fmt(action.monto)} {done && '✅'}
              </span>
            </button>

            {expanded && !done && (
              <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => handlePick(action, c.key)}
                    className="rounded-md border border-border-default bg-surface-primary px-2 py-1.5 text-left text-xs text-text-secondary transition-colors hover:border-accent-primary hover:text-accent-primary"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
            {errorId === action.id && !done && (
              <p className="mt-1 text-xs text-status-error">
                Esa categoría no es correcta — inténtalo de nuevo.
              </p>
            )}
          </div>
        )
      })}

      {allDone && (
        <p className="rounded-md bg-status-ok/10 px-3 py-2 text-center text-sm font-semibold text-status-ok">
          ✅ Todas clasificadas correctamente — desbloqueaste las siguientes pestañas ➡️
        </p>
      )}
    </div>
  )
}
