import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FarmGameCanvas } from '@/game/FarmGameCanvas'
import { LevelHUD } from '@/features/level/components/LevelHUD'
import { LevelCompleteModal } from '@/features/level/components/LevelCompleteModal'
import { GameOverModal } from '@/features/level/components/GameOverModal'
import { InGameMenu } from '@/features/level/components/InGameMenu'
import { CostFlowDialog } from '@/features/level/components/CostFlowDialog'
import { LevelIntroModal } from '@/features/level/components/LevelIntroModal'
import { SellModal } from '@/features/level/components/SellModal'
import { CostScrollModal } from '@/features/level/components/CostScrollModal'
import { farmEngine } from '@/simulation/farm/farmEngine'
import { useUiStore } from '@/store/uiStore'

/**
 * Level 1 game screen — Farm pivot. Owns the farm engine lifecycle and lays the
 * React HUD/dialogs over the Phaser canvas. State lives in `farmStore`.
 */
export function FarmGamePage() {
  const navigate = useNavigate()
  const setFarmDialog = useUiStore((s) => s.setFarmDialog)

  useEffect(() => {
    // Start fresh and pause on the objectives intro until the player begins.
    farmEngine.reset()
    farmEngine.start()
    setFarmDialog('objectives')
    return () => {
      farmEngine.stop()
      setFarmDialog(null)
    }
  }, [setFarmDialog])

  function handleRestart() {
    // Re-init AND re-start the clock, then drop straight back into play.
    farmEngine.reset()
    farmEngine.start()
    setFarmDialog(null)
  }

  function handleExit() {
    farmEngine.stop()
    navigate('/levels')
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-surface-primary">
      <FarmGameCanvas />
      <LevelHUD />
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
