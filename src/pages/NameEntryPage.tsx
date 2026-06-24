import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayerStore } from '@/store/playerStore'

const MAX_NAME_LENGTH = 20

/**
 * Screen 1 — Player name entry. First screen of the game; the name identifies
 * the local session and unlocks the rest of the flow (menu → levels → game).
 */
export function NameEntryPage() {
  const navigate = useNavigate()
  const { playerName, setPlayerName } = usePlayerStore()
  const [name, setName] = useState(playerName)

  const trimmed = name.trim()
  const canContinue = trimmed.length > 0

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canContinue) return
    setPlayerName(trimmed)
    navigate('/menu')
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-surface-primary p-4">
      <div className="panel w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-accent-primary">COSTFLOW</h1>
          <p className="mt-2 text-sm text-text-muted">Aprende costos jugando · Granja Andina</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label htmlFor="player-name" className="text-sm font-medium text-text-secondary">
            ¿Cuál es tu nombre?
          </label>
          <input
            id="player-name"
            type="text"
            autoFocus
            maxLength={MAX_NAME_LENGTH}
            placeholder="Escribe tu nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-border-default bg-surface-secondary px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-accent-primary focus:outline-none"
          />
          <button type="submit" disabled={!canContinue} className="btn-primary mt-2">
            Continuar
          </button>
        </form>
      </div>
    </div>
  )
}
