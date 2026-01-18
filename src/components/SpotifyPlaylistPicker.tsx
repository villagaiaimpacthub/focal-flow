'use client'

import { useEffect } from 'react'
import { useAudioStore } from '@/store/audio'
import type { SpotifyPlaylistItem } from '@/types/spotify'

interface SpotifyPlaylistPickerProps {
  onSelect: (playlist: SpotifyPlaylistItem) => void
  selectedPlaylistId?: string
}

export function SpotifyPlaylistPicker({
  onSelect,
  selectedPlaylistId,
}: SpotifyPlaylistPickerProps) {
  const {
    playlists,
    playlistsLoaded,
    isSpotifyConnected,
    spotifyProduct,
    setPlaylists,
    setPlaylistsLoaded,
  } = useAudioStore()

  useEffect(() => {
    if (isSpotifyConnected && !playlistsLoaded) {
      loadPlaylists()
    }
  }, [isSpotifyConnected, playlistsLoaded])

  const loadPlaylists = async () => {
    try {
      const response = await fetch('/api/spotify/playlists?limit=50')
      if (response.ok) {
        const data = await response.json()
        setPlaylists(data.items || [])
        setPlaylistsLoaded(true)
      }
    } catch (error) {
      console.error('Failed to load playlists:', error)
    }
  }

  if (!isSpotifyConnected) {
    return (
      <div className="text-center py-8 text-zinc-400">
        <p>Connect Spotify in Settings to see your playlists</p>
      </div>
    )
  }

  if (spotifyProduct !== 'premium') {
    return (
      <div className="text-center py-8">
        <p className="text-yellow-400 mb-2">Spotify Premium Required</p>
        <p className="text-sm text-zinc-400">
          Upgrade to Spotify Premium to play music while reading
        </p>
      </div>
    )
  }

  if (!playlistsLoaded) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-6 w-6 border-2 border-zinc-500 border-t-white rounded-full" />
      </div>
    )
  }

  if (playlists.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-400">
        <p>No playlists found</p>
        <p className="text-sm mt-1">Create a playlist on Spotify to see it here</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {playlists.map((playlist) => (
        <button
          key={playlist.id}
          onClick={() => onSelect(playlist)}
          className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
            selectedPlaylistId === playlist.id
              ? 'bg-[#1DB954]/20 border border-[#1DB954]/50'
              : 'bg-zinc-800 hover:bg-zinc-700'
          }`}
        >
          {playlist.images[0] ? (
            <img
              src={playlist.images[0].url}
              alt={playlist.name}
              className="w-12 h-12 rounded object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded bg-zinc-700 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-zinc-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
            </div>
          )}
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium text-white truncate">{playlist.name}</p>
            <p className="text-xs text-zinc-400 truncate">
              {playlist.tracks.total} tracks • {playlist.owner.display_name}
            </p>
          </div>
          {selectedPlaylistId === playlist.id && (
            <svg
              className="w-5 h-5 text-[#1DB954] flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
      ))}
    </div>
  )
}
