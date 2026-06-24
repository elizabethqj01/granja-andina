import { useNavigate } from 'react-router-dom'
import { usePlayerStore } from '@/store/playerStore'
import { LevelNode } from '@/features/menu/components/LevelNode'
import type { GameLevel, LevelStars } from '@/types'

const LEVELS: GameLevel[] = [1, 2, 3, 4, 5, 6, 7, 8]

// During the Farm pivot validation phase only Level 1 is playable.
const MAX_UNLOCKED_LEVEL: GameLevel = 1

/**
 * Screen 3 — Level map. A path of nodes; only Level 1 is unlocked for now.
 * Selecting an unlocked node navigates to that level's game screen.
 */
export function LevelMapPage() {
  const navigate = useNavigate()
  const { playerName } = usePlayerStore()
  // Star persistence per level is future work; show none for now.
  const stars: Partial<Record<GameLevel, LevelStars>> = {}

  function handleSelect(level: GameLevel) {
    navigate(`/play/${level}`)
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-surface-primary">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border-default px-6 py-4">
        <button
          onClick={() => navigate('/menu')}
          className="text-sm text-text-muted transition-colors hover:text-text-primary"
        >
          ← Menú
        </button>
        <h1 className="text-lg font-bold text-text-primary">Camino de niveles</h1>
        <span className="text-sm text-text-muted">{playerName}</span>
      </header>

      {/* Level path */}
      <main className="flex flex-1 items-center overflow-x-auto px-8">
        <div className="flex items-center gap-6">
          {LEVELS.map((level, i) => (
            <div key={level} className="flex items-center gap-6">
              <LevelNode
                level={level}
                locked={level > MAX_UNLOCKED_LEVEL}
                stars={stars[level] ?? 0}
                onSelect={handleSelect}
              />
              {i < LEVELS.length - 1 && (
                <div className="h-0.5 w-10 shrink-0 rounded bg-border-strong" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
