import { create } from 'zustand'
import type { User } from 'firebase/auth'
import type { AppUser } from '@/types'

interface AuthStore {
  user: User | null
  appUser: AppUser | null
  isNewUser: boolean
  sessionId: string | null
  loading: boolean
  setUser: (user: User | null) => void
  setAppUser: (appUser: AppUser | null) => void
  setSessionId: (id: string | null) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  appUser: null,
  isNewUser: false,
  sessionId: null,
  loading: true,
  setUser: (user) => set({ user, loading: false }),
  setAppUser: (appUser) => set({ appUser }),
  setSessionId: (id) => set({ sessionId: id }),
}))
