import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import {
  generateCodeVerifier,
  generateCodeChallenge,
  SPOTIFY_SCOPES,
  SPOTIFY_AUTH_URL,
} from '@/lib/spotify/pkce'
import type { Database } from '@/types/database'

export async function GET() {
  // Check if user is authenticated
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
    return NextResponse.redirect(new URL('/?auth=required', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'))
  }

  // Generate PKCE code verifier and challenge
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)

  // Store code verifier in httpOnly cookie (expires in 10 minutes)
  cookieStore.set('spotify_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  // Generate state for CSRF protection
  const state = crypto.randomUUID()
  cookieStore.set('spotify_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  // Build authorization URL
  const clientId = process.env.SPOTIFY_CLIENT_ID || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/spotify/callback`

  if (!clientId) {
    console.error('Missing SPOTIFY_CLIENT_ID environment variable')
    return NextResponse.redirect(new URL('/console?error=spotify_config', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'))
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SPOTIFY_SCOPES,
    state,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
  })

  return NextResponse.redirect(`${SPOTIFY_AUTH_URL}?${params.toString()}`)
}
