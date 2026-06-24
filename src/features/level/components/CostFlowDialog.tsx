import { useUiStore } from '@/store/uiStore'

/**
 * Placeholder for the cost-flow (ECPV) panel. The full live statement is
 * implemented in US-3; for now this dialog reserves the spot and demonstrates
 * the pause-on-dialog behavior (opening it pauses the farm simulation).
 */
export function CostFlowDialog() {
  const farmDialog = useUiStore((s) => s.farmDialog)
  const setFarmDialog = useUiStore((s) => s.setFarmDialog)
  if (farmDialog !== 'cost-flow') return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="panel w-full max-w-sm p-6 text-center" role="dialog" aria-modal="true">
        <h2 className="text-lg font-bold text-accent-primary">Flujo de Costos</h2>
        <p className="mt-3 text-sm text-text-secondary">
          El panel completo del Estado de Costos (ECPV) — maíz como materia prima, el granjero como
          mano de obra y los huevos como producto terminado — se habilita en la siguiente entrega.
        </p>
        <p className="mt-2 text-xs text-text-muted">El juego está en pausa mientras lees esto.</p>
        <button onClick={() => setFarmDialog(null)} className="btn-primary mt-6 w-full text-sm">
          Cerrar
        </button>
      </div>
    </div>
  )
}
