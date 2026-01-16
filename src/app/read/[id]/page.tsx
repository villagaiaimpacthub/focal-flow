'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { WordDisplay } from '@/components/WordDisplay'
import { ControlBar } from '@/components/ControlBar'
import { SettingsPanel } from '@/components/SettingsPanel'
import { CatchMeUpModal } from '@/components/CatchMeUpModal'
import { useReaderStore } from '@/store/reader'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function ReadPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showCatchMeUp, setShowCatchMeUp] = useState(false)

  const supabase = createClient()

  const {
    words,
    currentWordIndex,
    isPlaying,
    speed,
    setDocument,
    setCurrentWordIndex,
    incrementWordIndex,
    theme
  } = useReaderStore()

  // Refs for tracking
  const sessionStartRef = useRef<{ index: number; time: number } | null>(null)
  const lastSavedIndexRef = useRef(0)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
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

  // Playback loop
  useEffect(() => {
    if (!isPlaying || words.length === 0) return

    // Track session start when playback begins
    if (!sessionStartRef.current) {
      sessionStartRef.current = { index: currentWordIndex, time: Date.now() }
    }

    const interval = setInterval(() => {
      incrementWordIndex()
    }, (60 / speed) * 1000)

    return () => clearInterval(interval)
  }, [isPlaying, speed, words.length, incrementWordIndex, currentWordIndex])

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
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
        >
          Go Home
        </button>
      </div>
    )
  }

  return (
    <div
      className="h-screen relative overflow-hidden"
      style={{ backgroundColor: theme === 'dark' ? '#0F0F1A' : '#FAFAFA' }}
    >
      {/* Back button */}
      <button
        onClick={() => router.push(user ? '/library' : '/')}
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
        onCatchMeUpClick={() => setShowCatchMeUp(true)}
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
        textToSummarize={getTextToSummarize()}
        isDark={theme === 'dark'}
      />
    </div>
  )
}
