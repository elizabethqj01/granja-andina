import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { LevelId } from '@/constants/farmBalance'
import { FarmGameCanvas } from '@/game/FarmGameCanvas'
import { LevelHUD } from '@/features/level/components/LevelHUD'
import { LevelCompleteModal } from '@/features/level/components/LevelCompleteModal'
import { GameOverModal } from '@/features/level/components/GameOverModal'
import { InGameMenu } from '@/features/level/components/InGameMenu'
import { CostFlowDialog } from '@/features/level/components/CostFlowDialog'
import { LevelIntroModal } from '@/features/level/components/LevelIntroModal'
import { SellModal } from '@/features/level/components/SellModal'
import { CostScrollModal } from '@/features/level/components/CostScrollModal'
import { TutorialOverlay } from '@/features/education/TutorialOverlay'
import { farmEngine } from '@/simulation/farm/farmEngine'
import { useUiStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { useFarmStore } from '@/store/farmStore'
import { createSession, completeSession } from '@/firebase/firestore'

/**
 * Level 1 game screen — Farm pivot. Owns the farm engine lifecycle and lays the
 * React HUD/dialogs over the Phaser canvas. State lives in `farmStore`.
 */
export function FarmGamePage() {
  const navigate = useNavigate()
  const { level } = useParams<{ level: string }>()
  const levelId = (Number(level) === 2 ? 2 : 1) as LevelId
  const setFarmDialog = useUiStore((s) => s.setFarmDialog)
  const farmDialog = useUiStore((s) => s.farmDialog)
  const startFarmTutorial = useUiStore((s) => s.startFarmTutorial)
  const prevDialogRef = useRef<string | null>(null)

  const uid = useAuthStore((s) => s.user?.uid ?? null)
  const levelComplete = useFarmStore((s) => s.levelComplete)
  const levelFailed = useFarmStore((s) => s.levelFailed)
  const sessionIdRef = useRef<string | null>(null)
  const sessionOpenRef = useRef(false)

  function beginSession() {
    sessionOpenRef.current = false
    if (!uid) return
    createSession(uid, levelId).then((id) => {
      sessionIdRef.current = id
      sessionOpenRef.current = true
    })
  }

  function closeSession(status: 'completed' | 'abandoned') {
    if (!sessionOpenRef.current || !sessionIdRef.current) return
    sessionOpenRef.current = false
    const { cash, eggsSold } = useFarmStore.getState()
    void completeSession(sessionIdRef.current, {
      status,
      finalScore: null, // filled in once the scoring formula ships (backlog Fase 2)
      finalProfit: cash,
      decisionCount: eggsSold,
    })
  }

  useEffect(() => {
    // Start fresh and pause on the objectives intro until the player begins.
    farmEngine.reset(levelId)
    farmEngine.start()
    setFarmDialog('objectives')
    beginSession()
    return () => {
      farmEngine.stop()
      setFarmDialog(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per level mount, mirrors farmEngine.reset(levelId) above
  }, [setFarmDialog])

  // Start tutorial the moment the player closes the intro modal
  useEffect(() => {
    if (prevDialogRef.current === 'objectives' && farmDialog === null) {
      startFarmTutorial()
    }
    prevDialogRef.current = farmDialog
  }, [farmDialog, startFarmTutorial])

  // Persist the session's final stats the moment the level resolves.
  useEffect(() => {
    if (levelComplete || levelFailed) {
      closeSession(levelComplete ? 'completed' : 'abandoned')
    }
  }, [levelComplete, levelFailed])

  function handleRestart() {
    farmEngine.reset(levelId)
    farmEngine.start()
    setFarmDialog('objectives')
    beginSession()
  }

  function handleExit() {
    closeSession('abandoned')
    farmEngine.stop()
    navigate('/levels')
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-surface-primary">
      <FarmGameCanvas />
      {/* Mobile-only warehouse label — HTML so it renders at native device resolution */}
      <div
        className="pointer-events-none lg:hidden"
        style={{
          position: 'absolute',
          left: '86%',
          top: 'calc(88% - 13vh)',
          transform: 'translateX(-50%)',
          fontFamily: "'Kalam', cursive",
          fontSize: '11px',
          color: '#F5DEB3',
          textShadow:
            '1px 1px 0 #3A1500, -1px -1px 0 #3A1500, 1px -1px 0 #3A1500, -1px 1px 0 #3A1500',
          whiteSpace: 'nowrap',
          zIndex: 10,
        }}
      >
        Almacén
      </div>
      <LevelHUD />
      <TutorialOverlay />
      <LevelIntroModal />
      <SellModal />
      <CostScrollModal />
      <CostFlowDialog />
      <InGameMenu
        onResume={() => setFarmDialog(null)}
        onRestart={handleRestart}
        onExit={handleExit}
      />
      <LevelCompleteModal onRetry={handleRestart} onExit={handleExit} />
      <GameOverModal onRetry={handleRestart} onExit={handleExit} />
    </div>
  )
}
