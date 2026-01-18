import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export async function PUT(request: NextRequest) {
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

  // Parse request body
  let body: { device_id?: string; context_uri?: string; uris?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { device_id, context_uri, uris } = body

  if (!device_id) {
    return NextResponse.json({ error: 'device_id is required' }, { status: 400 })
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

  // Start playback on the specified device
  try {
    const playBody: { context_uri?: string; uris?: string[] } = {}
    if (context_uri) {
      playBody.context_uri = context_uri
    }
    if (uris) {
      playBody.uris = uris
    }

    const response = await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${device_id}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(playBody),
      }
    )

    // 204 No Content is success for Spotify
    if (response.status === 204 || response.ok) {
      return NextResponse.json({ success: true })
    }

    const errorData = await response.json()
    console.error('Spotify play failed:', errorData)
    return NextResponse.json({ error: 'Failed to start playback' }, { status: response.status })
  } catch (err) {
    console.error('Spotify play error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
