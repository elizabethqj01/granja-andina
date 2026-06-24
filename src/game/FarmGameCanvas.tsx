import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { createFarmConfig } from './farmConfig'

/**
 * Mounts the Phaser farm scene. The game state lives entirely in `farmStore`;
 * this component only owns the canvas lifecycle.
 */
export function FarmGameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return
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
