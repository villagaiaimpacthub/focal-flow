'use client'

import { useCallback, useState, useRef } from 'react'
import { Upload, Loader2, AlertCircle } from 'lucide-react'
import { parseFile, ACCEPTED_FILE_TYPES } from '@/lib/parsers'

interface FileUploadProps {
  onFileProcessed: (result: {
    title: string
    words: string[]
    wordCount: number
  }) => void
  isDark?: boolean
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function FileUpload({ onFileProcessed, isDark = true }: FileUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setError(null)

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum size is 10MB.')
      return
    }

    setIsProcessing(true)

    try {
      const result = await parseFile(file)
      onFileProcessed(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file')
    } finally {
      setIsProcessing(false)
    }
  }, [onFileProcessed])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
    // Reset input so same file can be selected again
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [handleFile])

  const handleClick = () => {
    inputRef.current?.click()
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        onChange={handleInputChange}
        className="hidden"
        disabled={isProcessing}
      />

      <button
        onClick={handleClick}
        disabled={isProcessing}
        className="flex items-center gap-3 px-6 py-4 rounded-xl text-white font-medium transition-all hover:brightness-110 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
        style={{ backgroundColor: 'var(--accent-color)' }}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Upload className="w-5 h-5" />
            Choose File
          </>
        )}
      </button>

      <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
        PDF, TXT, or Markdown
      </p>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  )
}
