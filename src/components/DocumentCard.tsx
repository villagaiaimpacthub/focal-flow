'use client'

import { FileText, Clock, BookOpen, Trash2 } from 'lucide-react'
import type { Document, ReadingProgress } from '@/types/database'

interface DocumentCardProps {
  document: Document
  progress?: ReadingProgress
  onRead: (document: Document) => void
  onDelete?: (document: Document) => void
  onCatchMeUp?: (document: Document) => void
  isDark?: boolean
}

export function DocumentCard({
  document,
  progress,
  onRead,
  onDelete,
  onCatchMeUp,
  isDark = true
}: DocumentCardProps) {
  const progressPercent = progress && document.word_count > 0
    ? Math.round((progress.word_index / document.word_count) * 100)
    : 0

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never read'
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  const estimatedReadTime = Math.ceil(document.word_count / 300) // Assuming 300 WPM

  return (
    <div
      className="group relative rounded-xl p-4 transition-all hover:scale-[1.02]"
      style={{
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
      }}
    >
      {/* Progress bar at top */}
      {progressPercent > 0 && (
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-xl overflow-hidden"
          style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
        >
          <div
            className="h-full bg-red-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Delete button (shows on hover) */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(document)
          }}
          className="absolute top-2 right-2 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/20 hover:bg-red-500/40"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      )}

      {/* Document icon and title */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: isDark ? 'rgba(229,62,62,0.2)' : 'rgba(229,62,62,0.1)' }}
        >
          <FileText className="w-5 h-5 text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className="font-medium truncate"
            style={{ color: isDark ? '#FFFFFF' : '#1A1A1A' }}
          >
            {document.title}
          </h3>
          <p
            className="text-sm"
            style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
          >
            {document.word_count.toLocaleString()} words
          </p>
        </div>
      </div>

      {/* Stats */}
      <div
        className="flex items-center gap-4 text-xs mb-4"
        style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
      >
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{estimatedReadTime} min</span>
        </div>
        <div className="flex items-center gap-1">
          <BookOpen className="w-3 h-3" />
          <span>{formatDate(document.last_read_at)}</span>
        </div>
        {progressPercent > 0 && (
          <span className="text-red-400">{progressPercent}% complete</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onRead(document)}
          className="flex-1 py-2 px-4 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
        >
          {progressPercent > 0 && progressPercent < 100 ? 'Continue' : 'Read'}
        </button>
        {onCatchMeUp && progressPercent > 0 && progressPercent < 100 && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCatchMeUp(document)
            }}
            className="py-2 px-4 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              color: isDark ? '#FFFFFF' : '#1A1A1A'
            }}
          >
            Catch Me Up
          </button>
        )}
      </div>
    </div>
  )
}
