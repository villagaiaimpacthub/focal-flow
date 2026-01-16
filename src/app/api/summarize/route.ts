import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Mistral } from '@mistralai/mistralai'
import Anthropic from '@anthropic-ai/sdk'

type SummaryLength = 'brief' | 'standard' | 'detailed' | 'key_points'

const PROMPTS: Record<SummaryLength, string> = {
  brief: 'Summarize the following text in 2-3 sentences, capturing the main idea:',
  standard: 'Provide a one paragraph summary of the following text, covering the key points:',
  detailed: 'Provide a comprehensive summary of the following text in multiple paragraphs, covering all important points and details:',
  key_points: 'Extract the key points from the following text as a bullet-point list:'
}

export async function POST(request: NextRequest) {
  try {
    const { text, length = 'standard' } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Check for user's API key
    let userApiKey: { provider: 'anthropic' | 'mistral'; encrypted_key: string } | null = null
    if (user) {
      const { data } = await supabase
        .from('api_keys')
        .select('provider, encrypted_key')
        .eq('user_id', user.id)
        .single()
      if (data) {
        userApiKey = data as { provider: 'anthropic' | 'mistral'; encrypted_key: string }
      }
    }

    const prompt = PROMPTS[length as SummaryLength] || PROMPTS.standard
    const textToSummarize = text.slice(0, 100000) // Limit to ~100k chars

    // PRIMARY: Try Mistral first (user key or env key)
    if (userApiKey?.provider === 'mistral' || process.env.MISTRAL_API_KEY) {
      const apiKey = userApiKey?.provider === 'mistral'
        ? userApiKey.encrypted_key
        : process.env.MISTRAL_API_KEY

      if (apiKey) {
        try {
          const mistral = new Mistral({ apiKey })

          const completion = await mistral.chat.complete({
            // Using Mistral Small 3.2 for cost-effective summaries
            // 94% cheaper than Claude Haiku 4.5 ($0.06/$0.18 vs $1.00/$5.00)
            model: 'mistral-small-2506',
            messages: [
              {
                role: 'user',
                content: `${prompt}\n\n${textToSummarize}`
              }
            ],
            maxTokens: 1024
          })

          const summary = completion.choices?.[0]?.message?.content || ''
          return NextResponse.json({ summary: typeof summary === 'string' ? summary : '' })
        } catch (mistralError) {
          console.error('Mistral error, falling back to Anthropic:', mistralError)
          // Fall through to Anthropic
        }
      }
    }

    // FALLBACK: Try Anthropic (user key or env key)
    if (userApiKey?.provider === 'anthropic' || process.env.ANTHROPIC_API_KEY) {
      const apiKey = userApiKey?.provider === 'anthropic'
        ? userApiKey.encrypted_key
        : process.env.ANTHROPIC_API_KEY

      if (apiKey) {
        const anthropic = new Anthropic({ apiKey })

        const message = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: `${prompt}\n\n${textToSummarize}`
            }
          ]
        })

        const summary = message.content[0].type === 'text'
          ? message.content[0].text
          : ''

        return NextResponse.json({ summary })
      }
    }

    // No API key available
    return NextResponse.json(
      {
        error: 'No API key configured. Please add your API key in settings or contact the administrator.'
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('Summary error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate summary' },
      { status: 500 }
    )
  }
}
