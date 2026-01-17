import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Mistral } from '@mistralai/mistralai'
import Anthropic from '@anthropic-ai/sdk'
import type { UserPreferences } from '@/types/database'

const SUMMARY_PROMPT = 'Provide a concise summary of the following text in one paragraph, covering the key points and main ideas:'

const DEFAULT_FREE_CREDITS = 10

async function generateSummary(
  apiKey: string,
  provider: 'mistral' | 'anthropic',
  prompt: string,
  text: string
): Promise<string> {
  if (provider === 'mistral') {
    const mistral = new Mistral({ apiKey })
    const completion = await mistral.chat.complete({
      model: 'mistral-small-2506',
      messages: [{ role: 'user', content: `${prompt}\n\n${text}` }],
      maxTokens: 1024
    })
    const summary = completion.choices?.[0]?.message?.content || ''
    return typeof summary === 'string' ? summary : ''
  } else {
    const anthropic = new Anthropic({ apiKey })
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: `${prompt}\n\n${text}` }]
    })
    return message.content[0].type === 'text' ? message.content[0].text : ''
  }
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const textToSummarize = text.slice(0, 100000) // Limit to ~100k chars

    // PRIORITY 1: Check for user's own API key (BYOK)
    if (user) {
      const { data: keyData } = await supabase
        .from('api_keys')
        .select('provider, encrypted_key')
        .eq('user_id', user.id)
        .single()

      if (keyData) {
        const userKey = keyData as { provider: 'anthropic' | 'mistral'; encrypted_key: string }
        try {
          const summary = await generateSummary(
            userKey.encrypted_key,
            userKey.provider,
            SUMMARY_PROMPT,
            textToSummarize
          )
          return NextResponse.json({ summary, usedCredits: false })
        } catch (error) {
          console.error('User API key error:', error)
          return NextResponse.json(
            { error: 'Your API key failed. Please check it in the console.' },
            { status: 400 }
          )
        }
      }
    }

    // PRIORITY 2: Check free credits (requires login)
    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('preferences')
        .eq('id', user.id)
        .single()

      const userDataTyped = userData as { preferences: UserPreferences } | null
      const preferences = userDataTyped?.preferences || {} as UserPreferences
      const freeCredits = preferences.free_summary_credits ?? DEFAULT_FREE_CREDITS

      if (freeCredits > 0) {
        // Use hosted API key
        const hostedKey = process.env.MISTRAL_API_KEY
        if (!hostedKey) {
          return NextResponse.json(
            { error: 'Service temporarily unavailable. Please add your own API key.' },
            { status: 503 }
          )
        }

        try {
          const summary = await generateSummary(hostedKey, 'mistral', SUMMARY_PROMPT, textToSummarize)

          // Decrement credits
          const newCredits = freeCredits - 1
          await supabase
            .from('users')
            .update({
              preferences: { ...preferences, free_summary_credits: newCredits }
            } as never)
            .eq('id', user.id)

          return NextResponse.json({
            summary,
            usedCredits: true,
            creditsRemaining: newCredits
          })
        } catch (error) {
          console.error('Hosted API error:', error)
          return NextResponse.json(
            { error: 'Failed to generate summary. Please try again.' },
            { status: 500 }
          )
        }
      } else {
        // No credits left
        return NextResponse.json(
          {
            error: 'You have used all your free summaries. Please add your own Mistral API key in the console to continue.',
            noCredits: true
          },
          { status: 402 }
        )
      }
    }

    // PRIORITY 3: Guest users - no summaries without login
    return NextResponse.json(
      {
        error: 'Please sign in to use the summary feature. You get 10 free summaries when you create an account.',
        requiresAuth: true
      },
      { status: 401 }
    )
  } catch (error) {
    console.error('Summary error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate summary' },
      { status: 500 }
    )
  }
}
