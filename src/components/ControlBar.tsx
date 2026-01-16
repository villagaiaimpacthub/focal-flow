'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Rewind,
  Settings,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { useReaderStore } from '@/store/reader'

interface ControlBarProps {
  onSettingsClick?: () => void
  onCatchMeUpClick?: () => void
}

export function ControlBar({ onSettingsClick, onCatchMeUpClick }: ControlBarProps) {
  const {
    isPlaying,
    togglePlaying,
    speed,
    setSpeed,
    adjustSpeed,
    anchorPosition,
    setAnchorPosition,
    words,
    currentWordIndex,
    skipForward,
    skipBackward,
    rewind
  } = useReaderStore()

  const [isVisible, setIsVisible] = useState(true)
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null)

  // Auto-hide controls during playback
  useEffect(() => {
    if (isPlaying) {
      const timeout = setTimeout(() => setIsVisible(false), 3000)
      setHideTimeout(timeout)
      return () => clearTimeout(timeout)
    } else {
      setIsVisible(true)
      if (hideTimeout) clearTimeout(hideTimeout)
    }
  }, [isPlaying])

  // Show controls on mouse movement
  const handleMouseMove = useCallback(() => {
    setIsVisible(true)
    if (hideTimeout) clearTimeout(hideTimeout)
    if (isPlaying) {
      const timeout = setTimeout(() => setIsVisible(false), 3000)
      setHideTimeout(timeout)
    }
  }, [isPlaying, hideTimeout])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          togglePlaying()
          break
        case 'ArrowUp':
          e.preventDefault()
          adjustSpeed(50)
          break
        case 'ArrowDown':
          e.preventDefault()
          adjustSpeed(-50)
          break
        case 'ArrowLeft':
          e.preventDefault()
          skipBackward()
          break
        case 'ArrowRight':
          e.preventDefault()
          skipForward()
          break
        case 'KeyS':
          e.preventDefault()
          onCatchMeUpClick?.()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [togglePlaying, adjustSpeed, skipForward, skipBackward, handleMouseMove, onCatchMeUpClick])

  const progress = words.length > 0
    ? ((currentWordIndex + 1) / words.length) * 100
    : 0

  const estimatedTimeRemaining = words.length > 0 && speed > 0
    ? Math.ceil((words.length - currentWordIndex) / speed)
    : 0

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{
        background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)'
      }}
    >
      {/* Progress bar */}
      <div className="w-full h-1 bg-white/10">
        <div
          className="h-full bg-red-500 transition-all duration-75"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-4 flex items-center justify-between gap-4">
        {/* Left section - Playback controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => rewind(15)}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            title="Rewind 15s"
          >
            <Rewind className="w-5 h-5 text-white" />
          </button>

          <button
            onClick={skipBackward}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            title="Previous sentence (Left arrow)"
          >
            <SkipBack className="w-5 h-5 text-white" />
          </button>

          <button
            onClick={togglePlaying}
            className="p-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
            title="Play/Pause (Space)"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-white" />
            ) : (
              <Play className="w-6 h-6 text-white ml-0.5" />
            )}
          </button>

          <button
            onClick={skipForward}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            title="Next sentence (Right arrow)"
          >
            <SkipForward className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Center section - Speed control */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustSpeed(-50)}
              className="p-1 rounded hover:bg-white/10"
              title="Decrease speed (Down arrow)"
            >
              <ChevronDown className="w-4 h-4 text-white" />
            </button>

            <div className="flex flex-col items-center min-w-[80px]">
              <span className="text-white text-lg font-mono font-bold">
                {speed}
              </span>
              <span className="text-white/60 text-xs">WPM</span>
            </div>

            <button
              onClick={() => adjustSpeed(50)}
              className="p-1 rounded hover:bg-white/10"
              title="Increase speed (Up arrow)"
            >
              <ChevronUp className="w-4 h-4 text-white" />
            </button>
          </div>

          <input
            type="range"
            min={100}
            max={1200}
            step={50}
            value={speed}
            onChange={(e) => setSpeed(parseInt(e.target.value))}
            className="w-32 accent-red-500"
          />
        </div>

        {/* Right section - Progress & Settings */}
        <div className="flex items-center gap-4">
          <div className="text-white/80 text-sm font-mono">
            {currentWordIndex + 1} / {words.length}
            {estimatedTimeRemaining > 0 && (
              <span className="text-white/50 ml-2">
                ~{estimatedTimeRemaining} min left
              </span>
            )}
          </div>

          {onCatchMeUpClick && currentWordIndex > 0 && (
            <button
              onClick={onCatchMeUpClick}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
              title="Get AI summary (S)"
            >
              Catch Me Up
            </button>
          )}

          <button
            onClick={onSettingsClick}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}
