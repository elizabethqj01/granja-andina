import { useState, useEffect } from 'react'
import { useFarmStore } from '@/store/farmStore'
import { useUiStore } from '@/store/uiStore'
import { FARM_LEVEL1 } from '@/constants/farmBalance'
import coinUrl from '@/assets/sprites/coin.png'

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

function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function starPace(elapsedSec: number): { stars: number; label: string; color: string } {
  if (elapsedSec <= FARM_LEVEL1.starThresholdsSec.three)
    return { stars: 3, label: '<1:00', color: 'text-yellow-300' }
  if (elapsedSec <= FARM_LEVEL1.starThresholdsSec.two)
    return { stars: 2, label: '<2:00', color: 'text-white/60' }
  return { stars: 1, label: '>2:00', color: 'text-white/40' }
}

export function LevelHUD() {
  const elapsedSec = useFarmStore((s) => s.elapsedSec)
  const cash = useFarmStore((s) => s.cash)
  const collected = useFarmStore((s) => s.eggsCollectedTotal)
  const warehouseEggs = useFarmStore((s) => s.warehouseEggs)
  const notification = useFarmStore((s) => s.notification)
  const setFarmDialog = useUiStore((s) => s.setFarmDialog)

  const pace = starPace(elapsedSec)
  const warehouseFull = warehouseEggs >= FARM_LEVEL1.maxWarehouseEggs

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {/* Top-left — animal roster */}
      <div className="pointer-events-auto absolute left-3 top-3 flex items-center gap-2 rounded-lg bg-black/40 px-3 py-2 backdrop-blur-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-white text-base">
          🐔
        </div>
        <span className="font-mono text-xs text-white/80">×{FARM_LEVEL1.initialChickens}</span>
      </div>

      {/* Bottom-center — cost flow button (away from corn warehouse) */}
      <div className="pointer-events-auto absolute bottom-3 left-1/2 -translate-x-1/2">
        <button
          onClick={() => setFarmDialog('cost-flow')}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-black shadow-md transition-transform hover:scale-105"
        >
          📊 Flujo de Costos
        </button>
      </div>

      {/* Top-right — timer + star pace + cash + objective */}
      <div className="pointer-events-auto absolute right-3 top-3 flex flex-col items-end gap-1 rounded-lg bg-black/40 px-3 py-2 backdrop-blur-sm">
        <span className="font-mono text-lg font-bold text-white">⏱ {formatTime(elapsedSec)}</span>
        {/* Star pace — updates live as time elapses */}
        <span className={`font-mono text-xs ${pace.color}`}>
          {'★'.repeat(pace.stars)}
          {'☆'.repeat(3 - pace.stars)} ritmo ({pace.label})
        </span>
        <span className="flex items-center gap-1 font-mono text-sm text-amber-300">
          <CoinSprite size={22} />${cash.toLocaleString('es-CO')}
        </span>
        <span className="font-mono text-sm text-white">
          🥚 {collected}/{FARM_LEVEL1.objectiveEggs} recolectados
        </span>
        <span
          className={`font-mono text-xs ${warehouseFull ? 'font-bold text-red-400' : 'text-white/70'}`}
        >
          almacén: {warehouseEggs}/{FARM_LEVEL1.maxWarehouseEggs}
          {warehouseFull && ' ¡LLENO!'}
        </span>
      </div>

      {/* Bottom-left — menu button */}
      <div className="pointer-events-auto absolute bottom-3 left-3">
        <button
          onClick={() => setFarmDialog('menu')}
          className="rounded-lg bg-black/50 px-5 py-2 text-sm font-bold text-white backdrop-blur-sm transition-colors hover:bg-black/70"
        >
          Menú
        </button>
      </div>

      {/* Warehouse-full banner — appears above sell cart area */}
      {warehouseFull && (
        <div className="pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 rounded-lg bg-red-700/80 px-4 py-1.5 text-xs font-bold text-white backdrop-blur-sm">
          🏠 Almacén lleno — vende los huevos
        </div>
      )}

      {/* Timed notification toast — actions that fail (no funds, empty cart…) */}
      {notification && (
        <div className="pointer-events-none absolute left-1/2 top-20 -translate-x-1/2 rounded-lg bg-gray-900/90 px-5 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-sm">
          {notification}
        </div>
      )}
    </div>
  )
}
