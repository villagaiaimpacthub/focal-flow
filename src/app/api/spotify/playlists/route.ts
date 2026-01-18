import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = searchParams.get('limit') || '50'
  const offset = searchParams.get('offset') || '0'

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

  // Get valid access token
  const tokenResponse = await fetch(
    new URL('/api/spotify/token', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
    {
      headers: {
        Cookie: cookieStore.toString(),
      },
    }
  )

  if (!tokenResponse.ok) {
    const error = await tokenResponse.json()
    return NextResponse.json(error, { status: tokenResponse.status })
  }

  const { access_token } = await tokenResponse.json()

  // Fetch playlists from Spotify
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/me/playlists?limit=${limit}&offset=${offset}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Spotify playlists fetch failed:', errorData)
      return NextResponse.json({ error: 'Failed to fetch playlists' }, { status: response.status })
    }

    const playlists = await response.json()
    return NextResponse.json(playlists)
  } catch (err) {
    console.error('Spotify playlists error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
