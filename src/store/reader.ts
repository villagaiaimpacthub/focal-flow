import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TimingSettings } from '@/types/database'

// Anchor color presets
export const anchorColorPresets = [
  { name: 'Red', value: '#E53E3E' },
  { name: 'Orange', value: '#ED8936' },
  { name: 'Cyan', value: '#0BC5EA' },
  { name: 'Yellow', value: '#ECC94B' },
  { name: 'Green', value: '#48BB78' },  // for red-colorblind users
  { name: 'Purple', value: '#9F7AEA' },
]

// Timing presets
export const timingPresets = {
  uniform: {
    name: 'Uniform',
    description: 'Same timing for all words',
    settings: { longWordThreshold: 99, msPerExtraChar: 0, sentencePauseMs: 0, clausePauseMs: 0 }
  },
  smooth: {
    name: 'Smooth',
    description: 'Natural pauses (recommended)',
    settings: { longWordThreshold: 6, msPerExtraChar: 20, sentencePauseMs: 150, clausePauseMs: 75 }
  },
  relaxed: {
    name: 'Relaxed',
    description: 'Extra time to absorb',
    settings: { longWordThreshold: 5, msPerExtraChar: 30, sentencePauseMs: 250, clausePauseMs: 125 }
  },
  speed: {
    name: 'Speed',
    description: 'Minimal pauses',
    settings: { longWordThreshold: 8, msPerExtraChar: 10, sentencePauseMs: 75, clausePauseMs: 25 }
  },
} as const

export type TimingPresetKey = keyof typeof timingPresets

export const defaultTimingSettings: TimingSettings = {
  longWordThreshold: 6,
  msPerExtraChar: 20,
  sentencePauseMs: 150,
  clausePauseMs: 75,
}

// Calculate display time for a word based on timing settings
export function getWordDisplayTime(
  word: string,
  wpm: number,
  timing: TimingSettings
): number {
  const baseMs = 60000 / wpm
  let totalMs = baseMs

  // Longer words get more time
  const extraChars = Math.max(0, word.length - timing.longWordThreshold)
  totalMs += extraChars * timing.msPerExtraChar

  // Punctuation pauses
  const lastChar = word.slice(-1)
  if ('.!?'.includes(lastChar)) {
    totalMs += timing.sentencePauseMs
  } else if (',;:'.includes(lastChar)) {
    totalMs += timing.clausePauseMs
  }

  return Math.round(totalMs)
}

interface ReaderState {
  // Playback state
  isPlaying: boolean
  currentWordIndex: number
  words: string[]

  // Settings
  speed: number // WPM
  anchorPosition: number // 0.2 - 0.6 (which letter in the word is the anchor)
  screenPosition: number // 0.3 - 0.7 (where on screen the anchor appears, 0.5 = center)
  fontSize: number
  theme: 'dark' | 'light'
  anchorColor: string
  timing: TimingSettings

  // Document info
  documentId: string | null
  documentTitle: string | null

  // Actions
  setPlaying: (playing: boolean) => void
  togglePlaying: () => void
  setCurrentWordIndex: (index: number) => void
  incrementWordIndex: () => void
  setWords: (words: string[]) => void
  setSpeed: (speed: number) => void
  adjustSpeed: (delta: number) => void
  setAnchorPosition: (position: number) => void
  setScreenPosition: (position: number) => void
  setFontSize: (size: number) => void
  setTheme: (theme: 'dark' | 'light') => void
  setAnchorColor: (color: string) => void
  setTiming: (timing: TimingSettings) => void
  setTimingPreset: (preset: TimingPresetKey) => void
  setTimingSetting: <K extends keyof TimingSettings>(key: K, value: TimingSettings[K]) => void
  resetTimingToDefaults: () => void
  setDocument: (id: string | null, title: string | null, words: string[]) => void
  skipForward: () => void
  skipBackward: () => void
  rewind: (seconds: number) => void
  reset: () => void
}

const MIN_SPEED = 100
const MAX_SPEED = 1200

export const useReaderStore = create<ReaderState>()(
  persist(
    (set, get) => ({
      // Initial state
      isPlaying: false,
      currentWordIndex: 0,
      words: [],
      speed: 300,
      anchorPosition: 0.35,
      screenPosition: 0.5,
      fontSize: 48,
      theme: 'dark',
      anchorColor: '#E53E3E',
      timing: defaultTimingSettings,
      documentId: null,
      documentTitle: null,

      // Actions
      setPlaying: (playing) => set({ isPlaying: playing }),

      togglePlaying: () => set((state) => ({ isPlaying: !state.isPlaying })),

      setCurrentWordIndex: (index) => set({ currentWordIndex: Math.max(0, index) }),

      incrementWordIndex: () => set((state) => {
        const nextIndex = state.currentWordIndex + 1
        if (nextIndex >= state.words.length) {
          return { isPlaying: false }
        }
        return { currentWordIndex: nextIndex }
      }),

      setWords: (words) => set({ words, currentWordIndex: 0 }),

      setSpeed: (speed) => set({
        speed: Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed))
      }),

      adjustSpeed: (delta) => set((state) => ({
        speed: Math.min(MAX_SPEED, Math.max(MIN_SPEED, state.speed + delta))
      })),

      setAnchorPosition: (position) => set({
        anchorPosition: Math.min(0.6, Math.max(0.2, position))
      }),

      setScreenPosition: (position) => set({
        screenPosition: Math.min(0.7, Math.max(0.3, position))
      }),

      setFontSize: (size) => set({
        fontSize: Math.min(120, Math.max(32, size))
      }),

      setTheme: (theme) => set({ theme }),

      setAnchorColor: (color) => set({ anchorColor: color }),

      setTiming: (timing) => set({ timing }),

      setTimingPreset: (preset) => set({
        timing: { ...timingPresets[preset].settings }
      }),

      setTimingSetting: (key, value) => set((state) => ({
        timing: { ...state.timing, [key]: value }
      })),

      resetTimingToDefaults: () => set({ timing: defaultTimingSettings }),

      setDocument: (id, title, words) => set({
        documentId: id,
        documentTitle: title,
        words,
        currentWordIndex: 0,
        isPlaying: false
      }),

      skipForward: () => {
        const { words, currentWordIndex } = get()
        // Find next sentence end (., !, ?)
        let nextIndex = currentWordIndex + 1
        while (nextIndex < words.length) {
          const word = words[nextIndex]
          if (word.match(/[.!?]$/)) {
            set({ currentWordIndex: Math.min(nextIndex + 1, words.length - 1) })
            return
          }
          nextIndex++
        }
        set({ currentWordIndex: words.length - 1 })
      },

      skipBackward: () => {
        const { words, currentWordIndex } = get()
        // Find previous sentence end
        let prevIndex = currentWordIndex - 2
        while (prevIndex > 0) {
          const word = words[prevIndex]
          if (word.match(/[.!?]$/)) {
            set({ currentWordIndex: prevIndex + 1 })
            return
          }
          prevIndex--
        }
        set({ currentWordIndex: 0 })
      },

      rewind: (seconds) => {
        const { speed, currentWordIndex } = get()
        const wordsToRewind = Math.floor((speed / 60) * seconds)
        set({ currentWordIndex: Math.max(0, currentWordIndex - wordsToRewind) })
      },

      reset: () => set({
        isPlaying: false,
        currentWordIndex: 0,
        words: [],
        documentId: null,
        documentTitle: null
      })
    }),
    {
      name: 'flowreader-settings',
      partialize: (state) => ({
        speed: state.speed,
        anchorPosition: state.anchorPosition,
        screenPosition: state.screenPosition,
        fontSize: state.fontSize,
        theme: state.theme,
        anchorColor: state.anchorColor,
        timing: state.timing
      })
    }
  )
)
