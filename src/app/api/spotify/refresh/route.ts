import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { SPOTIFY_TOKEN_URL } from '@/lib/spotify/pkce'
import type { Database, SpotifyConnection } from '@/types/database'

export async function POST() {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get current Spotify connection
  const { data: connectionData, error: fetchError } = await supabase
    .from('spotify_connections')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const connection = connectionData as SpotifyConnection | null

  if (fetchError || !connection) {
    return NextResponse.json({ error: 'No Spotify connection found' }, { status: 404 })
  }

  // Refresh the token
  const clientId = process.env.SPOTIFY_CLIENT_ID || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID

  try {
    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: connection.refresh_token,
        client_id: clientId!,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Spotify token refresh failed:', errorData)
      return NextResponse.json({ error: 'Token refresh failed' }, { status: 500 })
    }

    const tokens = await response.json()
    const { access_token, refresh_token, expires_in } = tokens

    // Calculate new expiration time
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString()

    // Update connection in database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('spotify_connections')
      .update({
        access_token,
        // Spotify may not return a new refresh token, keep old one if not provided
        refresh_token: refresh_token || connection.refresh_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Failed to update Spotify tokens:', updateError)
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
    }

    return NextResponse.json({
      access_token,
      expires_at: expiresAt,
    })
  } catch (err) {
    console.error('Spotify token refresh error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
