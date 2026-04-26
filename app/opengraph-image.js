import { ImageResponse } from 'next/og';

// Image metadata
export const alt = 'تداول+ - تحليل ذكي للأسهم السعودية';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

// Image generation
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
          fontFamily: 'sans-serif',
        }}
      >
        {/* Logo/Title */}
        <div
          style={{
            fontSize: 120,
            fontWeight: 900,
            color: '#f0c050',
            letterSpacing: '-2px',
            marginBottom: 20,
            textShadow: '0 0 40px rgba(240, 192, 80, 0.5)',
          }}
        >
          تداول+
        </div>
        
        {/* Subtitle */}
        <div
          style={{
            fontSize: 36,
            color: '#f0f6ff',
            fontWeight: 700,
            marginBottom: 40,
          }}
        >
          تحليل ذكي للأسهم السعودية
        </div>
        
        {/* Features */}
        <div
          style={{
            display: 'flex',
            gap: 30,
            fontSize: 24,
            color: '#90a4c8',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#1ee68a' }}>✓</span>
            <span>9 طبقات تحليل</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#1ee68a' }}>✓</span>
            <span>ذكاء اصطناعي</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#1ee68a' }}>✓</span>
            <span>Backtest</span>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 15,
            fontSize: 20,
            color: '#5a6e94',
          }}
        >
          <span>tadawul-plus.vercel.app</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
