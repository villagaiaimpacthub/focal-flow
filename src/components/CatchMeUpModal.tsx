'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, BookOpen, List, Copy, Check } from 'lucide-react'
import { WordDisplay } from './WordDisplay'
import { useReaderStore } from '@/store/reader'

interface CatchMeUpModalProps {
  isOpen: boolean
  onClose: () => void
  textToSummarize: string
  isDark?: boolean
}

type SummaryLength = 'brief' | 'standard' | 'detailed' | 'key_points'
type DisplayMode = 'text' | 'speed_read'

export function CatchMeUpModal({
  isOpen,
  onClose,
  textToSummarize,
  isDark = true
}: CatchMeUpModalProps) {
  const [summary, setSummary] = useState<string | null>(null)
  const [summaryWords, setSummaryWords] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summaryLength, setSummaryLength] = useState<SummaryLength>('standard')
  const [displayMode, setDisplayMode] = useState<DisplayMode>('text')
  const [copied, setCopied] = useState(false)

  // Speed read state for summary
  const [summaryIndex, setSummaryIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const { speed, anchorPosition } = useReaderStore()

  // Fetch summary when modal opens
  useEffect(() => {
    if (isOpen && textToSummarize && !summary) {
      generateSummary()
    }
  }, [isOpen, textToSummarize])

  // Speed read playback for summary
  useEffect(() => {
    if (!isPlaying || displayMode !== 'speed_read' || summaryWords.length === 0) return

    const interval = setInterval(() => {
      setSummaryIndex((prev) => {
        if (prev >= summaryWords.length - 1) {
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, (60 / speed) * 1000)

    return () => clearInterval(interval)
  }, [isPlaying, speed, summaryWords.length, displayMode])

  const generateSummary = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSummarize,
          length: summaryLength
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate summary')
      }

      const data = await response.json()
      setSummary(data.summary)
      setSummaryWords(data.summary.split(/\s+/).filter((w: string) => w.length > 0))
      setSummaryIndex(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    if (summary) {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleLengthChange = (length: SummaryLength) => {
    setSummaryLength(length)
    setSummary(null)
    setSummaryWords([])
    setError(null)
  }

  if (!isOpen) return null

  const lengthOptions: { value: SummaryLength; label: string }[] = [
    { value: 'brief', label: 'Brief' },
    { value: 'standard', label: 'Standard' },
    { value: 'detailed', label: 'Detailed' },
    { value: 'key_points', label: 'Key Points' }
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl mx-4 rounded-2xl shadow-xl max-h-[80vh] flex flex-col"
        style={{ backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2
            className="text-xl font-semibold"
            style={{ color: isDark ? '#FFFFFF' : '#1A1A1A' }}
          >
            Catch Me Up
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X
              className="w-5 h-5"
              style={{ color: isDark ? '#FFFFFF' : '#1A1A1A' }}
            />
          </button>
        </div>

        {/* Length options */}
        <div className="flex gap-2 p-4 border-b border-white/10">
          {lengthOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleLengthChange(option.value)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                summaryLength === option.value
                  ? 'bg-red-500 text-white'
                  : isDark
                  ? 'bg-white/10 text-white hover:bg-white/20'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-red-500" />
              <p style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
                Generating summary...
              </p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <p className="text-red-400">{error}</p>
              <button
                onClick={generateSummary}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {summary && !isLoading && (
            <>
              {/* Display mode toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setDisplayMode('text')}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    displayMode === 'text'
                      ? 'bg-red-500 text-white'
                      : isDark
                      ? 'bg-white/10 text-white hover:bg-white/20'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <List className="w-4 h-4" />
                  Text
                </button>
                <button
                  onClick={() => setDisplayMode('speed_read')}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    displayMode === 'speed_read'
                      ? 'bg-red-500 text-white'
                      : isDark
                      ? 'bg-white/10 text-white hover:bg-white/20'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  Speed Read
                </button>
              </div>

              {displayMode === 'text' ? (
                <div
                  className="prose max-w-none overflow-y-auto max-h-64"
                  style={{ color: isDark ? '#FFFFFF' : '#1A1A1A' }}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{summary}</p>
                </div>
              ) : (
                <div className="h-64 relative">
                  <WordDisplay
                    word={summaryWords[summaryIndex]}
                    anchorPreference={anchorPosition}
                    fontSize={36}
                    showAnchorLine={true}
                  />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                    <button
                      onClick={() => {
                        setIsPlaying(!isPlaying)
                      }}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                    >
                      {isPlaying ? 'Pause' : 'Play'}
                    </button>
                    <button
                      onClick={() => {
                        setSummaryIndex(0)
                        setIsPlaying(false)
                      }}
                      className="px-4 py-2 rounded-lg transition-colors"
                      style={{
                        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        color: isDark ? '#FFFFFF' : '#1A1A1A'
                      }}
                    >
                      Reset
                    </button>
                  </div>
                  <div
                    className="absolute bottom-0 left-0 right-0 h-1"
                    style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                  >
                    <div
                      className="h-full bg-red-500 transition-all"
                      style={{
                        width: `${((summaryIndex + 1) / summaryWords.length) * 100}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {summary && !isLoading && (
          <div className="flex justify-between items-center p-4 border-t border-white/10">
            <span
              className="text-sm"
              style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
            >
              {summaryWords.length} words
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                color: isDark ? '#FFFFFF' : '#1A1A1A'
              }}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
