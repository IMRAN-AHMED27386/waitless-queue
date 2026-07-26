import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #315cff 0%, #315cff 64%, #59d4d1 100%)',
          borderRadius: '20%',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="39.44,14 11.56,33.2 30.6,33.2 21.08,54 59.84,28 38.76,28" fill="#ffe066" transform="rotate(8 34 34)"/>
        </svg>
      </div>
    ),
    { ...size }
  );
}
