'use client'

export function SpotifyConnect() {
  // Spotify integration is coming soon - app registration is temporarily paused
  const isComingSoon = true

  if (isComingSoon) {
    return (
      <div className="bg-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-zinc-500"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white">Spotify Integration</p>
              <p className="text-xs text-zinc-400">
                Play your playlists while reading
              </p>
            </div>
          </div>
          <span className="px-3 py-1.5 bg-zinc-700 text-zinc-400 text-xs font-medium rounded-full">
            Coming Soon
          </span>
        </div>
        <div className="mt-3 p-3 bg-zinc-700/50 rounded-lg">
          <p className="text-xs text-zinc-400">
            Spotify integration is temporarily unavailable while we complete our app registration.
            In the meantime, enjoy our built-in ambient sounds for focused reading.
          </p>
        </div>
      </div>
    )
  }

  // Original connected/disconnected states will be used when Spotify is available
  return null
}
