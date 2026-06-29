import { useState, useEffect } from 'react'
import { useFarmStore } from '@/store/farmStore'
import { useUiStore } from '@/store/uiStore'
import { FARM_LEVEL1 } from '@/constants/farmBalance'
import coinUrl from '@/assets/sprites/coin.png'
import starUrl from '@/assets/sprites/start.png'

function CoinSprite({ size = 24 }: { size?: number }) {
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % 9), 1000 / 8)
    return () => clearInterval(id)
  }, [])
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        backgroundImage: `url(${coinUrl})`,
        backgroundSize: `${size * 9}px ${size}px`,
        backgroundPosition: `-${frame * size}px 0`,
        imageRendering: 'pixelated',
        flexShrink: 0,
      }}
    />
  )
}

function StarSprite({ filled, size = 30 }: { filled: boolean; size?: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        backgroundImage: `url(${starUrl})`,
        backgroundSize: `${size * 2}px ${size}px`,
        backgroundPosition: filled ? '0 0' : `-${size}px 0`,
        imageRendering: 'pixelated',
        flexShrink: 0,
      }}
    />
  )
}

function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function starCount(elapsedSec: number): number {
  if (elapsedSec <= FARM_LEVEL1.starThresholdsSec.three) return 3
  if (elapsedSec <= FARM_LEVEL1.starThresholdsSec.two) return 2
  return 1
}

const PANEL_STYLE: React.CSSProperties = {
  background: 'linear-gradient(160deg, #2d1a00 0%, #4a2c0a 45%, #3a2008 100%)',
  border: '2px solid #8B6914',
  boxShadow: '0 4px 24px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,200,80,0.12)',
}

const DIVIDER: React.CSSProperties = { borderBottom: '1px solid #5a3d0a' }

export function LevelHUD() {
  const elapsedSec = useFarmStore((s) => s.elapsedSec)
  const cash = useFarmStore((s) => s.cash)
  const collected = useFarmStore((s) => s.eggsCollectedTotal)
  const warehouseEggs = useFarmStore((s) => s.warehouseEggs)
  const notification = useFarmStore((s) => s.notification)
  const setFarmDialog = useUiStore((s) => s.setFarmDialog)

  const stars = starCount(elapsedSec)
  const warehouseFull = warehouseEggs >= FARM_LEVEL1.maxWarehouseEggs

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {/* Top-left — animal roster */}
      <div
        className="pointer-events-auto absolute left-3 top-3 flex items-center gap-2 rounded-xl px-3 py-2"
        style={PANEL_STYLE}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded bg-amber-900/60 text-base">
          🐔
        </div>
        <span className="font-mono text-xs text-amber-300">×{FARM_LEVEL1.initialChickens}</span>
      </div>

      {/* Top-right — main HUD panel */}
      <div
        className="pointer-events-auto absolute right-3 top-3 min-w-[190px] overflow-hidden rounded-xl"
        style={PANEL_STYLE}
      >
        {/* Timer */}
        <div className="flex items-center justify-center gap-2 px-4 py-2" style={DIVIDER}>
          <span className="text-lg">⏱</span>
          <span
            className="font-mono text-2xl font-bold tracking-widest text-white"
            style={{ textShadow: '0 0 10px rgba(255,200,0,0.4)' }}
          >
            {formatTime(elapsedSec)}
          </span>
        </div>

        {/* Stars */}
        <div className="flex items-center justify-center gap-1 px-4 py-2" style={DIVIDER}>
          {[1, 2, 3].map((n) => (
            <StarSprite key={n} filled={n <= stars} size={30} />
          ))}
        </div>

        {/* Cash */}
        <div className="flex items-center justify-between gap-3 px-4 py-1.5" style={DIVIDER}>
          <span className="text-xs uppercase tracking-wide text-amber-500/70">Caja</span>
          <span className="flex items-center gap-1 font-mono text-base font-bold text-amber-300">
            <CoinSprite size={20} />${cash.toLocaleString('es-CO')}
          </span>
        </div>

        {/* Objective */}
        <div className="flex items-center justify-between gap-3 px-4 py-1.5" style={DIVIDER}>
          <span className="text-xs uppercase tracking-wide text-amber-500/70">Objetivo</span>
          <span className="font-mono text-sm font-bold text-white">
            🥚 {collected}/{FARM_LEVEL1.objectiveEggs}
          </span>
        </div>

        {/* Warehouse */}
        <div className="flex items-center justify-between gap-3 px-4 py-1.5">
          <span className="text-xs uppercase tracking-wide text-amber-500/70">Almacén</span>
          <span
            className={`font-mono text-sm font-bold ${warehouseFull ? 'text-red-400' : 'text-white/80'}`}
          >
            {warehouseEggs}/{FARM_LEVEL1.maxWarehouseEggs}
            {warehouseFull && ' 🔴'}
          </span>
        </div>
      </div>

      {/* Bottom-center — cost flow button */}
      <div className="pointer-events-auto absolute bottom-3 left-1/2 -translate-x-1/2">
        <button
          onClick={() => setFarmDialog('cost-flow')}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-black shadow-md transition-transform hover:scale-105"
        >
          📊 Flujo de Costos
        </button>
      </div>

      {/* Bottom-left — menu button */}
      <div className="pointer-events-auto absolute bottom-3 left-3">
        <button
          onClick={() => setFarmDialog('menu')}
          className="rounded-xl px-5 py-2 text-sm font-bold text-white transition-colors"
          style={PANEL_STYLE}
        >
          Menú
        </button>
      </div>

      {/* Warehouse-full banner */}
      {warehouseFull && (
        <div className="pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 rounded-lg bg-red-700/80 px-4 py-1.5 text-xs font-bold text-white backdrop-blur-sm">
          🏠 Almacén lleno — vende los huevos
        </div>
      )}

      {/* Notification toast */}
      {notification && (
        <div className="pointer-events-none absolute left-1/2 top-20 -translate-x-1/2 rounded-lg bg-gray-900/90 px-5 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-sm">
          {notification}
        </div>
      )}
    </div>
  )
}
