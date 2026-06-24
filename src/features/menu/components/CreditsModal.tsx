interface CreditsModalProps {
  onClose: () => void
}

/**
 * Credits dialog for the main menu — authorship of the thesis project.
 */
export function CreditsModal({ onClose }: CreditsModalProps) {
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
        aria-label="Créditos"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">Créditos</h2>
          <button
            onClick={onClose}
            className="text-xl leading-none text-text-muted transition-colors hover:text-text-primary"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-3 text-sm text-text-secondary">
          <p>
            <span className="font-semibold text-text-primary">COSTFLOW</span> — juego serio para el
            aprendizaje de contabilidad de costos.
          </p>
          <div>
            <p className="text-xs uppercase tracking-wide text-text-muted">Trabajo de grado</p>
            <p className="text-text-primary">Café / Granja Andina S.A.S.</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-text-muted">Inspiración de juego</p>
            <p className="text-text-primary">Farm Frenzy</p>
          </div>
        </div>

        <button onClick={onClose} className="btn-secondary mt-6 w-full text-sm">
          Volver
        </button>
      </div>
    </div>
  )
}
