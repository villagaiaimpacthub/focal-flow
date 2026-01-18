import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database, SpotifyConnection } from '@/types/database'

export async function GET() {
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

  // Check if token is expired or about to expire (within 5 minutes)
  const expiresAt = new Date(connection.expires_at)
  const now = new Date()
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

  if (expiresAt <= fiveMinutesFromNow) {
    // Token is expired or about to expire, refresh it
    const refreshResponse = await fetch(
      new URL('/api/spotify/refresh', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
      {
        method: 'POST',
        headers: {
          Cookie: cookieStore.toString(),
        },
      }
    )

    if (!refreshResponse.ok) {
      return NextResponse.json({ error: 'Token refresh failed' }, { status: 500 })
    }

    const { access_token, expires_at } = await refreshResponse.json()
    return NextResponse.json({
      access_token,
      expires_at,
      spotify_product: connection.spotify_product,
      spotify_display_name: connection.spotify_display_name,
    })
  }

  // Token is still valid
  return NextResponse.json({
    access_token: connection.access_token,
    expires_at: connection.expires_at,
    spotify_product: connection.spotify_product,
    spotify_display_name: connection.spotify_display_name,
  })
}
