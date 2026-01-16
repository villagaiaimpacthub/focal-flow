'use client'

import { useMemo } from 'react'
import { useReaderStore } from '@/store/reader'

interface WordDisplayProps {
  word?: string
  anchorPreference?: number
  fontSize?: number
  showAnchorLine?: boolean
}

export function WordDisplay({
  word: propWord,
  anchorPreference: propAnchor,
  fontSize: propFontSize,
  showAnchorLine = true
}: WordDisplayProps) {
  const {
    words,
    currentWordIndex,
    anchorPosition: storeAnchor,
    fontSize: storeFontSize,
    theme
  } = useReaderStore()

  const word = propWord ?? words[currentWordIndex] ?? ''
  const anchorPreference = propAnchor ?? storeAnchor
  const fontSize = propFontSize ?? storeFontSize

  const { before, anchor, after, anchorIndex } = useMemo(() => {
    if (!word) {
      return { before: '', anchor: '', after: '', anchorIndex: 0 }
    }

    const idx = Math.floor(word.length * anchorPreference)
    const clampedIdx = Math.min(Math.max(0, idx), word.length - 1)

    return {
      before: word.slice(0, clampedIdx),
      anchor: word[clampedIdx] || '',
      after: word.slice(clampedIdx + 1),
      anchorIndex: clampedIdx
    }
  }, [word, anchorPreference])

  const isDark = theme === 'dark'

  if (!word) {
    return (
      <div
        className="relative flex items-center justify-center h-full"
        style={{
          backgroundColor: isDark ? '#0F0F1A' : '#FAFAFA',
          fontFamily: "'JetBrains Mono', 'SF Mono', monospace"
        }}
      >
        <span
          className="opacity-30"
          style={{
            fontSize: `${fontSize}px`,
            color: isDark ? '#FFFFFF' : '#1A1A1A'
          }}
        >
          Ready
        </span>
      </div>
    )
  }

  return (
    <div
      className="relative flex items-center justify-center h-full select-none"
      style={{
        backgroundColor: isDark ? '#0F0F1A' : '#FAFAFA',
        fontFamily: "'JetBrains Mono', 'SF Mono', monospace"
      }}
    >
      {/* Vertical anchor line */}
      {showAnchorLine && (
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            height: `${fontSize * 1.5}px`,
            width: '2px',
            backgroundColor: 'rgba(229, 62, 62, 0.3)'
          }}
        />
      )}

      {/* Word container - positioned so anchor lands at center */}
      <div
        className="absolute left-1/2 whitespace-nowrap"
        style={{
          fontSize: `${fontSize}px`,
          // For monospace: offset by character count using ch unit
          transform: `translateX(-${anchorIndex}ch) translateX(-0.5ch)`
        }}
      >
        <span style={{ color: isDark ? '#FFFFFF' : '#1A1A1A' }}>
          {before}
        </span>
        <span style={{ color: '#E53E3E', fontWeight: 'bold' }}>
          {anchor}
        </span>
        <span style={{ color: isDark ? '#FFFFFF' : '#1A1A1A' }}>
          {after}
        </span>
      </div>
    </div>
  )
}
