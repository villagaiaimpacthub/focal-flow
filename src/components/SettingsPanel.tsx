'use client'

import { X, Sun, Moon } from 'lucide-react'
import { useReaderStore } from '@/store/reader'

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
    setSpeed
  } = useReaderStore()

  if (!isOpen) return null

  const anchorPresets = [
    { label: 'Left', value: 0.25 },
    { label: 'Default', value: 0.35 },
    { label: 'Center', value: 0.5 }
  ]

  const speedPresets = [200, 300, 400, 500, 600, 700, 800, 900, 1000]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-4 p-6 rounded-2xl shadow-xl"
        style={{
          backgroundColor: theme === 'dark' ? '#1A1A2E' : '#FFFFFF'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-xl font-semibold"
            style={{ color: theme === 'dark' ? '#FFFFFF' : '#1A1A1A' }}
          >
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X
              className="w-5 h-5"
              style={{ color: theme === 'dark' ? '#FFFFFF' : '#1A1A1A' }}
            />
          </button>
        </div>

        {/* Theme toggle */}
        <div className="mb-6">
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: theme === 'dark' ? '#FFFFFF' : '#1A1A1A' }}
          >
            Theme
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Moon className="w-4 h-4" />
              Dark
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg transition-colors ${
                theme === 'light'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Sun className="w-4 h-4" />
              Light
            </button>
          </div>
        </div>

        {/* Anchor position */}
        <div className="mb-6">
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: theme === 'dark' ? '#FFFFFF' : '#1A1A1A' }}
          >
            Anchor Position: {(anchorPosition * 100).toFixed(0)}%
          </label>
          <div className="flex gap-2 mb-2">
            {anchorPresets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => setAnchorPosition(preset.value)}
                className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                  Math.abs(anchorPosition - preset.value) < 0.01
                    ? 'bg-red-500 text-white'
                    : theme === 'dark'
                    ? 'bg-white/10 text-white hover:bg-white/20'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
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
            className="w-full accent-red-500"
          />
          <p
            className="text-xs mt-1 opacity-60"
            style={{ color: theme === 'dark' ? '#FFFFFF' : '#1A1A1A' }}
          >
            Adjusts where the red anchor letter appears within each word
          </p>
        </div>

        {/* Font size */}
        <div className="mb-6">
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: theme === 'dark' ? '#FFFFFF' : '#1A1A1A' }}
          >
            Font Size: {fontSize}px
          </label>
          <input
            type="range"
            min={32}
            max={72}
            step={2}
            value={fontSize}
            onChange={(e) => setFontSize(parseInt(e.target.value))}
            className="w-full accent-red-500"
          />
        </div>

        {/* Default speed */}
        <div className="mb-6">
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: theme === 'dark' ? '#FFFFFF' : '#1A1A1A' }}
          >
            Default Speed: {speed} WPM
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {speedPresets.map((preset) => (
              <button
                key={preset}
                onClick={() => setSpeed(preset)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  speed === preset
                    ? 'bg-red-500 text-white'
                    : theme === 'dark'
                    ? 'bg-white/10 text-white hover:bg-white/20'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
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
            className="w-full accent-red-500"
          />
        </div>

        {/* Keyboard shortcuts info */}
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
            Keyboard Shortcuts
          </h3>
          <div
            className="grid grid-cols-2 gap-1 text-xs"
            style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}
          >
            <span>Space</span>
            <span>Play/Pause</span>
            <span>Up/Down</span>
            <span>Adjust speed ±50 WPM</span>
            <span>Left/Right</span>
            <span>Previous/Next sentence</span>
            <span>S</span>
            <span>Catch Me Up summary</span>
          </div>
        </div>
      </div>
    </div>
  )
}
