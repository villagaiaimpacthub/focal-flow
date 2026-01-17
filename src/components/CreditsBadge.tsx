'use client'

import { Sparkles } from 'lucide-react'

interface CreditsBadgeProps {
  credits: number
  size?: 'small' | 'large'
  showIcon?: boolean
}

export function CreditsBadge({ credits, size = 'small', showIcon = true }: CreditsBadgeProps) {
  const isLow = credits <= 3
  const isEmpty = credits === 0

  const colorClasses = isEmpty
    ? 'bg-red-500/20 text-red-400 border-red-500/30'
    : isLow
    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    : 'bg-white/10 text-white/70 border-white/20'

  if (size === 'large') {
    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${colorClasses}`}>
        {showIcon && <Sparkles className="w-5 h-5" />}
        <span className="text-2xl font-bold">{credits}</span>
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${colorClasses}`}>
      {showIcon && <Sparkles className="w-3 h-3" />}
      <span>{credits}</span>
    </div>
  )
}
