import { useUiStore } from '@/store/uiStore'

interface InGameMenuProps {
  onResume: () => void
  onRestart: () => void
  onExit: () => void
}

/**
 * In-game menu opened from the HUD "Menú" button. While open, `farmDialog`
 * is set so the farm simulation pauses (global pause-on-dialog requirement).
 */
export function InGameMenu({ onResume, onRestart, onExit }: InGameMenuProps) {
  const farmDialog = useUiStore((s) => s.farmDialog)
  if (farmDialog !== 'menu') return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="panel w-full max-w-xs p-6" role="dialog" aria-modal="true" aria-label="Menú">
        <h2 className="mb-4 text-center text-lg font-bold text-text-primary">Pausa</h2>
        <div className="flex flex-col gap-3">
          <button onClick={onResume} className="btn-primary text-sm">
            Continuar
          </button>
          <button onClick={onRestart} className="btn-secondary text-sm">
            Reiniciar nivel
          </button>
          <button onClick={onExit} className="btn-secondary text-sm">
            Salir al mapa
          </button>
        </div>
      </div>
    </div>
  )
}
