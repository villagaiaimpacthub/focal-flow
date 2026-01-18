'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, Square, Check, Trash2, Music } from 'lucide-react'
import { useAudioStore } from '@/store/audio'
import {
  getAllTracks,
  type SoundTrack,
  type AudioSelection,
  type CustomPlaylist
} from '@/types/spotify'

interface PreReadModalProps {
  isOpen: boolean
  onClose: () => void
  onStart: (selection: AudioSelection) => void
  documentTitle: string
}

type Tab = 'none' | 'browse' | 'playlists'

export function PreReadModal({
  isOpen,
  onClose,
  onStart,
  documentTitle,
}: PreReadModalProps) {
  const {
    lastAudioSelection,
    setLastAudioSelection,
    savedPlaylists,
    savePlaylist,
    deletePlaylist,
    crossfadeDuration,
    setCrossfadeDuration
  } = useAudioStore()

  const [activeTab, setActiveTab] = useState<Tab>('browse')
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set())
  const [previewingTrack, setPreviewingTrack] = useState<string | null>(null)
  const [playlistName, setPlaylistName] = useState('')
  const [showNameInput, setShowNameInput] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const allTracks = getAllTracks()
  const ambientTracks = allTracks.filter(t => t.category === 'ambient')
  const musicTracks = allTracks.filter(t => t.category === 'music')

  const stopPreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current.src = ''
      audioRef.current = null
    }
    setPreviewingTrack(null)
  }, [])

  // Clean up audio on close
  useEffect(() => {
    if (!isOpen) {
      stopPreview()
      setSelectedTracks(new Set())
      setShowNameInput(false)
      setPlaylistName('')
    }
  }, [isOpen, stopPreview])

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
        audioRef.current = null
      }
    }
  }, [])

  const togglePreview = useCallback((track: SoundTrack) => {
    if (previewingTrack === track.id) {
      stopPreview()
    } else {
      stopPreview()
      if (!audioRef.current) {
        audioRef.current = new Audio()
      }
      audioRef.current.src = track.path
      audioRef.current.volume = 0.5
      audioRef.current.play()
      setPreviewingTrack(track.id)
    }
  }, [previewingTrack, stopPreview])

  const toggleTrackSelection = (trackId: string) => {
    setSelectedTracks(prev => {
      const next = new Set(prev)
      if (next.has(trackId)) {
        next.delete(trackId)
      } else {
        next.add(trackId)
      }
      return next
    })
  }

  const selectAllInCategory = (category: 'ambient' | 'music') => {
    const tracks = category === 'ambient' ? ambientTracks : musicTracks
    setSelectedTracks(prev => {
      const next = new Set(prev)
      tracks.forEach(t => next.add(t.id))
      return next
    })
  }

  const deselectAllInCategory = (category: 'ambient' | 'music') => {
    const tracks = category === 'ambient' ? ambientTracks : musicTracks
    setSelectedTracks(prev => {
      const next = new Set(prev)
      tracks.forEach(t => next.delete(t.id))
      return next
    })
  }

  const handleCreatePlaylist = () => {
    if (selectedTracks.size === 0) return

    if (!showNameInput) {
      setShowNameInput(true)
      setPlaylistName(`My Playlist ${savedPlaylists.length + 1}`)
      return
    }

    const tracks = allTracks.filter(t => selectedTracks.has(t.id))
    const playlist: CustomPlaylist = {
      id: `playlist-${Date.now()}`,
      name: playlistName || `My Playlist ${savedPlaylists.length + 1}`,
      tracks,
      createdAt: Date.now(),
    }

    savePlaylist(playlist)
    setSelectedTracks(new Set())
    setShowNameInput(false)
    setPlaylistName('')
    setActiveTab('playlists')
  }

  const handleStartWithPlaylist = (playlist: CustomPlaylist) => {
    stopPreview()
    const selection: AudioSelection = {
      type: 'custom',
      customPlaylist: playlist
    }
    setLastAudioSelection(selection)
    onStart(selection)
  }

  const handleStartWithSelection = () => {
    stopPreview()

    if (activeTab === 'none') {
      const selection: AudioSelection = { type: 'none' }
      setLastAudioSelection(selection)
      onStart(selection)
      return
    }

    if (selectedTracks.size === 0) {
      // No tracks selected, start with no audio
      const selection: AudioSelection = { type: 'none' }
      setLastAudioSelection(selection)
      onStart(selection)
      return
    }

    // Create a temporary playlist from selected tracks
    const tracks = allTracks.filter(t => selectedTracks.has(t.id))
    const playlist: CustomPlaylist = {
      id: `temp-${Date.now()}`,
      name: 'Quick Play',
      tracks,
      createdAt: Date.now(),
    }

    const selection: AudioSelection = {
      type: 'custom',
      customPlaylist: playlist
    }
    setLastAudioSelection(selection)
    onStart(selection)
  }

  const handleDeletePlaylist = (playlistId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deletePlaylist(playlistId)
  }

  if (!isOpen) return null

  const TrackRow = ({ track }: { track: SoundTrack }) => {
    const isSelected = selectedTracks.has(track.id)
    const isPreviewing = previewingTrack === track.id

    return (
      <div
        className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
          isSelected ? 'bg-zinc-700/50' : 'hover:bg-zinc-800/50'
        }`}
      >
        {/* Checkbox */}
        <button
          onClick={() => toggleTrackSelection(track.id)}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            isSelected
              ? 'bg-[var(--accent-color)] border-[var(--accent-color)]'
              : 'border-zinc-500 hover:border-zinc-400'
          }`}
        >
          {isSelected && <Check className="w-3 h-3 text-white" />}
        </button>

        {/* Preview button */}
        <button
          onClick={() => togglePreview(track)}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            isPreviewing
              ? 'bg-[var(--accent-color)] text-white'
              : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
          }`}
        >
          {isPreviewing ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </button>

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate">{track.name}</p>
          <p className="text-xs text-zinc-500 capitalize">{track.category}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-xl w-full max-w-lg overflow-hidden shadow-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex-shrink-0">
          <h2 className="text-lg font-medium text-white">Ready to read?</h2>
          <p className="text-sm text-zinc-400 mt-1 truncate">{documentTitle}</p>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-zinc-800 flex-shrink-0">
          <button
            onClick={() => { setActiveTab('none'); stopPreview(); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'none'
                ? 'text-white border-b-2 border-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            No Audio
          </button>
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'browse'
                ? 'text-white border-b-2 border-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Browse Tracks
          </button>
          <button
            onClick={() => { setActiveTab('playlists'); stopPreview(); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'playlists'
                ? 'text-white border-b-2 border-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Playlists {savedPlaylists.length > 0 && `(${savedPlaylists.length})`}
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {activeTab === 'none' && (
            <div className="flex flex-col items-center justify-center h-48 text-center p-4">
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                <Square className="w-8 h-8 text-zinc-400" />
              </div>
              <p className="text-zinc-300">Read in silence</p>
              <p className="text-sm text-zinc-500 mt-1">Focus without background audio</p>
            </div>
          )}

          {activeTab === 'browse' && (
            <div className="p-4 space-y-4">
              {/* Selection info bar */}
              {selectedTracks.size > 0 && (
                <div className="flex items-center justify-between p-2 bg-zinc-800 rounded-lg">
                  <span className="text-sm text-white">
                    {selectedTracks.size} track{selectedTracks.size !== 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={() => setSelectedTracks(new Set())}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    Clear all
                  </button>
                </div>
              )}

              {/* Ambient sounds section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-zinc-300">Ambient Sounds</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => selectAllInCategory('ambient')}
                      className="text-xs text-zinc-500 hover:text-white"
                    >
                      Select all
                    </button>
                    <span className="text-zinc-600">|</span>
                    <button
                      onClick={() => deselectAllInCategory('ambient')}
                      className="text-xs text-zinc-500 hover:text-white"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  {ambientTracks.map(track => (
                    <TrackRow key={track.id} track={track} />
                  ))}
                </div>
              </div>

              {/* Music section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-zinc-300">Music</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => selectAllInCategory('music')}
                      className="text-xs text-zinc-500 hover:text-white"
                    >
                      Select all
                    </button>
                    <span className="text-zinc-600">|</span>
                    <button
                      onClick={() => deselectAllInCategory('music')}
                      className="text-xs text-zinc-500 hover:text-white"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  {musicTracks.map(track => (
                    <TrackRow key={track.id} track={track} />
                  ))}
                </div>
              </div>

              {/* Create playlist button */}
              {selectedTracks.size > 0 && (
                <div className="pt-2 border-t border-zinc-800">
                  {showNameInput ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={playlistName}
                        onChange={(e) => setPlaylistName(e.target.value)}
                        placeholder="Playlist name..."
                        className="flex-1 px-3 py-2 bg-zinc-800 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreatePlaylist()
                          if (e.key === 'Escape') setShowNameInput(false)
                        }}
                      />
                      <button
                        onClick={handleCreatePlaylist}
                        className="px-4 py-2 bg-[var(--accent-color)] text-white text-sm font-medium rounded-lg hover:brightness-110"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleCreatePlaylist}
                      className="w-full py-2.5 text-sm font-medium text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Music className="w-4 h-4" />
                      Save as Playlist
                    </button>
                  )}
                </div>
              )}

              {/* Crossfade setting */}
              {selectedTracks.size > 1 && (
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-white">Crossfade</p>
                    <span className="text-sm text-zinc-400">{crossfadeDuration}s</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={crossfadeDuration}
                    onChange={(e) => setCrossfadeDuration(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'playlists' && (
            <div className="p-4">
              {savedPlaylists.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                    <Music className="w-8 h-8 text-zinc-400" />
                  </div>
                  <p className="text-zinc-300">No saved playlists</p>
                  <p className="text-sm text-zinc-500 mt-1">
                    Browse tracks and save your favorites
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedPlaylists.map(playlist => (
                    <button
                      key={playlist.id}
                      onClick={() => handleStartWithPlaylist(playlist)}
                      className="w-full p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-left group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{playlist.name}</p>
                          <p className="text-xs text-zinc-400">
                            {playlist.tracks.length} track{playlist.tracks.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleDeletePlaylist(playlist.id, e)}
                            className="p-2 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="w-10 h-10 rounded-full bg-[var(--accent-color)] flex items-center justify-center">
                            <Play className="w-5 h-5 text-white ml-0.5" />
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex gap-3 flex-shrink-0">
          <button
            onClick={() => { stopPreview(); onClose(); }}
            className="flex-1 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleStartWithSelection}
            className="flex-1 py-2.5 text-sm font-medium text-white bg-[var(--accent-color)] hover:brightness-110 rounded-lg transition-all"
          >
            {activeTab === 'none'
              ? 'Start Reading'
              : selectedTracks.size > 0
                ? `Play ${selectedTracks.size} Track${selectedTracks.size !== 1 ? 's' : ''}`
                : 'Start Reading'}
          </button>
        </div>
      </div>
    </div>
  )
}
