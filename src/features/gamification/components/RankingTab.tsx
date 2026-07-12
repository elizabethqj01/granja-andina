import { useAuthStore } from '@/store/authStore'
import { useScoreStore } from '@/store/scoreStore'

export function RankingTab() {
  const appUser = useAuthStore((s) => s.appUser)
  const ranking = useScoreStore((s) => s.ranking)

  if (!appUser?.groupId) {
    return (
      <p className="text-sm text-text-muted">
        Únete a un grupo en la pestaña "Grupos" para ver la tabla de posiciones en tiempo real.
      </p>
    )
  }

  if (ranking.length === 0) {
    return (
      <p className="text-sm text-text-muted">Todavía nadie en tu grupo tiene puntaje registrado.</p>
    )
  }

  return (
    <div className="mx-auto max-w-2xl overflow-hidden rounded-lg border border-border-default">
      <table className="w-full text-sm">
        <thead className="bg-surface-secondary text-text-muted">
          <tr>
            <th className="px-4 py-2 text-left font-medium">#</th>
            <th className="px-4 py-2 text-left font-medium">Estudiante</th>
            <th className="px-4 py-2 text-right font-medium">Estrellas</th>
            <th className="px-4 py-2 text-right font-medium">Puntaje</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((entry, i) => {
            const isSelf = entry.uid === appUser.uid
            return (
              <tr
                key={entry.uid}
                className={`border-t border-border-default ${isSelf ? 'bg-accent-primary/10' : ''}`}
              >
                <td className="px-4 py-2 text-text-secondary">{i + 1}</td>
                <td className="px-4 py-2 text-text-primary">
                  {entry.displayName}
                  {isSelf && <span className="ml-2 text-xs text-accent-primary">(tú)</span>}
                </td>
                <td className="px-4 py-2 text-right text-text-secondary">⭐ {entry.starsTotal}</td>
                <td className="px-4 py-2 text-right font-semibold text-text-primary">
                  {entry.totalScore}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
