import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { createFarmConfig } from './farmConfig'
import { FARM_GRID } from '@/store/farmStore'

/**
 * Mounts the Phaser farm scene. The game state lives entirely in `farmStore`;
 * this component only owns the canvas lifecycle.
 */
export function FarmGameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return
    // On small screens (phones) use an 8×8 grid so tiles are larger and readable
    if (Math.min(window.innerWidth, window.innerHeight) < 550) {
      FARM_GRID.cols = 8
      FARM_GRID.rows = 8
    } else {
      FARM_GRID.cols = 12
      FARM_GRID.rows = 12
    }
    gameRef.current = new Phaser.Game(createFarmConfig(containerRef.current))

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden"
      aria-label="Granja — Nivel 1"
    />
  )
}
