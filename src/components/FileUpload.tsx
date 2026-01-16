'use client'

import { useCallback, useState } from 'react'
import { Upload, FileText, Loader2 } from 'lucide-react'
import { parseFile, ACCEPTED_FILE_TYPES } from '@/lib/parsers'

interface FileUploadProps {
  onFileProcessed: (result: {
    title: string
    words: string[]
    wordCount: number
  }) => void
  isDark?: boolean
}

export function FileUpload({ onFileProcessed, isDark = true }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback(async (file: File) => {
    setError(null)
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  return (
    <div
      className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
        isDragging
          ? 'border-red-500 bg-red-500/10'
          : isDark
          ? 'border-white/20 hover:border-white/40'
          : 'border-gray-300 hover:border-gray-400'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        onChange={handleInputChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isProcessing}
      />

      <div className="flex flex-col items-center gap-4">
        {isProcessing ? (
          <Loader2
            className="w-12 h-12 animate-spin"
            style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}
          />
        ) : (
          <Upload
            className="w-12 h-12"
            style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}
          />
        )}

        <div>
          <p
            className="text-lg font-medium"
            style={{ color: isDark ? '#FFFFFF' : '#1A1A1A' }}
          >
            {isProcessing ? 'Processing...' : 'Drop a file here or click to browse'}
          </p>
          <p
            className="text-sm mt-1"
            style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}
          >
            Supports TXT, Markdown, and PDF files
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm">
            <FileText className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
