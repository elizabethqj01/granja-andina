import { describe, it, expect, beforeEach } from 'vitest'
import { usePlayerStore } from './playerStore'

beforeEach(() => {
  localStorage.clear()
  usePlayerStore.setState({ playerName: '' })
})

describe('playerStore', () => {
  it('should_persistName_when_setPlayerNameCalled', () => {
    usePlayerStore.getState().setPlayerName('Eli')
    expect(usePlayerStore.getState().playerName).toBe('Eli')
    expect(localStorage.getItem('costflow_player_name')).toBe('Eli')
  })

  it('should_trimWhitespace_when_nameHasPadding', () => {
    usePlayerStore.getState().setPlayerName('  Ana  ')
    expect(usePlayerStore.getState().playerName).toBe('Ana')
  })

  it('should_clearName_when_clearPlayerNameCalled', () => {
    usePlayerStore.getState().setPlayerName('Eli')
    usePlayerStore.getState().clearPlayerName()
    expect(usePlayerStore.getState().playerName).toBe('')
    expect(localStorage.getItem('costflow_player_name')).toBeNull()
  })
})
