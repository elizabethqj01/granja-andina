import { useState } from 'react'
import { useFarmStore } from '@/store/farmStore'
import { useUiStore } from '@/store/uiStore'
import { FARM_LEVEL1 } from '@/constants/farmBalance'

export function SellModal() {
  const farmDialog = useUiStore((s) => s.farmDialog)
  const setFarmDialog = useUiStore((s) => s.setFarmDialog)

  const warehouseEggs = useFarmStore((s) => s.warehouseEggs)
  const chickens = useFarmStore((s) => s.chickens)
  const saleState = useFarmStore((s) => s.saleState)
  const initSale = useFarmStore((s) => s.initSale)

  const [eggCount, setEggCount] = useState(0)
  const [chickenCount, setChickenCount] = useState(0)

  if (farmDialog !== 'sell') return null

  // Player must keep at least 1 chicken
  const chickensSellable = Math.max(0, chickens.length - 1)
  const totalIncome =
    eggCount * FARM_LEVEL1.eggSellPrice + chickenCount * FARM_LEVEL1.chickenSellPrice
  const canSell = totalIncome > 0 && saleState === 'idle'

  function handleClose() {
    setFarmDialog(null)
    setEggCount(0)
    setChickenCount(0)
  }

  function handleSell() {
    if (!canSell) return
    initSale(eggCount, chickenCount)
    handleClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="panel w-full max-w-sm p-6" role="dialog" aria-modal="true">
        <h2 className="mb-1 text-center text-lg font-bold text-text-primary">
          🚚 Enviar al mercado
        </h2>
        <p className="mb-5 text-center text-xs text-text-muted">
          El camión llevará la carga a la ciudad y traerá el dinero al volver.
        </p>

        {/* Eggs */}
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm text-text-secondary">
              🥚 Huevos disponibles: <strong className="text-text-primary">{warehouseEggs}</strong>
            </span>
            <span className="font-mono text-xs text-accent-primary">
              ${FARM_LEVEL1.eggSellPrice}c/u
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEggCount((c) => Math.max(0, c - 1))}
              className="btn-secondary px-3 py-1 text-lg leading-none"
            >
              −
            </button>
            <span className="flex-1 text-center font-mono text-2xl font-bold text-text-primary">
              {eggCount}
            </span>
            <button
              onClick={() => setEggCount((c) => Math.min(warehouseEggs, c + 1))}
              className="btn-secondary px-3 py-1 text-lg leading-none"
            >
              +
            </button>
            <button
              onClick={() => setEggCount(warehouseEggs)}
              className="btn-secondary px-2 py-1 text-xs"
            >
              Todo
            </button>
          </div>
        </div>

        {/* Chickens */}
        {chickensSellable > 0 && (
          <div className="mb-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm text-text-secondary">
                🐔 Gallinas vendibles:{' '}
                <strong className="text-text-primary">{chickensSellable}</strong>
              </span>
              <span className="font-mono text-xs text-accent-primary">
                ${FARM_LEVEL1.chickenSellPrice}c/u
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setChickenCount((c) => Math.max(0, c - 1))}
                className="btn-secondary px-3 py-1 text-lg leading-none"
              >
                −
              </button>
              <span className="flex-1 text-center font-mono text-2xl font-bold text-text-primary">
                {chickenCount}
              </span>
              <button
                onClick={() => setChickenCount((c) => Math.min(chickensSellable, c + 1))}
                className="btn-secondary px-3 py-1 text-lg leading-none"
              >
                +
              </button>
            </div>
            <p className="mt-1 text-xs text-text-muted">
              Precio de reventa (mitad del valor de compra)
            </p>
          </div>
        )}

        {/* Total */}
        <div className="mb-5 rounded-lg border border-border-default bg-surface-secondary p-3 text-center">
          <p className="text-xs text-text-secondary">Total a recibir cuando el camión vuelva</p>
          <p className="font-mono text-2xl font-bold text-accent-primary">
            ${totalIncome.toLocaleString('es-CO')}
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={handleClose} className="btn-secondary flex-1 text-sm">
            Cancelar
          </button>
          <button
            onClick={handleSell}
            disabled={!canSell}
            className="btn-primary flex-1 text-sm disabled:opacity-40"
          >
            🚚 Enviar
          </button>
        </div>
      </div>
    </div>
  )
}
