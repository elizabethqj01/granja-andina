import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

/**
 * Route guard for the authenticated flow. Google sign-in (P-00) is the only
 * identity for the app; without it, send the user back to the entry screen.
 */
export function RequireAuth() {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-surface-primary">
        <span className="font-mono text-xs text-text-muted animate-pulse">Loading…</span>
      </div>
    )
  }

  return user ? <Outlet /> : <Navigate to="/" replace />
}
