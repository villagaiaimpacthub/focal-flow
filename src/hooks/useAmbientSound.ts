'use client'

import { useEffect, useRef, useCallback, useMemo } from 'react'
import { useAudioStore } from '@/store/audio'
import { getSoundCollection, type SoundTrack } from '@/types/spotify'

export function useAmbientSound() {
  // Single audio element - no crossfade to prevent doubling
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const shuffledIndicesRef = useRef<number[]>([])
  const playRequestIdRef = useRef(0)
  const isPlayingRef = useRef(false) // Mutex to prevent concurrent plays

  const {
    currentAudioType,
    currentAmbientSound,
    currentCustomPlaylist,
    isPlaying,
    volume,
    playbackMode,
    currentTrackIndex,
    shuffle,
    setPlaying,
    setCurrentTrackIndex,
    nextTrack,
  } = useAudioStore()

  // Get current tracks (from either ambient sound collection or custom playlist)
  const tracks = useMemo(() => {
    if (currentAudioType === 'custom' && currentCustomPlaylist) {
      return currentCustomPlaylist.tracks
    }
    if (currentAudioType === 'ambient' && currentAmbientSound) {
      const collection = getSoundCollection(currentAmbientSound)
      return collection?.tracks ?? []
    }
    return []
  }, [currentAudioType, currentAmbientSound, currentCustomPlaylist])

  // Get shuffled or sequential track order
  const getTrackOrder = useCallback((trackList: SoundTrack[]): number[] => {
    if (!shuffle) {
      return trackList.map((_, i) => i)
    }
    // Fisher-Yates shuffle
    const indices = trackList.map((_, i) => i)
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[indices[i], indices[j]] = [indices[j], indices[i]]
    }
    return indices
  }, [shuffle])

  // Initialize shuffle indices when tracks change
  useEffect(() => {
    if (tracks.length > 0) {
      shuffledIndicesRef.current = getTrackOrder(tracks)
    }
  }, [tracks, getTrackOrder])

  // Get current track based on mode and index
  const getCurrentTrack = useCallback((): SoundTrack | null => {
    if (tracks.length === 0) return null

    if (playbackMode === 'loop') {
      return tracks[0]
    }

    // Playlist mode
    if (shuffledIndicesRef.current.length !== tracks.length) {
      shuffledIndicesRef.current = getTrackOrder(tracks)
    }

    const actualIndex = shuffledIndicesRef.current[currentTrackIndex % tracks.length]
    return tracks[actualIndex]
  }, [tracks, playbackMode, currentTrackIndex, getTrackOrder])

  // Get or create audio element
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.preload = 'auto'
    }
    return audioRef.current
  }, [])

  // Stop all audio completely
  const stopAll = useCallback(() => {
    playRequestIdRef.current++
    isPlayingRef.current = false

    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.currentTime = 0
      audio.src = ''
    }
  }, [])

  // Play a specific track
  const playTrack = useCallback(
    async (track: SoundTrack, requestId: number) => {
      // Prevent concurrent plays
      if (isPlayingRef.current) {
        return false
      }

      // Check if this request is still valid
      if (requestId !== playRequestIdRef.current) {
        return false
      }

      isPlayingRef.current = true
      const audio = getAudio()

      try {
        // Stop any current playback first
        audio.pause()
        audio.currentTime = 0

        // Set up new track
        audio.loop = playbackMode === 'loop'
        audio.src = track.path
        audio.volume = volume

        // Check again before playing
        if (requestId !== playRequestIdRef.current) {
          isPlayingRef.current = false
          return false
        }

        await audio.play()
        return true
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Failed to play track:', error)
        }
        isPlayingRef.current = false
        return false
      }
    },
    [getAudio, volume, playbackMode]
  )

  // Pause without stopping
  const pause = useCallback(() => {
    playRequestIdRef.current++
    const audio = audioRef.current
    if (audio && !audio.paused) {
      audio.pause()
    }
    isPlayingRef.current = false
  }, [])

  // Resume playback
  const resume = useCallback(async () => {
    const audio = audioRef.current
    // Check if audio element exists, has a valid source (not empty), and is paused
    if (audio && audio.src && audio.src !== '' && audio.paused) {
      try {
        isPlayingRef.current = true
        await audio.play()
      } catch (error) {
        console.error('Failed to resume:', error)
        isPlayingRef.current = false
      }
    }
  }, [])

  // Skip to next track
  const skipNext = useCallback(() => {
    if (playbackMode === 'playlist' && tracks.length > 1) {
      const nextIndex = (currentTrackIndex + 1) % tracks.length

      // Reshuffle if we're looping back
      if (nextIndex === 0 && shuffle) {
        shuffledIndicesRef.current = getTrackOrder(tracks)
      }

      setCurrentTrackIndex(nextIndex)
    }
  }, [playbackMode, tracks, currentTrackIndex, shuffle, getTrackOrder, setCurrentTrackIndex])

  // Skip to previous track
  const skipPrevious = useCallback(() => {
    if (playbackMode === 'playlist' && tracks.length > 1 && currentTrackIndex > 0) {
      setCurrentTrackIndex(currentTrackIndex - 1)
    }
  }, [playbackMode, tracks.length, currentTrackIndex, setCurrentTrackIndex])

  // Handle track ended event
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleEnded = () => {
      if (currentAudioType !== 'ambient' && currentAudioType !== 'custom') return
      if (playbackMode === 'loop') return // Loop is handled by audio.loop = true

      if (tracks.length > 1) {
        const nextIndex = (currentTrackIndex + 1) % tracks.length

        // Reshuffle if we're looping back
        if (nextIndex === 0 && shuffle) {
          shuffledIndicesRef.current = getTrackOrder(tracks)
        }

        isPlayingRef.current = false // Allow next play
        setCurrentTrackIndex(nextIndex)
      }
    }

    audio.addEventListener('ended', handleEnded)
    return () => {
      audio.removeEventListener('ended', handleEnded)
    }
  }, [currentAudioType, playbackMode, tracks, currentTrackIndex, shuffle, getTrackOrder, setCurrentTrackIndex])

  // Main effect: Handle play/pause/track changes
  useEffect(() => {
    const isAudioActive = (currentAudioType === 'ambient' || currentAudioType === 'custom') && tracks.length > 0

    if (isAudioActive && isPlaying) {
      const track = getCurrentTrack()
      if (track) {
        const audio = audioRef.current
        const isCurrentTrack = audio?.src?.endsWith(track.path)

        if (isCurrentTrack && audio?.paused) {
          // Resume: same track, just paused - resume playback
          isPlayingRef.current = true
          audio.play().catch(err => {
            if (err.name !== 'AbortError') {
              console.error('Failed to resume:', err)
            }
            isPlayingRef.current = false
          })
        } else if (!isCurrentTrack) {
          // Fresh start: different track or no track loaded
          isPlayingRef.current = false // Reset mutex
          playRequestIdRef.current++
          playTrack(track, playRequestIdRef.current)
        }
        // else: already playing the current track, do nothing
      }
    } else if (!isAudioActive || !isPlaying) {
      // Pause instead of stop when just toggling off
      const audio = audioRef.current
      if (audio && !audio.paused) {
        audio.pause()
        isPlayingRef.current = false
      }
    }
  }, [currentAudioType, tracks.length, isPlaying, currentTrackIndex, getCurrentTrack, playTrack])

  // Handle volume changes
  useEffect(() => {
    const audio = audioRef.current
    if (audio && !audio.paused) {
      audio.volume = volume
    }
  }, [volume])

  // Handle playback mode changes
  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      audio.loop = playbackMode === 'loop'
    }
  }, [playbackMode])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      playRequestIdRef.current++
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
        audioRef.current = null
      }
    }
  }, [])

  // Get current track info for display
  const currentTrack = useMemo(() => {
    return getCurrentTrack()
  }, [getCurrentTrack])

  return {
    stop: stopAll,
    pause,
    resume,
    skipNext,
    skipPrevious,
    isPlaying: (currentAudioType === 'ambient' || currentAudioType === 'custom') && isPlaying,
    currentTrack,
    currentTrackIndex: playbackMode === 'playlist' ? currentTrackIndex + 1 : 1,
    totalTracks: tracks.length,
    isPlaylistMode: playbackMode === 'playlist',
  }
}
