'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  X, CheckCircle, BookOpen, Clock, ChevronRight, Plus,
  Search, BarChart3, Settings, MoreVertical, Trash2, Sparkles
} from 'lucide-react'
import { HomeDemo } from '@/components/HomeDemo'
import { AuthForm } from '@/components/AuthForm'
import { FileUpload } from '@/components/FileUpload'
import { CatchMeUpModal } from '@/components/CatchMeUpModal'
import { usePreferencesSync } from '@/hooks/usePreferencesSync'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Document, ReadingProgress, ReadingSession } from '@/types/database'

type SortBy = 'recent' | 'alphabetical' | 'progress'

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [user, setUser] = useState<User | null>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null)

  // Sync preferences
  usePreferencesSync(user)

  // Document state
  const [documents, setDocuments] = useState<Document[]>([])
  const [progressMap, setProgressMap] = useState<Record<string, ReadingProgress>>({})
  const [sessions, setSessions] = useState<ReadingSession[]>([])
  const [showUpload, setShowUpload] = useState(false)

  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('recent')
  const [showStats, setShowStats] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [catchMeUpDoc, setCatchMeUpDoc] = useState<Document | null>(null)

  // User preferences
  const [hasApiKey, setHasApiKey] = useState(false)

  // Check for auth redirect params
  useEffect(() => {
    const authRequired = searchParams.get('auth')

    if (authRequired === 'required') {
      setShowAuth(true)
      setToast({ message: 'Please sign in to access that page', type: 'info' })
      window.history.replaceState({}, '', '/')
    }
  }, [searchParams])

  useEffect(() => {
    const loadData = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      setUser(authUser)

      if (authUser) {
        // Load all documents
        const { data: docs } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', authUser.id)
          .order('last_read_at', { ascending: false, nullsFirst: false })

        if (docs) {
          setDocuments(docs as Document[])
        }

        // Load progress
        const { data: progress } = await supabase
          .from('reading_progress')
          .select('*')
          .eq('user_id', authUser.id)

        if (progress) {
          const map: Record<string, ReadingProgress> = {}
          ;(progress as ReadingProgress[]).forEach((p) => {
            map[p.document_id] = p
          })
          setProgressMap(map)
        }

        // Load sessions for stats
        const { data: sessionData } = await supabase
          .from('reading_sessions')
          .select('*')
          .eq('user_id', authUser.id)

        if (sessionData) {
          setSessions(sessionData as ReadingSession[])
        }

        // Check for API key
        const { data: keyData } = await supabase
          .from('api_keys')
          .select('id')
          .eq('user_id', authUser.id)
          .single()

        setHasApiKey(!!keyData)
      }

      setLoading(false)
    }

    loadData()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const newUser = session?.user ?? null
      setUser(newUser)

      if (event === 'SIGNED_IN' && newUser) {
        setToast({ message: 'Welcome! You have 10 free AI summaries.', type: 'success' })
        loadData()
      }

      if (event === 'SIGNED_OUT') {
        setDocuments([])
        setProgressMap({})
        setSessions([])
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClick = () => setActiveMenu(null)
    if (activeMenu) {
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [activeMenu])

  const handleSelectDocument = (doc: Document) => {
    router.push(`/read/${doc.id}`)
  }

  const handleFileProcessed = async (result: {
    title: string
    words: string[]
    wordCount: number
  }) => {
    if (!user) return

    const { data, error } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        title: result.title,
        words: result.words,
        word_count: result.wordCount
      } as never)
      .select()
      .single()

    if (!error && data) {
      const newDoc = data as Document
      setDocuments((prev) => [newDoc, ...prev])
      setShowUpload(false)
      setToast({ message: `"${newDoc.title}" added`, type: 'success' })
    }
  }

  const handleDeleteDocument = async (doc: Document) => {
    const confirmed = window.confirm(`Delete "${doc.title}"? This cannot be undone.`)
    if (!confirmed) return

    await supabase.from('documents').delete().eq('id', doc.id)
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
    setActiveMenu(null)
  }

  const handleCatchMeUp = (doc: Document) => {
    setCatchMeUpDoc(doc)
    setActiveMenu(null)
  }

  const getCatchMeUpText = () => {
    if (!catchMeUpDoc) return ''
    const progress = progressMap[catchMeUpDoc.id]
    if (!progress) return ''
    return catchMeUpDoc.words.slice(0, progress.word_index).join(' ')
  }

  const getProgress = (doc: Document) => {
    const progress = progressMap[doc.id]
    if (!progress) return 0
    return Math.round((progress.word_index / doc.word_count) * 100)
  }

  const formatLastRead = (date: string | null) => {
    if (!date) return 'Not started'
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString()
  }

  // Filter and sort documents
  const filteredDocs = documents
    .filter((doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'alphabetical':
          return a.title.localeCompare(b.title)
        case 'progress':
          const progressA = progressMap[a.id]?.word_index || 0
          const progressB = progressMap[b.id]?.word_index || 0
          const percentA = a.word_count > 0 ? progressA / a.word_count : 0
          const percentB = b.word_count > 0 ? progressB / b.word_count : 0
          return percentB - percentA
        case 'recent':
        default:
          const dateA = a.last_read_at ? new Date(a.last_read_at).getTime() : 0
          const dateB = b.last_read_at ? new Date(b.last_read_at).getTime() : 0
          return dateB - dateA
      }
    })

  // Calculate stats
  const totalWordsRead = sessions.reduce((sum, s) => sum + (s.end_index - s.start_index), 0)
  const totalTimeMinutes = sessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 60
  const avgSpeed = sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => sum + s.speed, 0) / sessions.length)
    : 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F1A]">
        <div className="animate-pulse text-xl text-white">Loading...</div>
      </div>
    )
  }

  // Logged-in experience
  if (user) {
    return (
      <div className="min-h-screen bg-[#0F0F1A] flex flex-col">
        {/* Header */}
        <header className="flex-shrink-0 border-b border-white/10">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
            <span className="text-lg font-bold text-white">
              Focal<span style={{ color: 'var(--accent-color)' }}>F</span>low
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                style={showSearch ? { color: 'var(--accent-color)' } : { color: 'rgba(255,255,255,0.7)' }}
              >
                <Search className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowStats(!showStats)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                style={showStats ? { color: 'var(--accent-color)' } : { color: 'rgba(255,255,255,0.7)' }}
              >
                <BarChart3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => router.push('/console')}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-hidden flex flex-col">
          <div className="max-w-lg mx-auto w-full flex-1 flex flex-col overflow-hidden">
            {/* Search bar */}
            {showSearch && (
              <div className="p-4 border-b border-white/10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search documents..."
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/40 transition-colors"
                  />
                </div>
                {/* Sort options */}
                <div className="flex gap-2 mt-3">
                  {(['recent', 'alphabetical', 'progress'] as SortBy[]).map((sort) => (
                    <button
                      key={sort}
                      onClick={() => setSortBy(sort)}
                      className="px-3 py-1.5 text-xs rounded-lg transition-colors capitalize"
                      style={sortBy === sort
                        ? { backgroundColor: 'var(--accent-color)', color: 'white' }
                        : { backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }
                      }
                    >
                      {sort}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stats panel */}
            {showStats && (
              <div className="p-4 border-b border-white/10">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold" style={{ color: 'var(--accent-color)' }}>
                      {totalWordsRead.toLocaleString()}
                    </div>
                    <div className="text-white/50 text-xs">Words Read</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold" style={{ color: 'var(--accent-color)' }}>
                      {Math.round(totalTimeMinutes)}
                    </div>
                    <div className="text-white/50 text-xs">Minutes</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold" style={{ color: 'var(--accent-color)' }}>
                      {avgSpeed}
                    </div>
                    <div className="text-white/50 text-xs">Avg WPM</div>
                  </div>
                </div>
              </div>
            )}

            {/* Document List */}
            <div className="flex-1 overflow-y-auto">
              {filteredDocs.length === 0 ? (
                <div className="p-8 text-center">
                  {searchQuery ? (
                    <>
                      <Search className="w-12 h-12 text-white/20 mx-auto mb-4" />
                      <p className="text-white/60">No documents match "{searchQuery}"</p>
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-12 h-12 text-white/20 mx-auto mb-4" />
                      <p className="text-white/60 mb-4">No documents yet</p>
                      <button
                        onClick={() => setShowUpload(true)}
                        className="px-6 py-3 rounded-xl text-white font-medium transition-all hover:brightness-110"
                        style={{ backgroundColor: 'var(--accent-color)' }}
                      >
                        Upload Your First Document
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="p-2">
                  {filteredDocs.map((doc) => {
                    const progress = getProgress(doc)
                    const hasProgress = progressMap[doc.id]?.word_index > 0
                    return (
                      <div key={doc.id} className="relative">
                        <button
                          onClick={() => handleSelectDocument(doc)}
                          className="w-full p-4 rounded-xl hover:bg-white/5 transition-colors flex items-center gap-4 text-left group"
                        >
                          {/* Progress indicator */}
                          <div className="relative w-12 h-12 flex-shrink-0">
                            <svg className="w-12 h-12 -rotate-90">
                              <circle
                                cx="24"
                                cy="24"
                                r="20"
                                fill="none"
                                stroke="rgba(255,255,255,0.1)"
                                strokeWidth="4"
                              />
                              <circle
                                cx="24"
                                cy="24"
                                r="20"
                                fill="none"
                                stroke="var(--accent-color)"
                                strokeWidth="4"
                                strokeDasharray={`${progress * 1.256} 125.6`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-xs text-white/70">
                              {progress}%
                            </span>
                          </div>

                          {/* Document info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-medium truncate">{doc.title}</h3>
                            <div className="flex items-center gap-2 text-sm text-white/50">
                              <Clock className="w-3 h-3" />
                              <span>{formatLastRead(doc.last_read_at)}</span>
                              <span>·</span>
                              <span>{doc.word_count.toLocaleString()} words</span>
                            </div>
                          </div>

                          {/* Arrow */}
                          <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" />
                        </button>

                        {/* Menu button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveMenu(activeMenu === doc.id ? null : doc.id)
                          }}
                          className="absolute right-14 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white/70"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>

                        {/* Action menu */}
                        {activeMenu === doc.id && (
                          <div
                            className="absolute right-14 top-12 z-10 bg-[#2A2A3E] rounded-xl shadow-xl border border-white/10 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {hasProgress && (
                              <button
                                onClick={() => handleCatchMeUp(doc)}
                                className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-white/10 transition-colors text-white"
                              >
                                <Sparkles className="w-4 h-4" style={{ color: 'var(--accent-color)' }} />
                                <span>Catch Me Up</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteDocument(doc)}
                              className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-white/10 transition-colors text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        </main>

        {/* FAB - Floating Action Button for upload */}
        {documents.length > 0 && (
          <button
            onClick={() => setShowUpload(true)}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white hover:brightness-110 hover:scale-105 transition-all z-40"
            style={{
              backgroundColor: 'var(--accent-color)',
              bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))'
            }}
            title="Upload document"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}

        {/* Upload Modal */}
        {showUpload && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowUpload(false)}
          >
            <div
              className="bg-[#1A1A2E] rounded-2xl p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Upload Document</h2>
                <button
                  onClick={() => setShowUpload(false)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <FileUpload onFileProcessed={handleFileProcessed} isDark={true} />
            </div>
          </div>
        )}

        {/* Catch Me Up Modal */}
        <CatchMeUpModal
          isOpen={!!catchMeUpDoc}
          onClose={() => setCatchMeUpDoc(null)}
          onContinueReading={() => {
            if (catchMeUpDoc) {
              router.push(`/read/${catchMeUpDoc.id}`)
            }
          }}
          textToSummarize={getCatchMeUpText()}
          documentId={catchMeUpDoc?.id || ''}
          wordIndex={catchMeUpDoc ? (progressMap[catchMeUpDoc.id]?.word_index || 0) : 0}
          isDark={true}
        />

        {/* Toast notification */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
              toast.type === 'success'
                ? 'bg-green-500/20 border border-green-500/30 text-green-300'
                : 'bg-blue-500/20 border border-blue-500/30 text-blue-300'
            }`}>
              {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
              <span>{toast.message}</span>
              <button
                onClick={() => setToast(null)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="flex-shrink-0 border-t border-white/10 py-4 px-4">
          <div className="max-w-lg mx-auto text-center text-xs text-white/40">
            <span>Open Source</span>
            <span className="mx-2">·</span>
            <a
              href="https://github.com/villagaiaimpacthub/focal-flow"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              GitHub
            </a>
          </div>
        </footer>
      </div>
    )
  }

  // Logged-out experience: Marketing page
  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 backdrop-blur-lg bg-[#0F0F1A]/80 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">Focal<span style={{ color: 'var(--accent-color)' }}>F</span>low</span>
          </div>
          <button
            onClick={() => setShowAuth(true)}
            className="px-4 py-2 text-sm rounded-lg transition-colors text-white hover:brightness-110"
            style={{ backgroundColor: 'var(--accent-color)' }}
          >
            Sign In
          </button>
        </div>
      </header>

      {/* Hero section */}
      <main className="pt-24 sm:pt-32 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center mb-10 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold">
            Read at <span style={{ color: 'var(--accent-color)' }}>3x Speed</span>
          </h1>
        </div>

        {/* Interactive Demo */}
        <div className="max-w-2xl mx-auto mb-12 sm:mb-16">
          <HomeDemo anchorColor="var(--accent-color)" />
        </div>

        {/* CTA Section */}
        <div className="max-w-md mx-auto text-center">
          <button
            onClick={() => setShowAuth(true)}
            className="w-full sm:w-auto px-8 py-4 text-lg font-semibold rounded-xl transition-all hover:brightness-110 hover:scale-[1.02] text-white"
            style={{ backgroundColor: 'var(--accent-color)' }}
          >
            Get Started Free →
          </button>
          <p className="mt-4 text-white/50">
            Already have an account?{' '}
            <button
              onClick={() => setShowAuth(true)}
              className="hover:underline transition-colors"
              style={{ color: 'var(--accent-color)' }}
            >
              Sign in
            </button>
          </p>
        </div>
      </main>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
            toast.type === 'success'
              ? 'bg-green-500/20 border border-green-500/30 text-green-300'
              : 'bg-blue-500/20 border border-blue-500/30 text-blue-300'
          }`}>
            {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Auth modal */}
      {showAuth && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowAuth(false)}
        >
          <div
            className="bg-[#1A1A2E] rounded-2xl p-8 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <AuthForm onSuccess={() => setShowAuth(false)} />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 px-4">
        <div className="max-w-6xl mx-auto text-center text-sm text-white/40">
          <span>Open Source</span>
          <span className="mx-2">·</span>
          <a
            href="https://github.com/villagaiaimpacthub/focal-flow"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F1A]">
        <div className="animate-pulse text-xl text-white">Loading...</div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}
