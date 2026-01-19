'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { BookOpen, Clock, ChevronRight, Play, Pause, Minus, Plus, ArrowLeft, FileText, File, BookMarked } from 'lucide-react'
import { PreReadModal } from '@/components/PreReadModal'
import { AudioPlayer } from '@/components/AudioPlayer'
import { useAudioStore } from '@/store/audio'
import type { AudioSelection } from '@/types/spotify'

// Sample documents with content
const SAMPLE_DOCUMENTS = [
  {
    id: '1',
    title: 'The Psychology of Speed Reading',
    type: 'article',
    wordCount: 1847,
    progress: 0,
    lastRead: '2 days ago',
    content: `Speed reading is not just about moving your eyes faster across a page. It fundamentally changes how your brain processes written information. Research shows that skilled speed readers develop enhanced pattern recognition, allowing them to grasp meaning from word groups rather than individual letters. The key breakthrough comes when readers learn to suppress subvocalization, the internal voice that sounds out each word. This mental shift unlocks reading speeds of 500 words per minute or more while maintaining strong comprehension. Practice with deliberate focus on chunking words together, and you will see dramatic improvements within weeks.`
  },
  {
    id: '2',
    title: 'Quarterly Report Q4 2025',
    type: 'document',
    wordCount: 3421,
    progress: 45,
    lastRead: '1 hour ago',
    content: `Executive Summary: Q4 2025 exceeded all performance targets across key business metrics. Revenue grew 23% year-over-year, driven by strong adoption of our enterprise solutions. Customer retention reached an all-time high of 94%, reflecting our continued investment in product quality and support infrastructure. Operating margins improved by 340 basis points through strategic cost optimization initiatives. Looking ahead, we are well-positioned to capitalize on emerging market opportunities while maintaining our commitment to sustainable growth and shareholder value creation.`
  },
  {
    id: '3',
    title: 'Getting Things Done - Chapter 3',
    type: 'book',
    wordCount: 5892,
    progress: 72,
    lastRead: 'Yesterday',
    content: `The collection habit is fundamental to stress-free productivity. Your mind is designed for having ideas, not holding them. When you try to keep track of everything mentally, your brain becomes overwhelmed and anxious. The solution is to capture every open loop, every commitment, every idea into a trusted external system. This could be a physical inbox, a digital note app, or a voice recorder. The key is consistency. Once you train yourself to immediately capture anything that has your attention, you free up mental bandwidth for higher-level thinking and creative problem solving.`
  },
  {
    id: '4',
    title: 'Product Launch Brief',
    type: 'memo',
    wordCount: 892,
    progress: 0,
    lastRead: 'Just now',
    content: `Product Launch Timeline: We are targeting March 15th for the public release of version 2.0. Key features include redesigned dashboard, AI-powered insights, and mobile app improvements. Marketing campaign begins February 28th with influencer previews. Press embargo lifts March 10th. All teams should finalize documentation by March 1st. Customer success will begin onboarding preparation next week. Engineering freeze scheduled for March 8th to allow final QA testing. This launch represents our largest update in company history.`
  }
]

// Get icon for document type
function getDocIcon(type: string) {
  switch (type) {
    case 'book':
      return BookMarked
    case 'article':
      return BookOpen
    case 'document':
      return FileText
    default:
      return File
  }
}

// Word display component with anchor highlighting
function WordDisplay({
  word,
  fontSize,
  anchorPosition,
  screenPosition,
  anchorColor
}: {
  word: string
  fontSize: number
  anchorPosition: number
  screenPosition: number
  anchorColor: string
}) {
  const { before, anchor, after, anchorIndex } = useMemo(() => {
    if (!word) {
      return { before: '', anchor: '', after: '', anchorIndex: 0 }
    }
    const idx = Math.floor(word.length * anchorPosition)
    const clampedIdx = Math.min(Math.max(0, idx), word.length - 1)
    return {
      before: word.slice(0, clampedIdx),
      anchor: word[clampedIdx] || '',
      after: word.slice(clampedIdx + 1),
      anchorIndex: clampedIdx
    }
  }, [word, anchorPosition])

  return (
    <div
      className="relative flex items-center justify-center h-full select-none"
      style={{ fontFamily: "'JetBrains Mono', 'SF Mono', monospace" }}
    >
      <div
        className="absolute whitespace-nowrap"
        style={{
          left: `${screenPosition * 100}%`,
          fontSize: `${fontSize}px`,
          transform: `translateX(-${anchorIndex}ch) translateX(-0.5ch)`
        }}
      >
        <span className="text-white">{before}</span>
        <span style={{ color: anchorColor, fontWeight: 'bold' }}>{anchor}</span>
        <span className="text-white">{after}</span>
      </div>
    </div>
  )
}

type ViewState = 'list' | 'audio' | 'loading' | 'reading'

export default function EmbedSelectPage() {
  const [view, setView] = useState<ViewState>('list')
  const [selectedDoc, setSelectedDoc] = useState<typeof SAMPLE_DOCUMENTS[0] | null>(null)

  // Audio store - AudioPlayer component handles the actual playback via useAmbientSound
  const { startAmbientSound, startCustomPlaylist, stopAudio, currentAudioType } = useAudioStore()

  // Reader state
  const [words, setWords] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [wpm, setWpm] = useState(300)

  // Settings
  const fontSize = 48
  const anchorPosition = 0.35
  const screenPosition = 0.5
  const anchorColor = '#E53E3E'

  // Handle document selection - show audio modal
  const handleSelectDocument = (doc: typeof SAMPLE_DOCUMENTS[0]) => {
    setSelectedDoc(doc)
    setView('audio')
  }

  // Handle start reading (from PreReadModal)
  const handleStartReading = (selection: AudioSelection) => {
    if (!selectedDoc) return

    // Start audio based on selection
    if (selection.type === 'ambient' && selection.ambientSound) {
      startAmbientSound(selection.ambientSound)
    } else if (selection.type === 'custom' && selection.customPlaylist) {
      startCustomPlaylist(selection.customPlaylist)
    }

    setView('loading')

    // Simulate loading
    setTimeout(() => {
      const parsedWords = selectedDoc.content.split(/\s+/).filter(w => w.length > 0)
      setWords(parsedWords)
      setCurrentIndex(0)
      setView('reading')
      setIsPlaying(true)
    }, 800)
  }

  // Handle back to list
  const handleBack = () => {
    setIsPlaying(false)
    stopAudio()
    setView('list')
    setSelectedDoc(null)
    setWords([])
    setCurrentIndex(0)
  }

  // Handle close audio modal
  const handleCloseAudioModal = () => {
    setView('list')
    setSelectedDoc(null)
  }

  // Calculate timing based on WPM
  const getWordTime = useCallback((word: string) => {
    const baseMs = 60000 / wpm
    let totalMs = baseMs

    const extraChars = Math.max(0, word.length - 6)
    totalMs += extraChars * 20

    const lastChar = word.slice(-1)
    if ('.!?'.includes(lastChar)) {
      totalMs += 150
    } else if (',;:'.includes(lastChar)) {
      totalMs += 75
    }

    return Math.round(totalMs)
  }, [wpm])

  // Playback loop
  useEffect(() => {
    if (!isPlaying || words.length === 0) return

    const currentWord = words[currentIndex]
    const timeout = setTimeout(() => {
      setCurrentIndex(prev => {
        const next = prev + 1
        if (next >= words.length) {
          return 0
        }
        return next
      })
    }, getWordTime(currentWord))

    return () => clearTimeout(timeout)
  }, [isPlaying, currentIndex, words, getWordTime])

  const togglePlay = () => setIsPlaying(prev => !prev)
  const adjustWpm = (delta: number) => setWpm(prev => Math.min(1000, Math.max(100, prev + delta)))
  const progress = words.length > 0 ? ((currentIndex + 1) / words.length) * 100 : 0

  const hasAudio = currentAudioType !== 'none'

  // Reading view
  if (view === 'reading' && selectedDoc) {
    return (
      <div className="w-full h-screen bg-[#0F0F1A] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors text-white/70"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-medium truncate text-sm">{selectedDoc.title}</h1>
            <p className="text-white/50 text-xs">{selectedDoc.wordCount.toLocaleString()} words</p>
          </div>
        </div>

        {/* Word display */}
        <div className="flex-1 relative min-h-0">
          <WordDisplay
            word={words[currentIndex] || ''}
            fontSize={fontSize}
            anchorPosition={anchorPosition}
            screenPosition={screenPosition}
            anchorColor={anchorColor}
          />
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-white/10">
          <div
            className="h-full bg-[#E53E3E] transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-4 py-3 bg-white/5">
          <button
            onClick={togglePlay}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white ml-0.5" />
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustWpm(-50)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <Minus className="w-4 h-4 text-white" />
            </button>
            <div className="text-white font-mono text-sm min-w-[80px] text-center">
              {wpm} <span className="text-white/50">WPM</span>
            </div>
            <button
              onClick={() => adjustWpm(50)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="text-white/50 text-xs font-mono">
            {currentIndex + 1}/{words.length}
          </div>
        </div>

        {/* Audio player */}
        {hasAudio && <AudioPlayer />}
      </div>
    )
  }

  // Loading view with audio player (so audio can start during user gesture)
  if (view === 'loading') {
    return (
      <div className="w-full h-screen bg-[#0F0F1A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-white/20 border-t-[#E53E3E] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">Loading {selectedDoc?.title}...</p>
        </div>
        {/* Audio player starts here to respect user gesture */}
        {hasAudio && <AudioPlayer />}
      </div>
    )
  }

  // Document list view (with PreReadModal)
  return (
    <div className="w-full h-screen bg-[#0F0F1A] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="px-4 h-14 flex items-center justify-between">
          <span className="text-lg font-bold text-white">
            Focal<span className="text-[#E53E3E]">F</span>low
          </span>
          <span className="text-white/50 text-sm">Your Library</span>
        </div>
      </header>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {SAMPLE_DOCUMENTS.map((doc) => {
            const Icon = getDocIcon(doc.type)
            return (
              <button
                key={doc.id}
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
                      stroke="#E53E3E"
                      strokeWidth="4"
                      strokeDasharray={`${doc.progress * 1.256} 125.6`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-white/50" />
                  </span>
                </div>

                {/* Document info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium truncate">{doc.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <Clock className="w-3 h-3" />
                    <span>{doc.lastRead}</span>
                    <span>·</span>
                    <span>{doc.wordCount.toLocaleString()} words</span>
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors flex-shrink-0" />
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer hint */}
      <div className="px-4 py-3 border-t border-white/10 text-center">
        <p className="text-white/40 text-xs">Click a document to start speed reading</p>
      </div>

      {/* Pre-read modal with audio selection */}
      <PreReadModal
        isOpen={view === 'audio'}
        onClose={handleCloseAudioModal}
        onStart={handleStartReading}
        documentTitle={selectedDoc?.title || ''}
      />
    </div>
  )
}
