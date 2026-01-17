'use client'

import { useEffect, useRef } from 'react'
import { useReaderStore } from '@/store/reader'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { UserPreferences } from '@/types/database'

/**
 * Hook to sync user preferences between Zustand store and Supabase database.
 *
 * - On mount: loads preferences from database (if user is authenticated)
 * - On change: saves preferences to database with 1 second debounce
 *
 * This ensures preferences persist across devices for authenticated users
 * while maintaining fast local updates via Zustand.
 */
export function usePreferencesSync(user: User | null) {
  const supabase = createClient()
  const hasLoadedFromDb = useRef(false)
  const isInitialMount = useRef(true)

  const {
    anchorPosition,
    setAnchorPosition,
    screenPosition,
    setScreenPosition,
    speed,
    setSpeed,
    theme,
    setTheme,
    fontSize,
    setFontSize,
    anchorColor,
    setAnchorColor,
    timing,
    setTiming,
  } = useReaderStore()

  // Load preferences from database on mount (for authenticated users)
  useEffect(() => {
    if (!user || hasLoadedFromDb.current) return

    const loadPreferences = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('preferences')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Failed to load preferences:', error)
        return
      }

      const userData = data as { preferences: UserPreferences } | null
      if (userData?.preferences) {
        const prefs = userData.preferences

        // Load each preference if it exists in the database
        if (prefs.anchor_position !== undefined) {
          setAnchorPosition(prefs.anchor_position)
        }
        if (prefs.screen_position !== undefined) {
          setScreenPosition(prefs.screen_position)
        }
        if (prefs.default_speed !== undefined) {
          setSpeed(prefs.default_speed)
        }
        if (prefs.theme !== undefined) {
          setTheme(prefs.theme)
        }
        if (prefs.font_size !== undefined) {
          setFontSize(prefs.font_size)
        }
        if (prefs.anchor_color !== undefined) {
          setAnchorColor(prefs.anchor_color)
        }
        if (prefs.timing !== undefined) {
          setTiming(prefs.timing)
        }

        hasLoadedFromDb.current = true
      }
    }

    loadPreferences()
  }, [user, supabase, setAnchorPosition, setScreenPosition, setSpeed, setTheme, setFontSize, setAnchorColor, setTiming])

  // Save preferences to database when they change (debounced)
  useEffect(() => {
    // Skip on initial mount and if no user or haven't loaded from DB yet
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    if (!user || !hasLoadedFromDb.current) return

    const timeoutId = setTimeout(async () => {
      // Get current free_summary_credits from database to preserve it
      const { data: currentData } = await supabase
        .from('users')
        .select('preferences')
        .eq('id', user.id)
        .single()

      const currentUserData = currentData as { preferences: UserPreferences } | null
      const currentCredits = currentUserData?.preferences?.free_summary_credits ?? 10

      const preferences: UserPreferences = {
        anchor_position: anchorPosition,
        screen_position: screenPosition,
        default_speed: speed,
        theme,
        font_size: fontSize,
        anchor_color: anchorColor,
        timing,
        free_summary_credits: currentCredits,
      }

      const { error } = await supabase
        .from('users')
        .update({ preferences } as never)
        .eq('id', user.id)

      if (error) {
        console.error('Failed to save preferences:', error)
      }
    }, 1000) // 1 second debounce

    return () => clearTimeout(timeoutId)
  }, [user, supabase, anchorPosition, screenPosition, speed, theme, fontSize, anchorColor, timing])
}
