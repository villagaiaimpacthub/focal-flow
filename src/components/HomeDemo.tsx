'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Play, Pause } from 'lucide-react'

const DEMO_TEXT = `Speed reading is a skill that can be developed with practice. FocalFlow uses RSVP technology to display one word at a time, allowing your brain to focus without eye movement. Most people can comfortably read at 300 to 500 words per minute. With practice, you can reach even higher speeds while maintaining comprehension.`

const SPEED_PRESETS = [
  { label: 'Slow', wpm: 200 },
  { label: 'Medium', wpm: 350 },
  { label: 'Fast', wpm: 500 },
]

interface HomeDemoProps {
  anchorColor?: string
  anchorPosition?: number
}

export function HomeDemo({
  anchorColor = '#E53E3E',
  anchorPosition = 0.35
}: HomeDemoProps) {
  const words = useMemo(() => DEMO_TEXT.split(/\s+/), [])

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [speed, setSpeed] = useState(350)

  // Calculate anchor letter position
  const getWordParts = useCallback((word: string) => {
    if (!word) return { before: '', anchor: '', after: '', anchorIndex: 0 }
    const idx = Math.floor(word.length * anchorPosition)
    const clampedIdx = Math.min(Math.max(0, idx), word.length - 1)
    return {
      before: word.slice(0, clampedIdx),
      anchor: word[clampedIdx] || '',
      after: word.slice(clampedIdx + 1),
      anchorIndex: clampedIdx
    }
  }, [anchorPosition])

  // Auto-start after 1 second delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPlaying(true)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  // Word advancement
  useEffect(() => {
    if (!isPlaying) return

    const intervalMs = (60 / speed) * 1000
    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev >= words.length - 1) {
          return 0 // Loop back to start
        }
        return prev + 1
      })
    }, intervalMs)

    return () => clearInterval(interval)
  }, [isPlaying, speed, words.length])

  const togglePlaying = () => {
    setIsPlaying(prev => !prev)
  }

  const currentWord = words[currentIndex] || ''
  const { before, anchor, after, anchorIndex } = getWordParts(currentWord)

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* RSVP Display */}
      <button
        onClick={togglePlaying}
        className="w-full bg-white/5 hover:bg-white/[0.07] rounded-2xl p-8 md:p-12 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20"
        aria-label={isPlaying ? 'Pause demo' : 'Play demo'}
      >
        <div
          className="relative h-16 md:h-20 flex items-center justify-center font-mono text-3xl md:text-5xl select-none"
        >
          {currentWord ? (
            <div
              className="absolute left-1/2 whitespace-nowrap"
              style={{
                transform: `translateX(-${anchorIndex}ch) translateX(-0.5ch)`
              }}
            >
              <span className="text-white">{before}</span>
              <span style={{ color: anchorColor, fontWeight: 'bold' }}>{anchor}</span>
              <span className="text-white">{after}</span>
            </div>
          ) : (
            <span className="text-white/30">Ready</span>
          )}

          {/* Play/Pause overlay on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20 rounded-xl">
            {isPlaying ? (
              <Pause className="w-10 h-10 text-white/80" />
            ) : (
              <Play className="w-10 h-10 text-white/80 ml-1" />
            )}
          </div>
        </div>
      </button>

      {/* Speed presets + WPM */}
      <div className="mt-6 flex items-center justify-center gap-3">
        {SPEED_PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => setSpeed(preset.wpm)}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all touch-target ${
              speed === preset.wpm
                ? 'text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
            style={speed === preset.wpm ? { backgroundColor: anchorColor } : undefined}
          >
            {preset.label}
          </button>
        ))}
        <span className="text-white/40 text-sm font-mono ml-2">{speed} WPM</span>
      </div>
    </div>
  )
}
