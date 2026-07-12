import { create } from 'zustand'

export type PanelId =
  | 'mp-warehouse'
  | 'roasting'
  | 'grinding'
  | 'packaging'
  | 'pt-warehouse'
  | 'ecpv'
  | 'finance'
  | null

export type Theme = 'dark' | 'light'

// Farm pivot — blocking in-game dialogs. While one is open, the farm
// simulation pauses (mirrors how the café engine pauses on event decisions).
// 'objectives' is the level-intro shown before the match starts.
export type FarmDialog =
  | 'menu'
  | 'cost-flow'
  | 'objectives'
  | 'sell'
  | 'scroll-mpd'
  | 'scroll-wip'
  | 'scroll-pt'
  | 'transactions'
  | null

const THEME_KEY = 'costflow_theme'
const ONBOARDING_KEY = 'costflow_onboarding_done'
const FARM_TUTORIAL_KEY = 'costflow_farm_tutorial_done'

function loadTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY) as Theme | null
  return saved ?? 'dark'
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem(THEME_KEY, theme)
}

interface UiStore {
  activePanel: PanelId
  theme: Theme
  onboardingStep: number | null // null = done, 0-4 = active step
  farmDialog: FarmDialog // open blocking dialog in the farm level (pauses sim)
  farmTutorialStep: number | null // null = inactive; 0-4 = active step
  farmTutorialDone: boolean
  setActivePanel: (id: PanelId) => void
  closePanel: () => void
  toggleTheme: () => void
  setOnboardingStep: (step: number | null) => void
  startOnboarding: () => void
  finishOnboarding: () => void
  setFarmDialog: (dialog: FarmDialog) => void
  startFarmTutorial: () => void
  nextFarmTutorialStep: () => void
  skipFarmTutorial: () => void
  resetFarmTutorial: () => void
}

export const useUiStore = create<UiStore>((set, get) => {
  const initialTheme = loadTheme()
  applyTheme(initialTheme)

  const onboardingDone = localStorage.getItem(ONBOARDING_KEY) === 'true'
  const farmTutorialDone = localStorage.getItem(FARM_TUTORIAL_KEY) === 'true'

  return {
    activePanel: null,
    theme: initialTheme,
    onboardingStep: onboardingDone ? null : 0,
    farmDialog: null,
    farmTutorialStep: null,
    farmTutorialDone,
    setActivePanel: (id) => set({ activePanel: id }),
    closePanel: () => set({ activePanel: null }),
    setFarmDialog: (dialog) => set({ farmDialog: dialog }),
    toggleTheme: () => {
      const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
      applyTheme(next)
      set({ theme: next })
    },
    setOnboardingStep: (step) => set({ onboardingStep: step }),
    startOnboarding: () => set({ onboardingStep: 0 }),
    finishOnboarding: () => {
      localStorage.setItem(ONBOARDING_KEY, 'true')
      set({ onboardingStep: null })
    },
    startFarmTutorial: () => {
      if (get().farmTutorialDone) return
      set({ farmTutorialStep: 0 })
    },
    nextFarmTutorialStep: () => {
      const step = get().farmTutorialStep
      if (step === null) return
      if (step >= 6) {
        localStorage.setItem(FARM_TUTORIAL_KEY, 'true')
        set({ farmTutorialStep: null, farmTutorialDone: true })
      } else {
        set({ farmTutorialStep: step + 1 })
      }
    },
    skipFarmTutorial: () => {
      localStorage.setItem(FARM_TUTORIAL_KEY, 'true')
      set({ farmTutorialStep: null, farmTutorialDone: true })
    },
    resetFarmTutorial: () => {
      localStorage.removeItem(FARM_TUTORIAL_KEY)
      set({ farmTutorialStep: null, farmTutorialDone: false })
    },
  }
})
