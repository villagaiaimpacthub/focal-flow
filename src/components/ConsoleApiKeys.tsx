'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff, Trash2, ExternalLink, Loader2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ConsoleApiKeysProps {
  userId: string
}

interface StoredKey {
  id: string
  provider: 'anthropic' | 'mistral'
  encrypted_key: string
  created_at: string
}

export function ConsoleApiKeys({ userId }: ConsoleApiKeysProps) {
  const supabase = createClient()

  const [mistralKey, setMistralKey] = useState('')
  const [storedKeys, setStoredKeys] = useState<StoredKey[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadKeys()
  }, [userId])

  const loadKeys = async () => {
    if (!userId) return

    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', userId)

    if (!error && data) {
      setStoredKeys(data as StoredKey[])
    }
    setLoading(false)
  }

  const handleSaveKey = async () => {
    if (!mistralKey.trim() || !userId) return

    setError(null)
    setSaving(true)

    // Basic validation
    if (!mistralKey.startsWith('sk-') && mistralKey.length < 20) {
      setError('Invalid API key format')
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('api_keys')
      .upsert({
        user_id: userId,
        provider: 'mistral',
        encrypted_key: mistralKey.trim()
      } as never, {
        onConflict: 'user_id,provider'
      })

    if (error) {
      setError('Failed to save API key')
    } else {
      setSuccess(true)
      setMistralKey('')
      await loadKeys()
      setTimeout(() => setSuccess(false), 3000)
    }

    setSaving(false)
  }

  const handleDeleteKey = async (keyId: string) => {
    setDeleting(keyId)

    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', keyId)

    if (!error) {
      await loadKeys()
    }

    setDeleting(null)
  }

  const maskKey = (key: string) => {
    if (key.length <= 8) return '••••••••'
    return `${key.slice(0, 4)}...${key.slice(-4)}`
  }

  const mistralStoredKey = storedKeys.find(k => k.provider === 'mistral')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Mistral API Key */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          Mistral API Key
        </label>

        {mistralStoredKey ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-white/5 rounded-lg">
              <span className="font-mono text-white/60">
                {showKey ? mistralStoredKey.encrypted_key : maskKey(mistralStoredKey.encrypted_key)}
              </span>
              <button
                onClick={() => setShowKey(!showKey)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                {showKey ? (
                  <EyeOff className="w-4 h-4 text-white/40" />
                ) : (
                  <Eye className="w-4 h-4 text-white/40" />
                )}
              </button>
            </div>
            <button
              onClick={() => handleDeleteKey(mistralStoredKey.id)}
              disabled={deleting === mistralStoredKey.id}
              className="p-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
            >
              {deleting === mistralStoredKey.id ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-3">
              <input
                type="password"
                value={mistralKey}
                onChange={(e) => setMistralKey(e.target.value)}
                placeholder="Enter your Mistral API key"
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-accent transition-colors"
              />
              <button
                onClick={handleSaveKey}
                disabled={!mistralKey.trim() || saving}
                className="flex items-center gap-2 px-4 py-3 rounded-lg transition-colors text-white hover:brightness-110 disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent-color)' }}
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : success ? (
                  <Check className="w-5 h-5" />
                ) : (
                  'Save'
                )}
              </button>
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center gap-2 text-sm text-white/50">
          <span>Get your API key at</span>
          <a
            href="https://console.mistral.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:brightness-110 transition-colors"
            style={{ color: 'var(--accent-color)' }}
          >
            console.mistral.ai
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Helper text */}
      <div className="p-4 bg-white/5 rounded-lg">
        <p className="text-sm text-white/60">
          <strong className="text-white/80">Why add your own key?</strong>
          <br />
          Adding your own Mistral API key gives you unlimited access to the "Catch Me Up"
          summary feature. Without it, you're limited to {10} free summaries.
        </p>
      </div>
    </div>
  )
}
