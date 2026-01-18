// PKCE (Proof Key for Code Exchange) helpers for Spotify OAuth

/**
 * Generate a cryptographically random code verifier
 * The verifier is a high-entropy cryptographic random string using the
 * unreserved characters [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
 * with a minimum length of 43 characters and a maximum length of 128 characters.
 */
export function generateCodeVerifier(length = 64): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(values)
    .map((x) => possible[x % possible.length])
    .join('')
}

/**
 * Generate the code challenge from the verifier using SHA-256
 * The code_challenge is the Base64-URL-encoded SHA256 hash of the code verifier.
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)

  return base64UrlEncode(digest)
}

/**
 * Base64 URL encode an ArrayBuffer
 * RFC 4648 § 5 base64url encoding
 */
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let str = ''
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i])
  }
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// Spotify OAuth configuration
export const SPOTIFY_SCOPES = [
  'streaming',                   // Required for Web Playback SDK
  'user-read-playback-state',    // Read player state and devices
  'user-modify-playback-state',  // Control playback (play, pause, skip)
  'user-read-private',           // Check if account is Premium
  'playlist-read-private',       // Access user's playlists
  'playlist-read-collaborative', // Include collaborative playlists
].join(' ')

export const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize'
export const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'
