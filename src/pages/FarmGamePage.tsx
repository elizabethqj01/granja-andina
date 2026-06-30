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

  useEffect(() => {
    // Start fresh and pause on the objectives intro until the player begins.
    farmEngine.reset(levelId)
    farmEngine.start()
    setFarmDialog('objectives')
    return () => {
      farmEngine.stop()
      setFarmDialog(null)
    }
  }, [setFarmDialog])

  // Start tutorial the moment the player closes the intro modal
  useEffect(() => {
    if (prevDialogRef.current === 'objectives' && farmDialog === null) {
      startFarmTutorial()
    }
    prevDialogRef.current = farmDialog
  }, [farmDialog, startFarmTutorial])

  function handleRestart() {
    farmEngine.reset(levelId)
    farmEngine.start()
    setFarmDialog('objectives')
  }

  function handleExit() {
    farmEngine.stop()
    navigate('/levels')
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-surface-primary">
      <FarmGameCanvas />
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
