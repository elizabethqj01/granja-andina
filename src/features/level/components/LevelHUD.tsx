import { useState, useEffect } from 'react'
import { useFarmStore } from '@/store/farmStore'
import { useUiStore } from '@/store/uiStore'
import { FARM_LEVEL1, FARM_LEVEL2, type FarmLevelConfig } from '@/constants/farmBalance'
import { useViewportSf } from '@/hooks/useViewportSf'
import coinUrl from '@/assets/sprites/coin.png'
import starUrl from '@/assets/sprites/start.png'
import hudPanelUrl from '@/assets/sprites/hud_panel..png'
import chickenSheetUrl from '@/assets/sprites/chicken_sheet.png'

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

function ChickenSprite({ size = 40, dim = false }: { size?: number; dim?: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        backgroundImage: `url(${chickenSheetUrl})`,
        backgroundSize: `${size * 6}px ${size * 4}px`,
        backgroundPosition: '0 0',
        imageRendering: 'pixelated',
        flexShrink: 0,
        opacity: dim ? 0.35 : 1,
        transition: 'opacity 0.2s',
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

function starCount(elapsedSec: number, cfg: FarmLevelConfig): number {
  if (elapsedSec <= cfg.starThresholdsSec.three) return 3
  if (elapsedSec <= cfg.starThresholdsSec.two) return 2
  return 1
}

const PANEL_STYLE: React.CSSProperties = {
  backgroundImage: `url(${hudPanelUrl})`,
  backgroundSize: '100% 100%',
  boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
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

export function LevelHUD() {
  const sf = useViewportSf()

  const elapsedSec = useFarmStore((s) => s.elapsedSec)
  const cash = useFarmStore((s) => s.cash)
  const collected = useFarmStore((s) => s.eggsCollectedTotal)
  const warehouseEggs = useFarmStore((s) => s.warehouseEggs)
  const notification = useFarmStore((s) => s.notification)
  const chickens = useFarmStore((s) => s.chickens)
  const buyChicken = useFarmStore((s) => s.buyChicken)
  const activeLevelId = useFarmStore((s) => s.activeLevelId)
  const setFarmDialog = useUiStore((s) => s.setFarmDialog)

  const cfg: FarmLevelConfig = activeLevelId === 2 ? FARM_LEVEL2 : FARM_LEVEL1
  const livingChickens = chickens.filter((c) => !c.dead).length
  const chickensFull = chickens.length >= cfg.maxChickens
  const canAfford = cash >= cfg.chickenBuyPrice
  const buyDisabled = chickensFull || !canAfford

  const stars = starCount(elapsedSec, cfg)
  const warehouseFull = warehouseEggs >= cfg.maxWarehouseEggs

  // Derived sizes — all scale with viewport sf
  const s = {
    panelMinW: Math.round(190 * sf),
    panelPadX: Math.round(24 * sf),
    panelPadY: Math.round(12 * sf),
    timerFont: `${(1.6 * sf).toFixed(2)}rem`,
    emojiFont: `${(1.1 * sf).toFixed(2)}rem`,
    starSize: Math.round(30 * sf),
    labelFont: `${Math.round(11 * sf)}px`,
    valueFont: `${Math.round(15 * sf)}px`,
    smallFont: `${Math.round(12 * sf)}px`,
    coinSize: Math.round(18 * sf),
    gap: Math.round(8 * sf),
    chickSize: Math.round(38 * sf),
    btnPadX: Math.round(12 * sf),
    btnPadY: Math.round(8 * sf),
    menuFont: `${Math.round(14 * sf)}px`,
    menuPadX: Math.round(18 * sf),
    menuPadY: Math.round(8 * sf),
  }

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {/* Top-left — chicken shop */}
      <button
        onClick={buyDisabled ? undefined : buyChicken}
        disabled={buyDisabled}
        title={
          chickensFull
            ? 'Corral lleno'
            : !canAfford
              ? `Necesitas $${cfg.chickenBuyPrice}`
              : `Comprar gallina ($${cfg.chickenBuyPrice})`
        }
        className="pointer-events-auto absolute left-3 top-3 flex items-center rounded-xl transition-transform active:scale-95"
        style={{
          ...PANEL_STYLE,
          gap: s.gap,
          padding: `${s.btnPadY}px ${s.btnPadX}px`,
          cursor: buyDisabled ? 'not-allowed' : 'pointer',
          filter: buyDisabled ? 'brightness(0.75)' : undefined,
        }}
      >
        <ChickenSprite size={s.chickSize} dim={buyDisabled} />
        <div className="flex flex-col items-start" style={{ gap: Math.round(2 * sf) }}>
          <span style={{ ...TEXT_LABEL, fontSize: s.labelFont }}>
            {chickensFull ? 'Corral lleno' : 'Comprar gallina'}
          </span>
          <span
            className="flex items-center font-bold"
            style={{ ...TEXT_MAIN, fontSize: s.smallFont, gap: Math.round(4 * sf) }}
          >
            <CoinSprite size={Math.round(13 * sf)} />${cfg.chickenBuyPrice}
          </span>
        </div>
      </button>

      {/* Top-right — main HUD panel */}
      <div
        className="pointer-events-auto absolute right-3 top-3 overflow-hidden rounded-xl"
        style={{ ...PANEL_STYLE, minWidth: s.panelMinW }}
      >
        {/* Timer */}
        <div
          className="flex items-center justify-center"
          style={{
            gap: Math.round(4 * sf),
            padding: `${s.panelPadY}px ${s.panelPadX}px ${Math.round(6 * sf)}px`,
          }}
        >
          <span style={{ fontSize: s.emojiFont }}>⏱</span>
          <span
            style={{
              ...TEXT_MAIN,
              fontFamily: "'Fredoka One', cursive",
              fontSize: s.timerFont,
              letterSpacing: '0.08em',
            }}
          >
            {formatTime(elapsedSec)}
          </span>
        </div>

        {/* Stars */}
        <div
          className="flex items-center justify-center"
          style={{ gap: Math.round(4 * sf), padding: `${Math.round(4 * sf)}px ${s.panelPadX}px` }}
        >
          {[1, 2, 3].map((n) => (
            <StarSprite key={n} filled={n <= stars} size={s.starSize} />
          ))}
        </div>

        {/* Star hint — only when sf big enough to show it */}
        {stars >= 2 && sf >= 0.75 && (
          <p
            className="text-center font-bold"
            style={{
              ...TEXT_LABEL,
              fontSize: `${Math.round(9 * sf)}px`,
              padding: `0 ${s.panelPadX}px ${Math.round(4 * sf)}px`,
            }}
          >
            {stars === 3
              ? `⭐⭐⭐ antes de ${formatTime(cfg.starThresholdsSec.three)}`
              : `⭐⭐ antes de ${formatTime(cfg.starThresholdsSec.two)}`}
          </p>
        )}

        {/* Cash */}
        <div
          className="flex items-center justify-between"
          style={{ gap: s.gap, padding: `${Math.round(4 * sf)}px ${s.panelPadX}px` }}
        >
          <span style={{ ...TEXT_LABEL, fontSize: s.labelFont }}>Caja</span>
          <span
            className="flex items-center font-bold"
            style={{
              ...TEXT_MAIN,
              fontFamily: "'Kalam', cursive",
              fontSize: s.valueFont,
              gap: Math.round(3 * sf),
            }}
          >
            <CoinSprite size={s.coinSize} />${cash.toLocaleString('es-CO')}
          </span>
        </div>

        {/* Objective */}
        <div
          className="flex items-center justify-between"
          style={{ gap: s.gap, padding: `${Math.round(4 * sf)}px ${s.panelPadX}px` }}
        >
          <span style={{ ...TEXT_LABEL, fontSize: s.labelFont }}>Objetivo</span>
          <div
            className="flex flex-col items-end font-bold"
            style={{
              ...TEXT_MAIN,
              fontFamily: "'Kalam', cursive",
              fontSize: s.valueFont,
              gap: Math.round(2 * sf),
            }}
          >
            <span>
              🥚 {collected}/{cfg.objectiveEggs}
            </span>
            {cfg.objectiveChickens > 0 && (
              <span>
                🐔 {livingChickens}/{cfg.objectiveChickens}
              </span>
            )}
          </div>
        </div>

        {/* Warehouse */}
        <div
          className="flex items-center justify-between"
          style={{
            gap: s.gap,
            padding: `${Math.round(4 * sf)}px ${s.panelPadX}px ${s.panelPadY}px`,
          }}
        >
          <span style={{ ...TEXT_LABEL, fontSize: s.labelFont }}>Almacén</span>
          <span
            className="font-bold"
            style={{
              fontFamily: "'Kalam', cursive",
              fontSize: s.valueFont,
              ...(warehouseFull
                ? { color: '#FF4422', textShadow: '1px 1px 3px rgba(0,0,0,0.85)' }
                : TEXT_MAIN),
            }}
          >
            {warehouseEggs}/{cfg.maxWarehouseEggs}
            {warehouseFull && ' 🔴'}
          </span>
        </div>
      </div>

      {/* Bottom-left — menu button */}
      <div className="pointer-events-auto absolute bottom-3 left-3">
        <button
          onClick={() => setFarmDialog('menu')}
          className="rounded-xl font-bold transition-colors"
          style={{
            ...PANEL_STYLE,
            ...TEXT_MAIN,
            fontSize: s.menuFont,
            padding: `${s.menuPadY}px ${s.menuPadX}px`,
          }}
        >
          Menú
        </button>
      </div>

      {/* Warehouse-full banner */}
      {warehouseFull && (
        <div
          className="pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 rounded-lg bg-red-700/80 font-bold text-white backdrop-blur-sm"
          style={{
            fontSize: s.smallFont,
            padding: `${Math.round(6 * sf)}px ${Math.round(14 * sf)}px`,
          }}
        >
          🏠 Almacén lleno — vende los huevos
        </div>
      )}

      {/* Notification toast */}
      {notification && (
        <div
          className="pointer-events-none absolute left-1/2 top-20 -translate-x-1/2 rounded-lg bg-gray-900/90 font-semibold text-white shadow-lg backdrop-blur-sm"
          style={{
            fontSize: s.smallFont,
            padding: `${Math.round(7 * sf)}px ${Math.round(18 * sf)}px`,
          }}
        >
          {notification}
        </div>
      )}
    </div>
  )
}
