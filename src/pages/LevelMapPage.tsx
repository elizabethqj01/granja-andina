import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { LevelNode } from '@/features/menu/components/LevelNode'
import { LevelInfoModal } from '@/features/menu/components/LevelInfoModal'
import { LevelReviewModal } from '@/features/level/components/LevelReviewModal'
import { getLevelSnapshot } from '@/firebase/firestore'
import type { LevelId } from '@/constants/farmBalance'
import type { GameLevel, LevelStars, LevelSnapshot } from '@/types'

const LEVELS: GameLevel[] = [1, 2, 3, 4, 5, 6, 7, 8]

const MAX_UNLOCKED_LEVEL: GameLevel = 2

/**
 * Screen 3 — Level map. A path of nodes; only Level 1-2 are unlocked for now.
 * Selecting an unlocked node opens the level info card (P-03B) before
 * navigating to that level's game screen.
 */
export function LevelMapPage() {
  const navigate = useNavigate()
  const displayName = useAuthStore((s) => s.user?.displayName ?? '')
  const uid = useAuthStore((s) => s.user?.uid ?? null)
  const bestStarsByLevel = useAuthStore((s) => s.appUser?.bestRecords.bestStarsByLevel ?? {})
  const [infoLevel, setInfoLevel] = useState<LevelId | null>(null)
  const [evalMode, setEvalMode] = useState(false)
  const [reviewSnapshot, setReviewSnapshot] = useState<LevelSnapshot | null>(null)
  const [reviewLevel, setReviewLevel] = useState<LevelId | null>(null)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [reviewLoading, setReviewLoading] = useState(false)

  const stars: Partial<Record<GameLevel, LevelStars>> = Object.fromEntries(
    Object.entries(bestStarsByLevel).map(([k, v]) => [Number(k), v as LevelStars])
  )

  function handleSelect(level: GameLevel) {
    if (level === 1 || level === 2) setInfoLevel(level)
  }

  function handleStart() {
    if (infoLevel === null) return
    navigate(evalMode ? `/play/${infoLevel}?eval=1` : `/play/${infoLevel}`)
  }

  async function handleReview() {
    if (infoLevel === null || !uid) return
    setReviewError(null)
    setReviewLoading(true)
    try {
      const snapshot = await getLevelSnapshot(uid, infoLevel)
      if (!snapshot) {
        setReviewError('Todavía no tienes una partida guardada de este nivel.')
        return
      }
      setReviewLevel(infoLevel)
      setReviewSnapshot(snapshot)
      setInfoLevel(null)
    } catch {
      setReviewError('No se pudo cargar tu último intento. Intenta de nuevo.')
    } finally {
      setReviewLoading(false)
    }
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
        <span className="text-sm text-text-muted">{displayName}</span>
      </header>

      {/* Evaluation mode toggle (EV-01 entry point) */}
      <div className="flex items-center justify-center gap-2 border-b border-border-default px-6 py-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={evalMode}
            onChange={(e) => setEvalMode(e.target.checked)}
            className="h-4 w-4 accent-accent-primary"
          />
          📝 Modo Evaluación (cronómetro oficial, sin tutorial ni ayudas)
        </label>
      </div>

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

      {infoLevel !== null && (
        <LevelInfoModal
          level={infoLevel}
          onBack={() => setInfoLevel(null)}
          onStart={handleStart}
          onReview={handleReview}
          reviewError={reviewError}
          reviewLoading={reviewLoading}
        />
      )}

      {reviewSnapshot && reviewLevel !== null && (
        <LevelReviewModal
          snapshot={reviewSnapshot}
          levelId={reviewLevel}
          onClose={() => {
            setReviewSnapshot(null)
            setReviewLevel(null)
          }}
        />
      )}
    </div>
  )
}
