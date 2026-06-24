import { Navigate, Outlet } from 'react-router-dom'
import { usePlayerStore } from '@/store/playerStore'

/**
 * Route guard for the Farm pivot flow. The player's name (Screen 1) is the
 * identity for the local session; without it, send the user back to entry.
 */
export function RequireName() {
  const playerName = usePlayerStore((s) => s.playerName)
  return playerName ? <Outlet /> : <Navigate to="/" replace />
}
