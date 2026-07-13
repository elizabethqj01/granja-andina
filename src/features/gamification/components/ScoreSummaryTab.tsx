import { useAuthStore } from '@/store/authStore'
import { useScoreStore } from '@/store/scoreStore'

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border-default bg-surface-secondary p-4">
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-text-primary">{value}</p>
    </div>
  )
}

export function ScoreSummaryTab() {
  const appUser = useAuthStore((s) => s.appUser)
  const ranking = useScoreStore((s) => s.ranking)

  if (!appUser) return null

  const position = ranking.findIndex((e) => e.uid === appUser.uid)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Puntaje total" value={appUser.totalScore} />
        <StatCard label="Estrellas" value={`⭐ ${appUser.starsTotal}`} />
        <StatCard label="Niveles completados" value={appUser.levelsCompleted} />
        <StatCard label="Posición en grupo" value={position >= 0 ? `#${position + 1}` : '—'} />
      </div>
      {!appUser.groupId && (
        <p className="text-sm text-text-muted">
          Únete a un grupo en la pestaña "Grupos" para ver tu posición y competir en el ranking.
        </p>
      )}
    </div>
  )
}
