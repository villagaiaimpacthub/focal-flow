'use client'

import { useRouter } from 'next/navigation'
import { BookOpen, AlertCircle, ArrowLeft } from 'lucide-react'

export default function AuthCodeErrorPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-full" style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.2)' }}>
            <AlertCircle className="w-12 h-12" style={{ color: 'var(--accent-color)' }} />
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-4">
          Authentication Error
        </h1>

        <p className="text-white/60 mb-8">
          There was a problem verifying your email. The link may have expired or already been used.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => router.push('/')}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors text-white hover:brightness-110"
            style={{ backgroundColor: 'var(--accent-color)' }}
          >
            <BookOpen className="w-5 h-5" />
            Go to Home
          </button>

          <button
            onClick={() => router.back()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>

        <p className="mt-8 text-sm text-white/40">
          Try signing up again or contact support if the problem persists.
        </p>
      </div>
    </div>
  )
}
