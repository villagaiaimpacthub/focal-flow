'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Zap, Clock, Upload } from 'lucide-react'
import { FileUpload } from '@/components/FileUpload'
import { AuthForm } from '@/components/AuthForm'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleFileProcessed = async (result: {
    title: string
    words: string[]
    wordCount: number
  }) => {
    if (user) {
      // Save to database
      const { data, error } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          title: result.title,
          words: result.words,
          word_count: result.wordCount
        } as never)
        .select()
        .single()

      if (!error && data) {
        router.push(`/read/${(data as { id: string }).id}`)
      }
    } else {
      // Store in localStorage for non-authenticated users
      localStorage.setItem('flowreader-temp-doc', JSON.stringify(result))
      router.push('/read/temp')
    }
  }

  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Read Faster',
      description: 'Train your brain to read at 300-900+ WPM using RSVP technology'
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: 'Fixed Focus Point',
      description: 'Red anchor letter keeps your eye anchored, eliminating saccadic movements'
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: 'Save Time',
      description: 'Read books, articles, and documents in a fraction of the time'
    }
  ]

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 backdrop-blur-lg bg-[#0F0F1A]/80 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-red-500" />
            <span className="text-xl font-bold">FlowReader</span>
          </div>
          <div className="flex items-center gap-4">
            {!loading && (
              user ? (
                <>
                  <button
                    onClick={() => router.push('/library')}
                    className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
                  >
                    Library
                  </button>
                  <button
                    onClick={() => supabase.auth.signOut()}
                    className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                >
                  Sign In
                </button>
              )
            )}
          </div>
        </div>
      </header>

      {/* Hero section */}
      <main className="pt-32 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Read at <span className="text-red-500">3x Speed</span>
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto mb-8">
            FlowReader uses Rapid Serial Visual Presentation (RSVP) to help you
            read faster while maintaining comprehension. Upload any document and start reading.
          </p>

          {/* Word display demo */}
          <div className="bg-white/5 rounded-2xl p-8 mb-8 font-mono text-4xl flex justify-center items-center h-24">
            <span>comp</span>
            <span className="text-red-500 font-bold">r</span>
            <span>ehension</span>
          </div>
        </div>

        {/* File upload */}
        <div className="max-w-xl mx-auto mb-16">
          <FileUpload onFileProcessed={handleFileProcessed} isDark={true} />
          <p className="text-center text-white/40 text-sm mt-4">
            Supports PDF, TXT, and Markdown files
          </p>
        </div>

        {/* Features */}
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white/5 rounded-xl p-6 text-center"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/20 text-red-500 mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-white/60 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Auth modal */}
      {showAuth && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowAuth(false)}
        >
          <div
            className="bg-[#1A1A2E] rounded-2xl p-8 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <AuthForm onSuccess={() => setShowAuth(false)} />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-white/40">
          <p>FlowReader - Open Source Speed Reading</p>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}
