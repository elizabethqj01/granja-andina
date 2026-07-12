import { useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
import { TransactionsPanel } from '@/features/level/components/TransactionsPanel'
import { EvaluationRubricModal } from '@/features/education/components/EvaluationRubricModal'
import { TutorialOverlay } from '@/features/education/TutorialOverlay'
import { farmEngine } from '@/simulation/farm/farmEngine'
import { useUiStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { useFarmStore, type FarmState } from '@/store/farmStore'
import {
  createSession,
  completeSession,
  writeScore,
  updateBestRecords,
  writeAssessment,
} from '@/firebase/firestore'
import { computeFarmCostStatement } from '@/features/level/farmCostStatement'

/**
 * Level 1 game screen — Farm pivot. Owns the farm engine lifecycle and lays the
 * React HUD/dialogs over the Phaser canvas. State lives in `farmStore`.
 */
export function FarmGamePage() {
  const navigate = useNavigate()
  const { level } = useParams<{ level: string }>()
  const [searchParams] = useSearchParams()
  const evalMode = searchParams.get('eval') === '1'
  const levelId = (Number(level) === 2 ? 2 : 1) as LevelId
  const setFarmDialog = useUiStore((s) => s.setFarmDialog)
  const farmDialog = useUiStore((s) => s.farmDialog)
  const startFarmTutorial = useUiStore((s) => s.startFarmTutorial)
  const prevDialogRef = useRef<string | null>(null)

  const uid = useAuthStore((s) => s.user?.uid ?? null)
  const appUser = useAuthStore((s) => s.appUser)
  const setAppUser = useAuthStore((s) => s.setAppUser)
  const levelComplete = useFarmStore((s) => s.levelComplete)
  const levelFailed = useFarmStore((s) => s.levelFailed)
  const finalScore = useFarmStore((s) => s.finalScore)
  const scoreBreakdown = useFarmStore((s) => s.scoreBreakdown)
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

  async function persistScoreIfNewBest(farm: FarmState) {
    if (farm.finalScore === null || !uid || !appUser) return
    const key = String(levelId)
    const previousBest = appUser.bestRecords.bestScoreByLevel[key] ?? -1
    if (farm.finalScore <= previousBest) return

    const statement = computeFarmCostStatement({
      cornPurchasedValue: farm.cornPurchasedValue,
      cornStock: farm.cornStock,
      modAccrued: farm.modAccrued,
      cifAccrued: farm.cifAccrued,
      chickenCostAccrued: farm.chickenCostAccrued,
      warehouseEggs: farm.warehouseEggs,
      groundEggsCount: farm.groundEggs.length,
      eggsCollectedTotal: farm.eggsCollectedTotal,
      revenue: farm.revenue,
    })
    const record = {
      score: farm.finalScore,
      stars: farm.stars,
      timeSeconds: farm.elapsedSec,
      costoUnitario: statement.costPerEgg,
      utilidad: statement.utilidad,
    }

    await writeScore(uid, appUser.displayName, levelId, appUser.groupId, record)
    await updateBestRecords(uid, levelId, appUser, record)

    const prevStars = appUser.bestRecords.bestStarsByLevel[key] ?? 0
    setAppUser({
      ...appUser,
      totalScore: appUser.totalScore - Math.max(previousBest, 0) + record.score,
      starsTotal: appUser.starsTotal - prevStars + record.stars,
      levelsCompleted:
        appUser.levelsCompleted + (key in appUser.bestRecords.bestScoreByLevel ? 0 : 1),
      bestRecords: {
        ...appUser.bestRecords,
        bestScoreByLevel: { ...appUser.bestRecords.bestScoreByLevel, [key]: record.score },
        bestStarsByLevel: { ...appUser.bestRecords.bestStarsByLevel, [key]: record.stars },
        bestTimeByLevel: { ...appUser.bestRecords.bestTimeByLevel, [key]: record.timeSeconds },
        bestCostUnitarioByLevel: {
          ...appUser.bestRecords.bestCostUnitarioByLevel,
          [key]: record.costoUnitario,
        },
        bestUtilidadByLevel: { ...appUser.bestRecords.bestUtilidadByLevel, [key]: record.utilidad },
      },
    })
  }

  function closeSession(status: 'completed' | 'abandoned') {
    if (!sessionOpenRef.current || !sessionIdRef.current) return
    sessionOpenRef.current = false
    const farm = useFarmStore.getState()
    void completeSession(sessionIdRef.current, {
      status,
      finalScore: farm.finalScore,
      finalProfit: farm.cash,
      decisionCount: farm.eggsSold,
    })
    if (status !== 'completed') return
    if (evalMode) {
      if (uid && farm.finalScore !== null && farm.scoreBreakdown) {
        void writeAssessment(
          uid,
          levelId,
          farm.finalScore / 20,
          farm.scoreBreakdown,
          farm.elapsedSec
        )
      }
      return
    }
    void persistScoreIfNewBest(farm)
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

  // Start tutorial the moment the player closes the intro modal — skipped in
  // evaluation mode (EV-01: "sin ayudas"), the rest of the engine lifecycle is unchanged.
  useEffect(() => {
    if (prevDialogRef.current === 'objectives' && farmDialog === null && !evalMode) {
      startFarmTutorial()
    }
    prevDialogRef.current = farmDialog
  }, [farmDialog, startFarmTutorial, evalMode])

  // Persist the session's final stats the moment the level resolves.
  useEffect(() => {
    if (levelComplete || levelFailed) {
      closeSession(levelComplete ? 'completed' : 'abandoned')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- closeSession reads fresh state via useFarmStore.getState()
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
      {!evalMode && <TutorialOverlay />}
      <LevelIntroModal evalMode={evalMode} />
      <SellModal />
      <CostScrollModal />
      <CostFlowDialog />
      <TransactionsPanel />
      <InGameMenu
        onResume={() => setFarmDialog(null)}
        onRestart={handleRestart}
        onExit={handleExit}
      />
      {evalMode ? (
        levelComplete &&
        finalScore !== null &&
        scoreBreakdown && (
          <EvaluationRubricModal
            nota={finalScore / 20}
            breakdown={scoreBreakdown}
            onContinue={() => navigate('/levels')}
          />
        )
      ) : (
        <LevelCompleteModal onRetry={handleRestart} onExit={handleExit} />
      )}
      <GameOverModal onRetry={handleRestart} onExit={handleExit} />
    </div>
  )
}
