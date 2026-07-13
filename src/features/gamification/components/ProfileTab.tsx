import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { logoutUser } from '@/firebase/auth'

const ROLE_LABEL: Record<'estudiante' | 'profesor', string> = {
  estudiante: 'Estudiante',
  profesor: 'Profesor',
}

/** SC-05 — datos, foto, estadísticas generales y cierre de sesión. */
export function ProfileTab() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const appUser = useAuthStore((s) => s.appUser)

  if (!user || !appUser) return null

  async function handleLogout() {
    await logoutUser()
    navigate('/', { replace: true })
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div className="flex items-center gap-4">
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt=""
            className="h-16 w-16 rounded-full border border-border-default"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border-default bg-surface-secondary text-xl text-text-muted">
            {user.displayName?.[0]?.toUpperCase() ?? '?'}
          </div>
        )}
        <div>
          <p className="text-lg font-semibold text-text-primary">{user.displayName}</p>
          <p className="text-sm text-text-muted">{user.email}</p>
        </div>
      </div>

      <div className="rounded-lg border border-border-default bg-surface-secondary p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-muted">Rol</span>
          <span className="text-text-primary">{ROLE_LABEL[appUser.role]}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-text-muted">Grupo</span>
          <span className="text-text-primary">{appUser.groupId ?? 'Sin grupo asignado'}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-text-muted">Puntaje total</span>
          <span className="text-text-primary">{appUser.totalScore}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-text-muted">Niveles completados</span>
          <span className="text-text-primary">{appUser.levelsCompleted}</span>
        </div>
      </div>

      <button onClick={handleLogout} className="btn-secondary py-2.5 text-sm">
        🚪 Cerrar sesión
      </button>
    </div>
  )
}
