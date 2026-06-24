import { create } from 'zustand'

const PLAYER_NAME_KEY = 'costflow_player_name'

function loadPlayerName(): string {
  return localStorage.getItem(PLAYER_NAME_KEY) ?? ''
}

interface PlayerStore {
  playerName: string
  setPlayerName: (name: string) => void
  clearPlayerName: () => void
}

/**
 * Identity of the local player for the Farm pivot.
 * The name is the entry point of the game (Screen 1) and persists in
 * localStorage so the player skips re-typing it across sessions.
 */
export const usePlayerStore = create<PlayerStore>((set) => ({
  playerName: loadPlayerName(),
  setPlayerName: (name) => {
    const trimmed = name.trim()
    localStorage.setItem(PLAYER_NAME_KEY, trimmed)
    set({ playerName: trimmed })
  },
  clearPlayerName: () => {
    localStorage.removeItem(PLAYER_NAME_KEY)
    set({ playerName: '' })
  },
}))
