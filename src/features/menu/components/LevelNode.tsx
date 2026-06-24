import type { GameLevel, LevelStars } from '@/types'

interface LevelNodeProps {
  level: GameLevel
  locked: boolean
  stars: LevelStars
  onSelect: (level: GameLevel) => void
}

/**
 * A single node on the level map. Active nodes are clickable and show earned
 * stars; locked nodes are dimmed with a lock glyph.
 */
export function LevelNode({ level, locked, stars, onSelect }: LevelNodeProps) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        disabled={locked}
        onClick={() => onSelect(level)}
        aria-label={locked ? `Nivel ${level} bloqueado` : `Jugar nivel ${level}`}
        className={[
          'flex h-16 w-16 items-center justify-center rounded-full border-2 font-mono text-xl font-bold transition-all duration-150',
          locked
            ? 'cursor-not-allowed border-border-default bg-surface-secondary text-text-muted opacity-60'
            : 'border-accent-primary bg-accent-primary/10 text-accent-primary hover:bg-accent-primary hover:text-surface-primary',
        ].join(' ')}
      >
        {locked ? '⚿' : level}
      </button>

      <div className="flex gap-0.5 text-xs" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span key={i} className={i <= stars ? 'text-accent-primary' : 'text-border-strong'}>
            ★
          </span>
        ))}
      </div>
    </div>
  )
}
