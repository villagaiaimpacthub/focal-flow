import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ReaderState {
  // Playback state
  isPlaying: boolean
  currentWordIndex: number
  words: string[]

  // Settings
  speed: number // WPM
  anchorPosition: number // 0.2 - 0.6
  fontSize: number
  theme: 'dark' | 'light'

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
  setFontSize: (size: number) => void
  setTheme: (theme: 'dark' | 'light') => void
  setDocument: (id: string | null, title: string | null, words: string[]) => void
  skipForward: () => void
  skipBackward: () => void
  rewind: (seconds: number) => void
  reset: () => void
}

const SPEED_PRESETS = [200, 300, 400, 500, 600, 700, 800, 900, 1000, 1200]
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
      fontSize: 48,
      theme: 'dark',
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

      setFontSize: (size) => set({
        fontSize: Math.min(72, Math.max(32, size))
      }),

      setTheme: (theme) => set({ theme }),

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
        fontSize: state.fontSize,
        theme: state.theme
      })
    }
  )
)
