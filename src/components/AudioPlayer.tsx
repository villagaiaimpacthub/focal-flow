'use client'

import { useEffect } from 'react'
import { Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Play, Pause, X, Volume2 } from 'lucide-react'
import { useAudioStore } from '@/store/audio'
import { useSpotifyPlayer } from '@/hooks/useSpotifyPlayer'
import { useAmbientSound } from '@/hooks/useAmbientSound'

interface AudioPlayerProps {
  compact?: boolean
}

type PlaybackModeType = 'loop' | 'playlist' | 'shuffle'

export function AudioPlayer({ compact = false }: AudioPlayerProps) {
  const {
    currentAudioType,
    currentAmbientSound,
    currentCustomPlaylist,
    currentSpotifyPlaylist,
    isPlaying,
    volume,
    playbackMode,
    shuffle,
    setPlaying,
    setVolume,
    setPlaybackMode,
    setShuffle,
    stopAudio,
  } = useAudioStore()

  const { pause: pauseSpotify, resume: resumeSpotify, togglePlay: toggleSpotify } = useSpotifyPlayer()
  const { pause: pauseAmbient, resume: resumeAmbient, skipNext, skipPrevious, currentTrack, currentTrackIndex, totalTracks, isPlaylistMode } = useAmbientSound()

  // Determine current playback mode for display
  const getCurrentPlaybackMode = (): PlaybackModeType => {
    if (shuffle) return 'shuffle'
    if (playbackMode === 'loop') return 'loop'
    return 'playlist'
  }

  // Cycle through modes: loop -> playlist -> shuffle -> loop
  const cyclePlaybackMode = () => {
    const current = getCurrentPlaybackMode()
    if (current === 'loop') {
      // loop -> playlist
      setPlaybackMode('playlist')
      setShuffle(false)
    } else if (current === 'playlist') {
      // playlist -> shuffle
      setPlaybackMode('playlist')
      setShuffle(true)
    } else {
      // shuffle -> loop
      setPlaybackMode('loop')
      setShuffle(false)
    }
  }

  // Get icon and color for current mode
  const getPlaybackModeIcon = () => {
    const mode = getCurrentPlaybackMode()
    switch (mode) {
      case 'loop':
        return { icon: Repeat1, active: true, label: 'Loop single' }
      case 'playlist':
        return { icon: Repeat, active: false, label: 'Play all' }
      case 'shuffle':
        return { icon: Shuffle, active: true, label: 'Shuffle' }
    }
  }

  // Handle play/pause toggle
  const handleTogglePlay = async () => {
    if (currentAudioType === 'spotify') {
      await toggleSpotify()
    } else if (currentAudioType === 'ambient' || currentAudioType === 'custom') {
      if (isPlaying) {
        pauseAmbient()
        setPlaying(false)
      } else {
        // Just set the store state - useEffect in useAmbientSound will handle playback
        setPlaying(true)
      }
    }
  }

  // Handle stop
  const handleStop = async () => {
    if (currentAudioType === 'spotify') {
      await pauseSpotify()
    } else if (currentAudioType === 'ambient' || currentAudioType === 'custom') {
      pauseAmbient()
    }
    stopAudio()
  }

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
  }

  // Sync play state when audio type changes
  useEffect(() => {
    if (currentAudioType === 'none') {
      pauseSpotify()
      pauseAmbient()
    }
  }, [currentAudioType, pauseSpotify, pauseAmbient])

  // Don't render if no audio is active
  if (currentAudioType === 'none') {
    return null
  }

  // Get current audio info
  const getAudioInfo = () => {
    if (currentAudioType === 'spotify' && currentSpotifyPlaylist) {
      return {
        icon: '♫',
        iconColor: 'text-[#1DB954]',
        name: currentSpotifyPlaylist.name,
        subtitle: `${currentSpotifyPlaylist.tracks.total} tracks`,
      }
    }
    if (currentAudioType === 'custom' && currentCustomPlaylist) {
      return {
        icon: '🎵',
        name: currentCustomPlaylist.name,
        subtitle: currentTrack?.name || `${currentCustomPlaylist.tracks.length} tracks`,
      }
    }
    if (currentAudioType === 'ambient' && currentAmbientSound) {
      return {
        icon: currentAmbientSound.includes('rain') ? '🌧️' : currentAmbientSound.includes('noise') ? '🔊' : '🎵',
        name: currentTrack?.name || 'Ambient',
        subtitle: 'Background audio',
      }
    }
    return { icon: '🔊', name: 'Audio', subtitle: '' }
  }

  const audioInfo = getAudioInfo()
  const modeInfo = getPlaybackModeIcon()
  const ModeIcon = modeInfo.icon

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800/80 backdrop-blur-sm rounded-lg">
        {/* Playback mode toggle */}
        <button
          onClick={cyclePlaybackMode}
          className={`w-7 h-7 flex items-center justify-center transition-colors ${
            modeInfo.active ? 'text-[var(--accent-color)]' : 'text-zinc-400 hover:text-white'
          }`}
          title={modeInfo.label}
        >
          <ModeIcon className="w-4 h-4" />
        </button>

        {/* Previous track */}
        <button
          onClick={skipPrevious}
          className={`w-7 h-7 flex items-center justify-center transition-colors ${
            totalTracks > 1 && currentTrackIndex > 1
              ? 'text-zinc-400 hover:text-white'
              : 'text-zinc-600 cursor-not-allowed'
          }`}
          disabled={totalTracks <= 1 || currentTrackIndex <= 1}
        >
          <SkipBack className="w-4 h-4" />
        </button>

        {/* Play/Pause */}
        <button
          onClick={handleTogglePlay}
          className="w-8 h-8 flex items-center justify-center text-white hover:text-zinc-300 transition-colors"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>

        {/* Next track */}
        <button
          onClick={skipNext}
          className={`w-7 h-7 flex items-center justify-center transition-colors ${
            totalTracks > 1
              ? 'text-zinc-400 hover:text-white'
              : 'text-zinc-600 cursor-not-allowed'
          }`}
          disabled={totalTracks <= 1}
        >
          <SkipForward className="w-4 h-4" />
        </button>

        {/* Track info */}
        <div className="text-xs text-zinc-300 truncate max-w-[80px] mx-1">
          <span className="flex items-center gap-1">
            <span className={audioInfo.iconColor}>{audioInfo.icon}</span>
            {audioInfo.name}
          </span>
        </div>

        {/* Close button */}
        <button
          onClick={handleStop}
          className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-80 bg-zinc-900/95 backdrop-blur-sm rounded-xl shadow-xl border border-zinc-800 p-4">
      {/* Current playing info */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded bg-zinc-800 flex items-center justify-center text-2xl">
          {audioInfo.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{audioInfo.name}</p>
          <p className="text-xs text-zinc-400">{audioInfo.subtitle}</p>
        </div>
      </div>

      {/* Track progress for playlist mode */}
      {(currentAudioType === 'custom' || currentAudioType === 'ambient') && totalTracks > 1 && (
        <div className="flex items-center justify-center gap-2 mb-3 text-xs text-zinc-400">
          <span>{currentTrackIndex}</span>
          <span>/</span>
          <span>{totalTracks}</span>
        </div>
      )}

      {/* Main controls */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {/* Playback mode toggle */}
        <button
          onClick={cyclePlaybackMode}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
            modeInfo.active
              ? 'bg-[var(--accent-color)]/20 text-[var(--accent-color)]'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
          title={modeInfo.label}
        >
          <ModeIcon className="w-5 h-5" />
        </button>

        {/* Previous track */}
        <button
          onClick={skipPrevious}
          className={`w-10 h-10 flex items-center justify-center transition-colors ${
            totalTracks > 1 && currentTrackIndex > 1
              ? 'text-zinc-400 hover:text-white'
              : 'text-zinc-600 cursor-not-allowed'
          }`}
          disabled={totalTracks <= 1 || currentTrackIndex <= 1}
        >
          <SkipBack className="w-5 h-5" />
        </button>

        {/* Play/Pause */}
        <button
          onClick={handleTogglePlay}
          className="w-12 h-12 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform"
        >
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
        </button>

        {/* Next track */}
        <button
          onClick={skipNext}
          className={`w-10 h-10 flex items-center justify-center transition-colors ${
            totalTracks > 1
              ? 'text-zinc-400 hover:text-white'
              : 'text-zinc-600 cursor-not-allowed'
          }`}
          disabled={totalTracks <= 1}
        >
          <SkipForward className="w-5 h-5" />
        </button>

        {/* Close button */}
        <button
          onClick={handleStop}
          className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          title="Stop audio"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Volume slider */}
      <div className="flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-zinc-400" />
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          className="flex-1 h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
        />
      </div>
    </div>
  )
}
