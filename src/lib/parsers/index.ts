import { marked } from 'marked'

export interface ParseResult {
  title: string
  words: string[]
  wordCount: number
  warnings?: string[]
}

// Split text into words, preserving punctuation attached to words
function splitIntoWords(text: string): string[] {
  return text
    .replace(/\n+/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0)
}

// Clean text by removing common PDF artifacts
function cleanPdfText(text: string): string {
  return text
    // Remove page numbers (common patterns)
    .replace(/\b(Page\s+)?\d+\s*(of\s+\d+)?\s*$/gm, '')
    // Remove excessive whitespace
    .replace(/\s{3,}/g, ' ')
    // Remove common header/footer patterns (customize as needed)
    .replace(/^(Chapter|Section)\s+\d+\s*$/gm, '')
    // Normalize quotes and dashes
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[–—]/g, '-')
    .trim()
}

// Detect if text appears to be from a multi-column layout (heuristic)
function detectMultiColumnIssues(text: string): boolean {
  // If we have many very short lines followed by content, likely multi-column
  const lines = text.split('\n').filter(l => l.trim().length > 0)
  if (lines.length < 10) return false

  const shortLines = lines.filter(l => l.trim().length < 30 && l.trim().length > 0)
  return shortLines.length / lines.length > 0.5
}

// Parse plain text files
export function parseTxt(content: string, filename: string): ParseResult {
  const words = splitIntoWords(content)
  return {
    title: filename.replace(/\.txt$/i, ''),
    words,
    wordCount: words.length
  }
}

// Parse markdown files - strip formatting but preserve text
export function parseMarkdown(content: string, filename: string): ParseResult {
  // Convert markdown to plain text by stripping HTML tags
  const html = marked(content, { async: false }) as string
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')

  const words = splitIntoWords(text)

  // Try to extract title from first heading
  const titleMatch = content.match(/^#\s+(.+)$/m)
  const title = titleMatch
    ? titleMatch[1]
    : filename.replace(/\.md$/i, '')

  return {
    title,
    words,
    wordCount: words.length
  }
}

// Parse PDF files using pdfjs-dist
export async function parsePdf(file: File): Promise<ParseResult> {
  // Dynamic import for client-side only
  const pdfjs = await import('pdfjs-dist')

  // Set worker source - use local copy in public folder
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise

  const warnings: string[] = []
  let fullText = ''

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()

    // Sort items by position to handle multi-column better
    const items = textContent.items as Array<{
      str: string
      transform: number[]
      width: number
      height: number
    }>

    // Group by approximate Y position to handle columns
    const lineGroups = new Map<number, typeof items>()
    items.forEach(item => {
      // Round Y to group items on same line (transform[5] is Y position)
      const y = Math.round(item.transform[5] / 10) * 10
      if (!lineGroups.has(y)) {
        lineGroups.set(y, [])
      }
      lineGroups.get(y)!.push(item)
    })

    // Sort lines by Y (descending - top to bottom in PDF coordinates)
    const sortedLines = Array.from(lineGroups.entries())
      .sort((a, b) => b[0] - a[0])

    // For each line, sort items by X position (left to right)
    for (const [, lineItems] of sortedLines) {
      lineItems.sort((a, b) => a.transform[4] - b.transform[4])
      const lineText = lineItems.map(item => item.str).join(' ')
      fullText += lineText + ' '
    }
  }

  // Clean the extracted text
  fullText = cleanPdfText(fullText)

  // Check for potential issues
  if (fullText.trim().length < 100) {
    warnings.push('This PDF may be scanned/image-based with little or no extractable text.')
  }

  if (detectMultiColumnIssues(fullText)) {
    warnings.push('This PDF may have multi-column layout. Text order might be affected.')
  }

  const words = splitIntoWords(fullText)

  // Use filename as title (PDF metadata is often unreliable/unhelpful)
  const title = file.name.replace(/\.pdf$/i, '')

  return {
    title,
    words,
    wordCount: words.length,
    warnings: warnings.length > 0 ? warnings : undefined
  }
}

// Main parser that routes to the appropriate format handler
export async function parseFile(file: File): Promise<ParseResult> {
  const extension = file.name.split('.').pop()?.toLowerCase()

  switch (extension) {
    case 'txt': {
      const content = await file.text()
      return parseTxt(content, file.name)
    }
    case 'md':
    case 'markdown': {
      const content = await file.text()
      return parseMarkdown(content, file.name)
    }
    case 'pdf': {
      return parsePdf(file)
    }
    default:
      throw new Error(`Unsupported file format: ${extension}`)
  }
}

// Get accepted file types for input element
export const ACCEPTED_FILE_TYPES = '.txt,.md,.markdown,.pdf'
