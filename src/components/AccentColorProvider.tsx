'use client'

import { useEffect } from 'react'
import { useReaderStore } from '@/store/reader'

// Convert hex to RGB values for use with rgba()
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

export function AccentColorProvider({ children }: { children: React.ReactNode }) {
  const anchorColor = useReaderStore((state) => state.anchorColor)

  useEffect(() => {
    const root = document.documentElement
    const rgb = hexToRgb(anchorColor)

    // Set the accent color CSS variables
    root.style.setProperty('--accent-color', anchorColor)

    if (rgb) {
      root.style.setProperty('--accent-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`)
    }
  }, [anchorColor])

  return <>{children}</>
}
