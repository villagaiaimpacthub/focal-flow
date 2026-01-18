import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { SPOTIFY_TOKEN_URL } from '@/lib/spotify/pkce'
import type { Database } from '@/types/database'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const cookieStore = await cookies()

  // Handle Spotify OAuth errors
  if (error) {
    console.error('Spotify OAuth error:', error)
    return NextResponse.redirect(new URL(`/console?error=spotify_${error}`, baseUrl))
  }

  // Verify state matches (CSRF protection)
  const storedState = cookieStore.get('spotify_oauth_state')?.value
  if (!state || state !== storedState) {
    console.error('State mismatch in Spotify OAuth callback')
    return NextResponse.redirect(new URL('/console?error=spotify_state_mismatch', baseUrl))
  }

  // Get code verifier from cookie
  const codeVerifier = cookieStore.get('spotify_code_verifier')?.value
  if (!codeVerifier) {
    console.error('Missing code verifier in Spotify OAuth callback')
    return NextResponse.redirect(new URL('/console?error=spotify_missing_verifier', baseUrl))
  }

  // Verify user is authenticated
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
    return NextResponse.redirect(new URL('/?auth=required', baseUrl))
  }

  // Exchange code for tokens
  const clientId = process.env.SPOTIFY_CLIENT_ID || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || `${baseUrl}/auth/spotify/callback`

  try {
    const tokenResponse = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code!,
        redirect_uri: redirectUri,
        client_id: clientId!,
        code_verifier: codeVerifier,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Spotify token exchange failed:', errorData)
      return NextResponse.redirect(new URL('/console?error=spotify_token_exchange', baseUrl))
    }

    const tokens = await tokenResponse.json()
    const { access_token, refresh_token, expires_in } = tokens

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString()

    // Fetch user profile to get Spotify user ID and check Premium status
    const profileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    let spotifyUserId = null
    let spotifyDisplayName = null
    let spotifyProduct = null

    if (profileResponse.ok) {
      const profile = await profileResponse.json()
      spotifyUserId = profile.id
      spotifyDisplayName = profile.display_name
      spotifyProduct = profile.product // 'premium' or 'free'
    }

    // Store connection in database (upsert to handle reconnection)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: dbError } = await (supabase as any)
      .from('spotify_connections')
      .upsert({
        user_id: user.id,
        access_token,
        refresh_token,
        expires_at: expiresAt,
        spotify_user_id: spotifyUserId,
        spotify_display_name: spotifyDisplayName,
        spotify_product: spotifyProduct,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })

    if (dbError) {
      console.error('Failed to store Spotify connection:', dbError)
      return NextResponse.redirect(new URL('/console?error=spotify_db_error', baseUrl))
    }

    // Clear PKCE cookies
    cookieStore.delete('spotify_code_verifier')
    cookieStore.delete('spotify_oauth_state')

    // Redirect to console with success
    const redirectUrl = new URL('/console', baseUrl)
    redirectUrl.searchParams.set('spotify', 'connected')
    if (spotifyProduct === 'free') {
      redirectUrl.searchParams.set('spotify_warning', 'premium_required')
    }

    return NextResponse.redirect(redirectUrl)
  } catch (err) {
    console.error('Spotify OAuth callback error:', err)
    return NextResponse.redirect(new URL('/console?error=spotify_unknown', baseUrl))
  }
}
