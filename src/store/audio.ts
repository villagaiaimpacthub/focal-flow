import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SpotifyPlaylistItem, AmbientSoundType, AudioSelection, PlaybackMode, CustomPlaylist, SoundTrack } from '@/types/spotify'

interface AudioState {
  // Spotify connection status
  isSpotifyConnected: boolean
  spotifyDisplayName: string | null
  spotifyProduct: 'premium' | 'free' | null

  // Cached playlists
  playlists: SpotifyPlaylistItem[]
  playlistsLoaded: boolean

  // Current playback state
  isPlaying: boolean
  currentAudioType: 'none' | 'ambient' | 'spotify' | 'custom'
  currentAmbientSound: AmbientSoundType | null
  currentCustomPlaylist: CustomPlaylist | null
  currentSpotifyPlaylist: SpotifyPlaylistItem | null
  volume: number

  // Saved custom playlists
  savedPlaylists: CustomPlaylist[]

  // Ambient sound playback mode and track state
  playbackMode: PlaybackMode
  currentTrackIndex: number
  shuffle: boolean
  crossfadeDuration: number // seconds to crossfade between tracks

  // Web Playback SDK state
  spotifyDeviceId: string | null
  isSpotifyReady: boolean
  isSpotifyPlayerLoading: boolean

  // Last audio selection (persisted for convenience)
  lastAudioSelection: AudioSelection | null

  // Actions
  setSpotifyConnection: (connected: boolean, displayName?: string | null, product?: 'premium' | 'free' | null) => void
  setPlaylists: (playlists: SpotifyPlaylistItem[]) => void
  setPlaylistsLoaded: (loaded: boolean) => void
  setPlaying: (playing: boolean) => void
  setCurrentAudioType: (type: 'none' | 'ambient' | 'spotify' | 'custom') => void
  setCurrentAmbientSound: (sound: AmbientSoundType | null) => void
  setCurrentCustomPlaylist: (playlist: CustomPlaylist | null) => void
  setCurrentSpotifyPlaylist: (playlist: SpotifyPlaylistItem | null) => void

  // Custom playlist management
  savePlaylist: (playlist: CustomPlaylist) => void
  deletePlaylist: (playlistId: string) => void
  startCustomPlaylist: (playlist: CustomPlaylist) => void
  setVolume: (volume: number) => void
  setPlaybackMode: (mode: PlaybackMode) => void
  setCurrentTrackIndex: (index: number) => void
  setShuffle: (shuffle: boolean) => void
  setCrossfadeDuration: (seconds: number) => void
  nextTrack: () => void
  previousTrack: () => void
  setSpotifyDeviceId: (deviceId: string | null) => void
  setSpotifyReady: (ready: boolean) => void
  setSpotifyPlayerLoading: (loading: boolean) => void
  setLastAudioSelection: (selection: AudioSelection | null) => void
  startAmbientSound: (sound: AmbientSoundType, mode?: PlaybackMode) => void
  startSpotifyPlaylist: (playlist: SpotifyPlaylistItem) => void
  stopAudio: () => void
  disconnect: () => void
}

export const useAudioStore = create<AudioState>()(
  persist(
    (set, get) => ({
      // Initial state
      isSpotifyConnected: false,
      spotifyDisplayName: null,
      spotifyProduct: null,
      playlists: [],
      playlistsLoaded: false,
      isPlaying: false,
      currentAudioType: 'none',
      currentAmbientSound: null,
      currentCustomPlaylist: null,
      currentSpotifyPlaylist: null,
      volume: 0.5,
      savedPlaylists: [],
      playbackMode: 'loop',
      currentTrackIndex: 0,
      shuffle: false,
      crossfadeDuration: 3,
      spotifyDeviceId: null,
      isSpotifyReady: false,
      isSpotifyPlayerLoading: false,
      lastAudioSelection: null,

      // Actions
      setSpotifyConnection: (connected, displayName = null, product = null) =>
        set({
          isSpotifyConnected: connected,
          spotifyDisplayName: displayName,
          spotifyProduct: product,
        }),

      setPlaylists: (playlists) => set({ playlists }),

      setPlaylistsLoaded: (loaded) => set({ playlistsLoaded: loaded }),

      setPlaying: (playing) => set({ isPlaying: playing }),

      setCurrentAudioType: (type) => set({ currentAudioType: type }),

      setCurrentAmbientSound: (sound) => set({ currentAmbientSound: sound }),

      setCurrentCustomPlaylist: (playlist) => set({ currentCustomPlaylist: playlist }),

      setCurrentSpotifyPlaylist: (playlist) => set({ currentSpotifyPlaylist: playlist }),

      savePlaylist: (playlist) => {
        const { savedPlaylists } = get()
        const existing = savedPlaylists.findIndex(p => p.id === playlist.id)
        if (existing >= 0) {
          // Update existing
          const updated = [...savedPlaylists]
          updated[existing] = playlist
          set({ savedPlaylists: updated })
        } else {
          // Add new
          set({ savedPlaylists: [...savedPlaylists, playlist] })
        }
      },

      deletePlaylist: (playlistId) => {
        const { savedPlaylists } = get()
        set({ savedPlaylists: savedPlaylists.filter(p => p.id !== playlistId) })
      },

      startCustomPlaylist: (playlist) =>
        set({
          currentAudioType: 'custom',
          currentCustomPlaylist: playlist,
          currentAmbientSound: null,
          currentSpotifyPlaylist: null,
          isPlaying: true,
          currentTrackIndex: 0,
          playbackMode: playlist.tracks.length > 1 ? 'playlist' : 'loop',
        }),

      setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),

      setPlaybackMode: (mode) => set({ playbackMode: mode }),

      setCurrentTrackIndex: (index) => set({ currentTrackIndex: index }),

      setShuffle: (shuffle) => set({ shuffle }),

      setCrossfadeDuration: (seconds) => set({ crossfadeDuration: Math.max(0, Math.min(10, seconds)) }),

      nextTrack: () => {
        const { currentTrackIndex } = get()
        set({ currentTrackIndex: currentTrackIndex + 1 })
      },

      previousTrack: () => {
        const { currentTrackIndex } = get()
        set({ currentTrackIndex: Math.max(0, currentTrackIndex - 1) })
      },

      setSpotifyDeviceId: (deviceId) => set({ spotifyDeviceId: deviceId }),

      setSpotifyReady: (ready) => set({ isSpotifyReady: ready }),

      setSpotifyPlayerLoading: (loading) => set({ isSpotifyPlayerLoading: loading }),

      setLastAudioSelection: (selection) => set({ lastAudioSelection: selection }),

      startAmbientSound: (sound, mode) =>
        set({
          currentAudioType: 'ambient',
          currentAmbientSound: sound,
          currentSpotifyPlaylist: null,
          isPlaying: true,
          currentTrackIndex: 0,
          playbackMode: mode ?? 'loop',
        }),

      startSpotifyPlaylist: (playlist) =>
        set({
          currentAudioType: 'spotify',
          currentSpotifyPlaylist: playlist,
          currentAmbientSound: null,
          isPlaying: true,
        }),

      stopAudio: () =>
        set({
          isPlaying: false,
          currentAudioType: 'none',
          currentAmbientSound: null,
          currentCustomPlaylist: null,
          currentSpotifyPlaylist: null,
          currentTrackIndex: 0,
        }),

      disconnect: () =>
        set({
          isSpotifyConnected: false,
          spotifyDisplayName: null,
          spotifyProduct: null,
          playlists: [],
          playlistsLoaded: false,
          isPlaying: false,
          currentAudioType: 'none',
          currentSpotifyPlaylist: null,
          spotifyDeviceId: null,
          isSpotifyReady: false,
        }),
    }),
    {
      name: 'focalflow-audio',
      partialize: (state) => ({
        volume: state.volume,
        lastAudioSelection: state.lastAudioSelection,
        playbackMode: state.playbackMode,
        shuffle: state.shuffle,
        crossfadeDuration: state.crossfadeDuration,
        savedPlaylists: state.savedPlaylists,
        // Persist current playback state for navigation
        currentAudioType: state.currentAudioType,
        currentCustomPlaylist: state.currentCustomPlaylist,
        currentAmbientSound: state.currentAmbientSound,
        isPlaying: state.isPlaying,
        currentTrackIndex: state.currentTrackIndex,
      }),
    }
  )
)
