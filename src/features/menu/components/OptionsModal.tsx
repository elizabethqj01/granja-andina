import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useUiStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { logoutUser } from '@/firebase/auth'
import { audioManager } from '@/game/audio/AudioManager'
import hudPanelUrl from '@/assets/sprites/hud_panel..png'

const WOOD: React.CSSProperties = {
  backgroundImage: `url(${hudPanelUrl})`,
  backgroundSize: '100% 100%',
  boxShadow: '0 8px 40px rgba(0,0,0,0.75)',
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

interface OptionsModalProps {
  onClose: () => void
}

export function OptionsModal({ onClose }: OptionsModalProps) {
  const navigate = useNavigate()
  const { theme, toggleTheme, farmTutorialDone, resetFarmTutorial } = useUiStore()
  const displayName = useAuthStore((s) => s.user?.displayName ?? '')
  const [audioEnabled, setAudioEnabled] = useState(audioManager.isEnabled)
  const [tutorialReset, setTutorialReset] = useState(false)

  function handleResetTutorial() {
    resetFarmTutorial()
    setTutorialReset(true)
  }

  function handleAudioToggle() {
    setAudioEnabled(audioManager.toggle())
  }

  async function handleLogout() {
    await logoutUser()
    navigate('/', { replace: true })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        className="w-full max-w-sm overflow-hidden rounded-2xl"
        style={WOOD}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Opciones"
      >
        <div style={{ padding: '28px 24px 24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
            }}
          >
            <h2
              style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: '22px',
                ...TEXT_MAIN,
                margin: 0,
              }}
            >
              ⚙️ Opciones
            </h2>
            <button
              onClick={onClose}
              style={{
                ...TEXT_LABEL,
                fontSize: '18px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                lineHeight: 1,
              }}
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>

          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}
          >
            <Row label="Jugador">
              <span style={{ ...TEXT_MAIN, fontSize: '13px', fontFamily: "'Kalam', cursive" }}>
                {displayName || '—'}
              </span>
            </Row>
            <Row label="Audio">
              <button
                onClick={handleAudioToggle}
                style={{
                  padding: '4px 12px',
                  borderRadius: '8px',
                  background: audioEnabled ? 'rgba(80,160,60,0.35)' : 'rgba(0,0,0,0.4)',
                  border: `1px solid ${audioEnabled ? '#6fcf5a' : 'rgba(255,224,102,0.4)'}`,
                  fontFamily: "'Kalam', cursive",
                  fontSize: '12px',
                  cursor: 'pointer',
                  ...TEXT_MAIN,
                }}
              >
                {audioEnabled ? '🔊 Activado' : '🔇 Silenciado'}
              </button>
            </Row>
            <Row label="Tema">
              <button
                onClick={toggleTheme}
                style={{
                  padding: '4px 12px',
                  borderRadius: '8px',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,224,102,0.4)',
                  fontFamily: "'Kalam', cursive",
                  fontSize: '12px',
                  cursor: 'pointer',
                  ...TEXT_MAIN,
                }}
              >
                {theme === 'dark' ? '🌙 Oscuro' : '☀️ Claro'}
              </button>
            </Row>
            <Row label="Tutorial">
              <button
                onClick={handleResetTutorial}
                disabled={!farmTutorialDone && !tutorialReset}
                style={{
                  padding: '4px 12px',
                  borderRadius: '8px',
                  background: tutorialReset
                    ? 'rgba(80,160,60,0.35)'
                    : farmTutorialDone
                      ? 'rgba(0,0,0,0.4)'
                      : 'rgba(0,0,0,0.2)',
                  border: `1px solid ${tutorialReset ? '#6fcf5a' : 'rgba(255,224,102,0.4)'}`,
                  fontFamily: "'Kalam', cursive",
                  fontSize: '12px',
                  cursor: farmTutorialDone ? 'pointer' : 'default',
                  opacity: !farmTutorialDone && !tutorialReset ? 0.45 : 1,
                  ...TEXT_MAIN,
                }}
              >
                {tutorialReset ? '✓ Listo' : farmTutorialDone ? '🔄 Repetir' : 'Sin completar'}
              </button>
            </Row>
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              marginBottom: '10px',
              padding: '11px',
              borderRadius: '10px',
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid rgba(255,224,102,0.3)',
              fontFamily: "'Kalam', cursive",
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              ...TEXT_MAIN,
            }}
          >
            🚪 Cerrar sesión
          </button>

          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '11px',
              borderRadius: '10px',
              background: 'rgba(0,0,0,0.4)',
              border: '2px solid rgba(255,224,102,0.5)',
              fontFamily: "'Fredoka One', cursive",
              fontSize: '15px',
              cursor: 'pointer',
              ...TEXT_MAIN,
            }}
          >
            Volver
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.25)',
        borderRadius: '10px',
        padding: '10px 14px',
        border: '1px solid rgba(255,224,102,0.15)',
      }}
    >
      <span
        style={{
          color: '#FFE066',
          fontFamily: "'Kalam', cursive",
          fontSize: '13px',
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      {children}
    </div>
  )
}
