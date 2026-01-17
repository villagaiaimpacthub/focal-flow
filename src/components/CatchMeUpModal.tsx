'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Loader2, Copy, Check, Play, Pause, SkipBack, BookOpen, Zap, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { WordDisplay } from '@/components/WordDisplay'
import { useReaderStore, getWordDisplayTime } from '@/store/reader'

interface CatchMeUpModalProps {
  isOpen: boolean
  onClose: () => void
  onContinueReading: () => void
  textToSummarize: string
  documentId: string
  wordIndex: number
  isDark?: boolean
}

type ViewMode = 'choice' | 'paragraph' | 'speedread'

export function CatchMeUpModal({
  isOpen,
  onClose,
  onContinueReading,
  textToSummarize,
  documentId,
  wordIndex,
  isDark = true
}: CatchMeUpModalProps) {
  const supabase = createClient()
  const { speed, timing, anchorPosition, anchorColor, screenPosition } = useReaderStore()

  const [summary, setSummary] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isCached, setIsCached] = useState(false)

  // View mode: choice -> paragraph or speedread
  const [viewMode, setViewMode] = useState<ViewMode>('choice')

  // Speed reading state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [summaryWords, setSummaryWords] = useState<string[]>([])
  const [isAutoContinuing, setIsAutoContinuing] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Check for cached summary or generate new one when modal opens
  useEffect(() => {
    if (isOpen && textToSummarize && !summary) {
      checkCacheOrGenerate()
    }
  }, [isOpen, textToSummarize])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSummary(null)
      setError(null)
      setIsCached(false)
      setViewMode('choice')
      setIsPlaying(false)
      setCurrentWordIndex(0)
      setSummaryWords([])
      setIsAutoContinuing(false)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isOpen])

  // Parse summary into words when it changes
  useEffect(() => {
    if (summary) {
      const words = summary.split(/\s+/).filter(w => w.length > 0)
      setSummaryWords(words)
    }
  }, [summary])

  // Speed reading playback
  useEffect(() => {
    if (!isPlaying || viewMode !== 'speedread' || summaryWords.length === 0) {
      return
    }

    if (currentWordIndex >= summaryWords.length) {
      setIsPlaying(false)
      setIsAutoContinuing(true)
      // Auto-continue to document after a brief pause
      const continueTimeout = setTimeout(() => {
        handleContinueReading()
      }, 1500)
      return () => clearTimeout(continueTimeout)
    }

    const word = summaryWords[currentWordIndex]
    const displayTime = getWordDisplayTime(word, speed, timing)

    timeoutRef.current = setTimeout(() => {
      setCurrentWordIndex(prev => prev + 1)
    }, displayTime)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isPlaying, viewMode, currentWordIndex, summaryWords, speed, timing])

  const checkCacheOrGenerate = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Check for cached summary at this word position (allow some tolerance)
      const tolerance = 50 // words
      const { data: cached } = await supabase
        .from('summaries')
        .select('summary_text, word_index')
        .eq('document_id', documentId)
        .gte('word_index', wordIndex - tolerance)
        .lte('word_index', wordIndex + tolerance)
        .order('word_index', { ascending: false })
        .limit(1)
        .single()

      const cachedTyped = cached as { summary_text: string; word_index: number } | null
      if (cachedTyped) {
        setSummary(cachedTyped.summary_text)
        setIsCached(true)
        setIsLoading(false)
        return
      }

      // No cache, generate new summary
      await generateSummary()
    } catch {
      // No cached summary found, generate new one
      await generateSummary()
    }
  }

  const generateSummary = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSummarize })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate summary')
      }

      const data = await response.json()
      setSummary(data.summary)

      // Cache the summary
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('summaries').upsert({
          document_id: documentId,
          user_id: user.id,
          word_index: wordIndex,
          summary_text: data.summary
        } as never, {
          onConflict: 'document_id,user_id,word_index'
        })
      }
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

  const handleContinueReading = () => {
    onClose()
    onContinueReading()
  }

  const handleStartSpeedRead = () => {
    setViewMode('speedread')
    setCurrentWordIndex(0)
    setIsPlaying(true)
  }

  const handleShowParagraph = () => {
    setViewMode('paragraph')
  }

  const handleBackToChoice = () => {
    setViewMode('choice')
    setIsPlaying(false)
    setCurrentWordIndex(0)
  }

  const togglePlaying = useCallback(() => {
    setIsPlaying(prev => !prev)
  }, [])

  const restart = useCallback(() => {
    setCurrentWordIndex(0)
    setIsPlaying(true)
  }, [])

  if (!isOpen) return null

  const wordCount = summaryWords.length
  const progress = wordCount > 0 ? Math.round((currentWordIndex / wordCount) * 100) : 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-xl max-h-[80vh] flex flex-col"
        style={{ backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h2
              className="text-xl font-semibold"
              style={{ color: isDark ? '#FFFFFF' : '#1A1A1A' }}
            >
              Catch Me Up
            </h2>
            {isCached && viewMode === 'choice' && (
              <span className="text-xs text-white/50">Summary ready</span>
            )}
            {viewMode === 'speedread' && (
              <span className="text-xs text-white/50">Speed reading summary</span>
            )}
            {viewMode === 'paragraph' && (
              <span className="text-xs text-white/50">Reading summary</span>
            )}
          </div>
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

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {/* Loading state */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-48 gap-4 p-4">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent-color)' }} />
              <p style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
                Generating summary...
              </p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex flex-col items-center justify-center h-48 gap-4 p-4">
              <p className="text-red-400 text-center">{error}</p>
              <button
                onClick={generateSummary}
                className="px-4 py-2 text-white rounded-lg transition-colors hover:brightness-110"
                style={{ backgroundColor: 'var(--accent-color)' }}
              >
                Try Again
              </button>
            </div>
          )}

          {/* Choice screen - shown first after summary is ready */}
          {summary && !isLoading && viewMode === 'choice' && (
            <div className="p-6 flex flex-col items-center justify-center gap-6">
              <p
                className="text-center text-lg"
                style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}
              >
                How would you like to catch up?
              </p>

              <div className="w-full space-y-3">
                {/* Speed Read option */}
                <button
                  onClick={handleStartSpeedRead}
                  className="w-full flex items-center gap-4 p-4 rounded-xl transition-all hover:bg-white/20"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: isDark ? '#FFFFFF' : '#1A1A1A'
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'var(--accent-color)' }}
                  >
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">Speed Read</div>
                    <div className="text-sm opacity-60">
                      Summary plays first, then continues to document
                    </div>
                  </div>
                </button>

                {/* Read as Paragraph option */}
                <button
                  onClick={handleShowParagraph}
                  className="w-full flex items-center gap-4 p-4 rounded-xl transition-all hover:bg-white/20"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: isDark ? '#FFFFFF' : '#1A1A1A'
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                  >
                    <FileText className="w-6 h-6" style={{ color: isDark ? '#FFFFFF' : '#1A1A1A' }} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">Read as Paragraph</div>
                    <div className="text-sm opacity-60">
                      View summary as text
                    </div>
                  </div>
                </button>

                {/* Skip option */}
                <button
                  onClick={handleContinueReading}
                  className="w-full flex items-center gap-4 p-4 rounded-xl transition-all hover:bg-white/20"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                  >
                    <Play className="w-6 h-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">Skip Summary</div>
                    <div className="text-sm opacity-60">
                      Continue reading now
                    </div>
                  </div>
                </button>
              </div>

              <p
                className="text-xs text-center"
                style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}
              >
                {wordCount} word summary
              </p>
            </div>
          )}

          {/* Paragraph view */}
          {summary && !isLoading && viewMode === 'paragraph' && (
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              <div
                className="prose max-w-none"
                style={{ color: isDark ? '#FFFFFF' : '#1A1A1A' }}
              >
                <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{summary}</p>
              </div>
            </div>
          )}

          {/* Speed reading view */}
          {summary && !isLoading && viewMode === 'speedread' && (
            <div className="flex flex-col h-64">
              {/* Word display or auto-continue message */}
              {isAutoContinuing ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent-color)' }} />
                  <p className="text-white/80 text-lg font-medium">Continuing to document...</p>
                </div>
              ) : (
                <div
                  className="flex-1 cursor-pointer"
                  onClick={togglePlaying}
                >
                  <WordDisplay
                    word={summaryWords[currentWordIndex] || ''}
                    anchorPreference={anchorPosition}
                    screenPosition={screenPosition}
                    fontSize={36}
                    anchorColor={anchorColor}
                  />
                </div>
              )}

              {/* Progress bar and playback controls - hidden when auto-continuing */}
              {!isAutoContinuing && (
                <>
                  {/* Progress bar */}
                  <div className="px-4 pb-2">
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-100"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: 'var(--accent-color)'
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-white/50 mt-1">
                      <span>{currentWordIndex} / {wordCount}</span>
                      <span>{speed} WPM</span>
                    </div>
                  </div>

                  {/* Playback controls */}
                  <div className="flex items-center justify-center gap-4 p-4 border-t border-white/10">
                    <button
                      onClick={restart}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70"
                      title="Restart"
                    >
                      <SkipBack className="w-5 h-5" />
                    </button>
                    <button
                      onClick={togglePlaying}
                      className="p-4 rounded-full text-white transition-all hover:brightness-110"
                      style={{ backgroundColor: 'var(--accent-color)' }}
                    >
                      {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                    </button>
                    <button
                      onClick={handleBackToChoice}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70"
                      title="Back to options"
                    >
                      <BookOpen className="w-5 h-5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer - only shown in paragraph view */}
        {summary && !isLoading && viewMode === 'paragraph' && (
          <div className="p-4 border-t border-white/10 space-y-3">
            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleBackToChoice}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all hover:bg-white/20"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: isDark ? '#FFFFFF' : '#1A1A1A'
                }}
              >
                <SkipBack className="w-5 h-5" />
                Back
              </button>
              <button
                onClick={handleContinueReading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl font-medium transition-all hover:brightness-110"
                style={{ backgroundColor: 'var(--accent-color)' }}
              >
                <Play className="w-5 h-5" />
                Continue Reading
              </button>
            </div>

            {/* Meta info and copy */}
            <div className="flex justify-between items-center">
              <span
                className="text-sm"
                style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
              >
                {wordCount} words
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors"
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  color: isDark ? '#FFFFFF' : '#1A1A1A'
                }}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
