import { useAuthStore } from '@/store/authStore'
import { useScoreStore } from '@/store/scoreStore'
import type { GlobalRecords } from '@/types'

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

function RecordsBoard({ records }: { records: GlobalRecords | null }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

/** SC-04 — mejores marcas globales y por grupo (especificaciones.md). */
export function RecordsTab() {
  const appUser = useAuthStore((s) => s.appUser)
  const records = useScoreStore((s) => s.records)
  const groupRecords = useScoreStore((s) => s.groupRecords)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      {appUser?.groupId && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-text-secondary">
            Récords de mi grupo ({appUser.groupId})
          </h2>
          <RecordsBoard records={groupRecords} />
        </section>
      )}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-text-secondary">Récords globales</h2>
        <RecordsBoard records={records} />
      </section>
    </div>
  )
}
