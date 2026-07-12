import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useScoreStore } from '@/store/scoreStore'
import { subscribeToRanking, subscribeToRecords } from '@/firebase/firestore'
import { ScoreSummaryTab } from '@/features/gamification/components/ScoreSummaryTab'
import { GroupsTab } from '@/features/gamification/components/GroupsTab'
import { RankingTab } from '@/features/gamification/components/RankingTab'
import { RecordsTab } from '@/features/gamification/components/RecordsTab'
import { ProfileTab } from '@/features/gamification/components/ProfileTab'

type ScoresTab = 'resumen' | 'grupos' | 'ranking' | 'records' | 'perfil'

const TABS: { id: ScoresTab; label: string }[] = [
  { id: 'resumen', label: '🏆 Resumen' },
  { id: 'grupos', label: '👥 Grupos' },
  { id: 'ranking', label: '📈 Ranking' },
  { id: 'records', label: '🥇 Récords' },
  { id: 'perfil', label: '👤 Perfil' },
]

/**
 * SC-01..SC-05 collapsed into one route with internal tabs (mirrors the
 * route+modal pattern already used for the rest of the app instead of
 * spinning up 5 separate pages).
 */
export function ScoresPage() {
  const navigate = useNavigate()
  const appUser = useAuthStore((s) => s.appUser)
  const setRanking = useScoreStore((s) => s.setRanking)
  const setRecords = useScoreStore((s) => s.setRecords)
  const setGroupRecords = useScoreStore((s) => s.setGroupRecords)
  const [tab, setTab] = useState<ScoresTab>('resumen')

  useEffect(() => {
    const unsubscribeRecords = subscribeToRecords(setRecords)
    return unsubscribeRecords
  }, [setRecords])

  useEffect(() => {
    if (!appUser?.groupId) {
      setRanking([])
      setGroupRecords(null)
      return
    }
    const unsubscribeRanking = subscribeToRanking(appUser.groupId, setRanking)
    const unsubscribeGroupRecords = subscribeToRecords(setGroupRecords, appUser.groupId)
    return () => {
      unsubscribeRanking()
      unsubscribeGroupRecords()
    }
  }, [appUser?.groupId, setRanking, setGroupRecords])

  return (
    <div className="flex h-screen w-screen flex-col bg-surface-primary">
      <header className="flex items-center justify-between border-b border-border-default px-6 py-4">
        <button
          onClick={() => navigate('/menu')}
          className="text-sm text-text-muted transition-colors hover:text-text-primary"
        >
          ← Menú
        </button>
        <h1 className="text-lg font-bold text-text-primary">Puntajes y Ranking</h1>
        <span className="w-14" aria-hidden="true" />
      </header>

      <nav className="flex gap-1 border-b border-border-default px-4 py-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-accent-primary text-surface-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="flex-1 overflow-y-auto p-6">
        {tab === 'resumen' && <ScoreSummaryTab />}
        {tab === 'grupos' && <GroupsTab />}
        {tab === 'ranking' && <RankingTab />}
        {tab === 'records' && <RecordsTab />}
        {tab === 'perfil' && <ProfileTab />}
      </main>
    </div>
  )
}
