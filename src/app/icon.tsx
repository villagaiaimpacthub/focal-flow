import { ImageResponse } from 'next/og'

export const size = {
  width: 512,
  height: 512,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 280,
          background: '#0F0F1A',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 96,
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
