'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useAudioStore } from '@/store/audio'
import type { SpotifyPlayer, SpotifyDeviceReadyEvent, SpotifyErrorEvent } from '@/types/spotify'

const SPOTIFY_SDK_URL = 'https://sdk.scdn.co/spotify-player.js'

export function useSpotifyPlayer() {
  const playerRef = useRef<SpotifyPlayer | null>(null)
  const isInitializedRef = useRef(false)

  const {
    isSpotifyConnected,
    spotifyProduct,
    volume,
    isSpotifyReady,
    spotifyDeviceId,
    currentSpotifyPlaylist,
    isPlaying,
    currentAudioType,
    setSpotifyDeviceId,
    setSpotifyReady,
    setSpotifyPlayerLoading,
    setPlaying,
  } = useAudioStore()

  // Fetch fresh access token
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/spotify/token')
      if (!response.ok) return null
      const data = await response.json()
      return data.access_token
    } catch (error) {
      console.error('Failed to get Spotify access token:', error)
      return null
    }
  }, [])

  // Load Spotify SDK script
  const loadSpotifySDK = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      // Check if SDK is already loaded
      if (window.Spotify) {
        resolve()
        return
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector(`script[src="${SPOTIFY_SDK_URL}"]`)
      if (existingScript) {
        // Wait for existing script to load
        window.onSpotifyWebPlaybackSDKReady = () => resolve()
        return
      }

      // Load the SDK
      const script = document.createElement('script')
      script.src = SPOTIFY_SDK_URL
      script.async = true
      script.onload = () => {
        // SDK sets window.onSpotifyWebPlaybackSDKReady
      }
      script.onerror = () => reject(new Error('Failed to load Spotify SDK'))

      window.onSpotifyWebPlaybackSDKReady = () => resolve()

      document.body.appendChild(script)
    })
  }, [])

  // Initialize player
  const initializePlayer = useCallback(async () => {
    if (isInitializedRef.current || !isSpotifyConnected || spotifyProduct !== 'premium') {
      return
    }

    setSpotifyPlayerLoading(true)

    try {
      await loadSpotifySDK()

      if (!window.Spotify) {
        console.error('Spotify SDK not available')
        setSpotifyPlayerLoading(false)
        return
      }

      const player = new window.Spotify.Player({
        name: 'FocalFlow Reader',
        getOAuthToken: async (cb) => {
          const token = await getAccessToken()
          if (token) cb(token)
        },
        volume: volume,
      })

      // Error handling
      player.addListener('initialization_error', (data) => {
        const { message } = data as SpotifyErrorEvent
        console.error('Spotify initialization error:', message)
        setSpotifyReady(false)
        setSpotifyPlayerLoading(false)
      })

      player.addListener('authentication_error', (data) => {
        const { message } = data as SpotifyErrorEvent
        console.error('Spotify authentication error:', message)
        setSpotifyReady(false)
        setSpotifyPlayerLoading(false)
      })

      player.addListener('account_error', (data) => {
        const { message } = data as SpotifyErrorEvent
        console.error('Spotify account error (likely non-Premium):', message)
        setSpotifyReady(false)
        setSpotifyPlayerLoading(false)
      })

      player.addListener('playback_error', (data) => {
        const { message } = data as SpotifyErrorEvent
        console.error('Spotify playback error:', message)
      })

      // Ready event
      player.addListener('ready', (data) => {
        const { device_id } = data as SpotifyDeviceReadyEvent
        console.log('Spotify player ready with device ID:', device_id)
        setSpotifyDeviceId(device_id)
        setSpotifyReady(true)
        setSpotifyPlayerLoading(false)
      })

      // Not ready event
      player.addListener('not_ready', (data) => {
        const { device_id } = data as SpotifyDeviceReadyEvent
        console.log('Spotify device went offline:', device_id)
        setSpotifyReady(false)
      })

      // State change listener
      player.addListener('player_state_changed', (state: unknown) => {
        if (!state) return
        // Update playing state based on Spotify's state
        const spotifyState = state as { paused: boolean }
        if (currentAudioType === 'spotify') {
          setPlaying(!spotifyState.paused)
        }
      })

      const connected = await player.connect()
      if (connected) {
        playerRef.current = player
        isInitializedRef.current = true
      } else {
        console.error('Failed to connect Spotify player')
        setSpotifyPlayerLoading(false)
      }
    } catch (error) {
      console.error('Failed to initialize Spotify player:', error)
      setSpotifyPlayerLoading(false)
    }
  }, [
    isSpotifyConnected,
    spotifyProduct,
    volume,
    currentAudioType,
    loadSpotifySDK,
    getAccessToken,
    setSpotifyDeviceId,
    setSpotifyReady,
    setSpotifyPlayerLoading,
    setPlaying,
  ])

  // Play a playlist
  const playPlaylist = useCallback(
    async (playlistUri: string) => {
      if (!spotifyDeviceId) {
        console.error('No Spotify device ID available')
        return false
      }

      try {
        const response = await fetch('/api/spotify/play', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device_id: spotifyDeviceId,
            context_uri: playlistUri,
          }),
        })

        return response.ok
      } catch (error) {
        console.error('Failed to play playlist:', error)
        return false
      }
    },
    [spotifyDeviceId]
  )

  // Pause playback
  const pause = useCallback(async () => {
    if (playerRef.current) {
      await playerRef.current.pause()
    }
  }, [])

  // Resume playback
  const resume = useCallback(async () => {
    if (playerRef.current) {
      await playerRef.current.resume()
    }
  }, [])

  // Toggle playback
  const togglePlay = useCallback(async () => {
    if (playerRef.current) {
      await playerRef.current.togglePlay()
    }
  }, [])

  // Set volume
  const setPlayerVolume = useCallback(async (newVolume: number) => {
    if (playerRef.current) {
      await playerRef.current.setVolume(newVolume)
    }
  }, [])

  // Disconnect player
  const disconnectPlayer = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.disconnect()
      playerRef.current = null
      isInitializedRef.current = false
      setSpotifyReady(false)
      setSpotifyDeviceId(null)
    }
  }, [setSpotifyReady, setSpotifyDeviceId])

  // Initialize when connected and premium
  useEffect(() => {
    if (isSpotifyConnected && spotifyProduct === 'premium' && !isInitializedRef.current) {
      initializePlayer()
    }
  }, [isSpotifyConnected, spotifyProduct, initializePlayer])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectPlayer()
    }
  }, [disconnectPlayer])

  // Sync volume changes
  useEffect(() => {
    if (playerRef.current && isSpotifyReady) {
      playerRef.current.setVolume(volume)
    }
  }, [volume, isSpotifyReady])

  // Play selected playlist when it changes
  useEffect(() => {
    if (currentSpotifyPlaylist && isSpotifyReady && isPlaying && currentAudioType === 'spotify') {
      playPlaylist(currentSpotifyPlaylist.uri)
    }
  }, [currentSpotifyPlaylist, isSpotifyReady, isPlaying, currentAudioType, playPlaylist])

  return {
    isReady: isSpotifyReady,
    deviceId: spotifyDeviceId,
    getPlayer: () => playerRef.current,
    playPlaylist,
    pause,
    resume,
    togglePlay,
    setVolume: setPlayerVolume,
    disconnect: disconnectPlayer,
    initializePlayer,
  }
}
