import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithGoogle } from '@/firebase/auth'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import { OnboardingTutorial } from '@/features/education/components/OnboardingTutorial'

/**
 * Screen 1 (P-00) — Google sign-in is the sole, mandatory entry point.
 * First-time students see the 4-step onboarding (P-00B) before reaching /menu;
 * returning students skip straight there once their session is confirmed.
 */
export function NameEntryPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const appUser = useAuthStore((s) => s.appUser)
  const isNewUser = useAuthStore((s) => s.isNewUser)
  const authLoading = useAuthStore((s) => s.loading)
  const onboardingStep = useUiStore((s) => s.onboardingStep)
  const startOnboarding = useUiStore((s) => s.startOnboarding)
  const finishOnboarding = useUiStore((s) => s.finishOnboarding)
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Once the users/{uid} doc is resolved: gate first-timers into the tutorial,
  // and make sure returning students never see it (even on a fresh browser).
  useEffect(() => {
    if (!user || !appUser) return
    if (isNewUser) {
      startOnboarding()
    } else if (onboardingStep !== null) {
      finishOnboarding()
    }
  }, [user, appUser, isNewUser]) // eslint-disable-line react-hooks/exhaustive-deps

  // Navigate to the menu once identity is resolved and onboarding (if any) is done.
  useEffect(() => {
    if (user && appUser && onboardingStep === null) {
      navigate('/menu', { replace: true })
    }
  }, [user, appUser, onboardingStep, navigate])

  async function handleGoogle() {
    setError(null)
    setSigningIn(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión con Google')
    } finally {
      setSigningIn(false)
    }
  }

  if (onboardingStep !== null) {
    return <OnboardingTutorial />
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-surface-primary p-4">
      <div className="panel w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-accent-primary">COSTFLOW</h1>
          <p className="mt-2 text-sm text-text-muted">Aprende costos jugando · Granja Andina</p>
        </div>

        {error && (
          <p className="mb-4 rounded-md bg-status-error/10 px-3 py-2 text-sm text-status-error">
            {error}
          </p>
        )}

        <button
          onClick={handleGoogle}
          disabled={signingIn || authLoading}
          className="flex w-full items-center justify-center gap-3 rounded-md border border-border-default bg-surface-secondary py-2.5 text-sm text-text-primary transition-colors hover:border-accent-primary hover:text-accent-primary disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
            <path fill="none" d="M0 0h48v48H0z" />
          </svg>
          {signingIn ? 'Conectando…' : 'Iniciar sesión con Google'}
        </button>

        <p className="mt-4 text-center text-xs text-text-muted">
          Herramienta educativa para trabajo de grado
        </p>
      </div>
    </div>
  )
}
