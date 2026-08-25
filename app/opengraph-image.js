import { ImageResponse } from 'next/og';

export const alt = 'تداول+ - تحليل ذكي للأسهم السعودية';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 60,
          background: '#06080f',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(240, 192, 80, 0.15) 0%, transparent 70%)',
        }}
      >
        {/* Title */}
        <div
          style={{
            fontSize: 140,
            fontWeight: 900,
            color: '#f0c050',
            letterSpacing: '-2px',
            marginBottom: 30,
            textShadow: '0 0 40px rgba(240, 192, 80, 0.5)',
          }}
        >
          Tadawul+
        </div>
        
        {/* Subtitle */}
        <div
          style={{
            fontSize: 42,
            color: '#f0f6ff',
            fontWeight: 700,
            marginBottom: 50,
          }}
        >
          Saudi Stock Market AI Analysis
        </div>
        
        {/* Features */}
        <div
          style={{
            display: 'flex',
            gap: 40,
            fontSize: 28,
            color: '#90a4c8',
            fontWeight: 600,
          }}
        >
<div style={{ color: '#1ee68a' }}>11 Layers AI</div>
          <div style={{ color: '#1ee68a' }}>•</div>
          <div style={{ color: '#1ee68a' }}>Backtest</div>
          <div style={{ color: '#1ee68a' }}>•</div>
          <div style={{ color: '#1ee68a' }}>Smart Alerts</div>
        </div>
        
        {/* Bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 50,
            display: 'flex',
            alignItems: 'center',
            gap: 15,
            fontSize: 22,
            color: '#5a6e94',
          }}
        >
          tadawul-plus.vercel.app
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
