'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Plus, Search, Grid, List, BarChart3 } from 'lucide-react'
import { DocumentCard } from '@/components/DocumentCard'
import { FileUpload } from '@/components/FileUpload'
import { CatchMeUpModal } from '@/components/CatchMeUpModal'
import { createClient } from '@/lib/supabase/client'
import type { Document, ReadingProgress, ReadingSession } from '@/types/database'
import type { User } from '@supabase/supabase-js'

type SortBy = 'recent' | 'alphabetical' | 'progress'
type ViewMode = 'grid' | 'list'

export default function LibraryPage() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState<Document[]>([])
  const [progressMap, setProgressMap] = useState<Record<string, ReadingProgress>>({})
  const [sessions, setSessions] = useState<ReadingSession[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('recent')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [showUpload, setShowUpload] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [catchMeUpDoc, setCatchMeUpDoc] = useState<Document | null>(null)

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/')
        return
      }

      setUser(user)

      // Load documents
      const { data: docs } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('last_read_at', { ascending: false, nullsFirst: false })

      if (docs) {
        setDocuments(docs as Document[])
      }

      // Load progress
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

      // Load sessions for stats
      const { data: sessionData } = await supabase
        .from('reading_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (sessionData) {
        setSessions(sessionData as ReadingSession[])
      }

      setLoading(false)
    }

    loadData()
  }, [supabase, router])

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
      setDocuments((prev) => [data as Document, ...prev])
      setShowUpload(false)
      router.push(`/read/${(data as Document).id}`)
    }
  }

  const handleDeleteDocument = async (doc: Document) => {
    const confirmed = window.confirm(`Delete "${doc.title}"? This cannot be undone.`)
    if (!confirmed) return

    await supabase.from('documents').delete().eq('id', doc.id)
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
  }

  const handleCatchMeUp = (doc: Document) => {
    setCatchMeUpDoc(doc)
  }

  const getCatchMeUpText = () => {
    if (!catchMeUpDoc) return ''
    const progress = progressMap[catchMeUpDoc.id]
    if (!progress) return ''
    return catchMeUpDoc.words.slice(0, progress.word_index).join(' ')
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

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2"
          >
            <BookOpen className="w-8 h-8 text-red-500" />
            <span className="text-xl font-bold">FlowReader</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowStats(!showStats)}
              className={`p-2 rounded-lg transition-colors ${
                showStats ? 'bg-red-500' : 'hover:bg-white/10'
              }`}
              title="View stats"
            >
              <BarChart3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
              className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats panel */}
        {showStats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white/5 rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-red-500">
                {totalWordsRead.toLocaleString()}
              </div>
              <div className="text-white/60 text-sm">Words Read</div>
            </div>
            <div className="bg-white/5 rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-red-500">
                {Math.round(totalTimeMinutes)}
              </div>
              <div className="text-white/60 text-sm">Minutes Reading</div>
            </div>
            <div className="bg-white/5 rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-red-500">
                {avgSpeed}
              </div>
              <div className="text-white/60 text-sm">Avg WPM</div>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-red-500"
          >
            <option value="recent">Recent</option>
            <option value="alphabetical">A-Z</option>
            <option value="progress">Progress</option>
          </select>

          <div className="flex border border-white/20 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-red-500' : 'hover:bg-white/10'}`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-red-500' : 'hover:bg-white/10'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Upload
          </button>
        </div>

        {/* Documents grid/list */}
        {filteredDocs.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60 mb-4">
              {searchQuery ? 'No documents match your search' : 'No documents yet'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowUpload(true)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              >
                Upload your first document
              </button>
            )}
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-4'
            }
          >
            {filteredDocs.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                progress={progressMap[doc.id]}
                onRead={() => router.push(`/read/${doc.id}`)}
                onDelete={handleDeleteDocument}
                onCatchMeUp={handleCatchMeUp}
                isDark={true}
              />
            ))}
          </div>
        )}
      </main>

      {/* Upload modal */}
      {showUpload && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowUpload(false)}
        >
          <div
            className="bg-[#1A1A2E] rounded-2xl p-8 max-w-lg w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4">Upload Document</h2>
            <FileUpload onFileProcessed={handleFileProcessed} isDark={true} />
          </div>
        </div>
      )}

      {/* Catch Me Up modal */}
      <CatchMeUpModal
        isOpen={!!catchMeUpDoc}
        onClose={() => setCatchMeUpDoc(null)}
        textToSummarize={getCatchMeUpText()}
        isDark={true}
      />
    </div>
  )
}
