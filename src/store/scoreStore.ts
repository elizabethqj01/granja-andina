import { create } from 'zustand'
import type { RankingEntry, GlobalRecords } from '@/types'

interface ScoreStore {
  ranking: RankingEntry[]
  records: GlobalRecords | null
  groupRecords: GlobalRecords | null
  setRanking: (entries: RankingEntry[]) => void
  setRecords: (records: GlobalRecords | null) => void
  setGroupRecords: (records: GlobalRecords | null) => void
}

/**
 * Live mirror of the group ranking / records subscriptions. Firestore
 * (rankings/{groupId}, records/global, records/{groupId}) is the source of
 * truth — this store only holds whatever the current onSnapshot delivered.
 */
export const useScoreStore = create<ScoreStore>((set) => ({
  ranking: [],
  records: null,
  groupRecords: null,
  setRanking: (ranking) => set({ ranking }),
  setRecords: (records) => set({ records }),
  setGroupRecords: (groupRecords) => set({ groupRecords }),
}))
