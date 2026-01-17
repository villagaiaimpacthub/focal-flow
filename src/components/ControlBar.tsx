'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronUp, ChevronDown, Settings, Play, Pause, SkipBack, SkipForward, Sparkles } from 'lucide-react'
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
    words,
    currentWordIndex,
    skipForward,
    skipBackward,
    theme
  } = useReaderStore()

  const [isVisible, setIsVisible] = useState(true)
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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

  // Show controls on mouse movement or touch
  const handleInteraction = useCallback(() => {
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
    window.addEventListener('mousemove', handleInteraction)
    window.addEventListener('touchstart', handleInteraction)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mousemove', handleInteraction)
      window.removeEventListener('touchstart', handleInteraction)
    }
  }, [togglePlaying, adjustSpeed, skipForward, skipBackward, handleInteraction, onCatchMeUpClick])

  const progress = words.length > 0
    ? ((currentWordIndex + 1) / words.length) * 100
    : 0

  const bgColor = theme === 'dark' ? 'bg-white/10' : 'bg-black/10'
  const hoverBgColor = theme === 'dark' ? 'hover:bg-white/20' : 'hover:bg-black/20'
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900'
  const textMutedColor = theme === 'dark' ? 'text-white/60' : 'text-gray-600'

  return (
    <>
      {/* Progress bar at bottom */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-1.5 md:h-1 transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          paddingBottom: 'var(--safe-area-inset-bottom)'
        }}
      >
        <div
          className="h-full transition-all duration-75"
          style={{ width: `${progress}%`, backgroundColor: 'var(--accent-color)' }}
        />
      </div>

      {/* Mobile: Bottom control bar */}
      {isMobile ? (
        <div
          className={`absolute bottom-0 left-0 right-0 transition-all duration-300 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
          }`}
          style={{ paddingBottom: 'calc(var(--safe-area-inset-bottom) + 8px)' }}
        >
          {/* Main controls bar */}
          <div className="flex items-center justify-between px-4 py-3 mx-3 mb-2 rounded-2xl backdrop-blur-lg"
            style={{ backgroundColor: theme === 'dark' ? 'rgba(26, 26, 46, 0.95)' : 'rgba(255, 255, 255, 0.95)' }}
          >
            {/* Left: Settings */}
            <button
              onClick={onSettingsClick}
              className={`touch-target flex items-center justify-center rounded-full ${bgColor} ${hoverBgColor} transition-colors`}
              title="Settings"
            >
              <Settings className={`w-6 h-6 ${textColor}`} />
            </button>

            {/* Center: Playback controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={skipBackward}
                className={`touch-target flex items-center justify-center rounded-full ${bgColor} ${hoverBgColor} transition-colors`}
                title="Previous sentence"
              >
                <SkipBack className={`w-5 h-5 ${textColor}`} />
              </button>

              <button
                onClick={togglePlaying}
                className="touch-target flex items-center justify-center rounded-full transition-colors text-white"
                style={{ backgroundColor: 'var(--accent-color)', minWidth: '56px', minHeight: '56px' }}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7" />
                ) : (
                  <Play className="w-7 h-7 ml-1" />
                )}
              </button>

              <button
                onClick={skipForward}
                className={`touch-target flex items-center justify-center rounded-full ${bgColor} ${hoverBgColor} transition-colors`}
                title="Next sentence"
              >
                <SkipForward className={`w-5 h-5 ${textColor}`} />
              </button>
            </div>

            {/* Right: Speed control */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => adjustSpeed(-50)}
                className={`w-9 h-9 flex items-center justify-center rounded-full ${bgColor} ${hoverBgColor} transition-colors`}
              >
                <ChevronDown className={`w-5 h-5 ${textColor}`} />
              </button>
              <div className={`px-2 py-1 rounded-lg ${bgColor} min-w-[60px] text-center`}>
                <span className={`font-mono font-bold text-sm ${textColor}`}>{speed}</span>
              </div>
              <button
                onClick={() => adjustSpeed(50)}
                className={`w-9 h-9 flex items-center justify-center rounded-full ${bgColor} ${hoverBgColor} transition-colors`}
              >
                <ChevronUp className={`w-5 h-5 ${textColor}`} />
              </button>
            </div>
          </div>

          {/* Catch Me Up button (when available) */}
          {onCatchMeUpClick && currentWordIndex > 0 && (
            <button
              onClick={onCatchMeUpClick}
              className="flex items-center justify-center gap-2 mx-3 mb-2 px-4 py-3 rounded-xl text-white text-sm font-medium transition-colors w-[calc(100%-24px)]"
              style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.2)' }}
            >
              <Sparkles className="w-4 h-4" style={{ color: 'var(--accent-color)' }} />
              <span style={{ color: 'var(--accent-color)' }}>Catch Me Up</span>
            </button>
          )}
        </div>
      ) : (
        /* Desktop: Original layout with improvements */
        <>
          {/* WPM control - bottom right, vertical */}
          <div
            className={`absolute bottom-8 right-6 flex flex-col items-center gap-2 transition-opacity duration-300 ${
              isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <button
              onClick={() => adjustSpeed(50)}
              className={`p-3 rounded-full ${bgColor} ${hoverBgColor} transition-colors`}
              title="Increase speed (Up arrow)"
            >
              <ChevronUp className={`w-5 h-5 ${textColor}`} />
            </button>

            {/* Vertical slider */}
            <div className="relative h-32 flex items-center">
              <input
                type="range"
                min={100}
                max={1200}
                step={50}
                value={speed}
                onChange={(e) => setSpeed(parseInt(e.target.value))}
                className="absolute w-32"
                style={{
                  transform: 'rotate(-90deg)',
                  transformOrigin: 'center center'
                }}
              />
            </div>

            <button
              onClick={() => adjustSpeed(-50)}
              className={`p-3 rounded-full ${bgColor} ${hoverBgColor} transition-colors`}
              title="Decrease speed (Down arrow)"
            >
              <ChevronDown className={`w-5 h-5 ${textColor}`} />
            </button>

            {/* WPM display */}
            <div className={`flex flex-col items-center mt-2 px-3 py-2 rounded-lg ${bgColor}`}>
              <span className={`${textColor} text-lg font-mono font-bold`}>{speed}</span>
              <span className={`${textMutedColor} text-xs`}>WPM</span>
            </div>
          </div>

          {/* Settings button - bottom left */}
          <div
            className={`absolute bottom-8 left-6 flex items-center gap-3 transition-opacity duration-300 ${
              isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <button
              onClick={onSettingsClick}
              className={`p-3 rounded-full ${bgColor} ${hoverBgColor} transition-colors`}
              title="Settings"
            >
              <Settings className={`w-5 h-5 ${textColor}`} />
            </button>

            {onCatchMeUpClick && currentWordIndex > 0 && (
              <button
                onClick={onCatchMeUpClick}
                className={`px-4 py-2 rounded-full ${bgColor} ${hoverBgColor} ${textColor} text-sm transition-colors`}
                title="Get AI summary (S)"
              >
                Catch Me Up
              </button>
            )}
          </div>
        </>
      )}

      {/* Word count - top right */}
      <div
        className={`absolute top-4 right-4 ${textMutedColor} text-sm font-mono transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ paddingTop: 'var(--safe-area-inset-top)' }}
      >
        {currentWordIndex + 1} / {words.length}
      </div>
    </>
  )
}
