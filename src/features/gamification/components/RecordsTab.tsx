import { useScoreStore } from '@/store/scoreStore'

function RecordCard({
  emoji,
  label,
  holder,
  formatValue,
}: {
  emoji: string
  label: string
  holder: { displayName: string; value: number } | null
  formatValue: (value: number) => string
}) {
  return (
    <div className="rounded-lg border border-border-default bg-surface-secondary p-4">
      <p className="text-xs uppercase tracking-wide text-text-muted">
        {emoji} {label}
      </p>
      {holder ? (
        <>
          <p className="mt-1 text-xl font-bold text-text-primary">{formatValue(holder.value)}</p>
          <p className="text-sm text-text-secondary">{holder.displayName}</p>
        </>
      ) : (
        <p className="mt-1 text-sm text-text-muted">Todavía sin marca</p>
      )}
    </div>
  )
}

export function RecordsTab() {
  const records = useScoreStore((s) => s.records)

  return (
    <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
      <RecordCard
        emoji="💵"
        label="Menor costo unitario"
        holder={records?.menorCostoUnitario ?? null}
        formatValue={(v) => `$${v.toLocaleString('es-CO', { maximumFractionDigits: 2 })}`}
      />
      <RecordCard
        emoji="⏱"
        label="Tiempo más rápido"
        holder={records?.tiempoMasRapido ?? null}
        formatValue={(v) => `${v}s`}
      />
      <RecordCard
        emoji="📈"
        label="Mayor utilidad"
        holder={records?.mayorUtilidad ?? null}
        formatValue={(v) => `$${v.toLocaleString('es-CO')}`}
      />
    </div>
  )
}
