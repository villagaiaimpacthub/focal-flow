import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 108,
          background: '#0F0F1A',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 36,
          fontFamily: 'system-ui, sans-serif',
          fontWeight: 700,
        }}
      >
        <span style={{ color: '#FFFFFF' }}>F</span>
        <span style={{ color: '#E53E3E' }}>f</span>
      </div>
    ),
    {
      width: 192,
      height: 192,
    }
  )
}
