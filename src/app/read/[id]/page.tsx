'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, X, Play, BookOpen } from 'lucide-react'
import { WordDisplay } from '@/components/WordDisplay'
import { ControlBar } from '@/components/ControlBar'
import { SettingsPanel } from '@/components/SettingsPanel'
import { CatchMeUpModal } from '@/components/CatchMeUpModal'
import { useReaderStore, getWordDisplayTime } from '@/store/reader'
import { usePreferencesSync } from '@/hooks/usePreferencesSync'
import { useSwipeGesture } from '@/hooks/useSwipeGesture'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Document, ReadingProgress } from '@/types/database'

export default function ReadPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showCatchMeUp, setShowCatchMeUp] = useState(false)
  const [showFileList, setShowFileList] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])
  const [progressMap, setProgressMap] = useState<Record<string, ReadingProgress>>({})

  const supabase = createClient()

  // Sync preferences with database for authenticated users
  usePreferencesSync(user)

  const {
    words,
    currentWordIndex,
    isPlaying,
    speed,
    timing,
    setDocument,
    setCurrentWordIndex,
    incrementWordIndex,
    togglePlaying,
    skipForward,
    skipBackward,
    theme
  } = useReaderStore()

  // Swipe gestures for mobile navigation
  useSwipeGesture({
    onSwipeLeft: skipForward,   // Swipe left = next sentence
    onSwipeRight: skipBackward, // Swipe right = previous sentence
  })

  // Refs for tracking
  const sessionStartRef = useRef<{ index: number; time: number } | null>(null)
  const lastSavedIndexRef = useRef(0)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const playbackTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const userRef = useRef<User | null>(null)

  // Keep userRef in sync
  useEffect(() => {
    userRef.current = user
  }, [user])

  // Load document
  useEffect(() => {
    const loadDocument = async () => {
      if (id === 'temp') {
        // Load from localStorage for non-authenticated users
        const tempDoc = localStorage.getItem('flowreader-temp-doc')
        if (tempDoc) {
          const { title, words: docWords } = JSON.parse(tempDoc)
          setDocument(null, title, docWords)
        }
        setLoading(false)
        return
      }

      const { data: { user: authUser } } = await supabase.auth.getUser()
      setUser(authUser)

      if (authUser) {
        // Load document from database
        const { data: doc } = await supabase
          .from('documents')
          .select('*')
          .eq('id', id)
          .single()

        if (doc) {
          const typedDoc = doc as { id: string; title: string; words: string[] }
          setDocument(typedDoc.id, typedDoc.title, typedDoc.words)

          // Load reading progress
          const { data: progress } = await supabase
            .from('reading_progress')
            .select('*')
            .eq('document_id', id)
            .single()

          if (progress) {
            const wordIndex = (progress as { word_index: number }).word_index
            setCurrentWordIndex(wordIndex)
            lastSavedIndexRef.current = wordIndex
          }

          // Update last read timestamp
          await supabase
            .from('documents')
            .update({ last_read_at: new Date().toISOString() } as never)
            .eq('id', id)
        }
      }

      setLoading(false)
    }

    loadDocument()
  }, [id, supabase, setDocument, setCurrentWordIndex])

  // Save progress function (debounced)
  const saveProgress = useCallback(async (index: number, currentSpeed: number) => {
    if (!userRef.current || id === 'temp') return

    try {
      await supabase
        .from('reading_progress')
        .upsert({
          user_id: userRef.current.id,
          document_id: id,
          word_index: index,
          speed: currentSpeed
        } as never, {
          onConflict: 'user_id,document_id'
        })
      lastSavedIndexRef.current = index
    } catch (err) {
      console.error('Failed to save progress:', err)
    }
  }, [id, supabase])

  // Save session function
  const saveSession = useCallback(async () => {
    if (!userRef.current || id === 'temp' || !sessionStartRef.current) return

    const session = sessionStartRef.current
    const duration = Math.floor((Date.now() - session.time) / 1000)
    const endIndex = useReaderStore.getState().currentWordIndex

    if (duration > 5 && endIndex > session.index) {
      try {
        await supabase.from('reading_sessions').insert({
          user_id: userRef.current.id,
          document_id: id,
          start_index: session.index,
          end_index: endIndex,
          speed: useReaderStore.getState().speed,
          duration_seconds: duration
        } as never)
      } catch (err) {
        console.error('Failed to save session:', err)
      }
    }

    sessionStartRef.current = null
  }, [id, supabase])

  // Playback loop with adaptive timing
  useEffect(() => {
    if (!isPlaying || words.length === 0) return

    // Track session start when playback begins
    if (!sessionStartRef.current) {
      sessionStartRef.current = { index: currentWordIndex, time: Date.now() }
    }

    // Schedule next word with adaptive timing
    const scheduleNextWord = () => {
      const currentWord = words[currentWordIndex]
      if (!currentWord) return

      const displayTime = getWordDisplayTime(currentWord, speed, timing)

      playbackTimeoutRef.current = setTimeout(() => {
        incrementWordIndex()
      }, displayTime)
    }

    scheduleNextWord()

    return () => {
      if (playbackTimeoutRef.current) {
        clearTimeout(playbackTimeoutRef.current)
      }
    }
  }, [isPlaying, speed, timing, words, currentWordIndex, incrementWordIndex])

  // Debounced auto-save progress every 5 words
  useEffect(() => {
    if (!user || id === 'temp') return

    // Only save if we've moved at least 5 words since last save
    if (currentWordIndex > 0 && currentWordIndex - lastSavedIndexRef.current >= 5) {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      // Debounce: wait 500ms before saving to avoid hammering the DB
      saveTimeoutRef.current = setTimeout(() => {
        saveProgress(currentWordIndex, speed)
      }, 500)
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [currentWordIndex, user, id, speed, saveProgress])

  // Save session on pause
  useEffect(() => {
    if (!isPlaying && sessionStartRef.current && user && id !== 'temp') {
      saveSession()
    }
  }, [isPlaying, user, id, saveSession])

  // beforeunload handler for tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Synchronously save progress using navigator.sendBeacon if available
      if (userRef.current && id !== 'temp') {
        const currentIndex = useReaderStore.getState().currentWordIndex
        const currentSpeed = useReaderStore.getState().speed

        // Use sendBeacon for reliable delivery on page close
        const data = JSON.stringify({
          user_id: userRef.current.id,
          document_id: id,
          word_index: currentIndex,
          speed: currentSpeed
        })

        // Note: sendBeacon doesn't work with Supabase directly, so we save via localStorage
        // and sync on next load as a fallback
        localStorage.setItem(`flowreader-unsaved-progress-${id}`, data)
      }

      // Also try to save session
      if (sessionStartRef.current && userRef.current) {
        const session = sessionStartRef.current
        const duration = Math.floor((Date.now() - session.time) / 1000)
        if (duration > 5) {
          localStorage.setItem(`flowreader-unsaved-session-${id}`, JSON.stringify({
            user_id: userRef.current.id,
            document_id: id,
            start_index: session.index,
            end_index: useReaderStore.getState().currentWordIndex,
            speed: useReaderStore.getState().speed,
            duration_seconds: duration
          }))
        }
      }
    }

    // Also handle visibility change (for mobile)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && userRef.current && id !== 'temp') {
        saveProgress(useReaderStore.getState().currentWordIndex, useReaderStore.getState().speed)
        if (sessionStartRef.current) {
          saveSession()
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Check for unsaved progress from previous session
    const unsavedProgress = localStorage.getItem(`flowreader-unsaved-progress-${id}`)
    if (unsavedProgress && user) {
      const data = JSON.parse(unsavedProgress)
      if (data.user_id === user.id) {
        saveProgress(data.word_index, data.speed)
        localStorage.removeItem(`flowreader-unsaved-progress-${id}`)
      }
    }

    const unsavedSession = localStorage.getItem(`flowreader-unsaved-session-${id}`)
    if (unsavedSession && user) {
      const data = JSON.parse(unsavedSession)
      if (data.user_id === user.id) {
        supabase.from('reading_sessions').insert(data as never)
        localStorage.removeItem(`flowreader-unsaved-session-${id}`)
      }
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [id, user, saveProgress, saveSession, supabase])

  // Get text for "Catch Me Up" summary
  const getTextToSummarize = useCallback(() => {
    return words.slice(0, currentWordIndex).join(' ')
  }, [words, currentWordIndex])

  // Load documents for file list
  const loadDocuments = useCallback(async () => {
    if (!user) return

    const { data: docs } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .order('last_read_at', { ascending: false, nullsFirst: false })

    if (docs) {
      setDocuments(docs as Document[])
    }

    const { data: progress } = await supabase
      .from('reading_progress')
      .select('*')
      .eq('user_id', user.id)

    if (progress) {
      const map: Record<string, ReadingProgress> = {}
      ;(progress as ReadingProgress[]).forEach((p) => {
        map[p.document_id] = p
      })
      setProgressMap(map)
    }
  }, [user, supabase])

  // Handle back button - show file list
  const handleBack = useCallback(() => {
    if (user) {
      loadDocuments()
      setShowFileList(true)
    } else {
      router.push('/')
    }
  }, [user, loadDocuments, router])

  // Handle tap on center to play/pause
  const handleCenterTap = useCallback((e: React.MouseEvent) => {
    // Only trigger if clicking on the word display area, not controls
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('input')) return
    togglePlaying()
  }, [togglePlaying])

  // Switch to another document
  const switchDocument = useCallback((docId: string) => {
    setShowFileList(false)
    router.push(`/read/${docId}`)
  }, [router])

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: theme === 'dark' ? '#0F0F1A' : '#FAFAFA' }}
      >
        <div className="animate-pulse text-xl" style={{ color: theme === 'dark' ? '#FFFFFF' : '#1A1A1A' }}>
          Loading...
        </div>
      </div>
    )
  }

  if (words.length === 0) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: theme === 'dark' ? '#0F0F1A' : '#FAFAFA' }}
      >
        <p style={{ color: theme === 'dark' ? '#FFFFFF' : '#1A1A1A' }}>
          Document not found
        </p>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 text-white rounded-lg transition-colors hover:brightness-110"
          style={{ backgroundColor: 'var(--accent-color)' }}
        >
          Go Home
        </button>
      </div>
    )
  }

  return (
    <div
      className="h-screen relative overflow-hidden cursor-pointer"
      style={{ backgroundColor: theme === 'dark' ? '#0F0F1A' : '#FAFAFA' }}
      onClick={handleCenterTap}
    >
      {/* Back button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleBack()
        }}
        className="absolute top-4 left-4 z-30 p-2 rounded-lg transition-colors"
        style={{
          backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
        }}
      >
        <ArrowLeft
          className="w-5 h-5"
          style={{ color: theme === 'dark' ? '#FFFFFF' : '#1A1A1A' }}
        />
      </button>

      {/* Word display */}
      <WordDisplay />

      {/* Control bar */}
      <ControlBar
        onSettingsClick={() => setShowSettings(true)}
        onCatchMeUpClick={user ? () => setShowCatchMeUp(true) : undefined}
      />

      {/* Settings panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Catch Me Up modal */}
      <CatchMeUpModal
        isOpen={showCatchMeUp}
        onClose={() => setShowCatchMeUp(false)}
        onContinueReading={() => {
          if (!isPlaying) togglePlaying()
        }}
        textToSummarize={getTextToSummarize()}
        documentId={id}
        wordIndex={currentWordIndex}
        isDark={theme === 'dark'}
      />

      {/* File list overlay */}
      {showFileList && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowFileList(false)}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-80 bg-[#1A1A2E] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Your Documents</h2>
              <button
                onClick={() => setShowFileList(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            <div className="p-2">
              {documents.length === 0 ? (
                <div className="p-4 text-center text-white/40">
                  No documents yet
                </div>
              ) : (
                documents.map((doc) => {
                  const progress = progressMap[doc.id]
                  const progressPercent = progress && doc.word_count > 0
                    ? Math.round((progress.word_index / doc.word_count) * 100)
                    : 0
                  const isCurrentDoc = doc.id === id

                  return (
                    <button
                      key={doc.id}
                      onClick={() => switchDocument(doc.id)}
                      className={`w-full p-3 rounded-lg text-left transition-colors mb-1 ${
                        isCurrentDoc
                          ? 'border'
                          : 'hover:bg-white/5'
                      }`}
                      style={isCurrentDoc ? { backgroundColor: 'rgba(var(--accent-rgb), 0.2)', borderColor: 'rgba(var(--accent-rgb), 0.3)' } : undefined}
                    >
                      <div className="flex items-start gap-3">
                        <BookOpen className="w-5 h-5 text-white/40 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">
                            {doc.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full"
                                style={{ width: `${progressPercent}%`, backgroundColor: 'var(--accent-color)' }}
                              />
                            </div>
                            <span className="text-xs text-white/40">
                              {progressPercent}%
                            </span>
                          </div>
                          <p className="text-xs text-white/40 mt-1">
                            {doc.word_count.toLocaleString()} words
                          </p>
                        </div>
                        {isCurrentDoc && (
                          <Play className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-color)' }} />
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            <div className="p-4 border-t border-white/10">
              <button
                onClick={() => {
                  setShowFileList(false)
                  router.push('/')
                }}
                className="w-full py-2 text-sm text-white/60 hover:text-white transition-colors"
              >
                Back to Home →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
