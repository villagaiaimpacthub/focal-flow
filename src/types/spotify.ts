// Spotify Web Playback SDK Types

export interface SpotifyPlayer {
  connect(): Promise<boolean>
  disconnect(): void
  addListener(event: string, callback: (data: unknown) => void): boolean
  removeListener(event: string, callback?: (data: unknown) => void): boolean
  getCurrentState(): Promise<SpotifyPlaybackState | null>
  setName(name: string): Promise<void>
  getVolume(): Promise<number>
  setVolume(volume: number): Promise<void>
  pause(): Promise<void>
  resume(): Promise<void>
  togglePlay(): Promise<void>
  seek(position_ms: number): Promise<void>
  previousTrack(): Promise<void>
  nextTrack(): Promise<void>
  activateElement(): Promise<void>
}

export interface SpotifyPlaybackState {
  context: {
    uri: string | null
    metadata: Record<string, unknown> | null
  }
  disallows: {
    pausing?: boolean
    peeking_next?: boolean
    peeking_prev?: boolean
    resuming?: boolean
    seeking?: boolean
    skipping_next?: boolean
    skipping_prev?: boolean
  }
  paused: boolean
  position: number
  repeat_mode: 0 | 1 | 2
  shuffle: boolean
  track_window: {
    current_track: SpotifyTrack
    previous_tracks: SpotifyTrack[]
    next_tracks: SpotifyTrack[]
  }
}

export interface SpotifyTrack {
  id: string
  uri: string
  type: string
  media_type: string
  name: string
  is_playable: boolean
  album: {
    uri: string
    name: string
    images: SpotifyImage[]
  }
  artists: {
    uri: string
    name: string
  }[]
  duration_ms: number
}

export interface SpotifyImage {
  url: string
  height?: number
  width?: number
}

export interface SpotifyPlaylistItem {
  id: string
  name: string
  description: string | null
  images: SpotifyImage[]
  tracks: {
    total: number
  }
  uri: string
  owner: {
    display_name: string
  }
}

export interface SpotifyPlaylistsResponse {
  items: SpotifyPlaylistItem[]
  total: number
  limit: number
  offset: number
  next: string | null
  previous: string | null
}

export interface SpotifyDeviceReadyEvent {
  device_id: string
}

export interface SpotifyErrorEvent {
  message: string
}

// Sound types - matching actual files in public/sounds/
export type AmbientSoundType =
  | 'rain'
  | 'rain2'
  | 'deep-noise'
  | 'deep-noise2'
  | 'chill-lofi'
  | 'guitar'

// Sound category for UI grouping
export type SoundCategory = 'ambient' | 'music'

// Playback mode
export type PlaybackMode = 'loop' | 'playlist'

export interface SoundTrack {
  id: string
  name: string
  path: string
  category: SoundCategory
}

export interface SoundCollection {
  id: AmbientSoundType
  name: string
  icon: string
  category: SoundCategory
  tracks: SoundTrack[]
  defaultMode: PlaybackMode // Whether to loop single track or play through playlist
}

// All available sound files
export const SOUND_TRACKS: Record<string, SoundTrack> = {
  'rain': { id: 'rain', name: 'Rain', path: '/sounds/rain.mp3', category: 'ambient' },
  'rain2': { id: 'rain2', name: 'Rain 2', path: '/sounds/rain2.mp3', category: 'ambient' },
  'deep-noise': { id: 'deep-noise', name: 'Deep Noise', path: '/sounds/deep-noise.mp3', category: 'ambient' },
  'deep-noise2': { id: 'deep-noise2', name: 'Deep Noise 2', path: '/sounds/deep-noise2.mp3', category: 'ambient' },
  'chill-lofi-1': { id: 'chill-lofi-1', name: 'Chill Lo-fi 1', path: '/sounds/chill-lofi.mp3', category: 'music' },
  'chill-lofi-2': { id: 'chill-lofi-2', name: 'Chill Lo-fi 2', path: '/sounds/chill-lofi2.mp3', category: 'music' },
  'chill-lofi-3': { id: 'chill-lofi-3', name: 'Chill Lo-fi 3', path: '/sounds/chill-lofi3.mp3', category: 'music' },
  'chill-lofi-4': { id: 'chill-lofi-4', name: 'Chill Lo-fi 4', path: '/sounds/chill-lofi4.mp3', category: 'music' },
  'chill-lofi-5': { id: 'chill-lofi-5', name: 'Chill Lo-fi 5', path: '/sounds/chill-lofi5.mp3', category: 'music' },
  'chill-lofi-6': { id: 'chill-lofi-6', name: 'Chill Lo-fi 6', path: '/sounds/chill-lofi6.mp3', category: 'music' },
  'chill-lofi-7': { id: 'chill-lofi-7', name: 'Chill Lo-fi 7', path: '/sounds/chill-lofi7.mp3', category: 'music' },
  'guitar': { id: 'guitar', name: 'Guitar', path: '/sounds/guitar.mp3', category: 'music' },
}

// Sound collections for the UI
export const SOUND_COLLECTIONS: SoundCollection[] = [
  {
    id: 'rain',
    name: 'Rain',
    icon: '🌧️',
    category: 'ambient',
    tracks: [SOUND_TRACKS['rain'], SOUND_TRACKS['rain2']],
    defaultMode: 'loop',
  },
  {
    id: 'deep-noise',
    name: 'Deep Noise',
    icon: '🔊',
    category: 'ambient',
    tracks: [SOUND_TRACKS['deep-noise'], SOUND_TRACKS['deep-noise2']],
    defaultMode: 'loop',
  },
  {
    id: 'chill-lofi',
    name: 'Chill Lo-fi',
    icon: '🎵',
    category: 'music',
    tracks: [
      SOUND_TRACKS['chill-lofi-1'],
      SOUND_TRACKS['chill-lofi-2'],
      SOUND_TRACKS['chill-lofi-3'],
      SOUND_TRACKS['chill-lofi-4'],
      SOUND_TRACKS['chill-lofi-5'],
      SOUND_TRACKS['chill-lofi-6'],
      SOUND_TRACKS['chill-lofi-7'],
    ],
    defaultMode: 'playlist',
  },
  {
    id: 'guitar',
    name: 'Guitar',
    icon: '🎸',
    category: 'music',
    tracks: [SOUND_TRACKS['guitar']],
    defaultMode: 'loop',
  },
]

// Helper to get collection by ID
export function getSoundCollection(id: AmbientSoundType): SoundCollection | undefined {
  return SOUND_COLLECTIONS.find(c => c.id === id)
}

// Custom playlist created by user from selected tracks
export interface CustomPlaylist {
  id: string
  name: string
  tracks: SoundTrack[]
  createdAt: number
}

// Audio selection for pre-read modal
export type AudioSelectionType = 'none' | 'ambient' | 'spotify' | 'custom'

export interface AudioSelection {
  type: AudioSelectionType
  ambientSound?: AmbientSoundType
  customPlaylist?: CustomPlaylist
  spotifyPlaylistUri?: string
  spotifyPlaylistName?: string
}

// Get all tracks as a flat array for the track browser
export function getAllTracks(): SoundTrack[] {
  return Object.values(SOUND_TRACKS)
}

// Get tracks by category
export function getTracksByCategory(category: SoundCategory): SoundTrack[] {
  return Object.values(SOUND_TRACKS).filter(t => t.category === category)
}

// Extend window for Spotify SDK
declare global {
  interface Window {
    Spotify?: {
      Player: new (options: SpotifyPlayerOptions) => SpotifyPlayer
    }
    onSpotifyWebPlaybackSDKReady?: () => void
  }
}

export interface SpotifyPlayerOptions {
  name: string
  getOAuthToken: (callback: (token: string) => void) => void
  volume?: number
}
