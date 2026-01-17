import { ImageResponse } from 'next/og'

export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 100,
          background: '#0F0F1A',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 32,
          fontFamily: 'system-ui, sans-serif',
          fontWeight: 700,
        }}
      >
        <span style={{ color: '#FFFFFF' }}>F</span>
        <span style={{ color: '#E53E3E' }}>f</span>
      </div>
    ),
    {
      ...size,
    }
  )
}
