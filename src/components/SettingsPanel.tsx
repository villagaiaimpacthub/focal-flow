'use client'

import { useState, useEffect } from 'react'
import { X, Sun, Moon, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import { useReaderStore, anchorColorPresets, timingPresets, defaultTimingSettings, TimingPresetKey } from '@/store/reader'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const {
    anchorPosition,
    setAnchorPosition,
    fontSize,
    setFontSize,
    theme,
    setTheme,
    speed,
    setSpeed,
    anchorColor,
    setAnchorColor,
    timing,
    setTimingPreset,
    setTimingSetting,
    resetTimingToDefaults
  } = useReaderStore()

  const [showAdvancedTiming, setShowAdvancedTiming] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (!isOpen) return null

  const anchorPresets = [
    { label: 'Left', value: 0.25 },
    { label: 'Default', value: 0.35 },
    { label: 'Center', value: 0.5 }
  ]

  const speedPresets = isMobile
    ? [200, 300, 400, 500, 600, 800, 1000] // Fewer options on mobile
    : [200, 300, 400, 500, 600, 700, 800, 900, 1000]

  // Check if current timing matches a preset
  const getCurrentTimingPreset = (): TimingPresetKey | null => {
    for (const [key, preset] of Object.entries(timingPresets)) {
      const settings = preset.settings
      if (
        timing.longWordThreshold === settings.longWordThreshold &&
        timing.msPerExtraChar === settings.msPerExtraChar &&
        timing.sentencePauseMs === settings.sentencePauseMs &&
        timing.clausePauseMs === settings.clausePauseMs
      ) {
        return key as TimingPresetKey
      }
    }
    return null
  }

  const currentPreset = getCurrentTimingPreset()

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md sm:mx-4 p-4 sm:p-6 sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto touch-scroll"
        style={{
          backgroundColor: theme === 'dark' ? '#1A1A2E' : '#FFFFFF',
          paddingBottom: 'calc(1rem + var(--safe-area-inset-bottom))'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle for mobile */}
        {isMobile && (
          <div className="flex justify-center mb-3">
            <div
              className="w-10 h-1 rounded-full"
              style={{ backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}
            />
          </div>
        )}

        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2
            className="text-lg sm:text-xl font-semibold"
            style={{ color: theme === 'dark' ? '#FFFFFF' : '#1A1A1A' }}
          >
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors touch-target flex items-center justify-center"
          >
            <X
              className="w-5 h-5"
              style={{ color: theme === 'dark' ? '#FFFFFF' : '#1A1A1A' }}
            />
          </button>
        </div>

        {/* Theme toggle */}
        <div className="mb-5 sm:mb-6">
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: theme === 'dark' ? '#FFFFFF' : '#1A1A1A' }}
          >
            Theme
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 flex items-center justify-center gap-2 p-3 sm:p-3 rounded-lg transition-colors touch-target ${
                theme === 'dark'
                  ? 'text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              style={theme === 'dark' ? { backgroundColor: 'var(--accent-color)' } : undefined}
            >
              <Moon className="w-4 h-4 sm:w-4 sm:h-4" />
              Dark
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 flex items-center justify-center gap-2 p-3 sm:p-3 rounded-lg transition-colors touch-target ${
                theme === 'light'
                  ? 'text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              style={theme === 'light' ? { backgroundColor: 'var(--accent-color)' } : undefined}
            >
              <Sun className="w-4 h-4 sm:w-4 sm:h-4" />
              Light
            </button>
          </div>
        </div>

        {/* Anchor color picker */}
        <div className="mb-5 sm:mb-6">
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: theme === 'dark' ? '#FFFFFF' : '#1A1A1A' }}
          >
            Focus Letter Color
          </label>
          <div className="flex gap-3 flex-wrap">
            {anchorColorPresets.map((color) => (
              <button
                key={color.value}
                onClick={() => setAnchorColor(color.value)}
                className={`w-11 h-11 sm:w-10 sm:h-10 rounded-full transition-all touch-target ${
                  anchorColor === color.value
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1A1A2E] scale-110'
                    : 'hover:scale-110'
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
          <p
            className="text-xs mt-2 opacity-60"
            style={{ color: theme === 'dark' ? '#FFFFFF' : '#1A1A1A' }}
          >
            Green option available for color-blind users
          </p>
        </div>

        {/* Anchor position */}
        <div className="mb-5 sm:mb-6">
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: theme === 'dark' ? '#FFFFFF' : '#1A1A1A' }}
          >
            Letter Position: {(anchorPosition * 100).toFixed(0)}%
          </label>
          <div className="flex gap-2 mb-3">
            {anchorPresets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => setAnchorPosition(preset.value)}
                className={`flex-1 px-3 py-2.5 sm:py-2 text-sm rounded-lg transition-colors touch-target ${
                  Math.abs(anchorPosition - preset.value) < 0.01
                    ? 'text-white'
                    : theme === 'dark'
                    ? 'bg-white/10 text-white hover:bg-white/20'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                style={Math.abs(anchorPosition - preset.value) < 0.01 ? { backgroundColor: 'var(--accent-color)' } : undefined}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <input
            type="range"
            min={0.2}
            max={0.6}
            step={0.01}
            value={anchorPosition}
            onChange={(e) => setAnchorPosition(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Font size */}
        <div className="mb-5 sm:mb-6">
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: theme === 'dark' ? '#FFFFFF' : '#1A1A1A' }}
          >
            Font Size: {fontSize}px
          </label>
          <input
            type="range"
            min={32}
            max={120}
            step={2}
            value={fontSize}
            onChange={(e) => setFontSize(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Default speed */}
        <div className="mb-5 sm:mb-6">
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: theme === 'dark' ? '#FFFFFF' : '#1A1A1A' }}
          >
            Speed: {speed} WPM
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {speedPresets.map((preset) => (
              <button
                key={preset}
                onClick={() => setSpeed(preset)}
                className={`px-3 py-2 sm:py-1.5 text-sm rounded-lg transition-colors ${
                  speed === preset
                    ? 'text-white'
                    : theme === 'dark'
                    ? 'bg-white/10 text-white hover:bg-white/20'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                style={speed === preset ? { backgroundColor: 'var(--accent-color)' } : undefined}
              >
                {preset}
              </button>
            ))}
          </div>
          <input
            type="range"
            min={100}
            max={1200}
            step={50}
            value={speed}
            onChange={(e) => setSpeed(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Reading Rhythm (Timing Presets) */}
        <div className="mb-5 sm:mb-6">
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: theme === 'dark' ? '#FFFFFF' : '#1A1A1A' }}
          >
            Reading Rhythm
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(timingPresets) as [TimingPresetKey, typeof timingPresets[TimingPresetKey]][]).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => setTimingPreset(key)}
                className={`p-3 rounded-lg text-left transition-all touch-target ${
                  currentPreset === key
                    ? 'border'
                    : theme === 'dark'
                    ? 'bg-white/5 border border-white/10 hover:bg-white/10'
                    : 'bg-gray-100 border border-gray-200 hover:bg-gray-200'
                }`}
                style={currentPreset === key ? { backgroundColor: 'rgba(var(--accent-rgb), 0.2)', borderColor: 'var(--accent-color)' } : undefined}
              >
                <div
                  className="font-medium text-sm sm:text-base"
                  style={{ color: theme === 'dark' ? '#FFFFFF' : '#1A1A1A' }}
                >
                  {preset.name}
                </div>
                <div
                  className="text-xs opacity-60"
                  style={{ color: theme === 'dark' ? '#FFFFFF' : '#1A1A1A' }}
                >
                  {preset.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Timing (collapsible) */}
        <div className="mb-5 sm:mb-6">
          <button
            onClick={() => setShowAdvancedTiming(!showAdvancedTiming)}
            className="flex items-center justify-between w-full text-sm font-medium py-2 touch-target"
            style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}
          >
            <span>Advanced Timing</span>
            {showAdvancedTiming ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>

          {showAdvancedTiming && (
            <div
              className="space-y-4 pt-2 p-4 rounded-lg"
              style={{
                backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
              }}
            >
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
                    Sentence pause
                  </span>
                  <span style={{ color: theme === 'dark' ? '#FFFFFF' : '#1A1A1A' }}>
                    {timing.sentencePauseMs}ms
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={400}
                  step={25}
                  value={timing.sentencePauseMs}
                  onChange={(e) => setTimingSetting('sentencePauseMs', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
                    Clause pause
                  </span>
                  <span style={{ color: theme === 'dark' ? '#FFFFFF' : '#1A1A1A' }}>
                    {timing.clausePauseMs}ms
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={25}
                  value={timing.clausePauseMs}
                  onChange={(e) => setTimingSetting('clausePauseMs', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
                    Long word threshold
                  </span>
                  <span style={{ color: theme === 'dark' ? '#FFFFFF' : '#1A1A1A' }}>
                    {timing.longWordThreshold} chars
                  </span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={12}
                  step={1}
                  value={timing.longWordThreshold}
                  onChange={(e) => setTimingSetting('longWordThreshold', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
                    Extra time per char
                  </span>
                  <span style={{ color: theme === 'dark' ? '#FFFFFF' : '#1A1A1A' }}>
                    {timing.msPerExtraChar}ms
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={5}
                  value={timing.msPerExtraChar}
                  onChange={(e) => setTimingSetting('msPerExtraChar', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <button
                onClick={resetTimingToDefaults}
                className="flex items-center gap-2 text-sm opacity-60 hover:opacity-100 transition-opacity py-2"
                style={{ color: theme === 'dark' ? '#FFFFFF' : '#1A1A1A' }}
              >
                <RotateCcw className="w-4 h-4" />
                Reset to defaults
              </button>
            </div>
          )}
        </div>

        {/* Controls info - different for mobile vs desktop */}
        <div
          className="p-4 rounded-lg"
          style={{
            backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
          }}
        >
          <h3
            className="text-sm font-medium mb-2"
            style={{ color: theme === 'dark' ? '#FFFFFF' : '#1A1A1A' }}
          >
            {isMobile ? 'Gestures' : 'Keyboard Shortcuts'}
          </h3>
          <div
            className="grid grid-cols-2 gap-1 text-xs"
            style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}
          >
            {isMobile ? (
              <>
                <span>Tap screen</span>
                <span>Show/hide controls</span>
                <span>Swipe left</span>
                <span>Next sentence</span>
                <span>Swipe right</span>
                <span>Previous sentence</span>
              </>
            ) : (
              <>
                <span>Space</span>
                <span>Play/Pause</span>
                <span>Up/Down</span>
                <span>Adjust speed ±50 WPM</span>
                <span>Left/Right</span>
                <span>Previous/Next sentence</span>
                <span>S</span>
                <span>Catch Me Up summary</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
