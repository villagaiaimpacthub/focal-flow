'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Play, Pause, Minus, Plus } from 'lucide-react'

// Sample text about productivity and reading
const SAMPLE_TEXT = `Speed reading transforms how you consume information. By training your eyes to move efficiently across text, you can double or triple your reading speed while maintaining comprehension. The key is eliminating subvocalization and trusting your brain to process words in rapid succession.`

// Parse text into words
function parseText(text: string): string[] {
  return text.split(/\s+/).filter(word => word.length > 0)
}

// Word display component with anchor highlighting
function WordDisplay({
  word,
  fontSize,
  anchorPosition,
  screenPosition,
  anchorColor
}: {
  word: string
  fontSize: number
  anchorPosition: number
  screenPosition: number
  anchorColor: string
}) {
  const { before, anchor, after, anchorIndex } = useMemo(() => {
    if (!word) {
      return { before: '', anchor: '', after: '', anchorIndex: 0 }
    }
    const idx = Math.floor(word.length * anchorPosition)
    const clampedIdx = Math.min(Math.max(0, idx), word.length - 1)
    return {
      before: word.slice(0, clampedIdx),
      anchor: word[clampedIdx] || '',
      after: word.slice(clampedIdx + 1),
      anchorIndex: clampedIdx
    }
  }, [word, anchorPosition])

  if (!word) {
    return (
      <div
        className="relative flex items-center justify-center h-full"
        style={{ fontFamily: "'JetBrains Mono', 'SF Mono', monospace" }}
      >
        <span className="opacity-30 text-white" style={{ fontSize: `${fontSize}px` }}>
          Ready
        </span>
      </div>
    )
  }

  return (
    <div
      className="relative flex items-center justify-center h-full select-none"
      style={{ fontFamily: "'JetBrains Mono', 'SF Mono', monospace" }}
    >
      <div
        className="absolute whitespace-nowrap"
        style={{
          left: `${screenPosition * 100}%`,
          fontSize: `${fontSize}px`,
          transform: `translateX(-${anchorIndex}ch) translateX(-0.5ch)`
        }}
      >
        <span className="text-white">{before}</span>
        <span style={{ color: anchorColor, fontWeight: 'bold' }}>{anchor}</span>
        <span className="text-white">{after}</span>
      </div>
    </div>
  )
}

export default function EmbedDemoPage() {
  const [words] = useState(() => parseText(SAMPLE_TEXT))
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [wpm, setWpm] = useState(300)
  const [hasStarted, setHasStarted] = useState(false)

  // Settings
  const fontSize = 48
  const anchorPosition = 0.35
  const screenPosition = 0.5
  const anchorColor = '#E53E3E'

  // Calculate timing based on WPM
  const getWordTime = useCallback((word: string) => {
    const baseMs = 60000 / wpm
    let totalMs = baseMs

    // Add time for long words
    const extraChars = Math.max(0, word.length - 6)
    totalMs += extraChars * 20

    // Add pauses for punctuation
    const lastChar = word.slice(-1)
    if ('.!?'.includes(lastChar)) {
      totalMs += 150
    } else if (',;:'.includes(lastChar)) {
      totalMs += 75
    }

    return Math.round(totalMs)
  }, [wpm])

  // Playback loop
  useEffect(() => {
    if (!isPlaying) return

    const currentWord = words[currentIndex]
    const timeout = setTimeout(() => {
      setCurrentIndex(prev => {
        const next = prev + 1
        // Loop back to start
        if (next >= words.length) {
          return 0
        }
        return next
      })
    }, getWordTime(currentWord))

    return () => clearTimeout(timeout)
  }, [isPlaying, currentIndex, words, getWordTime])

  // Handle first interaction to start
  const handleStart = () => {
    if (!hasStarted) {
      setHasStarted(true)
      setIsPlaying(true)
    }
  }

  const togglePlay = () => {
    setIsPlaying(prev => !prev)
    if (!hasStarted) setHasStarted(true)
  }

  const adjustWpm = (delta: number) => {
    setWpm(prev => Math.min(1000, Math.max(100, prev + delta)))
  }

  // Progress percentage
  const progress = ((currentIndex + 1) / words.length) * 100

  return (
    <div
      className="w-full h-screen bg-[#0F0F1A] flex flex-col overflow-hidden"
      onClick={!hasStarted ? handleStart : undefined}
      style={{ cursor: !hasStarted ? 'pointer' : 'default' }}
    >
      {/* Main word display area */}
      <div className="flex-1 relative min-h-0">
        <WordDisplay
          word={words[currentIndex]}
          fontSize={fontSize}
          anchorPosition={anchorPosition}
          screenPosition={screenPosition}
          anchorColor={anchorColor}
        />

        {/* Click to start overlay */}
        {!hasStarted && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                <Play className="w-8 h-8 text-white ml-1" />
              </div>
              <p className="text-white/70 text-sm">Click to start</p>
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-white/10">
        <div
          className="h-full bg-[#E53E3E] transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/5">
        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-white" />
          ) : (
            <Play className="w-5 h-5 text-white ml-0.5" />
          )}
        </button>

        {/* Speed control */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => adjustWpm(-50)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <Minus className="w-4 h-4 text-white" />
          </button>
          <div className="text-white font-mono text-sm min-w-[80px] text-center">
            {wpm} <span className="text-white/50">WPM</span>
          </div>
          <button
            onClick={() => adjustWpm(50)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <Plus className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Word counter */}
        <div className="text-white/50 text-xs font-mono">
          {currentIndex + 1}/{words.length}
        </div>
      </div>
    </div>
  )
}
