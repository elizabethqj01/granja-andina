import { useState } from 'react'
import { playSfx } from '@/services/sfx'
import { useFarmStore } from '@/store/farmStore'
import { useUiStore } from '@/store/uiStore'
import { FARM_LEVEL1 } from '@/constants/farmBalance'
import { useViewportSf } from '@/hooks/useViewportSf'
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
  color: '#FFE066',
  fontFamily: "'Kalam', cursive",
  fontWeight: 700,
  textShadow: '1px 1px 3px rgba(0,0,0,0.9)',
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
  const sf = Math.min(useViewportSf(), 1)

  const [eggCount, setEggCount] = useState(0)
  const [chickenCount, setChickenCount] = useState(0)

  if (farmDialog !== 'sell') return null

  const chickensSellable = Math.max(0, chickens.length - 1)
  const totalIncome =
    eggCount * FARM_LEVEL1.eggSellPrice + chickenCount * FARM_LEVEL1.chickenSellPrice
  const canSell = totalIncome > 0 && saleState === 'idle'

  const p = (base: number, min = 0) => Math.max(min, Math.round(base * sf))

  function handleClose() {
    setFarmDialog(null)
    setEggCount(0)
    setChickenCount(0)
  }

  function handleSell() {
    if (!canSell) return
    playSfx('sell_confirm')
    initSale(eggCount, chickenCount)
    handleClose()
  }

  const btnH = p(36)
  const btnW = p(36)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-2xl"
        style={{
          ...PANEL_STYLE,
          padding: `${p(28)}px`,
          maxHeight: 'calc(100dvh - 2rem)',
          overflowY: 'auto',
        }}
      >
        {/* X close button */}
        <button
          onClick={handleClose}
          className="absolute flex items-center justify-center rounded-full bg-amber-950/70 font-bold transition-colors hover:bg-amber-800/80"
          style={{
            ...TEXT_LABEL,
            right: p(12),
            top: p(12),
            width: p(32),
            height: p(32),
            fontSize: `${p(14, 13)}px`,
          }}
          aria-label="Cerrar"
        >
          ✕
        </button>

        {/* Header */}
        <h2
          className="text-center"
          style={{
            ...TEXT_MAIN,
            fontFamily: "'Fredoka One', cursive",
            fontSize: `${p(22, 17)}px`,
            letterSpacing: '0.05em',
            marginBottom: `${p(4)}px`,
          }}
        >
          🚚 Enviar al mercado
        </h2>
        <p
          className="text-center"
          style={{ ...TEXT_LABEL, fontSize: `${p(11, 12)}px`, marginBottom: `${p(20)}px` }}
        >
          El camión llevará la carga y traerá el dinero al volver.
        </p>

        {/* Eggs row */}
        <div style={{ marginBottom: `${p(16)}px` }}>
          <div className="flex items-center justify-between" style={{ marginBottom: `${p(8)}px` }}>
            <span style={{ ...TEXT_LABEL, fontSize: `${p(13, 13)}px` }}>🥚 Huevos</span>
            <span style={{ ...TEXT_VALUE, fontSize: `${p(11, 12)}px` }}>
              {warehouseEggs} disponibles · ${FARM_LEVEL1.eggSellPrice}c/u
            </span>
          </div>
          <div className="flex items-center" style={{ gap: `${p(8)}px` }}>
            <button
              onClick={() => {
                playSfx('btn_click')
                setEggCount((c) => Math.max(0, c - 1))
              }}
              className="rounded-lg bg-amber-900/60 font-bold leading-none transition-colors hover:bg-amber-800/80"
              style={{ ...TEXT_MAIN, width: btnW, height: btnH, fontSize: `${p(18, 16)}px` }}
            >
              −
            </button>
            <span
              className="flex-1 text-center font-bold"
              style={{
                ...TEXT_MAIN,
                fontFamily: "'Fredoka One', cursive",
                fontSize: `${p(28, 20)}px`,
              }}
            >
              {eggCount}
            </span>
            <button
              onClick={() => {
                playSfx('btn_click')
                setEggCount((c) => Math.min(warehouseEggs, c + 1))
              }}
              className="rounded-lg bg-amber-900/60 font-bold leading-none transition-colors hover:bg-amber-800/80"
              style={{ ...TEXT_MAIN, width: btnW, height: btnH, fontSize: `${p(18, 16)}px` }}
            >
              +
            </button>
            <button
              onClick={() => {
                playSfx('btn_click')
                setEggCount(warehouseEggs)
              }}
              className="rounded-lg bg-amber-900/60 font-bold transition-colors hover:bg-amber-800/80"
              style={{ ...TEXT_LABEL, fontSize: `${p(11, 12)}px`, padding: `${p(4)}px ${p(10)}px` }}
            >
              Todo
            </button>
          </div>
        </div>

        {/* Chickens row */}
        {chickensSellable > 0 && (
          <div style={{ marginBottom: `${p(16)}px` }}>
            <div
              className="flex items-center justify-between"
              style={{ marginBottom: `${p(8)}px` }}
            >
              <span style={{ ...TEXT_LABEL, fontSize: `${p(13, 13)}px` }}>🐔 Gallinas</span>
              <span style={{ ...TEXT_VALUE, fontSize: `${p(11, 12)}px` }}>
                {chickensSellable} vendibles · ${FARM_LEVEL1.chickenSellPrice}c/u
              </span>
            </div>
            <div className="flex items-center" style={{ gap: `${p(8)}px` }}>
              <button
                onClick={() => {
                  playSfx('btn_click')
                  setChickenCount((c) => Math.max(0, c - 1))
                }}
                className="rounded-lg bg-amber-900/60 font-bold leading-none transition-colors hover:bg-amber-800/80"
                style={{ ...TEXT_MAIN, width: btnW, height: btnH, fontSize: `${p(18, 16)}px` }}
              >
                −
              </button>
              <span
                className="flex-1 text-center font-bold"
                style={{
                  ...TEXT_MAIN,
                  fontFamily: "'Fredoka One', cursive",
                  fontSize: `${p(28, 20)}px`,
                }}
              >
                {chickenCount}
              </span>
              <button
                onClick={() => {
                  playSfx('btn_click')
                  setChickenCount((c) => Math.min(chickensSellable, c + 1))
                }}
                className="rounded-lg bg-amber-900/60 font-bold leading-none transition-colors hover:bg-amber-800/80"
                style={{ ...TEXT_MAIN, width: btnW, height: btnH, fontSize: `${p(18, 16)}px` }}
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Total */}
        <div
          className="text-center"
          style={{
            background: 'rgba(0,0,0,0.35)',
            borderRadius: '12px',
            padding: `${p(10)}px`,
            marginBottom: `${p(20)}px`,
          }}
        >
          <p style={{ ...TEXT_LABEL, fontSize: `${p(11, 12)}px`, marginBottom: `${p(4)}px` }}>
            Total a recibir
          </p>
          <p
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: `${p(28, 20)}px`,
              fontWeight: 700,
              ...(totalIncome > 0
                ? { color: '#FFD700', textShadow: '0 0 12px rgba(255,200,0,0.5)' }
                : TEXT_VALUE),
            }}
          >
            ${totalIncome.toLocaleString('es-CO')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex" style={{ gap: `${p(10)}px` }}>
          <button
            onClick={handleClose}
            className="flex-1 rounded-xl border-2 font-bold transition-colors hover:bg-amber-900/40"
            style={{
              ...TEXT_LABEL,
              borderColor: '#D4956A',
              fontSize: `${p(13, 13)}px`,
              padding: `${p(8)}px`,
            }}
          >
            ✕ Cancelar
          </button>
          <button
            onClick={handleSell}
            disabled={!canSell}
            className="flex-1 rounded-xl font-bold transition-all disabled:opacity-40"
            style={{
              fontSize: `${p(13, 13)}px`,
              padding: `${p(8)}px`,
              ...(canSell
                ? {
                    background: '#c47b2b',
                    color: '#FFF3D0',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.6)',
                  }
                : { background: '#7a5020', color: '#FFF3D0' }),
            }}
          >
            🚚 Enviar
          </button>
        </div>
      </div>
    </div>
  )
}
