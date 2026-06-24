import { useState, type ReactNode } from 'react'
import { useUiStore } from '@/store/uiStore'
import { usePlayerStore } from '@/store/playerStore'
import { audioManager } from '@/game/audio/AudioManager'

interface OptionsModalProps {
  onClose: () => void
}

/**
 * Options dialog for the main menu — audio and theme toggles, plus the
 * player name. Reuses the global ui/audio stores so changes persist.
 */
export function OptionsModal({ onClose }: OptionsModalProps) {
  const { theme, toggleTheme } = useUiStore()
  const { playerName } = usePlayerStore()
  const [audioEnabled, setAudioEnabled] = useState(audioManager.isEnabled)

  function handleAudioToggle() {
    setAudioEnabled(audioManager.toggle())
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="panel w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Opciones"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">Opciones</h2>
          <button
            onClick={onClose}
            className="text-xl leading-none text-text-muted transition-colors hover:text-text-primary"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <Row label="Jugador">
            <span className="text-sm font-medium text-text-primary">{playerName || '—'}</span>
          </Row>

          <Row label="Audio">
            <button onClick={handleAudioToggle} className="btn-secondary px-3 py-1 text-xs">
              {audioEnabled ? 'Activado' : 'Silenciado'}
            </button>
          </Row>

          <Row label="Tema">
            <button onClick={toggleTheme} className="btn-secondary px-3 py-1 text-xs">
              {theme === 'dark' ? 'Oscuro' : 'Claro'}
            </button>
          </Row>
        </div>

        <button onClick={onClose} className="btn-secondary mt-6 w-full text-sm">
          Volver
        </button>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border-default bg-surface-secondary px-3 py-2.5">
      <span className="text-sm text-text-secondary">{label}</span>
      {children}
    </div>
  )
}
