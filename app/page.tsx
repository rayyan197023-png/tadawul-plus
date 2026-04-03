'use client';

import dynamic from 'next/dynamic';

const AppShell = dynamic(() => import('../AppShell'), { 
  ssr: false,
  loading: () => <div style={{color:'white',padding:20}}>جاري التحميل...</div>
});

export default function Home() {
  return <AppShell />;
}