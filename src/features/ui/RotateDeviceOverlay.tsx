import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

// Show overlay only on small screens in portrait mode (real mobile devices)
const PORTRAIT_QUERY = '(orientation: portrait) and (max-width: 1024px)'

export function RotateDeviceOverlay() {
  const [isPortrait, setIsPortrait] = useState(() => window.matchMedia(PORTRAIT_QUERY).matches)

  useEffect(() => {
    const mq = window.matchMedia(PORTRAIT_QUERY)
    const handler = (e: MediaQueryListEvent) => setIsPortrait(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  if (!isPortrait) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: '#0a0804',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
      }}
    >
      <motion.span
        style={{ fontSize: 72, lineHeight: 1, display: 'block' }}
        animate={{ rotate: [0, 90] }}
        transition={{ duration: 1.2, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
      >
        📱
      </motion.span>
      <p
        style={{
          fontFamily: "'Fredoka One', cursive",
          fontSize: 22,
          color: '#FFF3D0',
          margin: 0,
          textShadow: '1px 1px 4px rgba(0,0,0,0.8)',
        }}
      >
        Rota tu dispositivo
      </p>
      <p
        style={{
          fontFamily: "'Kalam', cursive",
          fontSize: 13,
          color: 'rgba(255,243,208,0.65)',
          margin: 0,
          maxWidth: 260,
          textAlign: 'center',
          lineHeight: 1.5,
        }}
      >
        Este juego está diseñado para pantalla horizontal
      </p>
    </div>
  )
}
