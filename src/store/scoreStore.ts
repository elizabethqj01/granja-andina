import { create } from 'zustand'
import type { RankingEntry, GlobalRecords } from '@/types'

interface ScoreStore {
  ranking: RankingEntry[]
  records: GlobalRecords | null
  setRanking: (entries: RankingEntry[]) => void
  setRecords: (records: GlobalRecords | null) => void
}

/**
 * Live mirror of the group ranking / global records subscriptions. Firestore
 * (rankings/{groupId}, records/global) is the source of truth — this store
 * only holds whatever the current onSnapshot listener last delivered.
 */
export const useScoreStore = create<ScoreStore>((set) => ({
  ranking: [],
  records: null,
  setRanking: (ranking) => set({ ranking }),
  setRecords: (records) => set({ records }),
}))
