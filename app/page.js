'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

const AppShell = dynamic(() => import('../AppShell'), { 
  ssr: false,
  loading: () => <div style={{color:'white',padding:20}}>جاري التحميل...</div>
});

const OnboardingFlow = dynamic(() => import('../components/OnboardingFlow'), {
  ssr: false,
});

export default function Home() {
  const [showOnboarding, setShowOnboarding] = useState(null);

  useEffect(() => {
    // فحص localStorage لمعرفة إذا المستخدم شاهد Onboarding من قبل
    try {
      const completed = localStorage.getItem('onboarding_completed');
      setShowOnboarding(completed !== 'true');
    } catch (e) {
      setShowOnboarding(true);
    }
  }, []);

  const handleComplete = (userData) => {
    setShowOnboarding(false);
  };

  // لا تعرض شي حتى نفحص localStorage
  if (showOnboarding === null) {
    return <div style={{color:'white',padding:20}}>جاري التحميل...</div>;
  }

  return (
    <>
      {showOnboarding && <OnboardingFlow onComplete={handleComplete} />}
      <AppShell />
    </>
  );
}
