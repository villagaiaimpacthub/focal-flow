'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { User, Key, Sparkles, LogOut, ArrowLeft, Sliders, Music, Volume2 } from 'lucide-react'
import { ConsoleApiKeys } from '@/components/ConsoleApiKeys'
import { SpotifyConnect } from '@/components/SpotifyConnect'
import { CreditsBadge } from '@/components/CreditsBadge'
import { WordDisplay } from '@/components/WordDisplay'
import { useReaderStore, anchorColorPresets, timingPresets, TimingPresetKey, defaultTimingSettings } from '@/store/reader'
import { useAudioStore } from '@/store/audio'
import { usePreferencesSync } from '@/hooks/usePreferencesSync'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { UserPreferences } from '@/types/database'

function ConsolePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [resetEmailSent, setResetEmailSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [spotifyMessage, setSpotifyMessage] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null)

  // Handle Spotify OAuth redirect messages
  useEffect(() => {
    const spotifyStatus = searchParams.get('spotify')
    const spotifyWarning = searchParams.get('spotify_warning')
    const spotifyError = searchParams.get('error')

    if (spotifyStatus === 'connected') {
      if (spotifyWarning === 'premium_required') {
        setSpotifyMessage({ type: 'warning', text: 'Connected, but Spotify Premium is required for playback.' })
      } else {
        setSpotifyMessage({ type: 'success', text: 'Successfully connected to Spotify!' })
      }
      // Clear URL params
      router.replace('/console', { scroll: false })
    } else if (spotifyError?.startsWith('spotify_')) {
      setSpotifyMessage({ type: 'error', text: 'Failed to connect to Spotify. Please try again.' })
      router.replace('/console', { scroll: false })
    }
  }, [searchParams, router])

  // Sync preferences with database for authenticated users
  usePreferencesSync(user)

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        router.push('/')
        return
      }

      setUser(authUser)

      // Load user preferences
      const { data: userData } = await supabase
        .from('users')
        .select('preferences')
        .eq('id', authUser.id)
        .single()

      if (userData) {
        const typedData = userData as { preferences: UserPreferences }
        setPreferences(typedData.preferences)
      }

      setLoading(false)
    }

    loadUser()
  }, [supabase, router])

  const handleResetPassword = async () => {
    if (!user?.email) return

    setResetLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/console`
    })

    if (!error) {
      setResetEmailSent(true)
    }
    setResetLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const refreshCredits = async () => {
    if (!user) return

    const { data } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', user.id)
      .single()

    if (data) {
      const typedData = data as { preferences: UserPreferences }
      setPreferences(typedData.preferences)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F1A]">
        <div className="animate-pulse text-xl text-white">Loading...</div>
      </div>
    )
  }

  const freeCredits = preferences?.free_summary_credits ?? 10

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <span className="font-bold">Focal<span style={{ color: 'var(--accent-color)' }}>F</span>low</span>
            <span className="text-white/40 mx-2">|</span>
            <span className="font-medium text-white/70">Console</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Profile Section */}
        <section className="bg-white/5 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.2)' }}>
              <User className="w-5 h-5" style={{ color: 'var(--accent-color)' }} />
            </div>
            <h2 className="text-xl font-semibold">Profile</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-1">Email</label>
              <div className="px-4 py-3 bg-white/5 rounded-lg text-white/80">
                {user?.email}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleResetPassword}
                disabled={resetLoading || resetEmailSent}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-white/40 rounded-lg transition-colors"
              >
                {resetEmailSent ? 'Email Sent!' : resetLoading ? 'Sending...' : 'Change Password'}
              </button>

              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.2)', color: 'var(--accent-color)' }}
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>

            {resetEmailSent && (
              <p className="text-sm text-green-400">
                Check your email for the password reset link.
              </p>
            )}
          </div>
        </section>

        {/* API Keys Section */}
        <section className="bg-white/5 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.2)' }}>
              <Key className="w-5 h-5" style={{ color: 'var(--accent-color)' }} />
            </div>
            <h2 className="text-xl font-semibold">API Keys</h2>
          </div>

          <ConsoleApiKeys userId={user?.id || ''} />
        </section>

        {/* Spotify Section */}
        <section className="bg-white/5 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-[#1DB954]/20">
              <Music className="w-5 h-5 text-[#1DB954]" />
            </div>
            <h2 className="text-xl font-semibold">Background Audio</h2>
          </div>

          {spotifyMessage && (
            <div
              className={`mb-4 p-3 rounded-lg ${
                spotifyMessage.type === 'success'
                  ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                  : spotifyMessage.type === 'warning'
                  ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
                  : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}
            >
              <p className="text-sm">{spotifyMessage.text}</p>
              <button
                onClick={() => setSpotifyMessage(null)}
                className="text-xs underline mt-1 opacity-70 hover:opacity-100"
              >
                Dismiss
              </button>
            </div>
          )}

          <SpotifyConnect />

          <p className="mt-4 text-sm text-white/50">
            Connect Spotify to play music from your playlists while speed reading.
            You can also use ambient sounds without a Spotify account.
          </p>
        </section>

        {/* Audio Settings Section */}
        <AudioSettingsSection />

        {/* Reading Preferences Section */}
        <ReadingPreferencesSection />

        {/* Free Credits Section */}
        <section className="bg-white/5 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.2)' }}>
              <Sparkles className="w-5 h-5" style={{ color: 'var(--accent-color)' }} />
            </div>
            <h2 className="text-xl font-semibold">Free Credits</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <CreditsBadge credits={freeCredits} size="large" />
              <div>
                <p className="text-white/80">
                  You have <span className="font-bold text-white">{freeCredits}</span> free summaries remaining
                </p>
                <p className="text-sm text-white/50">
                  Add your own API key for unlimited summaries
                </p>
              </div>
            </div>

            {freeCredits === 0 && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400">
                  You've used all your free credits. Add your Mistral API key above to continue using the "Catch Me Up" feature.
                </p>
              </div>
            )}

            {freeCredits > 0 && freeCredits <= 3 && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400">
                  Running low on credits! Consider adding your own API key for unlimited summaries.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

function AudioSettingsSection() {
  const {
    volume,
    setVolume,
    playbackMode,
    setPlaybackMode,
    shuffle,
    setShuffle,
    crossfadeDuration,
    setCrossfadeDuration,
  } = useAudioStore()

  return (
    <section className="bg-white/5 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-[#1DB954]/20">
          <Volume2 className="w-5 h-5 text-[#1DB954]" />
        </div>
        <h2 className="text-xl font-semibold">Audio Settings</h2>
      </div>

      <div className="space-y-6">
        {/* Volume */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-white/80 font-medium">Default Volume</span>
            <span className="text-white">{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-white/50 mt-1">
            Sets the initial volume when you start reading
          </p>
        </div>

        {/* Default Playback Mode */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Default Playback Mode
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setPlaybackMode('loop')}
              className={`flex-1 px-4 py-2.5 text-sm rounded-lg transition-colors ${
                playbackMode === 'loop'
                  ? 'text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              style={playbackMode === 'loop' ? { backgroundColor: 'var(--accent-color)' } : undefined}
            >
              <span className="font-medium">Loop</span>
              <span className="block text-xs opacity-70">Repeat one track</span>
            </button>
            <button
              onClick={() => setPlaybackMode('playlist')}
              className={`flex-1 px-4 py-2.5 text-sm rounded-lg transition-colors ${
                playbackMode === 'playlist'
                  ? 'text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              style={playbackMode === 'playlist' ? { backgroundColor: 'var(--accent-color)' } : undefined}
            >
              <span className="font-medium">Playlist</span>
              <span className="block text-xs opacity-70">Play all tracks</span>
            </button>
          </div>
        </div>

        {/* Shuffle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white/80">Shuffle</p>
            <p className="text-xs text-white/50">Randomize track order in playlist mode</p>
          </div>
          <button
            onClick={() => setShuffle(!shuffle)}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              shuffle ? 'bg-[var(--accent-color)]' : 'bg-white/20'
            }`}
          >
            <span
              className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                shuffle ? 'left-8' : 'left-1'
              }`}
            />
          </button>
        </div>

        {/* Crossfade Duration */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-white/80 font-medium">Crossfade Duration</span>
            <span className="text-white">{crossfadeDuration}s</span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={crossfadeDuration}
            onChange={(e) => setCrossfadeDuration(parseInt(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-white/50 mt-1">
            {crossfadeDuration === 0
              ? 'No crossfade - tracks switch instantly'
              : `Tracks blend together over ${crossfadeDuration} seconds`}
          </p>
        </div>
      </div>
    </section>
  )
}

function ReadingPreferencesSection() {
  const {
    anchorPosition,
    setAnchorPosition,
    screenPosition,
    setScreenPosition,
    fontSize,
    setFontSize,
    speed,
    setSpeed,
    anchorColor,
    setAnchorColor,
    timing,
    setTimingPreset,
    setTimingSetting,
    resetTimingToDefaults
  } = useReaderStore()

  const anchorPresets = [
    { label: 'Left', value: 0.25 },
    { label: 'Default', value: 0.35 },
    { label: 'Center', value: 0.5 }
  ]

  // Check if current timing matches a preset
  const getCurrentTimingPreset = (): TimingPresetKey | null => {
    for (const [key, preset] of Object.entries(timingPresets)) {
      const settings = preset.settings
      if (
        timing.longWordThreshold === settings.longWordThreshold &&
        timing.msPerExtraChar === settings.msPerExtraChar &&
        timing.sentencePauseMs === settings.sentencePauseMs &&
        timing.clausePauseMs === settings.clausePauseMs
      ) {
        return key as TimingPresetKey
      }
    }
    return null
  }

  const currentPreset = getCurrentTimingPreset()

  return (
    <section className="bg-white/5 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.2)' }}>
          <Sliders className="w-5 h-5" style={{ color: 'var(--accent-color)' }} />
        </div>
        <h2 className="text-xl font-semibold">Reading Preferences</h2>
      </div>

      <div className="space-y-6">
        {/* Live preview */}
        <div className="h-32 bg-[#0F0F1A] rounded-lg overflow-hidden">
          <WordDisplay
            word="comprehension"
            anchorPreference={anchorPosition}
            screenPosition={screenPosition}
            fontSize={fontSize}
            anchorColor={anchorColor}
          />
        </div>

        {/* Focus Letter Color */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Focus Letter Color
          </label>
          <div className="flex gap-3 flex-wrap">
            {anchorColorPresets.map((color) => (
              <button
                key={color.value}
                onClick={() => setAnchorColor(color.value)}
                className={`w-10 h-10 rounded-full transition-all ${
                  anchorColor === color.value
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1A1A2E] scale-110'
                    : 'hover:scale-110'
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
          <p className="text-xs text-white/50 mt-2">
            Green option available for color-blind users
          </p>
        </div>

        {/* Anchor Position */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Letter Position: {Math.round(anchorPosition * 100)}%
          </label>
          <div className="flex gap-2 mb-3">
            {anchorPresets.map((preset) => {
              const isSelected = Math.abs(anchorPosition - preset.value) < 0.01
              return (
                <button
                  key={preset.label}
                  onClick={() => setAnchorPosition(preset.value)}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                    isSelected ? 'text-white' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                  style={isSelected ? { backgroundColor: 'var(--accent-color)' } : undefined}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
          <input
            type="range"
            min={0.1}
            max={0.6}
            step={0.01}
            value={anchorPosition}
            onChange={(e) => setAnchorPosition(parseFloat(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-white/50 mt-1">
            Controls which letter in the word is highlighted
          </p>
        </div>

        {/* Screen Position */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Word Position: {Math.round(screenPosition * 100)}%
          </label>
          <div className="flex gap-2 mb-3">
            {[
              { label: 'Left', value: 0.35 },
              { label: 'Center', value: 0.5 },
              { label: 'Right', value: 0.65 }
            ].map((preset) => {
              const isSelected = Math.abs(screenPosition - preset.value) < 0.01
              return (
                <button
                  key={preset.label}
                  onClick={() => setScreenPosition(preset.value)}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                    isSelected ? 'text-white' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                  style={isSelected ? { backgroundColor: 'var(--accent-color)' } : undefined}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
          <input
            type="range"
            min={0.3}
            max={0.7}
            step={0.01}
            value={screenPosition}
            onChange={(e) => setScreenPosition(parseFloat(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-white/50 mt-1">
            Move left to give long words more room on the right
          </p>
        </div>

        {/* Font Size */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Font Size: {fontSize}px
          </label>
          <input
            type="range"
            min={32}
            max={120}
            step={2}
            value={fontSize}
            onChange={(e) => setFontSize(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Default Speed */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Default Speed: {speed} WPM
          </label>
          <input
            type="range"
            min={100}
            max={1200}
            step={50}
            value={speed}
            onChange={(e) => setSpeed(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-white/40 mt-1">
            <span>100 WPM</span>
            <span>1200 WPM</span>
          </div>
        </div>

        {/* Reading Rhythm (Timing Presets) */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Reading Rhythm
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(timingPresets) as [TimingPresetKey, typeof timingPresets[TimingPresetKey]][]).map(([key, preset]) => {
              const isSelected = currentPreset === key
              return (
                <button
                  key={key}
                  onClick={() => setTimingPreset(key)}
                  className={`p-3 rounded-lg text-left transition-all ${
                    isSelected ? 'border' : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                  style={isSelected ? { backgroundColor: 'rgba(var(--accent-rgb), 0.2)', borderColor: 'var(--accent-color)' } : undefined}
                >
                  <div className="font-medium text-white">{preset.name}</div>
                  <div className="text-xs text-white/50">{preset.description}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Advanced Timing */}
        <details className="group">
          <summary className="text-sm font-medium text-white/70 cursor-pointer hover:text-white transition-colors list-none flex items-center gap-2">
            <span>Advanced Timing</span>
            <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>

          <div className="space-y-4 pt-4 mt-2 border-t border-white/10">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/70">Sentence pause</span>
                <span className="text-white">{timing.sentencePauseMs}ms</span>
              </div>
              <input
                type="range"
                min={0} max={400} step={25}
                value={timing.sentencePauseMs}
                onChange={(e) => setTimingSetting('sentencePauseMs', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/70">Clause pause</span>
                <span className="text-white">{timing.clausePauseMs}ms</span>
              </div>
              <input
                type="range"
                min={0} max={200} step={25}
                value={timing.clausePauseMs}
                onChange={(e) => setTimingSetting('clausePauseMs', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/70">Long word threshold</span>
                <span className="text-white">{timing.longWordThreshold} chars</span>
              </div>
              <input
                type="range"
                min={4} max={12} step={1}
                value={timing.longWordThreshold}
                onChange={(e) => setTimingSetting('longWordThreshold', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/70">Extra time per char</span>
                <span className="text-white">{timing.msPerExtraChar}ms</span>
              </div>
              <input
                type="range"
                min={0} max={50} step={5}
                value={timing.msPerExtraChar}
                onChange={(e) => setTimingSetting('msPerExtraChar', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <button
              onClick={resetTimingToDefaults}
              className="text-sm text-white/50 hover:text-white transition-colors"
            >
              Reset to defaults
            </button>
          </div>
        </details>
      </div>
    </section>
  )
}

export default function ConsolePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F1A]">
        <div className="animate-pulse text-xl text-white">Loading...</div>
      </div>
    }>
      <ConsolePageContent />
    </Suspense>
  )
}
