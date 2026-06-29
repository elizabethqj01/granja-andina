import { useState } from 'react'
import { useFarmStore } from '@/store/farmStore'
import { useUiStore } from '@/store/uiStore'
import { FARM_LEVEL1 } from '@/constants/farmBalance'
import hudPanelUrl from '@/assets/sprites/hud_panel..png'

const PANEL_STYLE: React.CSSProperties = {
  backgroundImage: `url(${hudPanelUrl})`,
  backgroundSize: '100% 100%',
  boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
}

const TEXT_MAIN: React.CSSProperties = {
  color: '#FFF3D0',
  textShadow: '1px 1px 3px rgba(0,0,0,0.85)',
}

const TEXT_LABEL: React.CSSProperties = {
  color: '#D4956A',
  fontFamily: "'Kalam', cursive",
  fontWeight: 700,
  textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
}

const TEXT_VALUE: React.CSSProperties = {
  color: '#FFF3D0',
  fontFamily: "'Kalam', cursive",
  textShadow: '1px 1px 3px rgba(0,0,0,0.85)',
}

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl p-7" style={PANEL_STYLE}>
        {/* X close button */}
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-amber-950/70 text-base font-bold transition-colors hover:bg-amber-800/80"
          style={TEXT_LABEL}
          aria-label="Cerrar"
        >
          ✕
        </button>

        {/* Header */}
        <h2
          className="mb-1 text-center font-fredoka text-2xl"
          style={{ ...TEXT_MAIN, letterSpacing: '0.05em' }}
        >
          🚚 Enviar al mercado
        </h2>
        <p className="mb-6 text-center text-xs" style={TEXT_LABEL}>
          El camión llevará la carga y traerá el dinero al volver.
        </p>

        {/* Eggs row */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold" style={TEXT_LABEL}>
              🥚 Huevos
            </span>
            <span className="text-xs" style={TEXT_VALUE}>
              {warehouseEggs} disponibles · ${FARM_LEVEL1.eggSellPrice}c/u
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEggCount((c) => Math.max(0, c - 1))}
              className="h-9 w-9 rounded-lg bg-amber-900/60 text-xl font-bold leading-none transition-colors hover:bg-amber-800/80"
              style={TEXT_MAIN}
            >
              −
            </button>
            <span className="flex-1 text-center font-fredoka text-3xl font-bold" style={TEXT_MAIN}>
              {eggCount}
            </span>
            <button
              onClick={() => setEggCount((c) => Math.min(warehouseEggs, c + 1))}
              className="h-9 w-9 rounded-lg bg-amber-900/60 text-xl font-bold leading-none transition-colors hover:bg-amber-800/80"
              style={TEXT_MAIN}
            >
              +
            </button>
            <button
              onClick={() => setEggCount(warehouseEggs)}
              className="rounded-lg bg-amber-900/60 px-3 py-1 text-xs font-bold transition-colors hover:bg-amber-800/80"
              style={TEXT_LABEL}
            >
              Todo
            </button>
          </div>
        </div>

        {/* Chickens row */}
        {chickensSellable > 0 && (
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold" style={TEXT_LABEL}>
                🐔 Gallinas
              </span>
              <span className="text-xs" style={TEXT_VALUE}>
                {chickensSellable} vendibles · ${FARM_LEVEL1.chickenSellPrice}c/u
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setChickenCount((c) => Math.max(0, c - 1))}
                className="h-9 w-9 rounded-lg bg-amber-900/60 text-xl font-bold leading-none transition-colors hover:bg-amber-800/80"
                style={TEXT_MAIN}
              >
                −
              </button>
              <span
                className="flex-1 text-center font-fredoka text-3xl font-bold"
                style={TEXT_MAIN}
              >
                {chickenCount}
              </span>
              <button
                onClick={() => setChickenCount((c) => Math.min(chickensSellable, c + 1))}
                className="h-9 w-9 rounded-lg bg-amber-900/60 text-xl font-bold leading-none transition-colors hover:bg-amber-800/80"
                style={TEXT_MAIN}
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Total box */}
        <div className="mb-6 rounded-xl bg-amber-950/50 p-3 text-center">
          <p className="mb-0.5 text-xs" style={TEXT_LABEL}>
            Total a recibir
          </p>
          <p
            className="font-fredoka text-3xl font-bold"
            style={
              totalIncome > 0
                ? { color: '#FFD700', textShadow: '0 0 12px rgba(255,200,0,0.5)' }
                : TEXT_VALUE
            }
          >
            ${totalIncome.toLocaleString('es-CO')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 rounded-xl border-2 py-2 text-sm font-bold transition-colors hover:bg-amber-900/40"
            style={{ ...TEXT_LABEL, borderColor: '#D4956A' }}
          >
            ✕ Cancelar
          </button>
          <button
            onClick={handleSell}
            disabled={!canSell}
            className="flex-1 rounded-xl py-2 text-sm font-bold transition-all disabled:opacity-40"
            style={
              canSell
                ? {
                    background: '#c47b2b',
                    color: '#FFF3D0',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.6)',
                  }
                : { background: '#7a5020', color: '#FFF3D0' }
            }
          >
            🚚 Enviar
          </button>
        </div>
      </div>
    </div>
  )
}
