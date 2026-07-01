import { useState, useEffect } from 'react'

const DESIGN_W = 1280
const DESIGN_H = 720

function computeSf(): number {
  return Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H)
}

/**
 * Returns a scale factor that mirrors Phaser's responsive sf:
 *   sf = min(viewport_w / 1280, viewport_h / 720)
 *
 * At 1280×720 → 1.0 (nominal). At 900×400 → ~0.55. At 1920×1080 → 1.5.
 * Updates reactively on window resize.
 */
export function useViewportSf(): number {
  const [sf, setSf] = useState(computeSf)
  useEffect(() => {
    const update = () => setSf(computeSf())
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return sf
}
