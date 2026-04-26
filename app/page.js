'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

// ═══════════════════════════════════════════════
// 🚀 Dynamic imports with optimized loading
// ═══════════════════════════════════════════════

// AppShell - Main app (always loaded)
const AppShell = dynamic(() => import('../AppShell'), { 
  ssr: false,
  loading: () => <BrandedLoader />,
});

// OnboardingFlow - Only loaded when needed (new users)
const OnboardingFlow = dynamic(() => import('../components/OnboardingFlow'), {
  ssr: false,
});

// ═══════════════════════════════════════════════
// 🎨 Branded Loader Component
// ═══════════════════════════════════════════════

function BrandedLoader() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#06080f',
      color: '#f0c050',
      fontFamily: "'Cairo', sans-serif",
    }}>
      {/* Logo/Spinner */}
      <div style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        border: '3px solid #1e2d42',
        borderTopColor: '#f0c050',
        animation: 'tdwSpin 0.8s linear infinite',
        marginBottom: 16,
      }} />
      
      {/* Brand */}
      <div style={{
        fontSize: 18,
        fontWeight: 800,
        color: '#f0c050',
        marginBottom: 4,
      }}>
        تداول+
      </div>
      
      {/* Subtitle */}
      <div style={{
        fontSize: 11,
        color: '#90a4c8',
      }}>
        جاري التحميل...
      </div>
      
      <style>{`
        @keyframes tdwSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 🏗️ Main Page Component
// ═══════════════════════════════════════════════

export default function Home() {
  const [showOnboarding, setShowOnboarding] = useState(null);

  useEffect(() => {
    // ✨ Quick localStorage check (synchronous, very fast)
    try {
      const completed = typeof window !== 'undefined' 
        ? window.localStorage.getItem('onboarding_completed') 
        : null;
      setShowOnboarding(completed !== 'true');
    } catch (e) {
      setShowOnboarding(true);
    }
  }, []);

  const handleComplete = (userData) => {
    setShowOnboarding(false);
  };

  // Show branded loader during initial check
  if (showOnboarding === null) {
    return <BrandedLoader />;
  }

  return (
    <>
      {/* Only render OnboardingFlow when needed */}
      {showOnboarding && <OnboardingFlow onComplete={handleComplete} />}
      
      {/* AppShell always renders */}
      <AppShell />
    </>
  );
}
