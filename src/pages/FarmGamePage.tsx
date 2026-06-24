import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FarmGameCanvas } from '@/game/FarmGameCanvas'
import { LevelHUD } from '@/features/level/components/LevelHUD'
import { LevelCompleteModal } from '@/features/level/components/LevelCompleteModal'
import { InGameMenu } from '@/features/level/components/InGameMenu'
import { CostFlowDialog } from '@/features/level/components/CostFlowDialog'
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
    setFarmDialog(null)
    farmEngine.reset()
    farmEngine.start()
    return () => {
      farmEngine.stop()
      setFarmDialog(null)
    }
  }, [setFarmDialog])

  function handleRestart() {
    farmEngine.reset()
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
      <CostFlowDialog />
      <InGameMenu
        onResume={() => setFarmDialog(null)}
        onRestart={handleRestart}
        onExit={handleExit}
      />
      <LevelCompleteModal onRetry={handleRestart} onExit={handleExit} />
    </div>
  )
}
