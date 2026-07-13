import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { logoutUser } from '@/firebase/auth'
import { CreditsModal } from '@/features/menu/components/CreditsModal'
import { OptionsModal } from '@/features/menu/components/OptionsModal'

/**
 * Screen 2 (P-02) — Main menu. Entry point after Google sign-in.
 * Play → level map · Créditos / Opciones open dialogs · Cerrar sesión → P-00.
 */
export function MainMenuPage() {
  const navigate = useNavigate()
  const displayName = useAuthStore((s) => s.user?.displayName ?? '')
  const [dialog, setDialog] = useState<'credits' | 'options' | null>(null)

  async function handleLogout() {
    await logoutUser()
    navigate('/', { replace: true })
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-surface-primary p-4">
      <div className="panel w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-accent-primary">COSTFLOW</h1>
          <p className="mt-2 text-sm text-text-muted">
            Hola, <span className="font-semibold text-text-secondary">{displayName}</span> 👋
          </p>
        </div>

        <nav className="flex flex-col gap-3">
          <button onClick={() => navigate('/levels')} className="btn-primary py-3 text-base">
            Iniciar juego
          </button>
          <button onClick={() => navigate('/scores')} className="btn-secondary py-3 text-base">
            🏆 Puntajes y Ranking
          </button>
          <button onClick={() => setDialog('credits')} className="btn-secondary py-3 text-base">
            Créditos
          </button>
          <button onClick={() => setDialog('options')} className="btn-secondary py-3 text-base">
            Opciones
          </button>
          <button
            onClick={handleLogout}
            className="mt-2 text-sm text-text-muted transition-colors hover:text-text-primary"
          >
            Cerrar sesión
          </button>
        </nav>
      </div>

      {dialog === 'credits' && <CreditsModal onClose={() => setDialog(null)} />}
      {dialog === 'options' && <OptionsModal onClose={() => setDialog(null)} />}
    </div>
  )
}
